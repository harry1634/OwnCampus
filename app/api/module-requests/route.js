import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// Institution-side module request API
// GET  /api/module-requests        — list this institution's requests
// POST /api/module-requests        — { module_key } — submit a new request

const ADMIN_ROLES = ['owner','super_admin','principal','vice_principal',
                     'academic_coordinator','chairman','director','administrator']

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('user_profiles')
      .select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id
    if (!institutionId) return Response.json({ requests: [] })

    const { data, error } = await admin.from('module_requests')
      .select('id, module_key, status, note, rejection_reason, requested_at, reviewed_at')
      .eq('institution_id', institutionId)
      .order('requested_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ requests: data || [] })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('user_profiles')
      .select('institution_id, role').eq('id', user.id).single()

    if (!ADMIN_ROLES.includes(profile?.role || '')) {
      return Response.json({ error: 'Only admins can request modules.' }, { status: 403 })
    }

    const institutionId = profile?.institution_id
    if (!institutionId) {
      return Response.json({ error: 'No institution linked to your account.' }, { status: 400 })
    }

    const { module_key, note } = await req.json()
    if (!module_key?.trim()) {
      return Response.json({ error: 'module_key is required.' }, { status: 400 })
    }

    // Check if there's already a pending request for this module
    const { data: existing } = await admin.from('module_requests')
      .select('id, status')
      .eq('institution_id', institutionId)
      .eq('module_key', module_key)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return Response.json({ error: 'A pending request for this module already exists.' }, { status: 409 })
    }

    // Check if module is already enabled
    const { data: modRow } = await admin.from('institution_modules')
      .select('is_enabled')
      .eq('institution_id', institutionId)
      .eq('module_key', module_key)
      .maybeSingle()

    if (modRow?.is_enabled === true) {
      return Response.json({ error: 'This module is already enabled.' }, { status: 400 })
    }

    const { data, error } = await admin.from('module_requests').insert({
      institution_id: institutionId,
      module_key:     module_key.trim(),
      status:         'pending',
      requested_by:   user.id,
      note:           note?.trim() || null,
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, request: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
