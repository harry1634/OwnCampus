-- ═══════════════════════════════════════════════════════════════
-- 016_control_center.sql
-- OwnCampus Control Center — company-level SaaS management tables
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Company Users ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_users (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id  UUID        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  email             TEXT        NOT NULL UNIQUE,
  role              TEXT        NOT NULL DEFAULT 'company_support'
                                CHECK (role IN ('company_owner','company_admin','company_support','company_sales')),
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID,
  metadata          JSONB       NOT NULL DEFAULT '{}'
);

-- Add self-referential FK separately so the table exists first
ALTER TABLE company_users
  DROP CONSTRAINT IF EXISTS company_users_created_by_fkey;
ALTER TABLE company_users
  ADD CONSTRAINT company_users_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES company_users(id) ON DELETE SET NULL;

-- ─── 2. Add control_status to institutions ───────────────────────
ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS control_status TEXT NOT NULL DEFAULT 'pending';

-- Add CHECK constraint if not already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'institutions_control_status_check'
  ) THEN
    ALTER TABLE institutions
      ADD CONSTRAINT institutions_control_status_check
      CHECK (control_status IN ('pending','trial','active','suspended','cancelled'));
  END IF;
END$$;

ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ;

ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS approved_by  UUID REFERENCES company_users(id) ON DELETE SET NULL;

-- ─── 3. Institution Licenses ────────────────────────────────────
CREATE TABLE IF NOT EXISTS institution_licenses (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID        NOT NULL UNIQUE REFERENCES institutions(id) ON DELETE CASCADE,
  billing_cycle     TEXT        NOT NULL DEFAULT 'monthly'
                                CHECK (billing_cycle IN ('monthly','quarterly','annual')),
  monthly_fee       NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency          TEXT        NOT NULL DEFAULT 'INR',
  valid_from        DATE,
  valid_until       DATE,
  grace_period_days INTEGER     NOT NULL DEFAULT 7,
  max_students      INTEGER     NOT NULL DEFAULT 500,
  max_faculty       INTEGER     NOT NULL DEFAULT 50,
  max_branches      INTEGER     NOT NULL DEFAULT 1,
  max_storage_gb    NUMERIC(6,2) NOT NULL DEFAULT 5,
  discount_percent  NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount_reason   TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID        REFERENCES company_users(id) ON DELETE SET NULL,
  updated_by        UUID        REFERENCES company_users(id) ON DELETE SET NULL
);

-- ─── 4. Institution Modules ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS institution_modules (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  module_key      TEXT        NOT NULL,
  is_enabled      BOOLEAN     NOT NULL DEFAULT true,
  enabled_at      TIMESTAMPTZ,
  disabled_at     TIMESTAMPTZ,
  updated_by      UUID        REFERENCES company_users(id) ON DELETE SET NULL,
  UNIQUE(institution_id, module_key)
);

-- ─── 5. Institution Page Permissions ────────────────────────────
CREATE TABLE IF NOT EXISTS institution_page_permissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  page_key        TEXT        NOT NULL,
  role            TEXT        NOT NULL CHECK (role IN ('admin','faculty','student')),
  can_access      BOOLEAN     NOT NULL DEFAULT true,
  updated_by      UUID        REFERENCES company_users(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, page_key, role)
);

-- ─── 6. Institution Action Permissions ──────────────────────────
CREATE TABLE IF NOT EXISTS institution_action_permissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  module_key      TEXT        NOT NULL,
  action          TEXT        NOT NULL CHECK (action IN ('create','read','update','delete','import','export','print','approve')),
  role            TEXT        NOT NULL CHECK (role IN ('admin','faculty','student')),
  is_allowed      BOOLEAN     NOT NULL DEFAULT true,
  updated_by      UUID        REFERENCES company_users(id) ON DELETE SET NULL,
  UNIQUE(institution_id, module_key, action, role)
);

-- ─── 7. Institution Status History ──────────────────────────────
CREATE TABLE IF NOT EXISTS institution_status_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  old_status      TEXT,
  new_status      TEXT        NOT NULL,
  changed_by      UUID        REFERENCES company_users(id) ON DELETE SET NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 8. Institution Payments ────────────────────────────────────
CREATE TABLE IF NOT EXISTS institution_payments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID        NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  billing_month    DATE        NOT NULL,
  amount           NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency         TEXT        NOT NULL DEFAULT 'INR',
  gst_percent      NUMERIC(5,2)  NOT NULL DEFAULT 18,
  gst_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status   TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (payment_status IN ('pending','paid','overdue','waived')),
  payment_method   TEXT,
  payment_date     DATE,
  invoice_number   TEXT        UNIQUE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by       UUID        REFERENCES company_users(id) ON DELETE SET NULL,
  UNIQUE(institution_id, billing_month)
);

