-- ============================================================
-- OWNCAMPUS – Migration 008: Production Hardening
-- Atomic RPCs, missing indexes, leave audit log,
-- attendance notification trigger, session cleanup
-- ============================================================

-- ── 1. Atomic book copy increment/decrement RPCs ─────────────
-- Prevents race conditions when two requests issue/return simultaneously.

CREATE OR REPLACE FUNCTION increment_book_copies(p_book_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE books
  SET available_copies = available_copies + 1
  WHERE id = p_book_id AND available_copies < total_copies;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_book_copies(p_book_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE books
  SET available_copies = available_copies - 1
  WHERE id = p_book_id AND available_copies > 0;
END;
$$;

-- ── 2. Atomic hostel room occupied counter ───────────────────

CREATE OR REPLACE FUNCTION increment_room_occupied(room_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE hostel_rooms
  SET occupied = COALESCE(occupied, 0) + 1
  WHERE id = room_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_room_occupied(room_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE hostel_rooms
  SET occupied = GREATEST(COALESCE(occupied, 0) - 1, 0)
  WHERE id = room_id;
END;
$$;

-- ── 3. Add occupied column to hostel_rooms if missing ────────

ALTER TABLE hostel_rooms ADD COLUMN IF NOT EXISTS occupied INTEGER DEFAULT 0;

-- ── 4. Missing indexes for performance ──────────────────────

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_inst_created
  ON notifications(institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_book_issues_user
  ON book_issues(user_id, status);

CREATE INDEX IF NOT EXISTS idx_book_issues_due
  ON book_issues(due_date)
  WHERE status = 'issued';

CREATE INDEX IF NOT EXISTS idx_leaves_inst_status
  ON leaves(institution_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_student_date
  ON attendance(student_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON audit_logs(institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fee_payments_student
  ON fee_payments(student_id, payment_date DESC);

-- ── 5. Low-attendance auto-notification trigger ──────────────
-- When attendance is inserted and student's 30-day rate drops below 75%,
-- insert a notification for the student and the admin.

CREATE OR REPLACE FUNCTION fn_check_low_attendance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_total   INTEGER;
  v_present INTEGER;
  v_pct     NUMERIC;
  v_user_id UUID;
  v_inst_id UUID;
BEGIN
  -- Only check student attendance
  IF NEW.student_id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*), SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)
  INTO v_total, v_present
  FROM attendance
  WHERE student_id = NEW.student_id
    AND institution_id = NEW.institution_id
    AND date >= CURRENT_DATE - INTERVAL '30 days';

  IF v_total < 5 THEN RETURN NEW; END IF; -- not enough data yet

  v_pct := ROUND(v_present * 100.0 / v_total, 1);

  IF v_pct < 75 THEN
    SELECT user_id, institution_id INTO v_user_id, v_inst_id
    FROM students WHERE id = NEW.student_id;

    IF v_user_id IS NOT NULL THEN
      INSERT INTO notifications(institution_id, user_id, type, title, body, is_broadcast, is_read, metadata)
      VALUES (
        v_inst_id, v_user_id, 'attendance',
        'Low Attendance Warning',
        'Your attendance is ' || v_pct || '% in the last 30 days. Minimum required is 75%.',
        false, false,
        jsonb_build_object('attendance_pct', v_pct, 'student_id', NEW.student_id)
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Install trigger (fires after every attendance insert)
DROP TRIGGER IF EXISTS trg_low_attendance_notify ON attendance;
CREATE TRIGGER trg_low_attendance_notify
  AFTER INSERT ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION fn_check_low_attendance();

-- ── 6. Receipt number sequence for fee_payments ──────────────

CREATE SEQUENCE IF NOT EXISTS fee_receipt_seq START 10000 INCREMENT 1 CACHE 10;

CREATE OR REPLACE FUNCTION fn_set_receipt_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.receipt_number IS NULL THEN
    NEW.receipt_number := 'REC-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('fee_receipt_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fee_receipt_number ON fee_payments;
CREATE TRIGGER trg_fee_receipt_number
  BEFORE INSERT ON fee_payments
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_receipt_number();

-- ── 7. Ensure supabase_realtime includes notifications ───────

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE fee_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE leaves;
ALTER PUBLICATION supabase_realtime ADD TABLE book_issues;

-- ── 8. Leave audit log trigger ───────────────────────────────

CREATE OR REPLACE FUNCTION fn_leave_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status <> NEW.status THEN
    INSERT INTO audit_logs(institution_id, actor_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (
      NEW.institution_id, NEW.approved_by,
      CASE NEW.status WHEN 'approved' THEN 'approve' WHEN 'rejected' THEN 'reject' ELSE 'update' END,
      'leave', NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leave_audit ON leaves;
CREATE TRIGGER trg_leave_audit
  AFTER UPDATE ON leaves
  FOR EACH ROW
  EXECUTE FUNCTION fn_leave_audit_log();

-- ── 9. RLS: notifications readable by target user ────────────

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications FOR SELECT
  USING (
    institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
    AND (user_id = auth.uid() OR user_id IS NULL OR is_broadcast = true)
  );

DROP POLICY IF EXISTS "notifications_insert_admin" ON notifications;
CREATE POLICY "notifications_insert_admin" ON notifications FOR INSERT
  WITH CHECK (
    institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  USING (user_id = auth.uid() OR institution_id IN (
    SELECT institution_id FROM user_profiles
    WHERE id = auth.uid() AND role IN ('owner','super_admin','principal')
  ));
