-- Migration 020: LMS Courses, Purchase Orders, Equipment Requests
-- Replaces localStorage-backed CRUD with real DB persistence

-- ── LMS Courses ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lms_courses (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  subject        TEXT,
  description    TEXT,
  status         TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  modules        JSONB       NOT NULL DEFAULT '[]',
  metadata       JSONB       NOT NULL DEFAULT '{}',
  created_by     UUID        REFERENCES user_profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lms_courses_institution_idx ON lms_courses(institution_id);

ALTER TABLE lms_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "institution users can read own lms courses"
  ON lms_courses FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "admin and faculty can insert lms courses"
  ON lms_courses FOR INSERT
  WITH CHECK (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "admin and faculty can update own lms courses"
  ON lms_courses FOR UPDATE
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ── Purchase Orders ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_orders (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  po_number      TEXT        NOT NULL,
  vendor         TEXT        NOT NULL,
  items          TEXT        NOT NULL,
  amount         DECIMAL(14,2) DEFAULT 0,
  category       TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','approved','delivered','rejected')),
  raised_by      UUID        REFERENCES user_profiles(id),
  raised_at      DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(institution_id, po_number)
);

CREATE INDEX IF NOT EXISTS purchase_orders_institution_idx ON purchase_orders(institution_id);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "institution users can read purchase orders"
  ON purchase_orders FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "institution users can insert purchase orders"
  ON purchase_orders FOR INSERT
  WITH CHECK (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "institution users can update purchase orders"
  ON purchase_orders FOR UPDATE
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ── Equipment Requests ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS equipment_requests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  faculty_id     UUID        REFERENCES user_profiles(id),
  faculty_name   TEXT,
  item           TEXT        NOT NULL,
  quantity       INTEGER     DEFAULT 1,
  urgency        TEXT        NOT NULL DEFAULT 'medium'
                             CHECK (urgency IN ('low','medium','high')),
  reason         TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','approved','rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS equipment_requests_institution_idx ON equipment_requests(institution_id);
CREATE INDEX IF NOT EXISTS equipment_requests_faculty_idx     ON equipment_requests(faculty_id);

ALTER TABLE equipment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "institution users can read equipment requests"
  ON equipment_requests FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "faculty can insert own equipment requests"
  ON equipment_requests FOR INSERT
  WITH CHECK (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "institution users can update equipment requests"
  ON equipment_requests FOR UPDATE
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Soft-delete for equipment_requests (cancel instead of delete)
ALTER TABLE equipment_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- ── Alumni ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alumni (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  batch          TEXT,
  program        TEXT,
  company        TEXT,
  role           TEXT,
  location       TEXT,
  email          TEXT,
  phone          TEXT,
  linkedin_url   TEXT,
  is_mentor      BOOLEAN     NOT NULL DEFAULT false,
  avatar_color   TEXT,
  added_by       UUID        REFERENCES user_profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alumni_institution_idx ON alumni(institution_id);

ALTER TABLE alumni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "institution users can read alumni"
  ON alumni FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "admins can insert alumni"
  ON alumni FOR INSERT
  WITH CHECK (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "admins can update alumni"
  ON alumni FOR UPDATE
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ── Inventory Items ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_items (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  category       TEXT,
  quantity       INTEGER     NOT NULL DEFAULT 0,
  unit           TEXT        DEFAULT 'Units',
  min_stock      INTEGER     DEFAULT 0,
  value          DECIMAL(14,2) DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'ok'
                             CHECK (status IN ('ok','low','critical','out')),
  added_by       UUID        REFERENCES user_profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_items_institution_idx ON inventory_items(institution_id);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "institution users can read inventory"
  ON inventory_items FOR SELECT
  USING (institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "admins can insert inventory"
  ON inventory_items FOR INSERT
  WITH CHECK (institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "admins can update inventory"
  ON inventory_items FOR UPDATE
  USING (institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid()));

-- ── Placement Companies / Drives ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS placement_drives (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  company_name   TEXT        NOT NULL,
  industry       TEXT,
  role           TEXT,
  ctc            TEXT,
  drive_date     DATE,
  slots          INTEGER     DEFAULT 0,
  applied        INTEGER     DEFAULT 0,
  shortlisted    INTEGER     DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'upcoming'
                             CHECK (status IN ('upcoming','ongoing','completed','cancelled')),
  added_by       UUID        REFERENCES user_profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS placement_drives_institution_idx ON placement_drives(institution_id);

ALTER TABLE placement_drives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "institution users can read placement drives"
  ON placement_drives FOR SELECT
  USING (institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "admins can insert placement drives"
  ON placement_drives FOR INSERT
  WITH CHECK (institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "admins can update placement drives"
  ON placement_drives FOR UPDATE
  USING (institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid()));
