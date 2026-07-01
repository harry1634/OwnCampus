-- ============================================================
-- OWNCAMPUS - Enterprise Education Operating System
-- Phase 2: Complete Database Schema
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'super_admin', 'chairman', 'director', 'owner', 'principal',
  'vice_principal', 'academic_coordinator', 'hod', 'teacher',
  'trainer', 'faculty', 'admission_officer', 'counsellor', 'hr',
  'accountant', 'receptionist', 'transport_manager', 'hostel_manager',
  'librarian', 'parent', 'student', 'alumni', 'vendor', 'auditor', 'guest'
);

CREATE TYPE institution_type AS ENUM (
  'school', 'college', 'university', 'coaching_center',
  'training_institute', 'skill_academy', 'multi_branch'
);

CREATE TYPE gender AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

CREATE TYPE blood_group AS ENUM ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-');

CREATE TYPE status AS ENUM ('active', 'inactive', 'suspended', 'deleted');

CREATE TYPE lead_status AS ENUM (
  'new', 'contacted', 'interested', 'not_interested', 'follow_up',
  'converted', 'lost', 'junk'
);

CREATE TYPE admission_status AS ENUM (
  'applied', 'under_review', 'shortlisted', 'interview_scheduled',
  'interviewed', 'accepted', 'rejected', 'waitlisted', 'enrolled', 'cancelled'
);

CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused', 'holiday');

CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'partial', 'overdue', 'waived', 'refunded');

CREATE TYPE exam_type AS ENUM (
  'internal', 'external', 'midterm', 'final', 'unit_test',
  'assignment', 'quiz', 'practical', 'project'
);

CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Institutions (Multi-tenant root)
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  type institution_type NOT NULL DEFAULT 'school',
  logo_url TEXT,
  cover_url TEXT,
  email VARCHAR(255),
  phone VARCHAR(20),
  website VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  pincode VARCHAR(10),
  established_year INTEGER,
  affiliation VARCHAR(255),
  accreditation TEXT,
  total_students INTEGER DEFAULT 0,
  total_faculty INTEGER DEFAULT 0,
  subscription_plan VARCHAR(50) DEFAULT 'starter',
  subscription_expires_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Branches
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  principal_id UUID,
  is_main_branch BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Academic Years
CREATE TABLE academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20),
  hod_id UUID,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs / Courses
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20),
  duration_years INTEGER DEFAULT 1,
  total_semesters INTEGER DEFAULT 2,
  total_seats INTEGER DEFAULT 60,
  fee_per_year DECIMAL(10,2) DEFAULT 0,
  description TEXT,
  eligibility TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes / Batches
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  program_id UUID REFERENCES programs(id),
  academic_year_id UUID REFERENCES academic_years(id),
  name VARCHAR(100) NOT NULL,
  section VARCHAR(10),
  semester INTEGER,
  year INTEGER,
  room_number VARCHAR(20),
  class_teacher_id UUID,
  max_students INTEGER DEFAULT 60,
  current_students INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  program_id UUID REFERENCES programs(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20),
  type VARCHAR(50) DEFAULT 'theory',
  credits INTEGER DEFAULT 3,
  hours_per_week INTEGER DEFAULT 4,
  semester INTEGER,
  is_elective BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER MANAGEMENT
-- ============================================================

