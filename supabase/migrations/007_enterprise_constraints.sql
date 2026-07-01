-- ============================================================
-- OWNCAMPUS – Migration 007: Enterprise Constraints
-- DB constraints, soft delete, rooms, event bus,
-- accounting ledger, calendar, audit log, workflow engine
-- ============================================================

-- ── 0. PRE-FLIGHT: create tables from migration 006 if not yet run ───
-- Safe to re-run; all statements use IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS transport_assignments (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id     UUID        NOT NULL REFERENCES students(id)     ON DELETE CASCADE,
  route_id       UUID        NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  stop_name      VARCHAR(255),
  pickup_point   VARCHAR(255),
  monthly_fee    DECIMAL(10,2),
  status         VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transport_assignments_route ON transport_assignments(route_id);
CREATE INDEX IF NOT EXISTS idx_transport_assignments_inst  ON transport_assignments(institution_id);

ALTER TABLE transport_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transport_institution" ON transport_assignments;
CREATE POLICY "transport_institution" ON transport_assignments FOR ALL
  USING (
    institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
    OR student_id IN (
      SELECT s.id FROM students s
      JOIN user_profiles up ON s.user_id = up.id WHERE up.id = auth.uid()
    )
  );

-- books, book_issues, vehicles, transport_routes indexes (006 safe re-run)
CREATE INDEX IF NOT EXISTS idx_books_title_author ON books
  USING gin(to_tsvector('english', title || ' ' || COALESCE(author,'') || ' ' || COALESCE(isbn,'')));
CREATE INDEX IF NOT EXISTS idx_vehicles_inst ON vehicles(institution_id);

ALTER TABLE vehicles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE books            ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_issues      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles_institution"    ON vehicles;
DROP POLICY IF EXISTS "routes_institution"      ON transport_routes;
DROP POLICY IF EXISTS "books_institution"       ON books;
DROP POLICY IF EXISTS "book_issues_institution" ON book_issues;

CREATE POLICY "vehicles_institution" ON vehicles FOR ALL
  USING (institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "routes_institution" ON transport_routes FOR ALL
  USING (institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "books_institution" ON books FOR ALL
  USING (institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "book_issues_institution" ON book_issues FOR ALL
  USING (
    institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

-- ── 0b. SEQUENCE for admission numbers ───────────────────────
CREATE SEQUENCE IF NOT EXISTS student_admission_seq START 1000 INCREMENT 1 CACHE 20;

-- ── 1. SOFT DELETE COLUMNS ────────────────────────────────────
-- All deletions must set deleted_at instead of hard-deleting rows.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by   UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS admission_number VARCHAR(50);

ALTER TABLE faculty
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by   UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS employee_id  VARCHAR(50);

ALTER TABLE books
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by   UUID REFERENCES user_profiles(id);

ALTER TABLE hostel_allocations
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by   UUID REFERENCES user_profiles(id);

ALTER TABLE hostel_rooms
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS capacity     INTEGER DEFAULT 40;

ALTER TABLE transport_routes
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;

ALTER TABLE transport_assignments
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by   UUID REFERENCES user_profiles(id);

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by   UUID REFERENCES user_profiles(id);

ALTER TABLE leaves
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;

ALTER TABLE fee_payments
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by   UUID REFERENCES user_profiles(id);

-- Active indexes that filter out soft-deleted rows
CREATE INDEX IF NOT EXISTS idx_students_active ON students(institution_id)
  WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_faculty_active ON faculty(institution_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_books_active ON books(institution_id)
  WHERE deleted_at IS NULL AND is_active = true;

-- ── 2. DB CONSTRAINTS ─────────────────────────────────────────

-- 2a. Hostel: exactly one active allocation per student
CREATE UNIQUE INDEX IF NOT EXISTS uix_student_active_hostel
  ON hostel_allocations(student_id)
  WHERE status = 'active' AND deleted_at IS NULL;

-- 2b. Hostel: room capacity enforcement (trigger)
CREATE OR REPLACE FUNCTION fn_check_hostel_capacity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_capacity INTEGER;
  v_occupied INTEGER;
BEGIN
  SELECT COALESCE(capacity, 1) INTO v_capacity
  FROM hostel_rooms WHERE id = NEW.room_id;

  SELECT COUNT(*) INTO v_occupied
  FROM hostel_allocations
  WHERE room_id = NEW.room_id
    AND status = 'active'
    AND deleted_at IS NULL
    AND (TG_OP = 'INSERT' OR id != NEW.id);

  IF v_occupied >= v_capacity THEN
    RAISE EXCEPTION 'Hostel room is at full capacity (% / %)', v_occupied, v_capacity;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_hostel_capacity ON hostel_allocations;
CREATE TRIGGER trg_hostel_capacity
  BEFORE INSERT OR UPDATE ON hostel_allocations
  FOR EACH ROW WHEN (NEW.status = 'active' AND NEW.deleted_at IS NULL)
  EXECUTE FUNCTION fn_check_hostel_capacity();

-- 2c. Transport: seats cannot exceed vehicle capacity
CREATE OR REPLACE FUNCTION fn_check_transport_capacity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_capacity INTEGER;
  v_assigned INTEGER;
BEGIN
  SELECT COALESCE(v.capacity, 9999) INTO v_capacity
  FROM vehicles v
  JOIN transport_routes tr ON tr.vehicle_id = v.id
  WHERE tr.id = NEW.route_id;

  SELECT COUNT(*) INTO v_assigned
  FROM transport_assignments
  WHERE route_id = NEW.route_id
    AND status = 'active'
    AND deleted_at IS NULL
    AND (TG_OP = 'INSERT' OR id != NEW.id);

  IF v_capacity IS NOT NULL AND v_assigned >= v_capacity THEN
    RAISE EXCEPTION 'Vehicle is at full capacity (% / %)', v_assigned, v_capacity;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_transport_capacity ON transport_assignments;
CREATE TRIGGER trg_transport_capacity
  BEFORE INSERT OR UPDATE ON transport_assignments
  FOR EACH ROW WHEN (NEW.status = 'active' AND NEW.deleted_at IS NULL)
  EXECUTE FUNCTION fn_check_transport_capacity();

-- 2d. Library: cannot issue if no copies available
-- (additional guard; API already checks, but DB enforces too)
CREATE OR REPLACE FUNCTION fn_check_library_availability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_avail INTEGER;
BEGIN
  SELECT COALESCE(available_copies, 0) INTO v_avail
  FROM books WHERE id = NEW.book_id;

  IF v_avail <= 0 THEN
    RAISE EXCEPTION 'No copies of this book are currently available';
  END IF;
  RETURN NEW;
END;
$$;
-- Replace the migration 006 trigger with this stricter one
DROP TRIGGER IF EXISTS trg_library_availability ON book_issues;
CREATE TRIGGER trg_library_availability
  BEFORE INSERT ON book_issues
  FOR EACH ROW WHEN (NEW.status = 'issued')
  EXECUTE FUNCTION fn_check_library_availability();

-- 2e. available_copies cannot go negative
ALTER TABLE books
  DROP CONSTRAINT IF EXISTS chk_available_copies,
  ADD  CONSTRAINT chk_available_copies CHECK (available_copies >= 0) NOT VALID;

-- 2f. Timetable: faculty on approved leave cannot teach that day (trigger)
CREATE OR REPLACE FUNCTION fn_check_faculty_leave_conflict()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_on_leave BOOLEAN;
BEGIN
  IF NEW.faculty_id IS NULL THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM leaves
    WHERE user_id = (SELECT user_id FROM faculty WHERE id = NEW.faculty_id LIMIT 1)
      AND status = 'approved'
      AND deleted_at IS NULL
      AND start_date <= NEW.date::DATE
      AND end_date   >= NEW.date::DATE
  ) INTO v_on_leave;

  IF v_on_leave THEN
    RAISE EXCEPTION 'Faculty member is on approved leave on %', NEW.date;
  END IF;
  RETURN NEW;
END;
$$;
-- Applied to attendance inserts (prevents marking faculty on leave as working)
DROP TRIGGER IF EXISTS trg_faculty_leave_check ON attendance;
CREATE TRIGGER trg_faculty_leave_check
  BEFORE INSERT ON attendance
  FOR EACH ROW WHEN (NEW.faculty_id IS NOT NULL)
  EXECUTE FUNCTION fn_check_faculty_leave_conflict();

-- ── 3. ROOMS SYSTEM ───────────────────────────────────────────
-- Reusable rooms: classrooms, labs, halls, exam rooms, etc.

CREATE TABLE IF NOT EXISTS rooms (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  branch_id      UUID        REFERENCES branches(id),
  name           VARCHAR(255) NOT NULL,
  code           VARCHAR(50),
  type           VARCHAR(50) NOT NULL DEFAULT 'classroom',
  -- classroom | lab | hall | exam_room | meeting_room | seminar | library | sports
  floor          INTEGER     DEFAULT 0,
  building       VARCHAR(255),
  capacity       INTEGER     NOT NULL DEFAULT 30,
  facilities     TEXT[],            -- ['projector','ac','smart_board']
  is_active      BOOLEAN     DEFAULT true,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (institution_id, code)
);
-- Defensive: add columns if table pre-existed from an earlier partial migration run
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS branch_id   UUID;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS code        VARCHAR(50);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor       INTEGER DEFAULT 0;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS building    VARCHAR(255);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS facilities  TEXT[];
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT true;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

-- Room bookings: conflict-free scheduling across all use cases
CREATE TABLE IF NOT EXISTS room_bookings (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  room_id        UUID        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  booking_type   VARCHAR(50) NOT NULL DEFAULT 'class',
  -- exam | class | meeting | event | ptm | seminar | lab | maintenance
  reference_id   UUID,      -- exam_id, timetable_slot_id, calendar_event_id, etc.
  title          VARCHAR(255) NOT NULL,
  start_time     TIMESTAMPTZ NOT NULL,
  end_time       TIMESTAMPTZ NOT NULL,
  booked_by      UUID        REFERENCES user_profiles(id),
  status         VARCHAR(20) DEFAULT 'confirmed',
  notes          TEXT,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_time > start_time)
);
-- Defensive: add columns if table pre-existed from an earlier partial migration run
ALTER TABLE room_bookings ADD COLUMN IF NOT EXISTS reference_id UUID;
ALTER TABLE room_bookings ADD COLUMN IF NOT EXISTS booked_by   UUID;
ALTER TABLE room_bookings ADD COLUMN IF NOT EXISTS status      VARCHAR(20) DEFAULT 'confirmed';
ALTER TABLE room_bookings ADD COLUMN IF NOT EXISTS notes       TEXT;
ALTER TABLE room_bookings ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_room_bookings_room ON room_bookings(room_id, start_time, end_time)
  WHERE status = 'confirmed' AND deleted_at IS NULL;

-- Room booking conflict prevention
CREATE OR REPLACE FUNCTION fn_check_room_booking_conflict()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM room_bookings
    WHERE room_id  = NEW.room_id
      AND status   = 'confirmed'
      AND deleted_at IS NULL
      AND (TG_OP = 'INSERT' OR id != NEW.id)
      AND start_time < NEW.end_time
      AND end_time   > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'Room is already booked during this time slot';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_room_booking_conflict ON room_bookings;
CREATE TRIGGER trg_room_booking_conflict
  BEFORE INSERT OR UPDATE ON room_bookings
  FOR EACH ROW WHEN (NEW.status = 'confirmed' AND NEW.deleted_at IS NULL)
  EXECUTE FUNCTION fn_check_room_booking_conflict();

ALTER TABLE rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_institution"         ON rooms;
DROP POLICY IF EXISTS "room_bookings_institution" ON room_bookings;

CREATE POLICY "rooms_institution" ON rooms FOR ALL
  USING (institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "room_bookings_institution" ON room_bookings FOR ALL
  USING (institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid()));

-- ── 4. DOMAIN EVENTS (Event Bus) ─────────────────────────────
-- Every important action emits an event. Events drive downstream tasks.

CREATE TABLE IF NOT EXISTS domain_events (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID         NOT NULL,
  event_type     VARCHAR(100) NOT NULL,
  -- fee.paid | attendance.low | exam.published | leave.approved | admission.approved
  -- hostel.assigned | transport.assigned | library.issued | library.overdue
  -- timetable.changed | announcement.created | student.deleted | faculty.deleted
  aggregate_type VARCHAR(50)  NOT NULL,  -- student | faculty | exam | leave | book…
  aggregate_id   UUID,
  payload        JSONB        NOT NULL DEFAULT '{}',
  actor_id       UUID,                   -- user who triggered the event
  processed      BOOLEAN      DEFAULT false,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);
-- Defensive: add columns if table pre-existed from an earlier partial migration run
ALTER TABLE domain_events ADD COLUMN IF NOT EXISTS aggregate_type VARCHAR(50);
ALTER TABLE domain_events ADD COLUMN IF NOT EXISTS aggregate_id   UUID;
ALTER TABLE domain_events ADD COLUMN IF NOT EXISTS payload        JSONB DEFAULT '{}';
ALTER TABLE domain_events ADD COLUMN IF NOT EXISTS actor_id       UUID;
ALTER TABLE domain_events ADD COLUMN IF NOT EXISTS processed      BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_domain_events_inst      ON domain_events(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_events_type      ON domain_events(event_type);
CREATE INDEX IF NOT EXISTS idx_domain_events_unprocessed ON domain_events(processed) WHERE processed = false;

-- ── 5. EVENT QUEUE (Background Jobs) ─────────────────────────
-- Async tasks: email, PDF, analytics refresh, notification broadcast

CREATE TABLE IF NOT EXISTS event_queue (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID,
  job_type       VARCHAR(50)  NOT NULL,
  -- email | pdf_generation | analytics_refresh | notification_broadcast
  -- ledger_sync | report_generation | excel_export | welcome_workflow
  payload        JSONB        NOT NULL DEFAULT '{}',
  status         VARCHAR(20)  DEFAULT 'pending',   -- pending | processing | done | failed
  attempts       INTEGER      DEFAULT 0,
  max_attempts   INTEGER      DEFAULT 3,
  scheduled_for  TIMESTAMPTZ  DEFAULT NOW(),
  processed_at   TIMESTAMPTZ,
  error          TEXT,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);
-- Defensive: ensure columns exist if table pre-existed
ALTER TABLE event_queue ADD COLUMN IF NOT EXISTS payload       JSONB DEFAULT '{}';
ALTER TABLE event_queue ADD COLUMN IF NOT EXISTS status        VARCHAR(20) DEFAULT 'pending';
ALTER TABLE event_queue ADD COLUMN IF NOT EXISTS attempts      INTEGER DEFAULT 0;
ALTER TABLE event_queue ADD COLUMN IF NOT EXISTS max_attempts  INTEGER DEFAULT 3;
ALTER TABLE event_queue ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE event_queue ADD COLUMN IF NOT EXISTS processed_at  TIMESTAMPTZ;
ALTER TABLE event_queue ADD COLUMN IF NOT EXISTS error         TEXT;

CREATE INDEX IF NOT EXISTS idx_event_queue_pending ON event_queue(scheduled_for)
  WHERE status = 'pending';

-- ── 6. EMIT_EVENT() FUNCTION ──────────────────────────────────
-- Central function all modules call to publish an event.
-- Automatically enqueues downstream jobs.

CREATE OR REPLACE FUNCTION emit_event(
  p_institution_id UUID,
  p_event_type     VARCHAR(100),
  p_aggregate_type VARCHAR(50),
  p_aggregate_id   UUID         DEFAULT NULL,
  p_payload        JSONB        DEFAULT '{}',
  p_actor_id       UUID         DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO domain_events(institution_id, event_type, aggregate_type, aggregate_id, payload, actor_id)
  VALUES (p_institution_id, p_event_type, p_aggregate_type, p_aggregate_id, p_payload, p_actor_id)
  RETURNING id INTO v_id;

  -- Enqueue downstream jobs based on event type
  CASE p_event_type

    WHEN 'fee.paid' THEN
      INSERT INTO event_queue(institution_id, job_type, payload) VALUES
        (p_institution_id, 'ledger_sync',         jsonb_build_object('event_id', v_id, 'aggregate_id', p_aggregate_id)),
        (p_institution_id, 'notification',         jsonb_build_object('event_id', v_id, 'type', 'fee.paid', 'user_id', p_payload->>'user_id')),
        (p_institution_id, 'analytics_refresh',    jsonb_build_object('scope', 'finance'));

    WHEN 'attendance.low' THEN
      INSERT INTO event_queue(institution_id, job_type, payload) VALUES
        (p_institution_id, 'notification',         jsonb_build_object('event_id', v_id, 'type', 'attendance.low')),
        (p_institution_id, 'analytics_refresh',    jsonb_build_object('scope', 'attendance'));

    WHEN 'exam.published' THEN
      INSERT INTO event_queue(institution_id, job_type, payload) VALUES
        (p_institution_id, 'notification_broadcast', jsonb_build_object('event_id', v_id, 'class_id', p_payload->>'class_id'));

    WHEN 'leave.approved', 'leave.rejected' THEN
      INSERT INTO event_queue(institution_id, job_type, payload) VALUES
        (p_institution_id, 'notification',         jsonb_build_object('event_id', v_id, 'user_id', p_payload->>'user_id', 'status', p_payload->>'status'));

    WHEN 'admission.approved' THEN
      INSERT INTO event_queue(institution_id, job_type, payload) VALUES
        (p_institution_id, 'email',                jsonb_build_object('event_id', v_id, 'template', 'welcome', 'user_id', p_payload->>'user_id')),
        (p_institution_id, 'welcome_workflow',     p_payload),
        (p_institution_id, 'analytics_refresh',    jsonb_build_object('scope', 'students'));

    WHEN 'library.overdue' THEN
      INSERT INTO event_queue(institution_id, job_type, payload) VALUES
        (p_institution_id, 'notification',         jsonb_build_object('event_id', v_id, 'user_id', p_payload->>'user_id', 'type', 'library.overdue'));

    WHEN 'transport.changed', 'hostel.changed', 'timetable.changed' THEN
      INSERT INTO event_queue(institution_id, job_type, payload) VALUES
        (p_institution_id, 'notification',         jsonb_build_object('event_id', v_id, 'type', p_event_type, 'user_id', p_payload->>'user_id'));

    ELSE NULL;
  END CASE;

  RETURN v_id;
END;
$$;

-- ── 7. ACCOUNTING LEDGER ──────────────────────────────────────
-- Every financial transaction creates a double-entry ledger record.

CREATE TABLE IF NOT EXISTS ledger_entries (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id   UUID         NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id       UUID         REFERENCES students(id),
  account_type     VARCHAR(50)  NOT NULL,
  -- receivable | revenue | expense | payable | cash | bank
  transaction_type VARCHAR(50)  NOT NULL,
  -- fee_payment | refund | salary | vendor_payment | hostel_fee | transport_fee | library_fine
  debit            NUMERIC(12,2) DEFAULT 0 CHECK (debit >= 0),
  credit           NUMERIC(12,2) DEFAULT 0 CHECK (credit >= 0),
  narration        TEXT,
  reference_type   VARCHAR(50),  -- fee_payment | expense | salary
  reference_id     UUID,         -- fee_payments.id, etc.
  transaction_date DATE         NOT NULL DEFAULT CURRENT_DATE,
  fiscal_year      VARCHAR(9)   NOT NULL DEFAULT
    TO_CHAR(CURRENT_DATE - INTERVAL '3 months', 'YYYY') || '-' ||
    TO_CHAR(CURRENT_DATE + INTERVAL '9 months', 'YY'),
  created_by       UUID         REFERENCES user_profiles(id),
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);
-- Defensive: add columns if table pre-existed from an earlier partial migration run
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS student_id       UUID;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS debit            NUMERIC(12,2) DEFAULT 0;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS credit           NUMERIC(12,2) DEFAULT 0;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS narration        TEXT;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS reference_type   VARCHAR(50);
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS reference_id     UUID;
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS fiscal_year      VARCHAR(9) DEFAULT
  TO_CHAR(CURRENT_DATE - INTERVAL '3 months', 'YYYY') || '-' ||
  TO_CHAR(CURRENT_DATE + INTERVAL '9 months', 'YY');
ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS created_by       UUID;

CREATE INDEX IF NOT EXISTS idx_ledger_inst_date ON ledger_entries(institution_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_student   ON ledger_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type      ON ledger_entries(transaction_type);
CREATE INDEX IF NOT EXISTS idx_ledger_fiscal    ON ledger_entries(institution_id, fiscal_year);

ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ledger_institution" ON ledger_entries;
CREATE POLICY "ledger_institution" ON ledger_entries FOR ALL
  USING (institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid()));

-- ── 8. CALENDAR EVENTS ────────────────────────────────────────
-- Single source of truth for all institutional scheduling.

CREATE TABLE IF NOT EXISTS calendar_events (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID         NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  branch_id      UUID         REFERENCES branches(id),
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  event_type     VARCHAR(50)  NOT NULL DEFAULT 'general',
  -- exam | holiday | ptm | event | assignment_due | fee_deadline | seminar
  -- hostel_event | transport_maintenance | timetable_change | leave | general
  color          VARCHAR(20)  DEFAULT '#2563EB',
  start_date     DATE         NOT NULL,
  end_date       DATE,
  start_time     TIME,
  end_time       TIME,
  all_day        BOOLEAN      DEFAULT true,
  target_roles   TEXT[]       DEFAULT ARRAY['all'],  -- all | student | faculty | parent | admin
  reference_type VARCHAR(50),   -- exam | leave | fee_payment | announcement
  reference_id   UUID,
  is_recurring   BOOLEAN      DEFAULT false,
  recurrence_rule TEXT,        -- iCal RRULE string
  room_id        UUID         REFERENCES rooms(id),
  created_by     UUID         REFERENCES user_profiles(id),
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);
-- Defensive: add columns if table pre-existed from an earlier partial migration run
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS branch_id      UUID;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS description    TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS color          VARCHAR(20) DEFAULT '#2563EB';
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS end_date       DATE;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS start_time     TIME;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS end_time       TIME;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS all_day        BOOLEAN DEFAULT true;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS target_roles   TEXT[] DEFAULT ARRAY['all'];
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reference_id   UUID;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS is_recurring   BOOLEAN DEFAULT false;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS room_id        UUID;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS created_by     UUID;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_calendar_inst_date ON calendar_events(institution_id, start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_type      ON calendar_events(event_type);

-- Unified calendar view: DB records + live exam/leave data
CREATE OR REPLACE VIEW v_institutional_calendar AS

-- Custom calendar events
SELECT
  id,
  institution_id,
  title,
  description,
  event_type,
  color,
  start_date,
  end_date,
  start_time,
  end_time,
  all_day,
  target_roles,
  reference_type,
  reference_id
FROM calendar_events
WHERE deleted_at IS NULL

UNION ALL

-- Exams (published)
SELECT
  id,
  institution_id,
  name                        AS title,
  NULL                        AS description,
  'exam'                      AS event_type,
  '#7C3AED'                   AS color,
  exam_date                   AS start_date,
  exam_date                   AS end_date,
  start_time::TIME            AS start_time,
  end_time::TIME              AS end_time,
  false                       AS all_day,
  ARRAY['student','faculty']  AS target_roles,
  'exam'                      AS reference_type,
  id                          AS reference_id
FROM exams
WHERE is_published = true AND deleted_at IS NULL AND exam_date IS NOT NULL

UNION ALL

-- Approved faculty leaves
SELECT
  id,
  institution_id,
  'Leave: ' || leave_type     AS title,
  reason                      AS description,
  'leave'                     AS event_type,
  '#DC2626'                   AS color,
  start_date,
  end_date,
  NULL                        AS start_time,
  NULL                        AS end_time,
  true                        AS all_day,
  ARRAY['faculty','admin']    AS target_roles,
  'leave'                     AS reference_type,
  id                          AS reference_id
FROM leaves
WHERE status = 'approved' AND deleted_at IS NULL;

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calendar_institution" ON calendar_events;
CREATE POLICY "calendar_institution" ON calendar_events FOR ALL
  USING (institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid()));

-- ── 9. AUDIT LOG ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID,
  actor_id     UUID,                    -- who performed the action
  action       VARCHAR(100) NOT NULL,   -- create | update | delete | approve | reject | login
  entity_type  VARCHAR(50)  NOT NULL,   -- student | faculty | fee_payment | exam | leave | book…
  entity_id    UUID,
  old_value    JSONB,
  new_value    JSONB,
  metadata     JSONB        DEFAULT '{}',
  ip_address   INET,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);
-- Defensive: add columns if table pre-existed from an earlier partial migration run
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id       UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id      UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value      JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value      JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata       JSONB DEFAULT '{}';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address     INET;

CREATE INDEX IF NOT EXISTS idx_audit_inst   ON audit_logs(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor  ON audit_logs(actor_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_read" ON audit_logs;
CREATE POLICY "audit_logs_read" ON audit_logs FOR SELECT
  USING (institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid()));

-- ── 10. INSTITUTION DASHBOARD AGGREGATION RPC ─────────────────
-- Single call returns every KPI the dashboard needs.
-- Replaces multiple round-trips from the UI.

CREATE OR REPLACE FUNCTION get_institution_dashboard(p_institution_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_students    RECORD;
  v_fac_count   BIGINT;
  v_attendance  RECORD;
  v_exams       RECORD;
  v_leaves      RECORD;
  v_hostel      RECORD;
  v_library     RECORD;
  v_transport   RECORD;
  v_events      RECORD;
  v_today       DATE := CURRENT_DATE;
  v_30d         DATE := CURRENT_DATE - INTERVAL '30 days';
BEGIN
  -- Students & fees
  SELECT
    COUNT(*)                                         FILTER (WHERE status = 'active' AND deleted_at IS NULL) AS total,
    SUM(COALESCE(total_fee, 0))                      FILTER (WHERE deleted_at IS NULL) AS receivable,
    SUM(COALESCE(paid_amount, 0))                    FILTER (WHERE deleted_at IS NULL) AS collected,
    COUNT(*) FILTER (WHERE fee_status = 'paid'    AND deleted_at IS NULL) AS fee_paid,
    COUNT(*) FILTER (WHERE fee_status = 'partial' AND deleted_at IS NULL) AS fee_partial,
    COUNT(*) FILTER (WHERE fee_status = 'pending' AND deleted_at IS NULL) AS fee_pending
  INTO v_students
  FROM students WHERE institution_id = p_institution_id;

  -- Faculty
  SELECT COUNT(*) INTO v_fac_count
  FROM faculty WHERE institution_id = p_institution_id AND status = 'active' AND deleted_at IS NULL;

  -- Attendance (30-day window)
  SELECT
    COUNT(*)                                                  AS total,
    SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END)      AS present,
    ROUND(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) * 100.0
          / NULLIF(COUNT(*), 0), 1)                           AS pct
  INTO v_attendance
  FROM attendance
  WHERE institution_id = p_institution_id AND date >= v_30d;

  -- Exams
  SELECT
    COUNT(*) FILTER (WHERE exam_date > v_today AND is_published AND deleted_at IS NULL) AS upcoming,
    COUNT(*) FILTER (WHERE exam_date <= v_today AND deleted_at IS NULL)                 AS completed,
    COUNT(*) FILTER (WHERE NOT is_published AND deleted_at IS NULL)                     AS drafts
  INTO v_exams
  FROM exams WHERE institution_id = p_institution_id;

  -- Leaves (current month)
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
    COUNT(*) FILTER (WHERE status = 'approved') AS approved
  INTO v_leaves
  FROM leaves
  WHERE institution_id = p_institution_id AND deleted_at IS NULL
    AND created_at >= DATE_TRUNC('month', NOW());

  -- Hostel
  SELECT
    COUNT(DISTINCT hb.id)                                          AS buildings,
    COUNT(hr.id)                                                   AS rooms,
    COALESCE(SUM(hr.capacity), 0)                                  AS capacity,
    COALESCE(SUM(hr.occupied), 0)                                  AS occupied
  INTO v_hostel
  FROM hostel_buildings hb
  LEFT JOIN hostel_rooms hr ON hr.building_id = hb.id AND hr.deleted_at IS NULL
  WHERE hb.institution_id = p_institution_id;

  -- Library
  SELECT
    COUNT(*)                                                        AS titles,
    COALESCE(SUM(total_copies), 0)                                  AS total_copies,
    COALESCE(SUM(available_copies), 0)                              AS available,
    (SELECT COUNT(*) FROM book_issues bi
     WHERE bi.institution_id = p_institution_id
       AND bi.status = 'issued' AND bi.due_date < v_today)          AS overdue
  INTO v_library
  FROM books WHERE institution_id = p_institution_id AND is_active = true AND deleted_at IS NULL;

  -- Transport
  SELECT
    COUNT(DISTINCT tr.id)                                           AS routes,
    COUNT(DISTINCT v.id) FILTER (WHERE v.deleted_at IS NULL)        AS vehicles,
    COUNT(ta.id)         FILTER (WHERE ta.status = 'active' AND ta.deleted_at IS NULL) AS assigned
  INTO v_transport
  FROM transport_routes tr
  LEFT JOIN vehicles v          ON v.institution_id = tr.institution_id
  LEFT JOIN transport_assignments ta ON ta.route_id = tr.id
  WHERE tr.institution_id = p_institution_id AND tr.deleted_at IS NULL;

  -- Upcoming calendar events (next 7 days)
  SELECT COUNT(*) AS upcoming_7d
  INTO v_events
  FROM calendar_events
  WHERE institution_id = p_institution_id
    AND deleted_at IS NULL
    AND start_date BETWEEN v_today AND v_today + INTERVAL '7 days';

  RETURN jsonb_build_object(
    'generated_at', NOW(),
    'students', jsonb_build_object(
      'total',          COALESCE(v_students.total, 0),
      'fee_paid',       COALESCE(v_students.fee_paid, 0),
      'fee_partial',    COALESCE(v_students.fee_partial, 0),
      'fee_pending',    COALESCE(v_students.fee_pending, 0),
      'receivable',     COALESCE(v_students.receivable, 0),
      'collected',      COALESCE(v_students.collected, 0),
      'collection_pct', ROUND(
        COALESCE(v_students.collected, 0) * 100.0
        / NULLIF(COALESCE(v_students.receivable, 0), 0), 1)
    ),
    'faculty',      jsonb_build_object('total', COALESCE(v_fac_count, 0)),
    'attendance',   jsonb_build_object(
      'pct',     COALESCE(v_attendance.pct, 0),
      'records', COALESCE(v_attendance.total, 0)
    ),
    'exams',        jsonb_build_object(
      'upcoming',  COALESCE(v_exams.upcoming, 0),
      'completed', COALESCE(v_exams.completed, 0),
      'drafts',    COALESCE(v_exams.drafts, 0)
    ),
    'leaves',       jsonb_build_object(
      'pending',  COALESCE(v_leaves.pending, 0),
      'approved', COALESCE(v_leaves.approved, 0)
    ),
    'hostel',       jsonb_build_object(
      'buildings',     COALESCE(v_hostel.buildings, 0),
      'rooms',         COALESCE(v_hostel.rooms, 0),
      'capacity',      COALESCE(v_hostel.capacity, 0),
      'occupied',      COALESCE(v_hostel.occupied, 0),
      'occupancy_pct', ROUND(
        COALESCE(v_hostel.occupied::NUMERIC, 0) * 100.0
        / NULLIF(COALESCE(v_hostel.capacity, 0), 0), 1)
    ),
    'library',      jsonb_build_object(
      'titles',    COALESCE(v_library.titles, 0),
      'copies',    COALESCE(v_library.total_copies, 0),
      'available', COALESCE(v_library.available, 0),
      'overdue',   COALESCE(v_library.overdue, 0)
    ),
    'transport',    jsonb_build_object(
      'routes',   COALESCE(v_transport.routes, 0),
      'vehicles', COALESCE(v_transport.vehicles, 0),
      'assigned', COALESCE(v_transport.assigned, 0)
    ),
    'calendar',     jsonb_build_object(
      'events_next_7_days', COALESCE(v_events.upcoming_7d, 0)
    )
  );
END;
$$;

-- ── 11. STUDENT ONBOARDING WORKFLOW ──────────────────────────
-- Runs as a transaction: admission approved → full student setup.

CREATE OR REPLACE FUNCTION run_student_onboarding_workflow(
  p_user_id        UUID,
  p_institution_id UUID,
  p_branch_id      UUID  DEFAULT NULL,
  p_class_id       UUID  DEFAULT NULL,
  p_actor_id       UUID  DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_student_id       UUID;
  v_admission_number VARCHAR(50);
  v_step             TEXT;
  v_done             TEXT[] := '{}';
BEGIN
  -- Step 1: Generate admission number (INST-YEAR-NNNN)
  v_step := 'generate_admission_number';
  v_admission_number := 'ADM-' || TO_CHAR(NOW(), 'YYYY') || '-'
    || LPAD(nextval('student_admission_seq')::TEXT, 4, '0');
  v_done := v_done || v_step;

  -- Step 2: Upsert student record
  v_step := 'upsert_student_record';
  INSERT INTO students (
    user_id, institution_id, branch_id, class_id,
    admission_number, status, total_fee, paid_amount, fee_status
  ) VALUES (
    p_user_id, p_institution_id, p_branch_id, p_class_id,
    v_admission_number, 'active', 0, 0, 'pending'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    institution_id   = EXCLUDED.institution_id,
    branch_id        = COALESCE(EXCLUDED.branch_id,  students.branch_id),
    class_id         = COALESCE(EXCLUDED.class_id,   students.class_id),
    admission_number = COALESCE(students.admission_number, EXCLUDED.admission_number),
    status           = 'active'
  RETURNING id INTO v_student_id;
  v_done := v_done || v_step;

  -- Step 3: Welcome notification
  v_step := 'create_welcome_notification';
  INSERT INTO notifications(institution_id, user_id, type, title, body, is_broadcast, is_read, metadata)
  VALUES (
    p_institution_id, p_user_id, 'general',
    'Welcome to OwnCampus!',
    '🎓 Your admission is confirmed. Admission No: ' || v_admission_number,
    false, false,
    jsonb_build_object('admission_number', v_admission_number, 'student_id', v_student_id)
  );
  v_done := v_done || v_step;

  -- Step 4: Calendar event (admission date)
  v_step := 'create_calendar_event';
  INSERT INTO calendar_events(institution_id, title, event_type, color, start_date, all_day, target_roles, reference_type, reference_id)
  VALUES (
    p_institution_id,
    'New Student Joined',
    'general', '#059669', CURRENT_DATE, true,
    ARRAY['admin'], 'student', v_student_id
  );
  v_done := v_done || v_step;

  -- Step 5: Emit domain event
  v_step := 'emit_domain_event';
  PERFORM emit_event(
    p_institution_id, 'admission.approved', 'student', v_student_id,
    jsonb_build_object(
      'user_id',          p_user_id,
      'admission_number', v_admission_number,
      'class_id',         p_class_id
    ),
    p_actor_id
  );
  v_done := v_done || v_step;

  -- Step 6: Audit log
  v_step := 'audit_log';
  INSERT INTO audit_logs(institution_id, actor_id, action, entity_type, entity_id, new_value)
  VALUES (
    p_institution_id, p_actor_id, 'admission_approved', 'student', v_student_id,
    jsonb_build_object('admission_number', v_admission_number, 'user_id', p_user_id)
  );
  v_done := v_done || v_step;

  RETURN jsonb_build_object(
    'success', true,
    'student_id', v_student_id,
    'admission_number', v_admission_number,
    'steps', to_jsonb(v_done)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'failed_at', v_step,
    'steps_done', to_jsonb(v_done)
  );
END;
$$;

-- ── 12. UNIVERSAL SEARCH VIEW ─────────────────────────────────

CREATE OR REPLACE VIEW v_universal_search AS

SELECT 'student' AS entity_type, s.id, s.institution_id,
  up.first_name || ' ' || COALESCE(up.last_name, '') AS title,
  COALESCE(s.roll_number, s.admission_number)         AS code,
  up.email, up.phone,
  COALESCE(c.name || COALESCE(' ' || c.section, ''), 'Unknown') AS category,
  COALESCE(s.fee_status::TEXT, 'pending')             AS extra,
  '/students'                                          AS href_prefix
FROM students s
JOIN user_profiles up ON s.user_id = up.id
LEFT JOIN classes c ON s.class_id = c.id
WHERE s.deleted_at IS NULL AND s.status = 'active'

UNION ALL

SELECT 'faculty' AS entity_type, f.id, f.institution_id,
  up.first_name || ' ' || COALESCE(up.last_name, '') AS title,
  COALESCE(f.employee_code, f.employee_id)            AS code,
  up.email, up.phone,
  COALESCE(d.name, 'Faculty')                         AS category,
  COALESCE(f.designation, up.role)                    AS extra,
  '/faculty'                                           AS href_prefix
FROM faculty f
JOIN user_profiles up ON f.user_id = up.id
LEFT JOIN departments d ON f.department_id = d.id
WHERE f.deleted_at IS NULL

UNION ALL

SELECT 'book' AS entity_type, b.id, b.institution_id,
  b.title AS title, b.isbn AS code,
  NULL AS email, NULL AS phone,
  COALESCE(b.category, 'Library') AS category,
  b.author                         AS extra,
  '/library'                       AS href_prefix
FROM books b
WHERE b.is_active = true AND b.deleted_at IS NULL

UNION ALL

SELECT 'vehicle' AS entity_type, v.id, v.institution_id,
  v.registration_number AS title, v.registration_number AS code,
  NULL AS email, NULL AS phone,
  COALESCE(v.type::TEXT, 'Bus') AS category, NULL AS extra,
  '/transport'                  AS href_prefix
FROM vehicles v
WHERE v.deleted_at IS NULL

UNION ALL

SELECT 'hostel_room' AS entity_type, hr.id, hb.institution_id,
  hb.name || ' – ' || hr.room_number AS title,
  hr.room_number AS code,
  NULL AS email, NULL AS phone,
  hb.name AS category, NULL AS extra,
  '/hostel'  AS href_prefix
FROM hostel_rooms hr
JOIN hostel_buildings hb ON hr.building_id = hb.id
WHERE hr.deleted_at IS NULL

UNION ALL

SELECT 'announcement' AS entity_type, a.id, a.institution_id,
  a.title AS title, NULL AS code,
  NULL AS email, NULL AS phone,
  COALESCE(a.type::TEXT, 'General') AS category, NULL AS extra,
  '/communication'                  AS href_prefix
FROM announcements a
WHERE a.institution_id IS NOT NULL;

-- ── 13. FEE PAYMENT → LEDGER TRIGGER ─────────────────────────
-- Every fee payment automatically creates a double-entry ledger record.

CREATE OR REPLACE FUNCTION fn_fee_payment_to_ledger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_fiscal_year VARCHAR(9);
BEGIN
  -- Compute fiscal year (April–March)
  v_fiscal_year := TO_CHAR(NEW.payment_date - INTERVAL '3 months', 'YYYY') || '-' ||
                   TO_CHAR(NEW.payment_date + INTERVAL '9 months', 'YY');

  -- Credit: Cash/Bank (asset increases)
  INSERT INTO ledger_entries(
    institution_id, student_id, account_type, transaction_type,
    credit, narration, reference_type, reference_id,
    transaction_date, fiscal_year, created_by
  ) VALUES (
    NEW.institution_id, NEW.student_id, 'cash', 'fee_payment',
    NEW.amount,
    'Fee received – Receipt ' || COALESCE(NEW.receipt_number, NEW.id::TEXT),
    'fee_payment', NEW.id,
    COALESCE(NEW.payment_date::DATE, CURRENT_DATE), v_fiscal_year,
    NEW.collected_by
  );

  -- Debit: Student receivable (liability reduces)
  INSERT INTO ledger_entries(
    institution_id, student_id, account_type, transaction_type,
    debit, narration, reference_type, reference_id,
    transaction_date, fiscal_year, created_by
  ) VALUES (
    NEW.institution_id, NEW.student_id, 'receivable', 'fee_payment',
    NEW.amount,
    'Fee applied to student account – Receipt ' || COALESCE(NEW.receipt_number, NEW.id::TEXT),
    'fee_payment', NEW.id,
    COALESCE(NEW.payment_date::DATE, CURRENT_DATE), v_fiscal_year,
    NEW.collected_by
  );

  -- Emit domain event for downstream: analytics, notifications, audit
  PERFORM emit_event(
    NEW.institution_id, 'fee.paid', 'fee_payment', NEW.id,
    jsonb_build_object(
      'student_id',     NEW.student_id,
      'amount',         NEW.amount,
      'receipt_number', NEW.receipt_number,
      'payment_mode',   NEW.payment_mode
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fee_payment_ledger ON fee_payments;
CREATE TRIGGER trg_fee_payment_ledger
  AFTER INSERT ON fee_payments
  FOR EACH ROW EXECUTE FUNCTION fn_fee_payment_to_ledger();

-- ── 14. REALTIME FOR NEW TABLES ───────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE domain_events;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE room_bookings;

-- ── 15. INDEXES ON SOFT-DELETED TABLES ───────────────────────

CREATE INDEX IF NOT EXISTS idx_hostel_alloc_student_active
  ON hostel_allocations(student_id) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transport_assign_route_active
  ON transport_assignments(route_id) WHERE status = 'active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exams_published
  ON exams(institution_id, exam_date) WHERE is_published = true AND deleted_at IS NULL;
