/**
 * lib/supabase/admin.js
 * Singleton Supabase admin client using the service role key.
 *
 * Connection pooling:
 *   The @supabase/supabase-js client communicates over HTTP (PostgREST),
 *   not direct Postgres TCP. All connections pass through Supabase's built-in
 *   PgBouncer (transaction mode). No application-level pooling is required.
 *
 *   For direct SQL access (pg_cron, migrations), use SUPABASE_DB_URL with the
 *   pooler port:  postgresql://...@<project>.supabase.co:6543/postgres?pgbouncer=true
 */

import { createClient } from '@supabase/supabase-js'

let _adminClient = null

export function createAdminClient() {
  if (_adminClient) return _adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')

  _adminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
    db: {
      // Use the pooler URL if explicitly configured; otherwise fall back to REST
      // which is already pooled via PgBouncer on the Supabase platform.
      schema: 'public',
    },
    global: {
      headers: {
        // Tag all admin client requests for observability in Supabase logs
        'x-client-info': `owncampus-admin/${process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'}`,
      },
    },
  })

  return _adminClient
}