-- User Profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  role user_role NOT NULL DEFAULT 'guest',
  employee_id VARCHAR(50),
  student_id VARCHAR(50),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  gender gender,
  date_of_birth DATE,
  blood_group blood_group,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  pincode VARCHAR(10),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  status status DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role Permissions
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  module VARCHAR(100) NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(institution_id, role, module)
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID REFERENCES institutions(id),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Login History
CREATE TABLE login_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50),
  location VARCHAR(255),
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STUDENT INFORMATION SYSTEM
-- ============================================================

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  class_id UUID REFERENCES classes(id),
  program_id UUID REFERENCES programs(id),
  academic_year_id UUID REFERENCES academic_years(id),
  roll_number VARCHAR(50),
  admission_number VARCHAR(50) UNIQUE,
  admission_date DATE,
  father_name VARCHAR(100),
  mother_name VARCHAR(100),
  guardian_name VARCHAR(100),
  guardian_phone VARCHAR(20),
  guardian_email VARCHAR(255),
  guardian_occupation VARCHAR(100),
  annual_income DECIMAL(10,2),
  nationality VARCHAR(50) DEFAULT 'Indian',
  religion VARCHAR(50),
  caste VARCHAR(50),
  category VARCHAR(20),
  is_differently_abled BOOLEAN DEFAULT false,
  disability_details TEXT,
  previous_school VARCHAR(255),
  previous_class VARCHAR(50),
  previous_percentage DECIMAL(5,2),
  hostel_required BOOLEAN DEFAULT false,
  transport_required BOOLEAN DEFAULT false,
  scholarship_details TEXT,
  medical_conditions TEXT,
  allergies TEXT,
  status status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Documents
CREATE TABLE student_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  document_name VARCHAR(255),
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES user_profiles(id),
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES user_profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ADMISSION CRM
-- ============================================================

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  program_id UUID REFERENCES programs(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  parent_name VARCHAR(100),
  parent_phone VARCHAR(20),
  city VARCHAR(100),
  source VARCHAR(100) DEFAULT 'walk_in',
  campaign_name VARCHAR(255),
  status lead_status DEFAULT 'new',
  assigned_to UUID REFERENCES user_profiles(id),
  notes TEXT,
  interested_program VARCHAR(255),
  expected_joining DATE,
  budget_range VARCHAR(50),
  score INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  follow_up_date TIMESTAMPTZ NOT NULL,
  follow_up_type VARCHAR(50) DEFAULT 'call',
  notes TEXT,
  outcome VARCHAR(100),
  next_follow_up TIMESTAMPTZ,
  done_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  program_id UUID REFERENCES programs(id),
  academic_year_id UUID REFERENCES academic_years(id),
  application_number VARCHAR(50) UNIQUE,
  status admission_status DEFAULT 'applied',
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  documents_submitted BOOLEAN DEFAULT false,
  interview_date TIMESTAMPTZ,
  merit_score DECIMAL(5,2),
  remarks TEXT,
  reviewed_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FACULTY MANAGEMENT
-- ============================================================

CREATE TABLE faculty (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  department_id UUID REFERENCES departments(id),
  employee_code VARCHAR(50) UNIQUE,
  designation VARCHAR(100),
  employment_type VARCHAR(50) DEFAULT 'full_time',
  joining_date DATE,
  qualification TEXT,
  experience_years INTEGER DEFAULT 0,
  specialization TEXT,
  subjects_teaching TEXT[],
  max_hours_per_week INTEGER DEFAULT 30,
  current_hours_per_week INTEGER DEFAULT 0,
  salary DECIMAL(10,2),
  bank_account VARCHAR(20),
  bank_name VARCHAR(100),
  ifsc_code VARCHAR(20),
  pan_number VARCHAR(20),
  pf_number VARCHAR(30),
  esi_number VARCHAR(30),
  status status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class-Subject-Faculty mapping
CREATE TABLE class_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  faculty_id UUID REFERENCES faculty(id),
  academic_year_id UUID REFERENCES academic_years(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, subject_id, academic_year_id)
);

-- ============================================================
-- ATTENDANCE MANAGEMENT
-- ============================================================

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  student_id UUID NOT NULL REFERENCES students(id),
  faculty_id UUID REFERENCES faculty(id),
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  time_in TIME,
  time_out TIME,
  remarks TEXT,
  marked_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date, subject_id)
);

-- Faculty Attendance
CREATE TABLE faculty_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  faculty_id UUID NOT NULL REFERENCES faculty(id),
  date DATE NOT NULL,
  time_in TIME,
  time_out TIME,
  status attendance_status DEFAULT 'present',
  marked_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(faculty_id, date)
);

-- ============================================================
-- TIMETABLE
-- ============================================================

