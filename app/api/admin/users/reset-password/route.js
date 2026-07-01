import { randomBytes }       from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

function generatePassword() {
  const upper   = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const lower   = 'abcdefghjkmnpqrstuvwxyz'
  const digits  = '23456789'
  const special = '@#$!'
  const all     = upper + lower + digits + special
  const buf     = randomBytes(12)
  const required = [
    upper[buf[0] % upper.length],
    lower[buf[1] % lower.length],
    digits[buf[2] % digits.length],
    special[buf[3] % special.length],
  ]
  const rest = Array.from({ length: 6 }, (_, i) => all[buf[4 + i] % all.length])
  const combined = [...required, ...rest]
  const shuffle  = randomBytes(combined.length)
  return combined
    .map((c, i) => ({ c, r: shuffle[i] }))
    .sort((a, b) => a.r - b.r)
    .map(x => x.c)
    .join('')
}

const ADMIN_ROLES = ['owner', 'super_admin', 'principal', 'vice_principal', 'academic_coordinator', 'hr', 'admission_officer']

// POST /api/admin/users/reset-password
// Body: { userId }  — resets the target user's password, saves temp_password to metadata
export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { userId } = body
    if (!userId) return Response.json({ error: 'userId is required' }, { status: 400 })

    const admin = createAdminClient()

    // Role check
    const { data: callerProfile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    if (!ADMIN_ROLES.includes(callerProfile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Institution scoping
    const { data: targetProfile } = await admin
      .from('user_profiles').select('institution_id, metadata').eq('id', userId).single()
    if (!targetProfile) return Response.json({ error: 'User not found' }, { status: 404 })
    if (targetProfile.institution_id !== callerProfile.institution_id) {
      return Response.json({ error: 'User belongs to a different institution' }, { status: 403 })
    }

    const password = generatePassword()

    // Update auth password
    const { error: authErr } = await admin.auth.admin.updateUserById(userId, { password })
    if (authErr) return Response.json({ error: authErr.message }, { status: 400 })

    // Save temp_password to metadata
    await admin.from('user_profiles').update({
      metadata: { ...(targetProfile.metadata || {}), temp_password: password },
    }).eq('id', userId)

    return Response.json({ success: true, password })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
