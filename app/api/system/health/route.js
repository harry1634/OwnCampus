import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET /api/system/health
// Returns real-time system health status.
// Only accessible to owner / super_admin.

const ADMIN_ROLES = ['owner', 'super_admin']

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()

    if (!ADMIN_ROLES.includes(profile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const institutionId = profile?.institution_id || null
    const checks = []
    const start  = Date.now()

    // ── 1. Database connectivity ──────────────────────────────────────────────
    try {
      const t0 = Date.now()
      const { error } = await admin.from('institutions').select('id').limit(1)
      const latency = Date.now() - t0
      checks.push({
        name:      'Database',
        status:    error ? 'degraded' : 'ok',
        latency,
        message:   error ? error.message : `Responding in ${latency}ms`,
        icon:      'database',
      })
    } catch (e) {
      checks.push({ name: 'Database', status: 'down', latency: null, message: e.message, icon: 'database' })
    }

    // ── 2. Auth service ────────────────────────────────────────────────────────
    try {
      const t0 = Date.now()
      const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
      const latency = Date.now() - t0
      checks.push({
        name:    'Auth Service',
        status:  error ? 'degraded' : 'ok',
        latency,
        message: error ? error.message : `Responding in ${latency}ms`,
        icon:    'shield',
      })
    } catch (e) {
      checks.push({ name: 'Auth Service', status: 'degraded', latency: null, message: e.message, icon: 'shield' })
    }

    // ── 3. Pending job queue ──────────────────────────────────────────────────
    try {
      const t0 = Date.now()
      const { count: pendingJobs, error } = await admin
        .from('job_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      const { count: failedJobs } = await admin
        .from('job_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed')
      const latency = Date.now() - t0
      checks.push({
        name:    'Job Queue',
        status:  (failedJobs || 0) > 10 ? 'degraded' : 'ok',
        latency,
        message: `${pendingJobs || 0} pending, ${failedJobs || 0} failed`,
        icon:    'queue',
        detail:  { pending: pendingJobs || 0, failed: failedJobs || 0 },
      })
    } catch {
      checks.push({ name: 'Job Queue', status: 'ok', latency: null, message: 'Table not yet created', icon: 'queue' })
    }

    // ── 4. Notification pipeline ──────────────────────────────────────────────
    try {
      const t0 = Date.now()
      const { count: unreadCount, error } = await admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .eq('is_read', false)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      const latency = Date.now() - t0
      checks.push({
        name:    'Notifications',
        status:  error ? 'degraded' : 'ok',
        latency,
        message: error ? error.message : `${unreadCount || 0} unread (24h)`,
        icon:    'bell',
        detail:  { unread_24h: unreadCount || 0 },
      })
    } catch (e) {
      checks.push({ name: 'Notifications', status: 'degraded', latency: null, message: e.message, icon: 'bell' })
    }

    // ── 5. Recent API errors (from audit logs, last 1h) ───────────────────────
    let recentErrors = []
    try {
      const { count: errCount } = await admin
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .like('action', 'error%')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      checks.push({
        name:    'Error Rate',
        status:  (errCount || 0) > 20 ? 'degraded' : 'ok',
        latency: null,
        message: `${errCount || 0} errors in last hour`,
        icon:    'alert',
        detail:  { errors_1h: errCount || 0 },
      })
    } catch {
      checks.push({ name: 'Error Rate', status: 'ok', latency: null, message: 'No errors tracked', icon: 'alert' })
    }

    // ── 6. Storage ────────────────────────────────────────────────────────────
    try {
      const t0 = Date.now()
      const { data: buckets } = await admin.storage.listBuckets()
      const latency = Date.now() - t0
      checks.push({
        name:    'Storage',
        status:  'ok',
        latency,
        message: `${(buckets || []).length} bucket(s) active`,
        icon:    'storage',
      })
    } catch (e) {
      checks.push({ name: 'Storage', status: 'degraded', latency: null, message: e.message, icon: 'storage' })
    }

    // ── 7. Key data counts ────────────────────────────────────────────────────
    let dataCounts = {}
    if (institutionId) {
      const [
        { count: stuCount },
        { count: facCount },
        { count: notifCount },
        { count: auditCount },
      ] = await Promise.all([
        admin.from('students').select('id', { count: 'exact', head: true })
          .eq('institution_id', institutionId).eq('status', 'active').is('deleted_at', null),
        admin.from('faculty').select('id', { count: 'exact', head: true })
          .eq('institution_id', institutionId).eq('status', 'active'),
        admin.from('notifications').select('id', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        admin.from('audit_logs').select('id', { count: 'exact', head: true })
          .eq('institution_id', institutionId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ])
      dataCounts = {
        active_students:   stuCount || 0,
        active_faculty:    facCount || 0,
        notifications_7d:  notifCount || 0,
        audit_events_7d:   auditCount || 0,
      }
    }

    // ── 8. Recent migration status ────────────────────────────────────────────
    let migrationStatus = 'unknown'
    try {
      const { data: migData } = await admin
        .from('schema_migrations')
        .select('version')
        .order('version', { ascending: false })
        .limit(1)
      migrationStatus = migData?.[0]?.version ? `Latest: ${migData[0].version}` : 'unknown'
    } catch {
      migrationStatus = 'schema_migrations table not accessible'
    }

    const overall = checks.every(c => c.status === 'ok') ? 'ok'
      : checks.some(c => c.status === 'down') ? 'down'
      : 'degraded'

    return Response.json({
      status:     overall,
      timestamp:  new Date().toISOString(),
      response_ms: Date.now() - start,
      checks,
      data_counts: dataCounts,
      migration_status: migrationStatus,
      institution_id: institutionId,
    })
  } catch (err) {
    return Response.json({
      status:    'down',
      error:     err.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
