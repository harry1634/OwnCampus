import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

async function getCallerInstitution(admin, userId) {
  const { data } = await admin.from('user_profiles')
    .select('institution_id, role').eq('id', userId).single()
  return data || {}
}

export async function PATCH(req, { params }) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { name, code } = await req.json()
    if (!name?.trim()) return Response.json({ error: 'Branch name is required.' }, { status: 400 })

    const admin = createAdminClient()
    const caller = await getCallerInstitution(admin, user.id)
    if (!caller.institution_id) return Response.json({ error: 'Institution not resolved.' }, { status: 400 })

    const { data, error } = await admin
      .from('branches')
      .update({ name: name.trim(), code: code?.trim() || null })
      .eq('id', id)
      .eq('institution_id', caller.institution_id)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    if (!data) return Response.json({ error: 'Branch not found or not in your institution.' }, { status: 404 })
    return Response.json({ branch: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const admin = createAdminClient()
    const caller = await getCallerInstitution(admin, user.id)
    if (!caller.institution_id) return Response.json({ error: 'Institution not resolved.' }, { status: 400 })

    // Soft-delete scoped to caller's institution so cross-tenant delete is impossible
    const { error } = await admin
      .from('branches')
      .update({ is_active: false })
      .eq('id', id)
      .eq('institution_id', caller.institution_id)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
