import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// POST /api/restore
// Restores a soft-deleted entity.
// Body: { table, id }
// Returns: { success: true }

const ADMIN_ROLES = ['owner', 'super_admin', 'principal', 'vice_principal']

const RESTORABLE = new Set([
  'students', 'faculty', 'leaves', 'hostel_allocations',
  'transport_assignments', 'exams', 'announcements',
  'book_issues', 'documents', 'timetable',
])

export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { table, id } = body

    if (!table || !id) {
      return Response.json({ error: 'table and id are required.' }, { status: 400 })
    }
    if (!RESTORABLE.has(table)) {
      return Response.json({ error: `Table "${table}" is not restorable.` }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify role
    const { data: profile } = await admin
      .from('user_profiles')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (!ADMIN_ROLES.includes(profile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const institutionId = profile?.institution_id || null

    // Call the atomic restore RPC
    const { data, error } = await admin.rpc('rpc_restore_entity', {
      p_table_name:     table,
      p_entity_id:      id,
      p_institution_id: institutionId,
      p_actor_id:       user.id,
    })

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, result: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/restore?table=students&limit=20
// Lists recently soft-deleted records for a given table

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (!ADMIN_ROLES.includes(profile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const table  = searchParams.get('table') || 'students'
    const limit  = Math.min(50, parseInt(searchParams.get('limit') || '20'))

    if (!RESTORABLE.has(table)) {
      return Response.json({ error: `Table "${table}" is not restorable.` }, { status: 400 })
    }

    const institutionId = profile?.institution_id || null

    const { data, error } = await admin
      .from(table)
      .select('id, deleted_at, deleted_by, created_at')
      .not('deleted_at', 'is', null)
      .eq('institution_id', institutionId)
      .order('deleted_at', { ascending: false })
      .limit(limit)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ deleted: data || [] })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
