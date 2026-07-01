-- ============================================================
-- OWNCAMPUS – Migration 006: Transport Assignments + Library Fixes + Search
-- ============================================================

-- ── 1. TRANSPORT ASSIGNMENTS ─────────────────────────────────────────
-- Links students to transport routes with their designated stop
CREATE TABLE IF NOT EXISTS transport_assignments (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id     UUID        NOT NULL REFERENCES students(id)     ON DELETE CASCADE,
  route_id       UUID        NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  stop_name      VARCHAR(255),
  pickup_point   VARCHAR(255),
  monthly_fee    DECIMAL(10,2),
  status         VARCHAR(20) NOT NULL DEFAULT 'active',   -- active | inactive
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  -- one active assignment per student
  UNIQUE (student_id, status)
);

CREATE INDEX IF NOT EXISTS idx_transport_assignments_route ON transport_assignments(route_id);
CREATE INDEX IF NOT EXISTS idx_transport_assignments_inst  ON transport_assignments(institution_id);

-- Enable RLS
ALTER TABLE transport_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transport_institution" ON transport_assignments;
CREATE POLICY "transport_institution" ON transport_assignments FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
    OR student_id IN (
      SELECT s.id FROM students s
      JOIN user_profiles up ON s.user_id = up.id
      WHERE up.id = auth.uid()
    )
  );

-- ── 2. BOOKS – ensure full-text search index ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_books_title_author ON books
  USING gin(to_tsvector('english', title || ' ' || COALESCE(author, '') || ' ' || COALESCE(isbn, '')));

-- ── 3. VEHICLES – institution scoping index ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_vehicles_inst ON vehicles(institution_id);

-- Enable RLS on vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicles_institution" ON vehicles;
CREATE POLICY "vehicles_institution" ON vehicles FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ── 4. TRANSPORT_ROUTES – RLS ─────────────────────────────────────────
ALTER TABLE transport_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "routes_institution" ON transport_routes;
CREATE POLICY "routes_institution" ON transport_routes FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ── 5. BOOKS / BOOK_ISSUES – RLS ─────────────────────────────────────
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "books_institution" ON books;
CREATE POLICY "books_institution" ON books FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

ALTER TABLE book_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "book_issues_institution" ON book_issues;
CREATE POLICY "book_issues_institution" ON book_issues FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- ── 6. REALTIME: enable for transport and library ─────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE transport_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE book_issues;

-- ── 7. VIEW: student transport info (for student dashboard) ───────────
CREATE OR REPLACE VIEW v_student_transport AS
SELECT
  ta.student_id,
  ta.institution_id,
  tr.name         AS route_name,
  tr.route_number,
  tr.departure_time,
  tr.arrival_time,
  ta.stop_name,
  ta.monthly_fee  AS transport_fee,
  v.registration_number AS vehicle_number,
  v.type          AS vehicle_type,
  up.first_name || ' ' || COALESCE(up.last_name,'') AS driver_name,
  up.phone        AS driver_phone
FROM transport_assignments ta
JOIN transport_routes tr ON ta.route_id = tr.id
LEFT JOIN vehicles v ON tr.vehicle_id = v.id
LEFT JOIN user_profiles up ON v.driver_id = up.id
WHERE ta.status = 'active';

-- ── 8. VIEW: library overdue summary ─────────────────────────────────
CREATE OR REPLACE VIEW v_library_overdue AS
SELECT
  bi.id          AS issue_id,
  bi.institution_id,
  bi.user_id,
  b.title        AS book_title,
  b.author,
  bi.issued_date,
  bi.due_date,
  CURRENT_DATE - bi.due_date AS days_overdue,
  (CURRENT_DATE - bi.due_date) * 2 AS fine_amount  -- ₹2/day
FROM book_issues bi
JOIN books b ON bi.book_id = b.id
WHERE bi.status = 'issued'
  AND bi.due_date < CURRENT_DATE;

-- ── 9. RPC: student full dashboard data ──────────────────────────────
-- Returns everything a student dashboard needs in one call
CREATE OR REPLACE FUNCTION get_student_dashboard(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_student RECORD;
  v_result  JSONB;
BEGIN
  -- Get student record
  SELECT s.*, up.first_name, up.last_name, up.email, up.phone
  INTO v_student
  FROM students s
  JOIN user_profiles up ON s.user_id = up.id
  WHERE s.user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Student not found');
  END IF;

  SELECT jsonb_build_object(
    'student_id',    v_student.id,
    'name',          v_student.first_name || ' ' || COALESCE(v_student.last_name, ''),
    'roll_number',   v_student.roll_number,
    'class_id',      v_student.class_id,
    'total_fee',     v_student.total_fee,
    'paid_amount',   v_student.paid_amount,
    'fee_balance',   GREATEST(v_student.total_fee - v_student.paid_amount, 0),
    'fee_status',    v_student.fee_status,
    'attendance_pct', (
      SELECT CASE WHEN COUNT(*) = 0 THEN NULL
             ELSE ROUND(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
             END
      FROM attendance
      WHERE student_id = v_student.id
        AND date >= CURRENT_DATE - INTERVAL '90 days'
    ),
    'upcoming_exams', (
      SELECT COUNT(*) FROM exams
      WHERE class_id = v_student.class_id
        AND exam_date > CURRENT_DATE
        AND is_published = true
    ),
    'overdue_books', (
      SELECT COUNT(*) FROM book_issues
      WHERE user_id = p_user_id
        AND status = 'issued'
        AND due_date < CURRENT_DATE
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ── 10. TRIGGER: auto-notify low attendance ───────────────────────────
-- Fire when student attendance dips below 75% in last 30 days
CREATE OR REPLACE FUNCTION check_low_attendance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_pct          NUMERIC;
  v_student_uid  UUID;
  v_inst_id      UUID;
  v_name         TEXT;
BEGIN
  -- Only run on absent marks
  IF NEW.status <> 'absent' THEN RETURN NEW; END IF;

  -- Compute 30-day attendance
  SELECT
    ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0))
  INTO v_pct
  FROM attendance a
  WHERE a.student_id = NEW.student_id
    AND a.date >= CURRENT_DATE - INTERVAL '30 days';

  -- If below 75%, notify the student
  IF v_pct IS NOT NULL AND v_pct < 75 THEN
    SELECT s.user_id, s.institution_id,
           up.first_name || ' ' || COALESCE(up.last_name, '')
    INTO v_student_uid, v_inst_id, v_name
    FROM students s JOIN user_profiles up ON s.user_id = up.id
    WHERE s.id = NEW.student_id;

    -- Avoid duplicate low-attendance notifications (check last 24h)
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = v_student_uid
        AND type = 'attendance'
        AND created_at > NOW() - INTERVAL '24 hours'
    ) THEN
      INSERT INTO notifications(institution_id, user_id, type, title, body, is_broadcast, is_read, metadata)
      VALUES (
        v_inst_id, v_student_uid,
        'attendance',
        'Low Attendance Warning',
        '⚠️ Your attendance is ' || v_pct || '% — below the required 75%.',
        false, false,
        jsonb_build_object('attendance_pct', v_pct, 'student_id', NEW.student_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_low_attendance ON attendance;
CREATE TRIGGER trg_low_attendance
  AFTER INSERT OR UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION check_low_attendance();
