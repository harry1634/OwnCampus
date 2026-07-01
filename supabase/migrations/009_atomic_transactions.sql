
-- ============================================================
-- OWNCAMPUS – Migration 009: Atomic Transactions & Enterprise Hardening
-- ============================================================
-- All workflows touching multiple tables now execute atomically.
-- Rollback on any failure — never partial data.
-- ============================================================

-- ── 1. Soft-delete columns on tables that are missing them ───
-- (students, faculty already have deleted_at from migration 007)

ALTER TABLE fee_payments      ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;
ALTER TABLE fee_payments      ADD COLUMN IF NOT EXISTS deleted_by   UUID REFERENCES auth.users(id);
ALTER TABLE book_issues       ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;
ALTER TABLE leaves            ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;
ALTER TABLE leaves            ADD COLUMN IF NOT EXISTS deleted_by   UUID REFERENCES auth.users(id);
ALTER TABLE hostel_allocations ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;
ALTER TABLE hostel_allocations ADD COLUMN IF NOT EXISTS deleted_by  UUID REFERENCES auth.users(id);
ALTER TABLE transport_assignments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE transport_assignments ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);
ALTER TABLE exams              ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;
ALTER TABLE exams              ADD COLUMN IF NOT EXISTS deleted_by   UUID REFERENCES auth.users(id);
ALTER TABLE announcements     ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;
ALTER TABLE announcements     ADD COLUMN IF NOT EXISTS deleted_by   UUID REFERENCES auth.users(id);
ALTER TABLE timetable_slots   ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;
ALTER TABLE timetable_slots   ADD COLUMN IF NOT EXISTS deleted_by   UUID REFERENCES auth.users(id);

-- ── 2. Documents table ───────────────────────────────────────
-- Universal document management for all modules.

CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  entity_type     TEXT NOT NULL,         -- 'student','faculty','admission','transport'…
  entity_id       UUID NOT NULL,
  category        TEXT NOT NULL DEFAULT 'general',
  document_type   TEXT NOT NULL DEFAULT 'other',
  name            TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  file_size       BIGINT,
  mime_type       TEXT,
  expiry_date     DATE,
  is_public       BOOLEAN DEFAULT false,
  version         INTEGER DEFAULT 1,
  metadata        JSONB DEFAULT '{}',
  uploaded_by     UUID REFERENCES auth.users(id),
  deleted_at      TIMESTAMPTZ,
  deleted_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_downloads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id    UUID NOT NULL REFERENCES documents(id),
  institution_id UUID,
  downloaded_by  UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_id, entity_type, institution_id);
CREATE INDEX IF NOT EXISTS idx_documents_inst   ON documents(institution_id, category);

-- ── 3. Activity / Entity Timeline table ──────────────────────
-- Denormalized timeline per entity for O(1) lookups without
-- scanning audit_logs (which can grow very large).

