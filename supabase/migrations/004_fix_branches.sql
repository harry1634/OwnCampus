-- ============================================================
-- Migration 004: Add branch support to existing tables
-- Run this in Supabase SQL Editor → https://supabase.com/dashboard
-- ============================================================

-- 1. Create branches table if it doesn't already exist
CREATE TABLE IF NOT EXISTS branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  code          VARCHAR(20),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add branch_id to user_profiles if missing
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

-- 3. Add is_active to user_profiles if missing (used for soft-delete)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. Add branch text column to access_requests if missing
ALTER TABLE access_requests
  ADD COLUMN IF NOT EXISTS branch TEXT;

-- 5. Reload PostgREST schema cache so the new columns are visible immediately
NOTIFY pgrst, 'reload schema';
