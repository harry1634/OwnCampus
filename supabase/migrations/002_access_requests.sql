-- Access requests table: pending registrations waiting for admin approval
CREATE TABLE IF NOT EXISTS access_requests (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text    NOT NULL,
  email         text    NOT NULL,
  role          text    NOT NULL CHECK (role IN ('student', 'faculty')),
  class_section text,
  roll_number   text,
  department    text,
  designation   text,
  phone         text,
  status        text    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Anyone can submit a registration request (public)
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_insert_access_requests"
  ON access_requests FOR INSERT WITH CHECK (true);

-- Default institution (required as FK for user_profiles)
INSERT INTO institutions (id, name, slug, type, email)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'OwnCampus School',
  'owncampus',
  'school',
  'admin@owncampus.com'
)
ON CONFLICT (id) DO NOTHING;
