-- ============================================================
-- OWNCAMPUS - Seed Data for Demo (idempotent)
-- ============================================================

-- Demo Institution
INSERT INTO institutions (id, name, slug, type, email, phone, city, state, established_year, affiliation, subscription_plan, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'OwnCampus Demo School',
  'owncampus-demo',
  'school',
  'admin@owncampus.com',
  '+91 98765 00000',
  'Delhi',
  'Delhi',
  2010,
  'CBSE',
  'enterprise',
  true
) ON CONFLICT (id) DO NOTHING;

-- Demo Branch
INSERT INTO branches (id, institution_id, name, code, city, state, is_main_branch)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Main Campus',
  'MAIN',
  'Delhi',
  'Delhi',
  true
) ON CONFLICT (id) DO NOTHING;

-- Academic Year
INSERT INTO academic_years (id, institution_id, name, start_date, end_date, is_current)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '2025-26',
  '2025-04-01',
  '2026-03-31',
  true
) ON CONFLICT (id) DO NOTHING;

-- Departments
INSERT INTO departments (id, institution_id, branch_id, name, code)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Mathematics', 'MATH'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Science', 'SCI'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'English', 'ENG'),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Commerce', 'COM'),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Social Science', 'SS')
ON CONFLICT (id) DO NOTHING;

-- Programs
INSERT INTO programs (id, institution_id, department_id, name, code, total_semesters, total_seats, fee_per_year)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Class 10 (Science)', 'C10S', 2, 60, 45000),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 'Class 11 (Commerce)', 'C11C', 2, 60, 50000),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'Class 12 (Science)', 'C12S', 2, 60, 55000)
ON CONFLICT (id) DO NOTHING;

-- Subjects
INSERT INTO subjects (id, institution_id, department_id, name, code, credits, semester)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Mathematics', 'MATH101', 5, 1),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'Physics', 'PHY101', 4, 1),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'Chemistry', 'CHE101', 4, 1),
  ('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'English', 'ENG101', 4, 1),
  ('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005', 'History', 'HIS101', 3, 1)
ON CONFLICT (id) DO NOTHING;

-- Role permissions (Super Admin gets all)
INSERT INTO role_permissions (institution_id, role, module, can_view, can_create, can_edit, can_delete, can_export)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  'super_admin',
  module,
  true, true, true, true, true
FROM unnest(ARRAY[
  'dashboard', 'students', 'faculty', 'admissions', 'attendance',
  'examinations', 'finance', 'hrms', 'library', 'hostel', 'transport',
  'lms', 'timetable', 'communication', 'placement', 'alumni',
  'analytics', 'inventory', 'procurement', 'settings'
]) AS module
ON CONFLICT (institution_id, role, module) DO NOTHING;

-- Events
INSERT INTO events (institution_id, title, description, type, start_datetime, end_datetime, is_holiday, target_audience, is_published)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Republic Day', 'National Holiday', 'holiday', '2026-01-26', '2026-01-26', true, 'all', true),
  ('a0000000-0000-0000-0000-000000000001', 'Annual Sports Day', 'Annual sports meet for all students', 'event', '2025-11-05', '2025-11-05', false, 'all', true),
  ('a0000000-0000-0000-0000-000000000001', 'Parent-Teacher Meeting', 'PTM for all classes', 'meeting', '2025-11-02', '2025-11-02', false, 'parents', true),
  ('a0000000-0000-0000-0000-000000000001', 'Unit Test 2', 'Second unit test for all classes', 'exam', '2025-10-28', '2025-11-05', false, 'students', true);