CREATE TABLE IF NOT EXISTS entity_timeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL,
  entity_type     TEXT NOT NULL,    -- 'student','faculty','fee_payment','leave'…
  entity_id       UUID NOT NULL,
  action          TEXT NOT NULL,    -- 'created','updated','fee_paid','approved'…
  description     TEXT,
  actor_id        UUID REFERENCES auth.users(id),
  actor_name      TEXT,
  actor_role      TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_timeline_entity
  ON entity_timeline(entity_id, entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entity_timeline_inst
  ON entity_timeline(institution_id, created_at DESC);

-- ── 4. Background Job Queue ───────────────────────────────────
-- Long-running tasks (email, PDF, report) queued here.
-- A worker polls and processes them asynchronously.

CREATE TABLE IF NOT EXISTS job_queue (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID,
  job_type       TEXT NOT NULL,       -- 'send_email','generate_pdf','export_csv','refresh_analytics'
  payload        JSONB NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'pending',  -- pending, running, done, failed
  attempts       INTEGER DEFAULT 0,
  max_attempts   INTEGER DEFAULT 3,
  scheduled_at   TIMESTAMPTZ DEFAULT NOW(),
  started_at     TIMESTAMPTZ,
  finished_at    TIMESTAMPTZ,
  error          TEXT,
  result         JSONB,
  created_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_job_queue_inst   ON job_queue(institution_id, created_at DESC);

-- ── 5. Approval Workflows table ───────────────────────────────
-- Configurable multi-step approval chains.

CREATE TABLE IF NOT EXISTS approval_workflows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  name            TEXT NOT NULL,
  entity_type     TEXT NOT NULL,   -- 'leave','fee_refund','procurement','hostel'…
  steps           JSONB NOT NULL DEFAULT '[]',
  -- [{ step: 1, role: 'hod', action: 'approve|reject', escalate_after_hours: 24 }]
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL,
  workflow_id     UUID REFERENCES approval_workflows(id),
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  current_step    INTEGER DEFAULT 1,
  total_steps     INTEGER DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, rejected, cancelled
  submitted_by    UUID REFERENCES auth.users(id),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES approval_requests(id),
  step            INTEGER NOT NULL,
  action          TEXT NOT NULL,    -- 'approved','rejected','escalated','delegated'
  actor_id        UUID REFERENCES auth.users(id),
  comments        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(institution_id, status);

-- ── 6. System Health / Monitoring table ──────────────────────

CREATE TABLE IF NOT EXISTS system_health_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID,
  check_type   TEXT NOT NULL,   -- 'api','db','realtime','storage','auth','queue'
  status       TEXT NOT NULL,   -- 'ok','degraded','down'
  latency_ms   INTEGER,
  message      TEXT,
  metadata     JSONB DEFAULT '{}',
  checked_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_log_time ON system_health_log(check_type, checked_at DESC);

-- ── 7. Atomic Fee Payment RPC ─────────────────────────────────
-- Executes: insert payment → update student → insert ledger → queue notification
-- Rolls back entirely on failure.

CREATE OR REPLACE FUNCTION rpc_record_fee_payment(
  p_institution_id UUID,
  p_student_id     UUID,
  p_actor_id       UUID,
  p_amount         NUMERIC,
  p_payment_mode   TEXT DEFAULT 'cash',
  p_fee_type       TEXT DEFAULT 'tuition',
  p_academic_year  TEXT DEFAULT NULL,
  p_notes          TEXT DEFAULT NULL,
  p_receipt_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student        RECORD;
  v_payment        RECORD;
  v_new_paid       NUMERIC;
  v_new_status     TEXT;
  v_receipt        TEXT;
  v_academic_year  TEXT;
BEGIN
  -- Lock student row to prevent concurrent race
  SELECT id, user_id, total_fee, paid_amount, fee_status, admission_number
  INTO v_student
  FROM students
  WHERE id = p_student_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  -- Generate receipt number
  v_receipt := COALESCE(
    p_receipt_number,
    'REC-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('fee_receipt_seq')::TEXT, 5, '0')
  );

  v_academic_year := COALESCE(p_academic_year, EXTRACT(YEAR FROM NOW())::TEXT);

  -- 1. Insert payment record
  INSERT INTO fee_payments (
    institution_id, student_id, amount, payment_mode,
    receipt_number, notes, status, payment_date, recorded_by
  ) VALUES (
    p_institution_id, p_student_id, p_amount, p_payment_mode,
    v_receipt, p_notes, 'paid',
    CURRENT_DATE, p_actor_id
  )
  RETURNING * INTO v_payment;

  -- 2. Update student cumulative amounts (locked row above)
  v_new_paid := COALESCE(v_student.paid_amount, 0) + p_amount;
  v_new_status := CASE
    WHEN v_new_paid <= 0                         THEN 'pending'
    WHEN v_new_paid >= COALESCE(v_student.total_fee, 0) THEN 'paid'
    ELSE 'partial'
  END;

  UPDATE students
  SET paid_amount = v_new_paid,
      fee_status  = v_new_status
  WHERE id = p_student_id;

  -- 3. Insert ledger entry (double-entry: credit student account)
  INSERT INTO ledger_entries (
    institution_id, student_id, account_type, transaction_type,
    credit, narration, reference_id, reference_type, created_by
  ) VALUES (
    p_institution_id, p_student_id, 'receivable', 'fee_payment',
    p_amount,
    'Fee payment — ' || COALESCE(p_fee_type, 'tuition') || ' (' || v_receipt || ')',
    v_payment.id, 'fee_payment', p_actor_id
  );

  -- 4. Queue notification (non-blocking; best-effort)
  INSERT INTO job_queue (institution_id, job_type, payload, created_by)
  VALUES (
    p_institution_id,
    'send_notification',
    jsonb_build_object(
      'user_id',    v_student.user_id,
      'template',   'fee_paid',
      'amount',     p_amount,
      'receipt',    v_receipt
    ),
    p_actor_id
  );

  -- 5. Write entity timeline
  INSERT INTO entity_timeline (institution_id, entity_type, entity_id, action, description, actor_id, metadata)
  VALUES (
    p_institution_id, 'student', p_student_id, 'fee_paid',
    'Fee payment of ₹' || p_amount::TEXT || ' recorded. Receipt: ' || v_receipt,
    p_actor_id,
    jsonb_build_object('payment_id', v_payment.id, 'receipt', v_receipt, 'amount', p_amount)
  );

  -- 6. Audit log
  INSERT INTO audit_logs (institution_id, actor_id, action, entity_type, entity_id, new_value)
  VALUES (
    p_institution_id, p_actor_id, 'fee.payment', 'fee_payment', v_payment.id,
    jsonb_build_object('amount', p_amount, 'receipt', v_receipt, 'mode', p_payment_mode)
  );

  RETURN jsonb_build_object(
    'success',         true,
    'payment_id',      v_payment.id,
    'receipt_number',  v_receipt,
    'new_paid_amount', v_new_paid,
    'new_fee_status',  v_new_status
  );

EXCEPTION WHEN OTHERS THEN
  RAISE; -- propagate: triggers full rollback in caller
END;
$$;

-- ── 8. Atomic Leave Approval RPC ──────────────────────────────

CREATE OR REPLACE FUNCTION rpc_approve_leave(
  p_leave_id       UUID,
  p_actor_id       UUID,
  p_institution_id UUID,
  p_action         TEXT,   -- 'approved' or 'rejected'
  p_comments       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_leave  RECORD;
  v_role   TEXT;
BEGIN
  -- Validate actor role
  SELECT role INTO v_role FROM user_profiles WHERE id = p_actor_id;
  IF v_role NOT IN ('owner','super_admin','principal','vice_principal','academic_coordinator','hod','hr') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Lock leave row
  SELECT id, user_id, start_date, end_date, status, institution_id
  INTO v_leave
  FROM leaves
  WHERE id = p_leave_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found';
  END IF;

  IF v_leave.status NOT IN ('pending') THEN
    RAISE EXCEPTION 'Leave request is not in pending status';
  END IF;

  -- 1. Update leave status
  UPDATE leaves
  SET status      = p_action,
      approved_by = p_actor_id,
      approved_at = NOW()
  WHERE id = p_leave_id;

  -- 2. Insert timeline event
  INSERT INTO entity_timeline (institution_id, entity_type, entity_id, action, description, actor_id)
  VALUES (
    p_institution_id, 'leave', p_leave_id,
    CASE p_action WHEN 'approved' THEN 'leave_approved' ELSE 'leave_rejected' END,
    'Leave request ' || p_action || CASE WHEN p_comments IS NOT NULL THEN ': ' || p_comments ELSE '' END,
    p_actor_id
  );

  -- 3. Queue notification to leave owner
  INSERT INTO job_queue (institution_id, job_type, payload, created_by)
  VALUES (
    p_institution_id,
    'send_notification',
    jsonb_build_object(
      'user_id',   v_leave.user_id,
      'template',  CASE p_action WHEN 'approved' THEN 'leave_approved' ELSE 'leave_rejected' END,
      'from_date', v_leave.start_date,
      'to_date',   v_leave.end_date
    ),
    p_actor_id
  );

  -- 4. Audit log
  INSERT INTO audit_logs (institution_id, actor_id, action, entity_type, entity_id, new_value)
  VALUES (
    p_institution_id, p_actor_id,
    CASE p_action WHEN 'approved' THEN 'leave.approve' ELSE 'leave.reject' END,
    'leave', p_leave_id,
    jsonb_build_object('status', p_action, 'comments', p_comments)
  );

  RETURN jsonb_build_object('success', true, 'status', p_action);

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ── 9. Atomic Hostel Allocation RPC ──────────────────────────

CREATE OR REPLACE FUNCTION rpc_allocate_hostel_room(
  p_institution_id UUID,
  p_student_id     UUID,
  p_room_id        UUID,
  p_bed_number     INTEGER DEFAULT 1,
  p_actor_id       UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room       RECORD;
  v_allocation RECORD;
  v_student    RECORD;
BEGIN
  -- Lock room row
  SELECT id, room_number, capacity, occupied, building_id
  INTO v_room
  FROM hostel_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  IF COALESCE(v_room.occupied, 0) >= COALESCE(v_room.capacity, 1) THEN
    RAISE EXCEPTION 'Room is at full capacity';
  END IF;

  -- Check student not already allocated
  IF EXISTS (
    SELECT 1 FROM hostel_allocations
    WHERE student_id = p_student_id AND status = 'active'
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Student already has an active hostel allocation';
  END IF;

  -- 1. Create allocation
  INSERT INTO hostel_allocations (institution_id, room_id, student_id, bed_number, check_in_date, status)
  VALUES (p_institution_id, p_room_id, p_student_id, p_bed_number, CURRENT_DATE, 'active')
  RETURNING * INTO v_allocation;

  -- 2. Increment room occupied count
  UPDATE hostel_rooms SET occupied = COALESCE(occupied, 0) + 1 WHERE id = p_room_id;

  -- 3. Get student user_id for notification
  SELECT user_id INTO v_student FROM students WHERE id = p_student_id;

  -- 4. Queue notification
  IF v_student.user_id IS NOT NULL THEN
    INSERT INTO job_queue (institution_id, job_type, payload, created_by)
    VALUES (
      p_institution_id,
      'send_notification',
      jsonb_build_object(
        'user_id',     v_student.user_id,
        'template',    'hostel_assigned',
        'room_id',     p_room_id,
        'room_number', v_room.room_number,
        'bed',         p_bed_number
      ),
      p_actor_id
    );
  END IF;

  -- 5. Timeline
  INSERT INTO entity_timeline (institution_id, entity_type, entity_id, action, description, actor_id)
  VALUES (
    p_institution_id, 'student', p_student_id, 'hostel_assigned',
    'Assigned to Hostel Room ' || v_room.room_number || ', Bed #' || p_bed_number,
    p_actor_id
  );

  -- 6. Audit log
  INSERT INTO audit_logs (institution_id, actor_id, action, entity_type, entity_id, new_value)
  VALUES (
    p_institution_id, p_actor_id, 'hostel.assign', 'hostel_allocation', v_allocation.id,
    jsonb_build_object('room_id', p_room_id, 'student_id', p_student_id, 'bed', p_bed_number)
  );

  RETURN jsonb_build_object('success', true, 'allocation_id', v_allocation.id);

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ── 10. Atomic Book Issue RPC ─────────────────────────────────

CREATE OR REPLACE FUNCTION rpc_issue_book(
  p_institution_id UUID,
  p_book_id        UUID,
  p_borrower_id    UUID,    -- user_id (not student_id)
  p_issued_by      UUID DEFAULT NULL,
  p_days           INTEGER DEFAULT 14
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book    RECORD;
  v_issue   RECORD;
  v_due     DATE;
BEGIN
  -- Lock book row to prevent race
  SELECT id, title, available_copies, total_copies
  INTO v_book
  FROM books
  WHERE id = p_book_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book not found';
  END IF;

  IF COALESCE(v_book.available_copies, 0) < 1 THEN
    RAISE EXCEPTION 'No available copies of "%"', v_book.title;
  END IF;

  v_due := CURRENT_DATE + p_days;

  -- 1. Create issue record
  INSERT INTO book_issues (institution_id, book_id, user_id, issued_date, due_date, status, issued_by)
  VALUES (p_institution_id, p_book_id, p_borrower_id, CURRENT_DATE, v_due, 'issued', p_issued_by)
  RETURNING * INTO v_issue;

  -- 2. Decrement available copies (atomic, same transaction)
  UPDATE books SET available_copies = available_copies - 1 WHERE id = p_book_id;

  -- 3. Queue notification
  INSERT INTO job_queue (institution_id, job_type, payload, created_by)
  VALUES (
    p_institution_id,
    'send_notification',
    jsonb_build_object(
      'user_id',   p_borrower_id,
      'template',  'book_issued',
      'title',     v_book.title,
      'due_date',  v_due
    ),
    p_issued_by
  );

  -- 4. Timeline
  INSERT INTO entity_timeline (institution_id, entity_type, entity_id, action, description, actor_id)
  VALUES (
    p_institution_id, 'user', p_borrower_id, 'book_issued',
    'Issued "' || v_book.title || '". Due: ' || v_due::TEXT,
    p_issued_by
  );

  -- 5. Audit
  INSERT INTO audit_logs (institution_id, actor_id, action, entity_type, entity_id, new_value)
  VALUES (
    p_institution_id, p_issued_by, 'library.issue', 'book_issue', v_issue.id,
    jsonb_build_object('book_id', p_book_id, 'borrower_id', p_borrower_id, 'due_date', v_due)
  );

  RETURN jsonb_build_object('success', true, 'issue_id', v_issue.id, 'due_date', v_due);

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ── 11. Atomic Book Return RPC ────────────────────────────────

CREATE OR REPLACE FUNCTION rpc_return_book(
  p_issue_id   UUID,
  p_actor_id   UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_issue RECORD;
  v_fine  NUMERIC;
  v_days  INTEGER;
BEGIN
  -- Lock issue row
  SELECT id, book_id, user_id, due_date, status, institution_id
  INTO v_issue
  FROM book_issues
  WHERE id = p_issue_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Issue record not found';
  END IF;

  IF v_issue.status = 'returned' THEN
    RAISE EXCEPTION 'Book already returned';
  END IF;

  -- Calculate fine (₹5 per overdue day, capped at ₹500)
  v_days := GREATEST(CURRENT_DATE - v_issue.due_date, 0);
  v_fine := LEAST(v_days * 5, 500);

  -- 1. Mark as returned
  UPDATE book_issues
  SET returned_date = CURRENT_DATE,
      fine_amount   = v_fine,
      status        = 'returned'
  WHERE id = p_issue_id;

  -- 2. Increment available copies (atomic)
  UPDATE books SET available_copies = available_copies + 1 WHERE id = v_issue.book_id;

  -- 3. Timeline
  INSERT INTO entity_timeline (institution_id, entity_type, entity_id, action, description, actor_id)
  VALUES (
    v_issue.institution_id, 'user', v_issue.user_id, 'book_returned',
    'Returned book. Fine: ₹' || v_fine::TEXT,
    p_actor_id
  );

  -- 4. Audit
  INSERT INTO audit_logs (institution_id, actor_id, action, entity_type, entity_id, new_value)
  VALUES (
    v_issue.institution_id, p_actor_id, 'library.return', 'book_issue', p_issue_id,
    jsonb_build_object('returned_date', CURRENT_DATE, 'fine', v_fine)
  );

  RETURN jsonb_build_object('success', true, 'fine', v_fine, 'overdue_days', v_days);

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ── 12. Restore soft-deleted entity RPC ──────────────────────

CREATE OR REPLACE FUNCTION rpc_restore_entity(
  p_table_name    TEXT,
  p_entity_id     UUID,
  p_institution_id UUID,
  p_actor_id      UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allowed TEXT[] := ARRAY['students','faculty','leaves','hostel_allocations',
                             'transport_assignments','exams','announcements',
                             'book_issues','documents','timetable'];
BEGIN
  IF NOT (p_table_name = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Table % is not restorable', p_table_name;
  END IF;

  -- Dynamic SQL: restore deleted_at to NULL
  EXECUTE format(
    'UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND institution_id = $2 AND deleted_at IS NOT NULL',
    p_table_name
  ) USING p_entity_id, p_institution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entity not found or not deleted';
  END IF;

  -- Audit restore
  INSERT INTO audit_logs (institution_id, actor_id, action, entity_type, entity_id, new_value)
  VALUES (
    p_institution_id, p_actor_id, 'restore', p_table_name, p_entity_id,
    jsonb_build_object('restored_at', NOW())
  );

  RETURN jsonb_build_object('success', true, 'restored', p_entity_id);
END;
$$;

-- ── 13. Entity Timeline Insertion Helper ──────────────────────

CREATE OR REPLACE FUNCTION fn_write_timeline(
  p_institution_id UUID,
  p_entity_type    TEXT,
  p_entity_id      UUID,
  p_action         TEXT,
  p_description    TEXT,
  p_actor_id       UUID DEFAULT NULL,
  p_metadata       JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id      UUID;
  v_actor   TEXT;
  v_role    TEXT;
BEGIN
  IF p_actor_id IS NOT NULL THEN
    SELECT TRIM(CONCAT(first_name, ' ', last_name)), role
    INTO v_actor, v_role
    FROM user_profiles WHERE id = p_actor_id;
  END IF;

  INSERT INTO entity_timeline (
    institution_id, entity_type, entity_id, action,
    description, actor_id, actor_name, actor_role, metadata
  )
  VALUES (
    p_institution_id, p_entity_type, p_entity_id, p_action,
    p_description, p_actor_id,
    COALESCE(v_actor, 'System'), COALESCE(v_role, 'system'),
    p_metadata
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── 14. Auto-populate entity_timeline from audit_logs ─────────
-- Trigger so every audit log write also adds a timeline entry.

CREATE OR REPLACE FUNCTION fn_audit_to_timeline()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.entity_type IS NOT NULL AND NEW.entity_id IS NOT NULL THEN
    PERFORM fn_write_timeline(
      NEW.institution_id, NEW.entity_type, NEW.entity_id,
      NEW.action, NEW.action, NEW.actor_id,
      COALESCE(NEW.new_value, '{}'::JSONB)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Only install if not already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_to_timeline'
  ) THEN
    EXECUTE $t$
      CREATE TRIGGER trg_audit_to_timeline
        AFTER INSERT ON audit_logs
        FOR EACH ROW
        EXECUTE FUNCTION fn_audit_to_timeline()
    $t$;
  END IF;
END;
$$;

-- ── 15. Performance indexes (additional) ─────────────────────

CREATE INDEX IF NOT EXISTS idx_students_inst_active
  ON students(institution_id, status) WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_faculty_inst_active
  ON faculty(institution_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_fee_payments_inst_date
  ON fee_payments(institution_id, payment_date DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entity_timeline_student
  ON entity_timeline(entity_id) WHERE entity_type = 'student';

CREATE INDEX IF NOT EXISTS idx_job_queue_type_status
  ON job_queue(job_type, status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_documents_entity_type
  ON documents(entity_id, institution_id) WHERE deleted_at IS NULL;

-- ── 16. RLS for new tables ─────────────────────────────────────

ALTER TABLE documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_timeline     ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue           ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows  ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_actions    ENABLE ROW LEVEL SECURITY;

-- documents: institution scoped
DROP POLICY IF EXISTS "documents_institution" ON documents;
CREATE POLICY "documents_institution" ON documents FOR ALL
  USING (institution_id IN (
    SELECT institution_id FROM user_profiles WHERE id = auth.uid()
  ));

-- entity_timeline: institution scoped
DROP POLICY IF EXISTS "timeline_institution" ON entity_timeline;
CREATE POLICY "timeline_institution" ON entity_timeline FOR SELECT
  USING (institution_id IN (
    SELECT institution_id FROM user_profiles WHERE id = auth.uid()
  ));

-- job_queue: admins only
DROP POLICY IF EXISTS "jobs_admin" ON job_queue;
CREATE POLICY "jobs_admin" ON job_queue FOR SELECT
  USING (institution_id IN (
    SELECT institution_id FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('owner','super_admin','principal')
  ));

-- approval workflows: institution scoped
DROP POLICY IF EXISTS "approvals_institution" ON approval_workflows;
CREATE POLICY "approvals_institution" ON approval_workflows FOR ALL
  USING (institution_id IN (
    SELECT institution_id FROM user_profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "approval_requests_institution" ON approval_requests;
CREATE POLICY "approval_requests_institution" ON approval_requests FOR ALL
  USING (institution_id IN (
    SELECT institution_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ── 17. Publish new tables to Supabase Realtime ──────────────

ALTER PUBLICATION supabase_realtime ADD TABLE entity_timeline;
ALTER PUBLICATION supabase_realtime ADD TABLE job_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE approval_requests;
