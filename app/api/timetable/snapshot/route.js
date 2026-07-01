import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET  /api/timetable/snapshot  — load the published timetable for this institution
// POST /api/timetable/snapshot  — save (publish) the timetable for this institution
// Stored in institutions.settings.timetable_snapshot as a JSON blob.

async function getInstitutionId(admin, userId) {
  const { data } = await admin.from('user_profiles').select('institution_id').eq('id', userId).single()
  return data?.institution_id || null
}

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const institutionId = await getInstitutionId(admin, user.id)
    if (!institutionId) return Response.json({ snapshot: null })

    const { data } = await admin
      .from('institutions')
      .select('settings')
      .eq('id', institutionId)
      .single()

    const snapshot = data?.settings?.timetable_snapshot || null
    return Response.json({ snapshot })
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
    const institutionId = await getInstitutionId(admin, user.id)
    if (!institutionId) return Response.json({ error: 'No institution found' }, { status: 400 })

    const body = await req.json()
    const { timetableData } = body
    if (!timetableData) return Response.json({ error: 'timetableData is required' }, { status: 400 })

    // Fetch existing settings to merge (don't overwrite other settings keys)
    const { data: inst } = await admin
      .from('institutions').select('settings').eq('id', institutionId).single()
    const existing = inst?.settings || {}

    const { error } = await admin
      .from('institutions')
      .update({ settings: { ...existing, timetable_snapshot: timetableData, timetable_published_at: new Date().toISOString() } })
      .eq('id', institutionId)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