CREATE TABLE timetable_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  branch_id UUID REFERENCES branches(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  faculty_id UUID REFERENCES faculty(id),
  day_of_week day_of_week NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number VARCHAR(20),
  academic_year_id UUID REFERENCES academic_years(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXAMINATION MANAGEMENT
-- ============================================================

CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  academic_year_id UUID REFERENCES academic_years(id),
  name VARCHAR(255) NOT NULL,
  type exam_type DEFAULT 'internal',
  exam_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  total_marks INTEGER NOT NULL DEFAULT 100,
  passing_marks INTEGER DEFAULT 35,
  hall_number VARCHAR(20),
  description TEXT,
  created_by UUID REFERENCES user_profiles(id),
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exam_marks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  marks_obtained DECIMAL(6,2),
  grade VARCHAR(5),
  is_absent BOOLEAN DEFAULT false,
  remarks TEXT,
  entered_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

-- ============================================================
-- FINANCE & FEES
-- ============================================================

CREATE TABLE fee_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  program_id UUID REFERENCES programs(id),
  academic_year_id UUID REFERENCES academic_years(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fee_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  is_mandatory BOOLEAN DEFAULT true,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fee_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  student_id UUID NOT NULL REFERENCES students(id),
  fee_structure_id UUID REFERENCES fee_structures(id),
  receipt_number VARCHAR(50) UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  late_fee DECIMAL(10,2) DEFAULT 0,
  total_paid DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'cash',
  transaction_id VARCHAR(255),
  payment_date DATE NOT NULL,
  status payment_status DEFAULT 'paid',
  notes TEXT,
  collected_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scholarships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  student_id UUID NOT NULL REFERENCES students(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  amount DECIMAL(10,2),
  percentage DECIMAL(5,2),
  academic_year_id UUID REFERENCES academic_years(id),
  approved_by UUID REFERENCES user_profiles(id),
  status VARCHAR(50) DEFAULT 'active',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HRMS
-- ============================================================

CREATE TABLE leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  reason TEXT,
  status leave_status DEFAULT 'pending',
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payroll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  faculty_id UUID NOT NULL REFERENCES faculty(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  basic_salary DECIMAL(10,2) DEFAULT 0,
  hra DECIMAL(10,2) DEFAULT 0,
  da DECIMAL(10,2) DEFAULT 0,
  other_allowances DECIMAL(10,2) DEFAULT 0,
  gross_salary DECIMAL(10,2) DEFAULT 0,
  pf_deduction DECIMAL(10,2) DEFAULT 0,
  esi_deduction DECIMAL(10,2) DEFAULT 0,
  tax_deduction DECIMAL(10,2) DEFAULT 0,
  other_deductions DECIMAL(10,2) DEFAULT 0,
  net_salary DECIMAL(10,2) DEFAULT 0,
  working_days INTEGER DEFAULT 26,
  present_days INTEGER DEFAULT 26,
  leave_days INTEGER DEFAULT 0,
  lop_days INTEGER DEFAULT 0,
  payment_date DATE,
  payment_mode VARCHAR(50) DEFAULT 'bank_transfer',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(faculty_id, month, year)
);

-- ============================================================
-- LIBRARY
-- ============================================================

CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  isbn VARCHAR(50),
  title VARCHAR(500) NOT NULL,
  author VARCHAR(255),
  publisher VARCHAR(255),
  edition VARCHAR(50),
  year_of_publication INTEGER,
  category VARCHAR(100),
  subject VARCHAR(100),
  language VARCHAR(50) DEFAULT 'English',
  total_copies INTEGER DEFAULT 1,
  available_copies INTEGER DEFAULT 1,
  rack_number VARCHAR(20),
  price DECIMAL(10,2),
  cover_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE book_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  book_id UUID NOT NULL REFERENCES books(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  issued_date DATE NOT NULL,
  due_date DATE NOT NULL,
  returned_date DATE,
  fine_amount DECIMAL(10,2) DEFAULT 0,
  fine_paid BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'issued',
  issued_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HOSTEL
-- ============================================================

CREATE TABLE hostel_buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'boys',
  total_rooms INTEGER DEFAULT 0,
  warden_id UUID REFERENCES user_profiles(id),
  address TEXT,
  facilities TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hostel_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id UUID NOT NULL REFERENCES hostel_buildings(id) ON DELETE CASCADE,
  room_number VARCHAR(20) NOT NULL,
  floor INTEGER DEFAULT 1,
  type VARCHAR(50) DEFAULT 'double',
  capacity INTEGER DEFAULT 2,
  occupied INTEGER DEFAULT 0,
  monthly_fee DECIMAL(10,2) DEFAULT 0,
  amenities TEXT[],
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hostel_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  room_id UUID NOT NULL REFERENCES hostel_rooms(id),
  student_id UUID NOT NULL REFERENCES students(id),
  bed_number INTEGER DEFAULT 1,
  check_in_date DATE NOT NULL,
  check_out_date DATE,
  monthly_fee DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, check_in_date)
);

-- ============================================================
-- TRANSPORT
-- ============================================================

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  registration_number VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50) DEFAULT 'bus',
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  capacity INTEGER DEFAULT 40,
  driver_id UUID REFERENCES user_profiles(id),
  fuel_type VARCHAR(50) DEFAULT 'diesel',
  insurance_expiry DATE,
  permit_expiry DATE,
  fitness_expiry DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transport_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  vehicle_id UUID REFERENCES vehicles(id),
  name VARCHAR(255) NOT NULL,
  route_number VARCHAR(20),
  stops JSONB DEFAULT '[]',
  departure_time TIME,
  arrival_time TIME,
  monthly_fee DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMMUNICATION
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  target_roles user_role[],
  target_user_ids UUID[],
  is_broadcast BOOLEAN DEFAULT false,
  sent_via TEXT[] DEFAULT '{"in_app"}',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  target_audience VARCHAR(50) DEFAULT 'all',
  start_date DATE,
  end_date DATE,
  is_pinned BOOLEAN DEFAULT false,
  attachment_url TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LMS - Learning Management System
-- ============================================================

CREATE TABLE lms_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  cover_url TEXT,
  instructor_id UUID REFERENCES faculty(id),
  is_published BOOLEAN DEFAULT false,
  total_lessons INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lms_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  type VARCHAR(50) DEFAULT 'video',
  content TEXT,
  video_url TEXT,
  file_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  is_free BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lms_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  completed_lessons INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(course_id, student_id)
);

-- ============================================================
-- PLACEMENT CELL
-- ============================================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  website VARCHAR(255),
  contact_person VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'full_time',
  location VARCHAR(255),
  ctc_min DECIMAL(10,2),
  ctc_max DECIMAL(10,2),
  description TEXT,
  requirements TEXT,
  skills_required TEXT[],
  eligible_programs UUID[],
  min_percentage DECIMAL(5,2) DEFAULT 60,
  application_deadline DATE,
  drive_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'applied',
  resume_url TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  interview_date TIMESTAMPTZ,
  offer_letter_url TEXT,
  ctc_offered DECIMAL(10,2),
  joining_date DATE,
  remarks TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, student_id)
);