-- ─── 9. Support Tickets ─────────────────────────────────────────
-- ticket_number is generated by a BEFORE INSERT trigger (volatile UUID
-- cannot be used in a column DEFAULT in PostgreSQL)
CREATE TABLE IF NOT EXISTS support_tickets (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number    TEXT        NOT NULL UNIQUE,
  institution_id   UUID        REFERENCES institutions(id) ON DELETE SET NULL,
  raised_by_name   TEXT        NOT NULL,
  raised_by_email  TEXT        NOT NULL,
  subject          TEXT        NOT NULL,
  description      TEXT        NOT NULL,
  category         TEXT        NOT NULL DEFAULT 'general'
                               CHECK (category IN ('general','billing','technical','feature_request','bug_report')),
  priority         TEXT        NOT NULL DEFAULT 'medium'
                               CHECK (priority IN ('low','medium','high','critical')),
  status           TEXT        NOT NULL DEFAULT 'open'
                               CHECK (status IN ('open','in_progress','waiting','resolved','closed')),
  assigned_to      UUID        REFERENCES company_users(id) ON DELETE SET NULL,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to auto-generate ticket_number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ticket_number ON support_tickets;
CREATE TRIGGER trg_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
  EXECUTE FUNCTION generate_ticket_number();

-- ─── 10. Support Messages ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type  TEXT        NOT NULL CHECK (sender_type IN ('company_user','institution_user')),
  sender_id    UUID,
  sender_name  TEXT        NOT NULL,
  message      TEXT        NOT NULL,
  attachments  JSONB       NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 11. Company Audit Logs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_audit_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_user_id   UUID        REFERENCES company_users(id) ON DELETE SET NULL,
  company_user_name TEXT        NOT NULL,
  action            TEXT        NOT NULL,
  target_type       TEXT,
  target_id         TEXT,
  target_name       TEXT,
  details           JSONB       NOT NULL DEFAULT '{}',
  ip_address        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 12. Company Settings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_settings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        NOT NULL UNIQUE,
  value       JSONB       NOT NULL DEFAULT 'null',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID        REFERENCES company_users(id) ON DELETE SET NULL
);

-- ─── 13. Email Queue ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_queue (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email        TEXT        NOT NULL,
  to_name         TEXT,
  subject         TEXT        NOT NULL,
  template_key    TEXT,
  body_html       TEXT,
  variables       JSONB       NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','sent','failed')),
  attempts        INTEGER     NOT NULL DEFAULT 0,
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,
  institution_id  UUID        REFERENCES institutions(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_company_users_email            ON company_users(email);
CREATE INDEX IF NOT EXISTS idx_company_users_supabase         ON company_users(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_institution_licenses_inst      ON institution_licenses(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_modules_inst       ON institution_modules(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_payments_inst      ON institution_payments(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_payments_month     ON institution_payments(billing_month);
CREATE INDEX IF NOT EXISTS idx_support_tickets_inst           ON support_tickets(institution_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status         ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket        ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user                ON company_audit_logs(company_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created             ON company_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_institutions_control_status    ON institutions(control_status);
CREATE INDEX IF NOT EXISTS idx_email_queue_status             ON email_queue(status);

-- ─── RLS ─────────────────────────────────────────────────────────
ALTER TABLE company_users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_licenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_modules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_page_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_action_permissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue                ENABLE ROW LEVEL SECURITY;

-- Drop policies first so re-running this migration is safe
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
    WHERE policyname IN (
      'deny_all_company_users','deny_all_inst_licenses','deny_all_inst_modules',
      'deny_all_page_permissions','deny_all_action_permissions','deny_all_status_history',
      'deny_all_inst_payments','deny_all_support_tickets','deny_all_support_messages',
      'deny_all_audit_logs','deny_all_company_settings','deny_all_email_queue'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "deny_all_company_users"      ON company_users              FOR ALL USING (false);
CREATE POLICY "deny_all_inst_licenses"      ON institution_licenses       FOR ALL USING (false);
CREATE POLICY "deny_all_inst_modules"       ON institution_modules        FOR ALL USING (false);
CREATE POLICY "deny_all_page_permissions"   ON institution_page_permissions     FOR ALL USING (false);
CREATE POLICY "deny_all_action_permissions" ON institution_action_permissions   FOR ALL USING (false);
CREATE POLICY "deny_all_status_history"     ON institution_status_history FOR ALL USING (false);
CREATE POLICY "deny_all_inst_payments"      ON institution_payments       FOR ALL USING (false);
CREATE POLICY "deny_all_support_tickets"    ON support_tickets            FOR ALL USING (false);
CREATE POLICY "deny_all_support_messages"   ON support_messages           FOR ALL USING (false);
CREATE POLICY "deny_all_audit_logs"         ON company_audit_logs         FOR ALL USING (false);
CREATE POLICY "deny_all_company_settings"   ON company_settings           FOR ALL USING (false);
CREATE POLICY "deny_all_email_queue"        ON email_queue                FOR ALL USING (false);

-- ─── Seed default company settings ───────────────────────────────
INSERT INTO company_settings (key, value) VALUES
  ('company_name',    '"OwnCampus"'),
  ('company_email',   '"support@owncampus.com"'),
  ('gst_number',      '"27AABCU9603R1ZM"'),
  ('gst_percent',     '18'),
  ('invoice_prefix',  '"OC"'),
  ('currency',        '"INR"'),
  ('smtp_host',       '"smtp.gmail.com"'),
  ('smtp_port',       '587'),
  ('smtp_user',       '""'),
  ('smtp_pass',       '""'),
  ('support_email',   '"support@owncampus.com"')
ON CONFLICT (key) DO NOTHING;
