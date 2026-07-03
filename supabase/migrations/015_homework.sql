-- Migration 015: Homework module
-- Faculty create homework assignments; students view and submit

CREATE TABLE IF NOT EXISTS homework (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  institution_id  UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  faculty_id      UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  class_id        UUID        REFERENCES classes(id)   ON DELETE SET NULL,
  branch_id       UUID        REFERENCES branches(id)  ON DELETE SET NULL,
  subject         VARCHAR(255) NOT NULL,
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  due_date        DATE,
  is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
  attachment_url  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homework_submissions (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  homework_id    UUID        NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id     UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  institution_id UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  status         VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','graded','late')),
  notes          TEXT,
  submitted_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (homework_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_homework_institution   ON homework(institution_id);
CREATE INDEX IF NOT EXISTS idx_homework_class         ON homework(class_id);
CREATE INDEX IF NOT EXISTS idx_homework_faculty       ON homework(faculty_id);
CREATE INDEX IF NOT EXISTS idx_homework_due           ON homework(due_date);
CREATE INDEX IF NOT EXISTS idx_homework_submissions   ON homework_submissions(homework_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_s ON homework_submissions(student_id);

ALTER TABLE homework            ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homework_institution" ON homework;
CREATE POLICY "homework_institution" ON homework FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "homework_submissions_policy" ON homework_submissions;
CREATE POLICY "homework_submissions_policy" ON homework_submissions FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
    OR student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE homework;
ALTER PUBLICATION supabase_realtime ADD TABLE homework_submissions;
