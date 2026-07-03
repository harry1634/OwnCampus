import { randomBytes }       from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { notifyUser }        from '@/lib/services/notification.service'

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
  // Shuffle using crypto random bytes
  const combined = [...required, ...rest]
  const shuffle  = randomBytes(combined.length)
  return combined
    .map((c, i) => ({ c, r: shuffle[i] }))
    .sort((a, b) => a.r - b.r)
    .map(x => x.c)
    .join('')
}

async function sendEmail(to, subject, html) {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY not set in environment variables.' }
  }
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
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = data?.message || data?.name || `Resend error ${res.status}`
      return { ok: false, error: msg }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

const SUPER_ADMIN_ROLES = ['super_admin']
const INST_ADMIN_ROLES  = ['owner', 'super_admin', 'principal', 'vice_principal',
                            'academic_coordinator', 'chairman', 'director', 'administrator']

export async function POST(req, { params }) {
  try {
    const supabase = createAdminClient()
    const { id }   = await params

    // ── Identify the calling admin and their institution ──
    const serverClient = await createClient()
    const { data: { user: callerUser } } = await serverClient.auth.getUser()
    if (!callerUser) return Response.json({ error: 'Unauthorized.' }, { status: 401 })

    const { data: callerProfile } = await supabase
      .from('user_profiles')
      .select('institution_id, role')
      .eq('id', callerUser.id)
      .single()

    const callerInstitutionId = callerProfile?.institution_id || null
    const callerRole          = callerProfile?.role || ''
    const isSuperAdmin        = SUPER_ADMIN_ROLES.includes(callerRole)

    // Non-admins cannot approve
    if (!INST_ADMIN_ROLES.includes(callerRole)) {
      return Response.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    // Fetch the pending request
    const { data: request, error: fetchErr } = await supabase
      .from('access_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !request) {
      return Response.json({ error: 'Request not found.' }, { status: 404 })
    }
    if (request.status === 'approved') {
      return Response.json({ error: 'Already approved.' }, { status: 400 })
    }

    // ── Enforce institution isolation ────────────────────────────────────
    if (!request.institution_id) {
      return Response.json({
        error: 'This request has no institution linked. The user must re-submit using an institution code.',
      }, { status: 400 })
    }

    if (!isSuperAdmin && request.institution_id !== callerInstitutionId) {
      return Response.json({
        error: 'You can only approve requests for your own institution.',
      }, { status: 403 })
    }

    const institutionId = request.institution_id

    const password    = generatePassword()
    const nameParts   = request.name.trim().split(' ')
    const firstName   = nameParts[0]
    const lastName    = nameParts.slice(1).join(' ') || null
    // Preserve the exact role from the request instead of collapsing all non-students to 'teacher'
    const profileRole = request.role === 'student' ? 'student' : (request.role || 'teacher')

    // Resolve branch name → branch UUID (scoped to institution)
    let branchId = null
    if (request.branch) {
      let branchQuery = supabase
        .from('branches')
        .select('id')
        .ilike('name', request.branch.trim())
        .limit(1)
      if (institutionId) branchQuery = branchQuery.eq('institution_id', institutionId)
      const { data: branchRow } = await branchQuery.single()
      branchId = branchRow?.id || null
    }

    if (!request.email) {
      return Response.json({ error: 'No email on this request. Cannot approve.' }, { status: 400 })
    }

    // Create the Supabase Auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email:         request.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name:  request.name,
        first_name: firstName,
        last_name:  lastName,
        role:       profileRole,
      },
    })

    if (authErr) {
      const msg = authErr.message.toLowerCase().includes('already registered')
        ? 'This email is already registered. The user may have been approved before.'
        : authErr.message
      return Response.json({ error: msg }, { status: 400 })
    }

    const userId = authData.user.id

    // Update the profile created by the DB trigger with full details
    await supabase
      .from('user_profiles')
      .upsert(
        {
          id:             userId,
          email:          request.email,
          first_name:     firstName,
          last_name:      lastName,
          role:           profileRole,
          phone:          request.phone || null,
          institution_id: institutionId,
          branch_id:      branchId,
          is_active:      true,
          metadata: {
            class_section: request.class_section || null,
            roll_number:   request.roll_number   || null,
            department:    request.department     || null,
            designation:   request.designation    || null,
            temp_password: password,
          },
        },
        { onConflict: 'id' }
      )

    // ── Create student record in students table (if student) ──
    if (request.role === 'student' && institutionId) {
      // Resolve class_section text → class UUID so attendance & timetable work properly
      let studentClassId = null
      if (request.class_section) {
        const { data: allClasses } = await supabase
          .from('classes')
          .select('id, name, section')
          .eq('institution_id', institutionId)
        const normalizeLabel = v => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '')
        const wanted = normalizeLabel(request.class_section)
        const match  = (allClasses || []).find(c => {
          const n = c.name || '', s = c.section || ''
          return [n, s ? `${n} ${s}` : '', s ? `${n}-${s}` : '']
            .some(candidate => normalizeLabel(candidate) === wanted)
        })
        studentClassId = match?.id || null
      }

      await supabase.from('students').upsert(
        {
          user_id:        userId,
          institution_id: institutionId,
          branch_id:      branchId,
          class_id:       studentClassId,
          roll_number:    request.roll_number || null,
          parent_name:    null,
          status:         'active',
          total_fee:      0,
          paid_amount:    0,
          fee_status:     'pending',
        },
        { onConflict: 'user_id' }
      )
    }

    // ── Create faculty record in faculty table (if teacher) ──
    if (request.role !== 'student' && institutionId) {
      await supabase.from('faculty').upsert(
        {
          user_id:          userId,
          institution_id:   institutionId,
          branch_id:        branchId,
          designation:      request.designation || null,
          status:           'active',
        },
        { onConflict: 'user_id' }
      )
    }

    // Mark the request as approved
    await supabase
      .from('access_requests')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', id)

    // Send approval email with full credentials
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const roleLabel   = request.role.charAt(0).toUpperCase() + request.role.slice(1)
    const extraRow    = profileRole === 'student'
      ? `<tr><td style="padding:5px 0;color:#64748b;font-size:13px">Class / Section</td><td style="padding:5px 0;font-weight:600;color:#0f172a;font-size:13px">${request.class_section || '—'}${request.roll_number ? ' · Roll ' + request.roll_number : ''}</td></tr>`
      : `<tr><td style="padding:5px 0;color:#64748b;font-size:13px">Department</td><td style="padding:5px 0;font-weight:600;color:#0f172a;font-size:13px">${request.department || '—'}${request.designation ? ' · ' + request.designation : ''}</td></tr>`

    const emailResult = await sendEmail(
      request.email,
      'Your OwnCampus Access Has Been Approved',
      `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px 16px">
        <div style="background:linear-gradient(135deg,#1e40af,#7c3aed);padding:32px 28px;border-radius:20px;margin-bottom:28px;text-align:center">
          <div style="font-size:40px;margin-bottom:14px">🎓</div>
          <h1 style="color:white;margin:0;font-size:24px;font-weight:800">Access Approved!</h1>
          <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:15px">Welcome to OwnCampus, ${firstName}!</p>
        </div>

        <p style="color:#374151;font-size:15px;line-height:1.6;margin-bottom:6px">Hi <strong>${request.name}</strong>,</p>
        <p style="color:#374151;font-size:14px;line-height:1.6;margin-bottom:24px">
          Your <strong>${roleLabel}</strong> account on OwnCampus has been approved.
          Here are your account details and login credentials.
        </p>

        <!-- Profile summary -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:20px">
          <p style="margin:0 0 12px;font-size:11px;color:#64748b;font-weight:700;letter-spacing:0.07em;text-transform:uppercase">Your Profile</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:5px 0;color:#64748b;font-size:13px;width:130px">Full Name</td><td style="padding:5px 0;font-weight:600;color:#0f172a;font-size:13px">${request.name}</td></tr>
            <tr><td style="padding:5px 0;color:#64748b;font-size:13px">Role</td><td style="padding:5px 0;font-weight:600;color:#0f172a;font-size:13px">${roleLabel}</td></tr>
            <tr><td style="padding:5px 0;color:#64748b;font-size:13px">Phone</td><td style="padding:5px 0;font-weight:600;color:#0f172a;font-size:13px">${request.phone || '—'}</td></tr>
            ${extraRow}
          </table>
        </div>

        <!-- Login credentials -->
        <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:14px;padding:20px;margin-bottom:20px">
          <p style="margin:0 0 14px;font-size:11px;color:#1e40af;font-weight:700;letter-spacing:0.07em;text-transform:uppercase">Login Credentials</p>
          <div style="margin-bottom:14px">
            <p style="margin:0 0 3px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Email / User ID</p>
            <p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;font-family:monospace">${request.email}</p>
          </div>
          <div>
            <p style="margin:0 0 6px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Temporary Password</p>
            <div style="background:#fff;border:2px dashed #93c5fd;border-radius:10px;padding:12px 20px;display:inline-block">
              <span style="font-family:monospace;font-size:26px;font-weight:800;color:#2563eb;letter-spacing:5px">${password}</span>
            </div>
          </div>
        </div>

        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:14px;margin-bottom:24px">
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5">
            ⚠️ <strong>Security:</strong> Change your password immediately after your first login via <em>Profile → Change Password</em>. Do not share these credentials.
          </p>
        </div>

        <a href="${appUrl}/auth/login"
           style="display:block;text-align:center;background:linear-gradient(135deg,#1e40af,#2563eb);color:white;padding:16px;border-radius:12px;text-decoration:none;font-weight:800;font-size:16px;margin-bottom:20px">
          Login to OwnCampus →
        </a>

        <p style="font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;margin:0">
          Questions? Contact your institution admin.<br/>
          <strong style="color:#64748b">OwnCampus</strong> · School Management Platform
        </p>
      </div>`
    )

    // ── Send in-app notification to the new user ────────────────────────────
    // Fetch institution name for the welcome message
    let institutionName = 'your institution'
    if (institutionId) {
      const { data: instRow } = await supabase
        .from('institutions').select('name').eq('id', institutionId).maybeSingle()
      if (instRow?.name) institutionName = instRow.name
    }
    await notifyUser({
      institutionId,
      userId,
      template:  'access_approved',
      data:      { institution_name: institutionName },
      createdBy: callerUser.id,
    }).then(null, () => {})

    // Run onboarding workflow (generates admission number, notifications, audit log, domain event)
    if (request.role === 'student' && institutionId) {
      await supabase.rpc('run_student_onboarding_workflow', {
        p_user_id:        userId,
        p_institution_id: institutionId,
        p_branch_id:      branchId || null,
        p_class_id:       null,
        p_actor_id:       callerUser.id,
      }).then(null, () => {})
      // Audit log for student approval (RPC may or may not write its own)
      await supabase.from('audit_logs').insert({
        institution_id: institutionId,
        actor_id:       callerUser.id,
        action:         'admission_approved',
        entity_type:    'student',
        new_value:      { user_id: userId, role: request.role, name: request.name },
      }).then(null, () => {})
    } else if (institutionId) {
      // Faculty: emit domain event + audit log
      await supabase.rpc('emit_event', {
        p_institution_id: institutionId,
        p_event_type:     'admission.approved',
        p_aggregate_type: 'faculty',
        p_aggregate_id:   null,
        p_payload:        { user_id: userId, role: request.role },
        p_actor_id:       callerUser.id,
      }).then(null, () => {})
      await supabase.from('audit_logs').insert({
        institution_id: institutionId,
        actor_id:       callerUser.id,
        action:         'admission_approved',
        entity_type:    'faculty',
        new_value:      { user_id: userId, role: request.role, name: request.name },
      }).then(null, () => {})
    }

    return Response.json({
      success:    true,
      userId,
      email:      request.email,
      password,
      name:       request.name,
      phone:      request.phone || null,
      emailSent:  emailResult.ok,
      emailError: emailResult.ok ? null : emailResult.error,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
