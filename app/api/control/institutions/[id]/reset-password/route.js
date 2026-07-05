import { requireControlUser } from '@/lib/control/auth'
import { createAdminClient }  from '@/lib/supabase/admin'

function generateTempPassword() {
  const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower  = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const syms   = '!@#$'
  const all    = upper + lower + digits + syms
  const pick   = (set) => set[Math.floor(Math.random() * set.length)]
  const chars  = [pick(upper), pick(lower), pick(digits), pick(syms)]
  for (let i = 4; i < 16; i++) chars.push(pick(all))
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export async function POST(req, { params }) {
  try {
    await requireControlUser()
    const { id } = await params
    const admin  = createAdminClient()

    const { data: inst } = await admin
      .from('institutions')
      .select('id, name, temp_admin_email, provisioned_at')
      .eq('id', id)
      .single()

    if (!inst)             return Response.json({ error: 'Institution not found.' },          { status: 404 })
    if (!inst.provisioned_at) return Response.json({ error: 'Institution not yet provisioned.' }, { status: 400 })
    if (!inst.temp_admin_email) return Response.json({ error: 'No admin email on record.' },  { status: 400 })

    // Find the admin's user_profiles row
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id, metadata')
      .eq('email', inst.temp_admin_email)
      .eq('institution_id', id)
      .maybeSingle()

    if (!profile) return Response.json({ error: 'Admin user not found in user_profiles.' }, { status: 404 })

    const newPassword = generateTempPassword()

    // Update the Supabase auth password
    const { error: authErr } = await admin.auth.admin.updateUserById(profile.id, { password: newPassword })
    if (authErr) return Response.json({ error: `Could not reset password: ${authErr.message}` }, { status: 500 })

    // Persist new temp_password in metadata so the CC can always read it back
    await admin.from('user_profiles').update({
      metadata: { ...(profile.metadata || {}), temp_password: newPassword },
    }).eq('id', profile.id)

    return Response.json({ ok: true, temp_password: newPassword })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
