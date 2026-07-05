/**
 * GET  /api/control/institutions/[id]/credentials
 *   Returns the institution admin's email and temp_password (from metadata or email_queue).
 *
 * POST /api/control/institutions/[id]/credentials
 *   Resends the welcome/credentials email to a specified address.
 *   Body: { to_email }  — if omitted, sends to the original admin email.
 */

import { requireControlUser } from '@/lib/control/auth'
import { createAdminClient }  from '@/lib/supabase/admin'
import { queueAndSend }       from '@/lib/email'

export async function GET(req, { params }) {
  try {
    await requireControlUser()
    const { id } = await params
    const admin   = createAdminClient()

    // Fetch institution row to get the admin email stored at provisioning time
    const { data: inst } = await admin
      .from('institutions')
      .select('id, name, code, temp_admin_email, provisioned_at')
      .eq('id', id)
      .single()

    if (!inst) return Response.json({ error: 'Institution not found.' }, { status: 404 })
    if (!inst.provisioned_at) return Response.json({ error: 'Institution not yet provisioned.' }, { status: 400 })

    const adminEmail = inst.temp_admin_email

    // Look up the admin user_profiles row to get temp_password from metadata
    let tempPassword = null
    if (adminEmail) {
      const { data: profile } = await admin
        .from('user_profiles')
        .select('metadata')
        .eq('email', adminEmail)
        .eq('institution_id', id)
        .single()

      tempPassword = profile?.metadata?.temp_password || null
    }

    // Fallback: pull from email_queue variables if not in metadata (existing provisioned institutions)
    if (!tempPassword && adminEmail) {
      const { data: qRow } = await admin
        .from('email_queue')
        .select('variables')
        .eq('institution_id', id)
        .eq('template_key', 'institution_welcome')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      tempPassword = qRow?.variables?.temp_password || null
    }

    return Response.json({
      admin_email:   adminEmail  || null,
      temp_password: tempPassword || null,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}

export async function POST(req, { params }) {
  try {
    await requireControlUser()
    const { id }  = await params
    const body    = await req.json()
    const admin   = createAdminClient()

    const { data: inst } = await admin
      .from('institutions')
      .select('id, name, code, temp_admin_email, provisioned_at')
      .eq('id', id)
      .single()

    if (!inst)              return Response.json({ error: 'Institution not found.' }, { status: 404 })
    if (!inst.provisioned_at) return Response.json({ error: 'Institution not yet provisioned.' }, { status: 400 })

    // Determine recipient
    const toEmail = (body.to_email || inst.temp_admin_email || '').trim()
    if (!toEmail) return Response.json({ error: 'to_email is required.' }, { status: 400 })

    // Get temp_password from profile metadata (or email_queue fallback)
    const { data: profile } = await admin
      .from('user_profiles')
      .select('first_name, last_name, metadata')
      .eq('email', inst.temp_admin_email)
      .eq('institution_id', id)
      .single()

    let tempPassword = profile?.metadata?.temp_password || null

    if (!tempPassword) {
      const { data: qRow } = await admin
        .from('email_queue')
        .select('variables')
        .eq('institution_id', id)
        .eq('template_key', 'institution_welcome')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      tempPassword = qRow?.variables?.temp_password || null
    }

    if (!tempPassword) {
      return Response.json({ error: 'Temporary password not found. Cannot resend credentials.' }, { status: 400 })
    }

    const adminName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Admin'
    const loginUrl  = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login`

    const result = await queueAndSend({
      to_email:      toEmail,
      to_name:       adminName,
      subject:       `OwnCampus — Login Credentials for ${inst.name}`,
      template_key:  'credentials_resend',
      body_html:     buildCredentialsEmail(inst.name, adminName, inst.code, inst.temp_admin_email, tempPassword, loginUrl),
      variables: {
        institution_name: inst.name,
        institution_code: inst.code,
        admin_email:      inst.temp_admin_email,
        temp_password:    tempPassword,
      },
      institution_id: id,
    })

    if (!result.sent) {
      return Response.json({ error: `Email queued but delivery failed: ${result.error}` }, { status: 500 })
    }

    return Response.json({ ok: true, sent_to: toEmail })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}

function buildCredentialsEmail(instName, adminName, code, email, tempPassword, loginUrl) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>OwnCampus Login Credentials</title></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;padding:40px 0;margin:0">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(15,23,42,0.07)">
    <div style="background:linear-gradient(135deg,#1e40af,#2563eb);padding:32px 36px">
      <p style="color:rgba(255,255,255,0.65);font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.12em">OwnCampus School ERP</p>
      <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:800;letter-spacing:-0.02em">Institution Login Credentials</h1>
    </div>
    <div style="padding:32px 36px">
      <p style="color:#0f172a;font-size:15px;margin:0 0 6px">Hi <strong>${adminName}</strong>,</p>
      <p style="color:#64748b;font-size:13.5px;line-height:1.65;margin:0 0 24px">
        Here are the login credentials for <strong>${instName}</strong>.
      </p>
      <div style="background:#f1f5f9;border-radius:12px;padding:20px 24px;margin-bottom:20px">
        <p style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;margin:0 0 14px">LOGIN CREDENTIALS</p>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="font-size:12.5px;color:#64748b;padding:6px 0;width:150px">Institution Code</td>
            <td style="font-size:15px;font-weight:800;color:#1e40af;letter-spacing:0.12em;padding:6px 0;font-family:monospace">${code}</td>
          </tr>
          <tr>
            <td style="font-size:12.5px;color:#64748b;padding:6px 0">Admin Email</td>
            <td style="font-size:13.5px;font-weight:700;color:#0f172a;padding:6px 0">${email}</td>
          </tr>
          <tr>
            <td style="font-size:12.5px;color:#64748b;padding:6px 0">Temporary Password</td>
            <td style="font-size:15px;font-weight:800;color:#dc2626;font-family:monospace;letter-spacing:0.08em;padding:6px 0">${tempPassword}</td>
          </tr>
          <tr>
            <td style="font-size:12.5px;color:#64748b;padding:6px 0">Login URL</td>
            <td style="font-size:13px;padding:6px 0"><a href="${loginUrl}" style="color:#2563eb;font-weight:600">${loginUrl}</a></td>
          </tr>
        </table>
      </div>
      <p style="font-size:12px;color:#94a3b8;line-height:1.7;margin:0">
        Questions? Contact us at
        <a href="mailto:support@owncampus.in" style="color:#2563eb">support@owncampus.in</a>
      </p>
    </div>
  </div>
</body>
</html>`
}
