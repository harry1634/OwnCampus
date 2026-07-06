import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/classes — all classes for this institution, sorted
export async function GET() {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    let q = admin.from('classes').select('id, name, section').order('name').order('section')
    if (institutionId) q = q.eq('institution_id', institutionId)

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 400 })

    const classes = (data || []).map(c => ({
      id:   c.id,
      name: c.section ? `${c.name} - ${c.section}` : c.name,
    }))

    return Response.json({ classes })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
