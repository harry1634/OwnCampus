-- 021: Add file attachment support to homework submissions

ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS file_url  TEXT;
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS file_name TEXT;
