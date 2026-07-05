-- ═══════════════════════════════════════════════════════════════
-- 018_saas_integration.sql
-- Full SaaS integration: extended limits, provisioning state,
-- dashboard access control, updated status values.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Extended license limits ──────────────────────────────────
ALTER TABLE institution_licenses
  ADD COLUMN IF NOT EXISTS max_admins               INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_departments          INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_courses              INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS max_classes              INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS max_library_books        INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS max_hostel_rooms         INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS max_vehicles             INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS max_api_requests         INTEGER NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS max_realtime_connections INTEGER NOT NULL DEFAULT 100;

-- ─── 2. Provisioning state on institutions ───────────────────────
ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS activation_token  TEXT,
  ADD COLUMN IF NOT EXISTS activated_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provisioned_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_used_mb   NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS temp_admin_email  TEXT,
  ADD COLUMN IF NOT EXISTS provisioned_by    UUID REFERENCES company_users(id) ON DELETE SET NULL;

-- ─── 3. Expand control_status to include grace_period + expired ──
ALTER TABLE institutions
  DROP CONSTRAINT IF EXISTS institutions_control_status_check;

ALTER TABLE institutions
  ADD CONSTRAINT institutions_control_status_check
  CHECK (control_status IN (
    'pending', 'trial', 'active', 'grace_period',
    'suspended', 'expired', 'cancelled'
  ));

-- ─── 4. Institution dashboards access ────────────────────────────
-- Controls whether admin / faculty / student dashboards are enabled
CREATE TABLE IF NOT EXISTS institution_dashboards (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  dashboard_key   TEXT        NOT NULL CHECK (dashboard_key IN ('admin','faculty','student')),
  is_enabled      BOOLEAN     NOT NULL DEFAULT true,
  updated_by      UUID        REFERENCES company_users(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, dashboard_key)
);

ALTER TABLE institution_dashboards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'deny_all_dashboards'
    AND tablename    = 'institution_dashboards'
  ) THEN
    CREATE POLICY "deny_all_dashboards"
      ON institution_dashboards FOR ALL USING (false);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_institution_dashboards_inst
  ON institution_dashboards(institution_id);

-- ─── 5. Updated status history constraint ────────────────────────
ALTER TABLE institution_status_history
  DROP CONSTRAINT IF EXISTS institution_status_history_new_status_check;

-- (no explicit check on status_history — keep it flexible for audit)

-- ─── 6. Index on activation_token for fast lookup ────────────────
CREATE INDEX IF NOT EXISTS idx_institutions_activation_token
  ON institutions(activation_token)
  WHERE activation_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_institutions_temp_email
  ON institutions(temp_admin_email)
  WHERE temp_admin_email IS NOT NULL;
