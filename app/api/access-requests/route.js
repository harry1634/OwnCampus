import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const SUPER_ADMIN_ROLES = ['super_admin']
const INST_ADMIN_ROLES  = ['owner', 'super_admin', 'principal', 'vice_principal',
                            'academic_coordinator', 'chairman', 'director', 'administrator']

async function sendEmail(to, subject, html) {
  if (!process.env.RESEND_API_KEY) return { ok: false }
  try {
    const res  = await fetch('https://api.resend.com/emails', {
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
    return { ok: res.ok }
  } catch {
    return { ok: false }
  }
}

export async function POST(req) {
  try {
    const {
      name, email, role, classSection, rollNumber,
      department, designation, phone, branch,
      institutionCode, institutionId: rawInstitutionId,
    } = await req.json()

    if (!name?.trim() || !email?.trim() || !role) {
      return Response.json({ error: 'Name, email, and role are required.' }, { status: 400 })
    }

    if (!['student', 'faculty'].includes(role)) {
      return Response.json({ error: 'Invalid role. Must be student or faculty.' }, { status: 400 })
    }

    const supabase   = createAdminClient()
    const cleanEmail = email.toLowerCase().trim()

    // ── Resolve institution — REQUIRED ──────────────────────────────────
    let institutionId = rawInstitutionId || null

    if (!institutionId && institutionCode) {
      const { data: inst } = await supabase
        .from('institutions')
        .select('id, is_active')
        .ilike('code', institutionCode.trim())
        .maybeSingle()

      if (!inst) {
        return Response.json({ error: 'Institution code not found. Ask your school admin for the correct code.' }, { status: 400 })
      }
      if (inst.is_active === false) {
        return Response.json({ error: 'This institution account is inactive. Contact support.' }, { status: 403 })
      }
      institutionId = inst.id
    }

    if (!institutionId) {
      return Response.json({
        error: 'Institution code is required. Every access request must be linked to an institution. Ask your school admin for the code.',
      }, { status: 400 })
    }

    // ── Block duplicate active requests ──────────────────────────────────
    const { data: existing } = await supabase
      .from('access_requests')
      .select('id, status')
      .eq('email', cleanEmail)
      .neq('status', 'rejected')
      .maybeSingle()

    if (existing?.status === 'approved') {
      return Response.json({ error: 'This email already has approved access. Please log in directly.' }, { status: 400 })
    }
    if (existing?.status === 'pending') {
      return Response.json({ error: 'A request for this email is already pending admin review.' }, { status: 400 })
    }

    const insertPayload = {
      name:           name.trim(),
      email:          cleanEmail,
      role,
      class_section:  classSection || null,
      roll_number:    rollNumber   || null,
      department:     department   || null,
      designation:    designation  || null,
      phone:          phone?.replace(/[\s\-().+]/g, '') || null,
      institution_id: institutionId,
    }
    if (branch) insertPayload.branch = branch.trim()

    const { data, error } = await supabase
      .from('access_requests')
      .insert(insertPayload)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 400 })

    // ── Notify admin via email ───────────────────────────────────────────
    // Find institution admins to notify
    const { data: admins } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('institution_id', institutionId)
      .in('role', INST_ADMIN_ROLES)
      .eq('is_active', true)
      .limit(3)

    const adminEmails = (admins || []).map(a => a.email).filter(Boolean)
    // Also notify global ADMIN_EMAIL env var if set
    if (process.env.ADMIN_EMAIL) adminEmails.push(process.env.ADMIN_EMAIL)

    if (adminEmails.length > 0) {
      const appUrl    = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const roleColor = role === 'faculty' ? '#059669' : '#7c3aed'
      const roleExtra =
        role === 'student'
          ? `<tr><td style="padding:6px 0;color:#64748b;width:120px">Class</td><td style="padding:6px 0;color:#0f172a">${classSection || '—'}</td></tr>
             <tr><td style="padding:6px 0;color:#64748b">Roll No.</td><td style="padding:6px 0;color:#0f172a">${rollNumber || '—'}</td></tr>`
          : `<tr><td style="padding:6px 0;color:#64748b;width:120px">Department</td><td style="padding:6px 0;color:#0f172a">${department || '—'}</td></tr>
             <tr><td style="padding:6px 0;color:#64748b">Designation</td><td style="padding:6px 0;color:#0f172a">${designation || '—'}</td></tr>`

      await sendEmail(
        adminEmails,
        `New Access Request — ${name} (${role})`,
        `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <div style="background:linear-gradient(135deg,#1e40af,#2563eb);padding:24px;border-radius:12px;margin-bottom:24px">
            <h2 style="color:white;margin:0;font-size:20px">New Portal Access Request</h2>
            <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px">Someone is requesting access to your institution on OwnCampus</p>
          </div>
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#64748b;width:120px">Name</td><td style="padding:6px 0;font-weight:600;color:#0f172a">${name}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0;color:#0f172a">${cleanEmail}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Role</td><td style="padding:6px 0;font-weight:600;color:${roleColor};text-transform:capitalize">${role}</td></tr>
            ${roleExtra}
            <tr><td style="padding:6px 0;color:#64748b">Phone</td><td style="padding:6px 0;color:#0f172a">${phone || '—'}</td></tr>
          </table>
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0">
            <a href="${appUrl}/dashboard" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
              Review in Admin Dashboard →
            </a>
          </div>
        </div>`
      )
    }

    return Response.json({ success: true, id: data.id })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminClient()

    // Resolve caller's role and institution
    const { data: prof } = await supabase
      .from('user_profiles')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    const institutionId = prof?.institution_id || null
    const isSuperAdmin  = SUPER_ADMIN_ROLES.includes(prof?.role || '')

    // Any non-admin role is rejected — prevents students/faculty from listing requests
    if (!isSuperAdmin && !INST_ADMIN_ROLES.includes(prof?.role || '')) {
      return Response.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    let query = supabase
      .from('access_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (isSuperAdmin) {
      // Super admin sees all requests across all institutions
    } else if (institutionId) {
      // Institution admin sees ONLY their institution's requests
      // No NULL fallback — requests without institution_id are invisible to regular admins
      query = query.eq('institution_id', institutionId)
    } else {
      // No institution context — return empty (shouldn't normally happen for valid admins)
      return Response.json([])
    }

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json(data || [])
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
