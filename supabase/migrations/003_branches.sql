-- Run this in Supabase SQL Editor to enable branch support in access requests
ALTER TABLE access_requests ADD COLUMN IF NOT EXISTS branch text;
