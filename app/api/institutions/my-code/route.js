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

    // Fetch extended fields for settings page
    let ext = {}
    try {
      const { data: full } = await supabase
        .from('institutions')
        .select('email, phone, website, address, city, state, pincode, established_year, affiliation, accreditation')
        .eq('id', inst.id)
        .single()
      if (full) ext = full
    } catch (_) {}

    return Response.json({
      id:               inst.id,
      name:             inst.name,
      type:             inst.type,
      code,
      logo_url:         inst.logo_url || null,
      email:            ext.email            || '',
      phone:            ext.phone            || '',
      website:          ext.website          || '',
      address:          ext.address          || '',
      city:             ext.city             || '',
      state:            ext.state            || '',
      pincode:          ext.pincode          || '',
      established_year: ext.established_year || '',
      affiliation:      ext.affiliation      || '',
      accreditation:    ext.accreditation    || '',
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/institutions/my-code — update institution fields (logo_url, name, type, contact, etc.)
export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

    const body = await req.json()
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.institution_id) {
      return Response.json({ error: 'No institution linked to this account.' }, { status: 404 })
    }

    const ADMIN_ROLES = ['owner', 'super_admin', 'principal', 'vice_principal', 'administrator']
    if (!ADMIN_ROLES.includes(profile.role)) {
      return Response.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const ALLOWED = ['logo_url','name','type','email','phone','website','address','city','state','pincode','established_year','affiliation','accreditation']
    const patch = Object.fromEntries(Object.entries(body).filter(([k]) => ALLOWED.includes(k)))
    if (Object.keys(patch).length === 0) return Response.json({ error: 'No valid fields to update.' }, { status: 400 })

    const { error } = await admin
      .from('institutions')
      .update(patch)
      .eq('id', profile.institution_id)

    if (error) throw new Error(error.message)

    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
