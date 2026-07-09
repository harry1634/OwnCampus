-- ============================================================
-- Migration 023 — Import Jobs
-- Tracks the status and progress of background student import jobs.
-- Used by the bulk import Inngest function and the polling endpoint.
-- ============================================================

CREATE TABLE IF NOT EXISTS import_jobs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'queued'
                              CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  total           INTEGER     NOT NULL DEFAULT 0,
  processed       INTEGER     NOT NULL DEFAULT 0,
  created         INTEGER     NOT NULL DEFAULT 0,
  skipped         INTEGER     NOT NULL DEFAULT 0,
  errors          INTEGER     NOT NULL DEFAULT 0,
  error_details   JSONB,
  row_data        JSONB       NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  inngest_event_id TEXT
);

-- Index for polling by institution + recency
CREATE INDEX IF NOT EXISTS idx_import_jobs_institution_created
  ON import_jobs(institution_id, created_at DESC);

-- Index for status-based queue monitoring
CREATE INDEX IF NOT EXISTS idx_import_jobs_status
  ON import_jobs(status, created_at DESC);

-- RLS
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- Institution admins can read their own import jobs (via service role for writes)
DROP POLICY IF EXISTS "import_jobs: institution users read own" ON import_jobs;
CREATE POLICY "import_jobs: institution users read own"
  ON import_jobs FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles WHERE id = auth.uid()
    )
  );
