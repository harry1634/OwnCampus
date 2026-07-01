import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const ADMIN_ROLES = ['owner','super_admin','principal','vice_principal',
                     'academic_coordinator','chairman','director','administrator','hr']

export async function GET() {
  try {
    // Auth check — unauthenticated callers must not enumerate branches
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminClient()

    // Resolve caller's institution so only their branches are returned
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('institution_id')
      .eq('id', user.id)
      .single()
    const institutionId = profile?.institution_id || null

    let q = supabase
      .from('branches')
      .select('id, name, code, is_active, created_at')
      .eq('is_active', true)
      .order('name')

    if (institutionId) q = q.eq('institution_id', institutionId)

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ branches: data || [] })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    // Auth + role check
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, code } = await req.json()
    if (!name?.trim()) return Response.json({ error: 'Branch name is required.' }, { status: 400 })

    const supabase = createAdminClient()

    // Resolve caller's institution and role — never fall back to LIMIT 1
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (!ADMIN_ROLES.includes(profile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const institutionId = profile?.institution_id || null
    if (!institutionId) {
      return Response.json({ error: 'No institution linked to your account.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('branches')
      .insert({ name: name.trim(), code: code?.trim() || null, institution_id: institutionId, is_active: true })
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ branch: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
