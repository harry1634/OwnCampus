import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET /api/institutions/my-code
// Returns the institution code for the currently logged-in admin.
// Works even before migration 005 is run — never selects the `code` column directly
// since it may not exist yet. Instead derives a stable code from slug + name.

export async function GET() {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

    const supabase = createAdminClient()

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.institution_id) {
      return Response.json({ error: 'No institution linked to this account.' }, { status: 404 })
    }

    // Only select columns guaranteed to exist from migration 001
    const { data: inst, error } = await supabase
      .from('institutions')
      .select('id, name, type, slug, logo_url')
      .eq('id', profile.institution_id)
      .single()

    if (error || !inst) {
      return Response.json({ error: 'Institution not found.' }, { status: 404 })
    }

    // Try to get the `code` column separately — it only exists after migration 005
    let code = null
    try {
      const { data: withCode } = await supabase
        .from('institutions')
        .select('code')
        .eq('id', inst.id)
        .single()
      code = withCode?.code || null
    } catch (_) { /* column doesn't exist yet */ }

    if (!code) {
      // Derive a stable, deterministic code from name + slug
      // so it's the same every time even before migration 005 runs
      const nameChars = (inst.name || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X')
      const slugTail  = (inst.slug || inst.id).replace(/-/g, '').toUpperCase().slice(-4)
      code = nameChars + slugTail

      // Try to persist — silently skip if column doesn't exist
      try {
        await supabase.from('institutions').update({ code }).eq('id', inst.id)
      } catch (_) {}
    }

    return Response.json({ id: inst.id, name: inst.name, type: inst.type, code, logo_url: inst.logo_url || null })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
