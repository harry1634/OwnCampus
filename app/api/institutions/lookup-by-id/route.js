import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET /api/institutions/lookup-by-id?id=<uuid>
// Returns the institution code for the current admin's institution.
// Auth required — only returns data for the caller's own institution or super_admin.

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')?.trim()

    if (!id) return Response.json({ error: 'id is required.' }, { status: 400 })

    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

    const supabase = createAdminClient()

    // Verify caller belongs to this institution (or is super_admin)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    const isSuperAdmin   = profile?.role === 'super_admin'
    const isOwnInstitution = profile?.institution_id === id

    if (!isSuperAdmin && !isOwnInstitution) {
      return Response.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('institutions')
      .select('id, name, type, code, is_active')
      .eq('id', id)
      .single()

    if (error || !data) return Response.json({ error: 'Institution not found.' }, { status: 404 })

    // If code is missing (created before migration 005), generate and save one now
    if (!data.code) {
      const namePrefix    = data.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6).padEnd(4, 'X')
      const codeSuffix    = Date.now().toString(36).toUpperCase().slice(-4)
      const generatedCode = namePrefix + codeSuffix
      await supabase.from('institutions').update({ code: generatedCode }).eq('id', id)
      data.code = generatedCode
    }

    return Response.json({ id: data.id, name: data.name, type: data.type, code: data.code })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
