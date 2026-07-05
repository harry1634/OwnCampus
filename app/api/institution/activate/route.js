/**
 * POST /api/institution/activate
 *
 * Final step of the institution onboarding flow.
 * The admin supplies their institution code, email, temporary password,
 * and a new password. This route:
 *   1. Validates the institution code and email
 *   2. Verifies the institution is in an approved + provisioned state
 *   3. Updates the Supabase auth user's password to the new password
 *   4. Marks the institution as activated
 *
 * The actual sign-in with the temp password is done client-side
 * (via supabase.auth.signInWithPassword). This route receives
 * the authenticated user's JWT and completes the activation.
 */

import { createAdminClient }  from '@/lib/supabase/admin'
import { createClient }        from '@/lib/supabase/server'

const ACTIVATABLE_STATUSES = new Set(['trial', 'active', 'grace_period'])

export async function POST(req) {
  try {
    const { institution_code, new_password } = await req.json()

    if (!institution_code?.trim()) {
      return Response.json({ error: 'Institution code is required.' }, { status: 400 })
    }
    if (!new_password || new_password.length < 8) {
      return Response.json({ error: 'New password must be at least 8 characters.' }, { status: 400 })
    }

    // The user must already be authenticated with the temp password
    const serverClient = await createClient()
    const { data: { user }, error: authErr } = await serverClient.auth.getUser()
    if (authErr || !user) {
      return Response.json({ error: 'Not authenticated. Please sign in with your temporary password first.' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Look up institution by code
    const { data: inst } = await admin
      .from('institutions')
      .select('id, name, code, control_status, temp_admin_email, provisioned_at, activated_at')
      .ilike('code', institution_code.trim())
      .single()

    if (!inst) {
      return Response.json({ error: 'Invalid institution code.' }, { status: 404 })
    }

    // Must be provisioned
    if (!inst.provisioned_at) {
      return Response.json({
        error: 'This institution has not been provisioned yet. Contact OwnCampus support.',
      }, { status: 403 })
    }

    // Must be in an activatable status
    if (!ACTIVATABLE_STATUSES.has(inst.control_status)) {
      const msg = inst.control_status === 'suspended'
        ? 'This institution is suspended. Contact OwnCampus support.'
        : inst.control_status === 'cancelled'
        ? 'This institution account has been cancelled.'
        : `Institution status is '${inst.control_status}'. Contact support.`
      return Response.json({ error: msg }, { status: 403 })
    }

    // Email must match the provisioned admin email
    if (inst.temp_admin_email && user.email?.toLowerCase() !== inst.temp_admin_email.toLowerCase()) {
      return Response.json({
        error: 'This account email does not match the institution admin email.',
      }, { status: 403 })
    }

    // User must belong to this institution
    const { data: profile } = await admin
      .from('user_profiles')
      .select('institution_id')
      .eq('id', user.id)
      .single()

    if (profile?.institution_id && profile.institution_id !== inst.id) {
      return Response.json({ error: 'Institution mismatch.' }, { status: 403 })
    }

    // Update password via admin API
    const { error: pwdErr } = await admin.auth.admin.updateUserById(user.id, {
      password: new_password,
    })
    if (pwdErr) {
      return Response.json({ error: `Failed to update password: ${pwdErr.message}` }, { status: 500 })
    }

    // Mark institution as activated (idempotent)
    if (!inst.activated_at) {
      await admin.from('institutions').update({
        activated_at:     new Date().toISOString(),
        activation_token: null,   // invalidate the one-time token
      }).eq('id', inst.id)
    }

    return Response.json({
      ok:              true,
      institution_id:  inst.id,
      institution_name:inst.name,
      message:         'Institution activated successfully. Welcome to OwnCampus!',
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

/**
 * GET /api/institution/activate?token=xxx&email=xxx
 * Validates an activation token from the welcome email link.
 * Returns institution info so the activate page can pre-fill fields.
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')?.trim()
    const email = searchParams.get('email')?.trim().toLowerCase()

    if (!token) {
      return Response.json({ error: 'Activation token is required.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: inst } = await admin
      .from('institutions')
      .select('id, name, code, control_status, temp_admin_email, provisioned_at, activated_at')
      .eq('activation_token', token)
      .single()

    if (!inst) {
      return Response.json({ error: 'Invalid or expired activation link.' }, { status: 404 })
    }

    if (inst.activated_at) {
      return Response.json({ error: 'This institution has already been activated.' }, { status: 409 })
    }

    if (!ACTIVATABLE_STATUSES.has(inst.control_status)) {
      return Response.json({ error: `Institution status is '${inst.control_status}'. Contact support.` }, { status: 403 })
    }

    return Response.json({
      institution_id:   inst.id,
      institution_name: inst.name,
      institution_code: inst.code,
      admin_email:      inst.temp_admin_email || email || '',
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
