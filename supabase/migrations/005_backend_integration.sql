-- ============================================================
-- OWNCAMPUS – Migration 005: Full Backend Integration
-- Fixes: multi-tenancy, RLS, triggers, views, sync, indexes
-- ============================================================

-- ── 1. INSTITUTION CODE & SLUG on institutions ───────────────
ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS code         VARCHAR(20)  UNIQUE,
  ADD COLUMN IF NOT EXISTS domain       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_active    BOOLEAN      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS setup_done   BOOLEAN      NOT NULL DEFAULT false;

-- Generate a short code for institutions that don't have one
UPDATE institutions SET code = UPPER(SUBSTRING(slug, 1, 8)) WHERE code IS NULL;

-- ── 2. CAMPUSES table (alias for branches in multi-campus context) ──
-- branches table already exists; add display alias + active flag
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS is_active    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS campus_code  VARCHAR(20);

-- ── 3. ACCESS_REQUESTS – add institution + campus context ────
ALTER TABLE access_requests
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS campus_id      UUID REFERENCES branches(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS institution_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS branch         TEXT;     -- keep existing TEXT column, it's already there

-- Index for fast per-institution pending lookups
CREATE INDEX IF NOT EXISTS idx_access_requests_institution ON access_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status      ON access_requests(status);

-- ── 4. USER_PROFILES – enforce institution membership ────────
-- institution_id is already nullable; we keep nullable for super_admin
-- Add computed column helper via function (not stored column for compat)
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_inst ON user_profiles(role, institution_id);

-- ── 5. STUDENTS – full relational record ────────────────────
-- The students table already has the right columns; add missing ones:
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS total_fee     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount   NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_status    payment_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS parent_name   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS parent_phone  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS parent_email  VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_students_user    ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_program ON students(program_id);
CREATE INDEX IF NOT EXISTS idx_students_ay      ON students(academic_year_id);

-- ── 6. FACULTY – sync columns ────────────────────────────────
ALTER TABLE faculty
  ADD COLUMN IF NOT EXISTS subjects_text TEXT;  -- comma-separated fallback for UI

CREATE INDEX IF NOT EXISTS idx_faculty_user    ON faculty(user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_dept    ON faculty(department_id);
CREATE INDEX IF NOT EXISTS idx_faculty_inst    ON faculty(institution_id);

-- ── 7. ATTENDANCE – indexes + institution column ─────────────
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_attendance_inst        ON attendance(institution_id);
CREATE INDEX IF NOT EXISTS idx_attendance_faculty     ON attendance(faculty_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date  ON attendance(class_id, date);

-- ── 8. FEE_PAYMENTS – add missing columns ───────────────────
-- Existing columns (from migration 001): institution_id, receipt_number, notes,
--   payment_method, collected_by, status (payment_status enum), payment_date, amount.
-- We only add truly new columns below.
ALTER TABLE fee_payments
  ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50),
  ADD COLUMN IF NOT EXISTS recorded_by  UUID REFERENCES user_profiles(id);

-- Back-fill aliases from existing columns (safe if already populated)
UPDATE fee_payments SET payment_mode = payment_method WHERE payment_mode IS NULL;
UPDATE fee_payments SET recorded_by  = collected_by   WHERE recorded_by  IS NULL;

CREATE INDEX IF NOT EXISTS idx_fee_payments_inst   ON fee_payments(institution_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_status ON fee_payments(status);
CREATE INDEX IF NOT EXISTS idx_fee_payments_date   ON fee_payments(payment_date);

-- ── 9. EXAMS – add lifecycle status (auto-computed) ─────────
ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_exams_inst ON exams(institution_id);
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(exam_date);

-- ── 10. TIMETABLE_SLOTS – institution FK ────────────────────
ALTER TABLE timetable_slots
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_timetable_inst  ON timetable_slots(institution_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day   ON timetable_slots(day_of_week);

-- ── 11. LEAVES – table exists from migration 001 with start_date/end_date ──
-- Add any missing columns (days_count exists as NOT NULL so we can't add it without default)
ALTER TABLE leaves
  ADD COLUMN IF NOT EXISTS leave_type VARCHAR(50) DEFAULT 'casual';

-- Ensure legacy rows have a leave_type
UPDATE leaves SET leave_type = 'casual' WHERE leave_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_leaves_institution ON leaves(institution_id);
CREATE INDEX IF NOT EXISTS idx_leaves_user        ON leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status      ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_dates       ON leaves(start_date, end_date);

-- ── 12. NOTIFICATIONS – table exists from migration 001; add missing columns ──
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS user_id   UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS link      VARCHAR(500),
  ADD COLUMN IF NOT EXISTS is_read   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata  JSONB DEFAULT '{}';

-- Backfill user_id for per-user targeting (leave broadcast ones as NULL)
UPDATE notifications SET user_id = target_user_ids[1]
  WHERE user_id IS NULL AND target_user_ids IS NOT NULL AND array_length(target_user_ids, 1) = 1;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_inst ON notifications(institution_id, created_at DESC);

-- ── 13. RECEIPT SEQUENCE ────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1000 INCREMENT 1;

-- ── 14. HELPER FUNCTION: get calling user's institution_id ──
CREATE OR REPLACE FUNCTION get_my_institution_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT institution_id FROM user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── 15. TRIGGER: auto-set institution_id on attendance ───────
CREATE OR REPLACE FUNCTION set_attendance_institution()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.institution_id IS NULL THEN
    SELECT institution_id INTO NEW.institution_id
    FROM user_profiles WHERE id = NEW.faculty_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_institution ON attendance;
CREATE TRIGGER trg_attendance_institution
  BEFORE INSERT ON attendance
  FOR EACH ROW EXECUTE FUNCTION set_attendance_institution();

-- ── 16. TRIGGER: sync student fee totals from fee_payments ───
CREATE OR REPLACE FUNCTION sync_student_fee_totals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_student_id UUID;
  v_total_paid NUMERIC(12,2);
BEGIN
  -- resolve student UUID from fee_payments.student_id
  v_student_id := COALESCE(NEW.student_id, OLD.student_id);

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM fee_payments
  WHERE student_id = v_student_id
    AND status = 'paid';

  UPDATE students
  SET
    paid_amount = v_total_paid,
    fee_status  = CASE
      WHEN v_total_paid = 0             THEN 'pending'::payment_status
      WHEN v_total_paid >= total_fee    THEN 'paid'::payment_status
      ELSE                                   'partial'::payment_status
    END
  WHERE id = v_student_id;

  -- Also update user_profiles.metadata for quick reads
  UPDATE user_profiles
  SET metadata = jsonb_set(
    jsonb_set(metadata, '{paid_amount}', to_jsonb(v_total_paid)),
    '{fee_status}',
    to_jsonb(
      CASE
        WHEN v_total_paid = 0 THEN 'pending'
        WHEN v_total_paid >= (SELECT total_fee FROM students WHERE id = v_student_id)
          THEN 'paid'
        ELSE 'partial'
      END
    )
  )
  WHERE id = (SELECT user_id FROM students WHERE id = v_student_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_fee_totals ON fee_payments;
CREATE TRIGGER trg_sync_fee_totals
  AFTER INSERT OR UPDATE OR DELETE ON fee_payments
  FOR EACH ROW EXECUTE FUNCTION sync_student_fee_totals();

-- ── 17. TRIGGER: auto-create notification on fee payment ─────
CREATE OR REPLACE FUNCTION notify_fee_payment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_student_user_id UUID;
  v_inst_id         UUID;
  v_student_name    TEXT;
BEGIN
  IF NEW.status = 'paid' AND (OLD IS NULL OR OLD.status <> 'paid') THEN
    SELECT up.id, up.institution_id,
           up.first_name || ' ' || COALESCE(up.last_name, '')
    INTO v_student_user_id, v_inst_id, v_student_name
    FROM students s JOIN user_profiles up ON s.user_id = up.id
    WHERE s.id = NEW.student_id;

    INSERT INTO notifications(institution_id, user_id, type, title, body, metadata, is_read)
    VALUES (
      v_inst_id,
      v_student_user_id,
      'payment',
      'Payment Received',
      '₹' || NEW.amount || ' received via ' || COALESCE(NEW.payment_mode, NEW.payment_method, 'cash'),
      jsonb_build_object(
        'amount', NEW.amount,
        'mode',   COALESCE(NEW.payment_mode, NEW.payment_method),
        'receipt', NEW.receipt_number,
        'date',   NEW.payment_date
      ),
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_fee_payment ON fee_payments;
CREATE TRIGGER trg_notify_fee_payment
  AFTER INSERT OR UPDATE ON fee_payments
  FOR EACH ROW EXECUTE FUNCTION notify_fee_payment();

-- ── 18. TRIGGER: auto-set institution on fee_payments ────────
CREATE OR REPLACE FUNCTION set_fee_payment_institution()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.institution_id IS NULL THEN
    SELECT s.institution_id INTO NEW.institution_id
    FROM students s WHERE s.id = NEW.student_id;
  END IF;
  IF NEW.receipt_number IS NULL THEN
    NEW.receipt_number := 'RCP-' || LPAD(nextval('receipt_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fee_payment_institution ON fee_payments;
CREATE TRIGGER trg_fee_payment_institution
  BEFORE INSERT ON fee_payments
  FOR EACH ROW EXECUTE FUNCTION set_fee_payment_institution();

-- ── 19. TRIGGER: auto-set student fee_status on total_fee change ──
CREATE OR REPLACE FUNCTION recalc_fee_status_on_total_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.total_fee IS DISTINCT FROM OLD.total_fee THEN
    NEW.fee_status := CASE
      WHEN NEW.paid_amount = 0             THEN 'pending'::payment_status
      WHEN NEW.paid_amount >= NEW.total_fee THEN 'paid'::payment_status
      ELSE                                      'partial'::payment_status
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_fee_status ON students;
CREATE TRIGGER trg_recalc_fee_status
  BEFORE UPDATE OF total_fee, paid_amount ON students
  FOR EACH ROW EXECUTE FUNCTION recalc_fee_status_on_total_change();

-- ── 20. TRIGGER: leaves updated_at ───────────────────────────
DROP TRIGGER IF EXISTS update_leaves_updated_at ON leaves;
CREATE TRIGGER update_leaves_updated_at
  BEFORE UPDATE ON leaves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 21. VIEW: institution dashboard KPIs ─────────────────────
CREATE OR REPLACE VIEW v_institution_kpis AS
SELECT
  i.id                                                  AS institution_id,
  i.name                                                AS institution_name,
  COUNT(DISTINCT s.id)                                  AS total_students,
  COUNT(DISTINCT f.id)                                  AS total_faculty,
  COUNT(DISTINCT CASE WHEN s.fee_status = 'pending'  THEN s.id END) AS fee_pending_count,
  COUNT(DISTINCT CASE WHEN s.fee_status = 'partial'  THEN s.id END) AS fee_partial_count,
  COUNT(DISTINCT CASE WHEN s.fee_status = 'paid'     THEN s.id END) AS fee_paid_count,
  COALESCE(SUM(s.total_fee),   0)                       AS total_fee_expected,
  COALESCE(SUM(s.paid_amount), 0)                       AS total_fee_collected,
  COALESCE(SUM(s.total_fee) - SUM(s.paid_amount), 0)   AS total_fee_outstanding,
  COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'pending') AS pending_approvals
FROM institutions i
LEFT JOIN students  s  ON s.institution_id  = i.id AND s.status = 'active'
LEFT JOIN faculty   f  ON f.institution_id  = i.id AND f.status = 'active'
LEFT JOIN access_requests ar ON ar.institution_id = i.id
GROUP BY i.id, i.name;

-- ── 22. VIEW: student fee ledger ─────────────────────────────
CREATE OR REPLACE VIEW v_student_fee_ledger AS
SELECT
  s.id                  AS student_id,
  s.institution_id,
  up.first_name || ' ' || COALESCE(up.last_name, '') AS student_name,
  up.email,
  s.roll_number,
  c.name                AS class_name,
  s.total_fee,
  s.paid_amount,
  GREATEST(s.total_fee - s.paid_amount, 0)           AS balance,
  s.fee_status,
  COUNT(fp.id)          AS payment_count,
  MAX(fp.payment_date)  AS last_payment_date
FROM students s
JOIN user_profiles up ON s.user_id = up.id
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN fee_payments fp ON fp.student_id = s.id AND fp.status = 'paid'
GROUP BY s.id, s.institution_id, up.first_name, up.last_name, up.email,
         s.roll_number, c.name, s.total_fee, s.paid_amount, s.fee_status;

-- ── 23. VIEW: exam lifecycle (status auto-computed) ───────────
CREATE OR REPLACE VIEW v_exam_with_status AS
SELECT
  e.*,
  CASE
    WHEN e.exam_date > CURRENT_DATE  THEN 'upcoming'
    WHEN e.exam_date = CURRENT_DATE  THEN 'ongoing'
    WHEN e.exam_date < CURRENT_DATE  THEN 'completed'
    ELSE 'upcoming'
  END AS computed_status
FROM exams e;

-- ── 24. VIEW: today's attendance summary per class ────────────
CREATE OR REPLACE VIEW v_today_attendance AS
SELECT
  a.institution_id,
  a.class_id,
  c.name          AS class_name,
  COUNT(*)        AS total_marked,
  SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_count,
  SUM(CASE WHEN a.status = 'absent'  THEN 1 ELSE 0 END) AS absent_count,
  CURRENT_DATE    AS date
FROM attendance a
LEFT JOIN classes c ON a.class_id = c.id
WHERE a.date = CURRENT_DATE
GROUP BY a.institution_id, a.class_id, c.name;

-- ── 25. RPC: get institution dashboard stats ─────────────────
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_institution_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'students',          COUNT(DISTINCT s.id),
    'faculty',           COUNT(DISTINCT f.id),
    'pending_approvals', COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'pending'),
    'fee_collected',     COALESCE(SUM(s.paid_amount), 0),
    'fee_outstanding',   COALESCE(SUM(GREATEST(s.total_fee - s.paid_amount, 0)), 0),
    'today_attendance',  (
      SELECT COUNT(*) FROM attendance
      WHERE institution_id = p_institution_id AND date = CURRENT_DATE AND status = 'present'
    )
  )
  INTO v_result
  FROM institutions i
  LEFT JOIN students s  ON s.institution_id = p_institution_id AND s.status = 'active'
  LEFT JOIN faculty  f  ON f.institution_id = p_institution_id AND f.status = 'active'
  LEFT JOIN access_requests ar ON ar.institution_id = p_institution_id
  WHERE i.id = p_institution_id;

  RETURN v_result;
END;
$$;

-- ── 26. RPC: record fee payment (atomic + triggers) ───────────
CREATE OR REPLACE FUNCTION record_fee_payment(
  p_student_id    UUID,
  p_amount        NUMERIC,
  p_mode          VARCHAR,
  p_recorded_by   UUID,
  p_notes         TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_payment_id UUID;
  v_receipt    VARCHAR;
  v_inst_id    UUID;
BEGIN
  SELECT institution_id INTO v_inst_id FROM students WHERE id = p_student_id;

  INSERT INTO fee_payments(student_id, institution_id, amount, total_paid, status, payment_method, payment_mode, payment_date, recorded_by, collected_by, notes)
  VALUES (p_student_id, v_inst_id, p_amount, p_amount, 'paid', p_mode, p_mode, CURRENT_DATE, p_recorded_by, p_recorded_by, p_notes)
  RETURNING id, receipt_number INTO v_payment_id, v_receipt;

  RETURN jsonb_build_object('payment_id', v_payment_id, 'receipt_number', v_receipt);
END;
$$;

-- ── 27. RPC: search students for fee entry ───────────────────
CREATE OR REPLACE FUNCTION search_students_for_fee(
  p_institution_id UUID,
  p_query          TEXT
)
RETURNS TABLE(
  student_id    UUID,
  user_id       UUID,
  name          TEXT,
  roll_number   VARCHAR,
  class_name    TEXT,
  section       VARCHAR,
  phone         VARCHAR,
  email         VARCHAR,
  total_fee     NUMERIC,
  paid_amount   NUMERIC,
  balance       NUMERIC,
  fee_status    payment_status
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    up.first_name || ' ' || COALESCE(up.last_name, ''),
    s.roll_number,
    c.name,
    c.section,
    up.phone,
    up.email,
    s.total_fee,
    s.paid_amount,
    GREATEST(s.total_fee - s.paid_amount, 0),
    s.fee_status
  FROM students s
  JOIN user_profiles up ON s.user_id = up.id
  LEFT JOIN classes c ON s.class_id = c.id
  WHERE s.institution_id = p_institution_id
    AND s.status = 'active'
    AND (
      up.first_name  ILIKE '%' || p_query || '%' OR
      up.last_name   ILIKE '%' || p_query || '%' OR
      s.roll_number  ILIKE '%' || p_query || '%' OR
      s.admission_number ILIKE '%' || p_query || '%' OR
      up.phone       ILIKE '%' || p_query || '%' OR
      up.email       ILIKE '%' || p_query || '%' OR
      c.name         ILIKE '%' || p_query || '%'
    )
  ORDER BY up.first_name, up.last_name
  LIMIT 20;
END;
$$;

-- ── 28. REALTIME: enable for critical tables ─────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE fee_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE access_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE leaves;

-- ── 29. RLS – access_requests (per institution) ───────────────
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_access_requests" ON access_requests;
CREATE POLICY "public_insert_access_requests"
  ON access_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "institution_admin_see_requests" ON access_requests;
CREATE POLICY "institution_admin_see_requests"
  ON access_requests FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('owner','super_admin','principal','vice_principal',
                     'academic_coordinator','chairman','director','administrator')
    )
    OR institution_id IS NULL  -- legacy requests before institution context was added
  );

DROP POLICY IF EXISTS "institution_admin_update_requests" ON access_requests;
CREATE POLICY "institution_admin_update_requests"
  ON access_requests FOR UPDATE
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('owner','super_admin','principal','vice_principal',
                     'academic_coordinator','chairman','director')
    )
  );

-- ── 30. RLS – notifications ───────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_notifications" ON notifications FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "admin_insert_notifications" ON notifications FOR INSERT
  WITH CHECK (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "mark_own_read" ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ── 31. RLS – leaves ─────────────────────────────────────────
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_leaves" ON leaves FOR SELECT
  USING (
    user_id = auth.uid()
    OR institution_id IN (
      SELECT institution_id FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('owner','super_admin','principal','vice_principal',
                     'academic_coordinator','hod','hr')
    )
  );

CREATE POLICY "insert_own_leave" ON leaves FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_update_leave" ON leaves FOR UPDATE
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles
      WHERE id = auth.uid()
        AND role IN ('owner','super_admin','principal','vice_principal',
                     'academic_coordinator','hod','hr')
    )
  );

-- ── 32. RLS – fee_payments ────────────────────────────────────
DROP POLICY IF EXISTS "fee_payments_institution" ON fee_payments;
CREATE POLICY "fee_payments_institution" ON fee_payments FOR ALL
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

-- ── 33. RLS – attendance ─────────────────────────────────────
DROP POLICY IF EXISTS "attendance_institution" ON attendance;
CREATE POLICY "attendance_institution" ON attendance FOR ALL
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

-- ── 34. INDEX: full text search on students ──────────────────
DROP INDEX IF EXISTS idx_students_name_search;
CREATE INDEX idx_students_name_search ON user_profiles
  USING gin(to_tsvector('english',
    first_name || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(phone, '') || ' ' || COALESCE(email, '')
  ))
  WHERE role = 'student';

-- ── 35. FUNCTION: resolve logged-in user's institution ───────
CREATE OR REPLACE FUNCTION resolve_user_institution(p_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT institution_id FROM user_profiles WHERE id = p_user_id LIMIT 1;
$$;