-- ============================================================
-- EVENTS & CALENDAR
-- ============================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  branch_id UUID REFERENCES branches(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'general',
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  location VARCHAR(255),
  is_holiday BOOLEAN DEFAULT false,
  target_audience VARCHAR(50) DEFAULT 'all',
  organizer_id UUID REFERENCES user_profiles(id),
  cover_url TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_user_profiles_institution ON user_profiles(institution_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_students_institution ON students(institution_id);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_leads_institution ON leads(institution_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_notifications_institution ON notifications(institution_id);
CREATE INDEX idx_books_institution ON books(institution_id);
CREATE INDEX idx_timetable_class ON timetable_slots(class_id);

-- Full text search indexes
CREATE INDEX idx_students_search ON user_profiles USING gin(to_tsvector('english', first_name || ' ' || coalesce(last_name, '')));
CREATE INDEX idx_books_search ON books USING gin(to_tsvector('english', title || ' ' || coalesce(author, '')));

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON institutions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faculty_updated_at BEFORE UPDATE ON faculty FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VIEWS
-- ============================================================

CREATE VIEW v_student_details AS
SELECT
  s.id,
  s.institution_id,
  s.roll_number,
  s.admission_number,
  s.admission_date,
  up.first_name,
  up.last_name,
  up.email,
  up.phone,
  up.avatar_url,
  up.gender,
  up.date_of_birth,
  s.father_name,
  s.mother_name,
  c.name AS class_name,
  c.section,
  p.name AS program_name,
  d.name AS department_name,
  b.name AS branch_name,
  s.status,
  s.created_at
FROM students s
JOIN user_profiles up ON s.user_id = up.id
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN departments d ON p.department_id = d.id
LEFT JOIN branches b ON s.branch_id = b.id;

CREATE VIEW v_faculty_details AS
SELECT
  f.id,
  f.institution_id,
  f.employee_code,
  f.designation,
  f.employment_type,
  f.joining_date,
  f.experience_years,
  up.first_name,
  up.last_name,
  up.email,
  up.phone,
  up.avatar_url,
  up.gender,
  d.name AS department_name,
  b.name AS branch_name,
  f.status,
  f.salary
FROM faculty f
JOIN user_profiles up ON f.user_id = up.id
LEFT JOIN departments d ON f.department_id = d.id
LEFT JOIN branches b ON f.branch_id = b.id;

CREATE VIEW v_attendance_summary AS
SELECT
  a.student_id,
  a.class_id,
  a.subject_id,
  COUNT(*) as total_classes,
  SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
  SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
  ROUND(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as attendance_percentage
FROM attendance a
GROUP BY a.student_id, a.class_id, a.subject_id;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admin can see everything
CREATE POLICY "super_admin_all" ON institutions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Users can see their institution's data
CREATE POLICY "institution_isolation" ON branches FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can see their own profile
CREATE POLICY "own_profile" ON user_profiles FOR SELECT
  USING (id = auth.uid() OR institution_id IN (
    SELECT institution_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "own_profile_update" ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- Students visible within institution
CREATE POLICY "students_institution" ON students FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Faculty visible within institution
CREATE POLICY "faculty_institution" ON faculty FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Leads visible within institution
CREATE POLICY "leads_institution" ON leads FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Attendance visible within institution
CREATE POLICY "attendance_institution" ON attendance FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Fee payments visible within institution
CREATE POLICY "fee_payments_institution" ON fee_payments FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to get institution stats
CREATE OR REPLACE FUNCTION get_institution_stats(p_institution_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_students', (SELECT COUNT(*) FROM students WHERE institution_id = p_institution_id AND status = 'active'),
    'total_faculty', (SELECT COUNT(*) FROM faculty WHERE institution_id = p_institution_id AND status = 'active'),
    'total_leads', (SELECT COUNT(*) FROM leads WHERE institution_id = p_institution_id),
    'total_revenue', (SELECT COALESCE(SUM(total_paid), 0) FROM fee_payments WHERE institution_id = p_institution_id),
    'new_leads_today', (SELECT COUNT(*) FROM leads WHERE institution_id = p_institution_id AND DATE(created_at) = CURRENT_DATE),
    'attendance_today', (
      SELECT ROUND(AVG(
        CASE WHEN a.status = 'present' THEN 100 ELSE 0 END
      ), 2)
      FROM attendance a
      WHERE a.institution_id = p_institution_id AND a.date = CURRENT_DATE
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-generate receipt numbers
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_number IS NULL THEN
    NEW.receipt_number := 'RCP' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(nextval('receipt_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS receipt_seq START 1;
CREATE TRIGGER gen_receipt_number BEFORE INSERT ON fee_payments FOR EACH ROW EXECUTE FUNCTION generate_receipt_number();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, first_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'guest')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
