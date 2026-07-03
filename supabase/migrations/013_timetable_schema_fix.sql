-- ============================================================
-- 013 – Fix timetable_slots schema mismatches
-- Root cause: period_number and room columns missing; start/end
-- time NOT NULL prevents partial saves; no direct FK to
-- user_profiles; no unique constraint for upsert.
-- ============================================================

-- 1. Add period_number (APIs use this for ordering/grouping)
ALTER TABLE timetable_slots
  ADD COLUMN IF NOT EXISTS period_number INTEGER;

-- 2. Add room (APIs use 'room'; original schema had 'room_number')
ALTER TABLE timetable_slots
  ADD COLUMN IF NOT EXISTS room VARCHAR(50);

-- 3. Make time columns nullable (partial-time periods allowed)
ALTER TABLE timetable_slots
  ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE timetable_slots
  ALTER COLUMN end_time DROP NOT NULL;

-- 4. Copy any existing room_number data into new room column
UPDATE timetable_slots
  SET room = room_number
  WHERE room IS NULL AND room_number IS NOT NULL;

  

-- 5. Add faculty_user_id — stores user_profiles.id directly so APIs
--    can join user_profiles without a multi-hop through faculty table.
ALTER TABLE timetable_slots
  ADD COLUMN IF NOT EXISTS faculty_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- 6. Unique constraint for safe delete+insert and future upserts.
--    Partial index: only enforces uniqueness when period_number is set.
DROP INDEX IF EXISTS uq_timetable_slot;
CREATE UNIQUE INDEX IF NOT EXISTS uq_timetable_slot
  ON timetable_slots (institution_id, class_id, day_of_week, period_number)
  WHERE period_number IS NOT NULL;

-- 7. Performance indexes
CREATE INDEX IF NOT EXISTS idx_timetable_faculty_id   ON timetable_slots (faculty_id);
CREATE INDEX IF NOT EXISTS idx_timetable_faculty_user  ON timetable_slots (faculty_user_id);
CREATE INDEX IF NOT EXISTS idx_timetable_period        ON timetable_slots (period_number);
CREATE INDEX IF NOT EXISTS idx_timetable_class_day     ON timetable_slots (class_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_faculty_day   ON timetable_slots (faculty_id, day_of_week);
