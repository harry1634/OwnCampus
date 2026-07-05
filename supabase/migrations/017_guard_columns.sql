-- 017: Guard migration — safely add columns that may be missing due to partial
-- migration history. All statements use IF NOT EXISTS so re-running is safe.

-- user_profiles personal info columns (defined in 001 but may have been missed)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender        VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS blood_group   VARCHAR(10);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS address       TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS city          VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS state         VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS pincode       VARCHAR(10);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS country       VARCHAR(100) DEFAULT 'India';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emergency_contact_name  VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url    TEXT;

-- institutions logo column (needed by institution settings page)
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Drop enum casts for gender/blood_group if the original enum types don't exist
-- (some deployments use VARCHAR instead of the enum types defined in 001)
-- The VARCHAR(20) / VARCHAR(10) definitions above are intentionally permissive.
