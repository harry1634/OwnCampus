-- Migration 019: module_requests table + max_transport_routes on institution_licenses
-- Adds the institution-side module request flow for the Control Center.

-- 1. Add max_transport_routes to institution_licenses (if not already present)
ALTER TABLE institution_licenses
  ADD COLUMN IF NOT EXISTS max_transport_routes INTEGER DEFAULT 10;

-- 2. Create module_requests table
CREATE TABLE IF NOT EXISTS module_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  module_key      TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by    UUID        REFERENCES user_profiles(id),
  reviewed_by     UUID        NULL,  -- cc_uid of control center reviewer (not a FK)
  note            TEXT        NULL,
  rejection_reason TEXT       NULL,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate pending requests for the same institution+module
CREATE UNIQUE INDEX IF NOT EXISTS module_requests_pending_unique
  ON module_requests (institution_id, module_key)
  WHERE (status = 'pending');

-- Index for CC queries (all pending across all institutions)
CREATE INDEX IF NOT EXISTS module_requests_status_idx ON module_requests (status, requested_at DESC);
CREATE INDEX IF NOT EXISTS module_requests_institution_idx ON module_requests (institution_id, requested_at DESC);

-- RLS: institution users can only see and insert their own requests
ALTER TABLE module_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY module_requests_select ON module_requests
  FOR SELECT USING (
    institution_id = (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY module_requests_insert ON module_requests
  FOR INSERT WITH CHECK (
    institution_id = (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- No UPDATE/DELETE for institution users — only CC can update via admin client
