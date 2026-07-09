-- ============================================================
-- Migration 022 — Performance Indexes
-- Adds missing indexes identified during the performance audit.
-- All statements are IF NOT EXISTS — safe to re-run.
-- ============================================================

-- ── exam_marks ───────────────────────────────────────────────
-- student_id standalone index (UNIQUE constraint covers exam_id-leading composite
-- but single-column student_id lookups need their own index)
CREATE INDEX IF NOT EXISTS idx_exam_marks_student
  ON exam_marks(student_id);

CREATE INDEX IF NOT EXISTS idx_exam_marks_exam_absent
  ON exam_marks(exam_id, is_absent)
  WHERE is_absent = false;

-- ── announcements ─────────────────────────────────────────────
-- Zero indexes on this table despite being fetched on every dashboard load
CREATE INDEX IF NOT EXISTS idx_announcements_institution_pin_date
  ON announcements(institution_id, is_pinned DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_institution_created
  ON announcements(institution_id, created_at DESC);

-- ── hostel_buildings ─────────────────────────────────────────
-- Needed for the hostel room limit check (rooms join via buildings)
CREATE INDEX IF NOT EXISTS idx_hostel_buildings_institution
  ON hostel_buildings(institution_id);

-- ── book_issues ──────────────────────────────────────────────
-- Institution-scoped date range queries (analytics, library trends)
CREATE INDEX IF NOT EXISTS idx_book_issues_institution_date
  ON book_issues(institution_id, issued_date DESC);

CREATE INDEX IF NOT EXISTS idx_book_issues_institution_status
  ON book_issues(institution_id, status);

-- ── students ─────────────────────────────────────────────────
-- soft-delete filter: WHERE deleted_at IS NULL (partial index)
CREATE INDEX IF NOT EXISTS idx_students_not_deleted
  ON students(institution_id, status)
  WHERE deleted_at IS NULL;

-- ── attendance ───────────────────────────────────────────────
-- Analytics: WHERE institution_id = ? AND date >= ? (time-range scan)
CREATE INDEX IF NOT EXISTS idx_attendance_institution_date
  ON attendance(institution_id, date DESC);

-- ── fee_payments ──────────────────────────────────────────────
-- Composite for finance dashboard: institution + status + payment_date
CREATE INDEX IF NOT EXISTS idx_fee_payments_inst_status_date
  ON fee_payments(institution_id, status, payment_date DESC);

-- ── user_profiles ─────────────────────────────────────────────
-- Batch profile lookups by array of ids (used in announcements, students)
-- id is already a PK but including for clarity — the real gain is the email lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_institution_role
  ON user_profiles(institution_id, role)
  WHERE is_active = true;

-- ── leads ────────────────────────────────────────────────────
-- Admission source analytics
CREATE INDEX IF NOT EXISTS idx_leads_institution_source
  ON leads(institution_id, source);

-- ── alumni ───────────────────────────────────────────────────
-- Name trigram search (ilike '%q%')
CREATE INDEX IF NOT EXISTS idx_alumni_name_trgm
  ON alumni USING gin(name gin_trgm_ops);

-- ── inventory_items ───────────────────────────────────────────
-- Name trigram search (ilike '%q%')
CREATE INDEX IF NOT EXISTS idx_inventory_name_trgm
  ON inventory_items USING gin(name gin_trgm_ops);

-- ── placement_drives ──────────────────────────────────────────
-- Company name trigram search (ilike '%q%')
CREATE INDEX IF NOT EXISTS idx_placement_company_trgm
  ON placement_drives USING gin(company_name gin_trgm_ops);

-- ── subjects ──────────────────────────────────────────────────
-- Lookups by institution used in exam analytics
CREATE INDEX IF NOT EXISTS idx_subjects_institution
  ON subjects(institution_id);

-- ── classes ───────────────────────────────────────────────────
-- Lookups by institution (timetable, students)
CREATE INDEX IF NOT EXISTS idx_classes_institution
  ON classes(institution_id);

-- ============================================================
-- EXTENDED AUDIT — indexes identified as still missing
-- All statements are IF NOT EXISTS — safe to re-run.
-- ============================================================

-- ── branches ─────────────────────────────────────────────────
-- Frequently joined to students, user_profiles, classes, faculty.
-- No institution_id index exists anywhere in migrations 001-021.
CREATE INDEX IF NOT EXISTS idx_branches_institution
  ON branches(institution_id);

-- ── departments ──────────────────────────────────────────────
-- Queried by institution for faculty management and program setup.
CREATE INDEX IF NOT EXISTS idx_departments_institution
  ON departments(institution_id);

-- ── programs ─────────────────────────────────────────────────
-- Used in admissions (applications table) and student records.
CREATE INDEX IF NOT EXISTS idx_programs_institution
  ON programs(institution_id);

-- ── academic_years ───────────────────────────────────────────
-- Joined to classes, students, exams, fee_structures.
CREATE INDEX IF NOT EXISTS idx_academic_years_institution
  ON academic_years(institution_id);

-- ── hostel_allocations ───────────────────────────────────────
-- hostel_alloc_student_active partial index exists (007) but no
-- general institution_id index for admin-side listing queries.
CREATE INDEX IF NOT EXISTS idx_hostel_allocations_institution
  ON hostel_allocations(institution_id);

-- ── transport_routes ─────────────────────────────────────────
-- Transport listing page queries by institution_id.
-- idx_vehicles_inst exists but not for routes.
CREATE INDEX IF NOT EXISTS idx_transport_routes_institution
  ON transport_routes(institution_id);

-- ── scholarships ─────────────────────────────────────────────
-- Finance module scholarship listing.
CREATE INDEX IF NOT EXISTS idx_scholarships_institution
  ON scholarships(institution_id);

-- ── payroll ──────────────────────────────────────────────────
-- HRMS payroll listing by institution.
-- UNIQUE(faculty_id, month, year) covers faculty_id-prefix lookup
-- but institution-level queries need their own index.
CREATE INDEX IF NOT EXISTS idx_payroll_institution
  ON payroll(institution_id);

-- ── rooms ────────────────────────────────────────────────────
-- Room booking and timetable scheduling queries.
CREATE INDEX IF NOT EXISTS idx_rooms_institution
  ON rooms(institution_id);

-- ── room_bookings ─────────────────────────────────────────────
-- idx_room_bookings_room exists on (room_id, start_time, end_time)
-- but no institution_id index for admin-side calendar queries.
CREATE INDEX IF NOT EXISTS idx_room_bookings_institution
  ON room_bookings(institution_id);

-- ── events ───────────────────────────────────────────────────
-- Institution-scoped event/holiday calendar.
-- calendar_events has idx_calendar_inst_date but events table does not.
CREATE INDEX IF NOT EXISTS idx_events_institution
  ON events(institution_id);

-- ── companies ────────────────────────────────────────────────
-- Placement module company listing.
CREATE INDEX IF NOT EXISTS idx_companies_institution
  ON companies(institution_id);

-- ── job_postings ─────────────────────────────────────────────
-- Placement module job board.
CREATE INDEX IF NOT EXISTS idx_job_postings_institution
  ON job_postings(institution_id);

-- ── homework_submissions ─────────────────────────────────────
-- homework_submissions has indexes on homework_id and student_id
-- but no institution_id index for institution-scoped grading views.
CREATE INDEX IF NOT EXISTS idx_homework_submissions_institution
  ON homework_submissions(institution_id);

-- ── Composite: exams(institution_id, class_id, exam_date) ─────
-- examinations/route.js:
--   .eq('institution_id', ...).eq('class_id', ...).order('exam_date', desc)
-- idx_exams_inst and idx_exams_date are separate single-column indexes.
-- idx_exams_published is partial (published + not deleted only).
-- This composite covers the general admin exam list without the partial filter.
CREATE INDEX IF NOT EXISTS idx_exams_inst_class_date
  ON exams(institution_id, class_id, exam_date DESC)
  WHERE deleted_at IS NULL;

-- ── Composite: attendance(institution_id, date, class_id) ─────
-- attendance/route.js main GET:
--   .eq('institution_id', ...).eq('date', date).eq('class_id', classId)
-- idx_attendance_institution_date (added above) covers the 2-column case.
-- This composite extends it to also cover the class_id equality filter,
-- which is the most common admin query (marking attendance per class per day).
CREATE INDEX IF NOT EXISTS idx_attendance_inst_date_class
  ON attendance(institution_id, date, class_id);

-- ── Composite: leaves(institution_id, start_date) ────────────
-- analytics/route.js:
--   .eq('institution_id', ...).gte('start_date', firstOfMonth)
-- idx_leaves_dates is on (start_date, end_date) without institution_id prefix.
-- idx_leaves_institution is single-column only.
-- This composite allows the planner to range-scan by date within an institution.
CREATE INDEX IF NOT EXISTS idx_leaves_inst_start_date
  ON leaves(institution_id, start_date DESC)
  WHERE deleted_at IS NULL;

-- ── Composite: students(class_id, status) ────────────────────
-- examinations/route.js notifies students in a class:
--   .eq('class_id', ...).eq('status', 'active').not('user_id', 'is', null)
-- idx_students_class covers class_id alone; adding status avoids a post-filter scan.
CREATE INDEX IF NOT EXISTS idx_students_class_status
  ON students(class_id, status)
  WHERE deleted_at IS NULL;

-- ── Composite: book_issues(institution_id, status, due_date) ──
-- library/route.js overdue list:
--   .eq('institution_id', ...).eq('status', 'issued').lt('due_date', today)
-- idx_book_issues_institution_status covers the first two columns; adding due_date
-- turns a post-filter into a range scan and avoids touching the separate
-- idx_book_issues_due partial index.
CREATE INDEX IF NOT EXISTS idx_book_issues_inst_status_due
  ON book_issues(institution_id, status, due_date);
