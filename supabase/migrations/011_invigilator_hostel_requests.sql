-- Add invigilator_id to exams (stores faculty user_profiles.id UUID)
ALTER TABLE exams ADD COLUMN IF NOT EXISTS invigilator_id UUID REFERENCES user_profiles(id);

-- Create hostel_requests table for student hostel applications
CREATE TABLE IF NOT EXISTS hostel_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  preferred_type VARCHAR(50),
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','waitlisted')),
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  allocation_id UUID REFERENCES hostel_allocations(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hostel_requests_institution ON hostel_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_hostel_requests_student ON hostel_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_hostel_requests_status ON hostel_requests(status);
