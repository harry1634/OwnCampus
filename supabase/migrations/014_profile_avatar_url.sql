-- 014: Ensure avatar_url column exists on user_profiles
-- Column was declared in 001_initial_schema.sql; this migration is a
-- safe no-op guard so the schema is explicit and re-runnable.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
