import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const SUPER_ADMIN_ROLES = ['super_admin']
const INST_ADMIN_ROLES  = ['owner', 'super_admin', 'principal', 'vice_principal',
                            'academic_coordinator', 'chairman', 'director']

async function sendEmail(to, subject, html) {
  if (!process.env.RESEND_API_KEY) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'OwnCampus <onboarding@resend.dev>',
        to,
        subject,
        html,
      }),
    })
  } catch {}
}

export async function POST(req, { params }) {
  try {
    const supabase = createAdminClient()
    const { id }  = await params

    // Auth + institution guard
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

    const { data: callerProfile } = await supabase
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const callerRole = callerProfile?.role || ''

    if (!INST_ADMIN_ROLES.includes(callerRole)) {
      return Response.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const { data: request } = await supabase
      .from('access_requests')
      .select('name, email, role, institution_id')
      .eq('id', id)
      .single()

    if (!request) return Response.json({ error: 'Request not found.' }, { status: 404 })

    // Cross-institution guard — treat null institution_id as a violation for non-super-admins
    const isSuperAdmin = SUPER_ADMIN_ROLES.includes(callerRole)
    if (!isSuperAdmin && request.institution_id !== callerProfile?.institution_id) {
      return Response.json({ error: 'You can only reject requests for your own institution.' }, { status: 403 })
    }

    await supabase
      .from('access_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (request) {
      await sendEmail(
        request.email,
        'Update on Your OwnCampus Access Request',
        `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#0f172a;font-size:20px">OwnCampus Access Request Update</h2>
          <p style="color:#374151;line-height:1.6">Hi <strong>${request.name}</strong>,</p>
          <p style="color:#374151;line-height:1.6">
            We regret to inform you that your <strong>${request.role}</strong> portal access request
            has not been approved at this time.
          </p>
          <p style="color:#374151;line-height:1.6">
            Please contact the institution admin directly for more information
            or to clarify any concerns with your application.
          </p>
          <p style="color:#64748b;font-size:13px;margin-top:24px">— The OwnCampus Team</p>
        </div>`
      )
    }

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
