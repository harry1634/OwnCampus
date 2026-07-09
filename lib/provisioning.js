/**
 * lib/provisioning.js
 * Full onboarding automation for approved institutions.
 * Called after a Control Center operator approves an institution.
 *
 * Provisions:
 *   1. Institution license with default limits
 *   2. All modules enabled by default
 *   3. All dashboard portals enabled
 *   4. Admin Supabase auth user with a temporary password
 *   5. user_profiles row for the admin
 *   6. Welcome email queued
 *   7. Institution marked as provisioned with activation_token
 */

import { randomBytes }       from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { queueAndSend }     from '@/lib/email'

// All module keys that exist in the platform
export const ALL_MODULES = [
  'students', 'faculty', 'attendance', 'finance', 'library',
  'hostel', 'transport', 'timetable', 'hrms', 'lms',
  'analytics', 'communication', 'examinations', 'admissions',
  'placement', 'inventory', 'procurement', 'alumni',
]

// Default dashboard access
const ALL_DASHBOARDS = ['admin', 'faculty', 'student']

// Default license limits for a new institution
const DEFAULT_LIMITS = {
  billing_cycle:           'monthly',
  monthly_fee:             0,
  currency:                'INR',
  grace_period_days:       7,
  max_students:            500,
  max_faculty:             50,
  max_admins:              5,
  max_branches:            1,
  max_departments:         10,
  max_courses:             50,
  max_classes:             20,
  max_library_books:       1000,
  max_hostel_rooms:        50,
  max_vehicles:            10,
  max_transport_routes:    10,
  max_api_requests:        10000,
  max_realtime_connections:100,
  max_storage_gb:          5,
  discount_percent:        0,
}

// Rejection sampling — avoids modulo bias when set size doesn't divide 256 evenly
function secureRandIndex(max) {
  const limit = Math.floor(256 / max) * max
  let r
  do { r = randomBytes(1)[0] } while (r >= limit)
  return r % max
}

/**
 * Generate a cryptographically random temporary password (16 chars).
 * Uses crypto.randomBytes — NOT Math.random.
 */
function generateTempPassword() {
  const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower  = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const syms   = '!@#$'
  const all    = upper + lower + digits + syms
  const pick   = (set) => set[secureRandIndex(set.length)]
  // Guarantee at least one from each character class
  const chars  = [pick(upper), pick(lower), pick(digits), pick(syms)]
  for (let i = 4; i < 16; i++) chars.push(pick(all))
  // Fisher-Yates shuffle using crypto-random indexes
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

/**
 * Generate a unique activation token (UUID-based).
 */
function generateActivationToken() {
  return 'oc_act_' + crypto.randomUUID().replace(/-/g, '')
}

/** Paginated search for a Supabase auth user by email — avoids loading all users into memory. */
async function findAuthUserByEmail(admin, email) {
  const PER_PAGE = 1000
  let page = 1
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE })
    if (!data?.users?.length) return null
    const found = data.users.find(u => u.email === email)
    if (found) return found
    if (data.users.length < PER_PAGE) return null
    page++
  }
}

/**
 * provisionInstitution — main entry point.
 *
 * @param {string} institutionId  — UUID of the institution to provision
 * @param {string} adminEmail     — email for the new admin account
 * @param {string} adminName      — display name of the admin
 * @param {string|null} companyUserId — who triggered provisioning (for audit)
 * @returns {{ ok: boolean, tempPassword: string, error?: string }}
 */
export async function provisionInstitution(institutionId, adminEmail, adminName, companyUserId = null) {
  const admin = createAdminClient()

  // ── 0. Fetch institution ─────────────────────────────────────────
  const { data: inst, error: instErr } = await admin
    .from('institutions')
    .select('id, name, code, control_status, provisioned_at')
    .eq('id', institutionId)
    .single()

  if (instErr || !inst) {
    return { ok: false, error: 'Institution not found.' }
  }

  // Idempotency: if already provisioned, return without re-creating the auth user
  if (inst.provisioned_at) {
    return { ok: false, error: 'Institution is already provisioned.' }
  }

  const tempPassword     = generateTempPassword()
  const activationToken  = generateActivationToken()
  const now              = new Date().toISOString()

  // ── 1. Create Supabase auth user ─────────────────────────────────
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email:          adminEmail,
    password:       tempPassword,
    email_confirm:  true,          // skip email confirmation — we send our own email
    user_metadata:  {
      full_name:        adminName,
      first_name:       adminName.split(' ')[0] || adminName,
      last_name:        adminName.split(' ').slice(1).join(' ') || '',
      role:             'owner',
      institution_name: inst.name,
    },
  })

  if (authErr) {
    // If user already exists, look them up instead of failing
    if (!authErr.message?.includes('already registered')) {
      return { ok: false, error: `Could not create admin user: ${authErr.message}` }
    }
    // User exists — find by paginating rather than loading all users into memory
    const existingUser = await findAuthUserByEmail(admin, adminEmail)
    if (!existingUser) {
      return { ok: false, error: 'User already exists but could not be found.' }
    }
    // Update password to temp password so they can activate
    await admin.auth.admin.updateUserById(existingUser.id, { password: tempPassword })
    authData.user = existingUser
  }

  const userId = authData.user.id

  // ── 2. Upsert user_profiles row ──────────────────────────────────
  const nameParts = adminName.trim().split(' ')
  await admin.from('user_profiles').upsert({
    id:             userId,
    email:          adminEmail,
    first_name:     nameParts[0] || adminName,
    last_name:      nameParts.slice(1).join(' ') || '',
    role:           'owner',
    institution_id: institutionId,
    is_active:      true,
    metadata:       { provisioned: true, institution_name: inst.name },
  }, { onConflict: 'id' })

  // ── 3. Upsert institution license ────────────────────────────────
  await admin.from('institution_licenses').upsert({
    ...DEFAULT_LIMITS,
    institution_id: institutionId,
    valid_from:     now.slice(0, 10),
    valid_until:    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    created_by:     companyUserId,
    updated_by:     companyUserId,
    updated_at:     now,
  }, { onConflict: 'institution_id' })

  // ── 4. Upsert all modules (enabled by default) ───────────────────
  const moduleRows = ALL_MODULES.map(key => ({
    institution_id: institutionId,
    module_key:     key,
    is_enabled:     true,
    enabled_at:     now,
    disabled_at:    null,
    updated_by:     companyUserId,
  }))
  await admin.from('institution_modules')
    .upsert(moduleRows, { onConflict: 'institution_id,module_key' })

  // ── 5. Upsert all dashboard access (enabled by default) ──────────
  const dashRows = ALL_DASHBOARDS.map(key => ({
    institution_id: institutionId,
    dashboard_key:  key,
    is_enabled:     true,
    updated_by:     companyUserId,
    updated_at:     now,
  }))
  await admin.from('institution_dashboards')
    .upsert(dashRows, { onConflict: 'institution_id,dashboard_key' })

  // ── 6. Queue + send welcome email ────────────────────────────────
  const activationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/activate?token=${activationToken}&email=${encodeURIComponent(adminEmail)}`
  await queueAndSend({
    to_email:      adminEmail,
    to_name:       adminName,
    subject:       `Welcome to OwnCampus — Activate Your Institution`,
    template_key:  'institution_welcome',
    body_html:     buildWelcomeEmail(inst.name, adminName, inst.code, adminEmail, tempPassword, activationUrl),
    variables: {
      institution_name:  inst.name,
      institution_code:  inst.code,
      admin_name:        adminName,
      admin_email:       adminEmail,
      temp_password:     tempPassword,
      activation_url:    activationUrl,
    },
    institution_id: institutionId,
  })

  // ── 7. Mark institution as provisioned ───────────────────────────
  await admin.from('institutions').update({
    provisioned_at:   now,
    provisioned_by:   companyUserId,
    activation_token: activationToken,
    temp_admin_email: adminEmail,
  }).eq('id', institutionId)

  return { ok: true, tempPassword, activationToken, adminEmail }
}

function buildWelcomeEmail(instName, adminName, code, email, tempPassword, activationUrl) {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login`
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to OwnCampus</title></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;padding:40px 0;margin:0">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(15,23,42,0.07)">
    <div style="background:linear-gradient(135deg,#1e40af,#2563eb);padding:32px 36px">
      <p style="color:rgba(255,255,255,0.65);font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.12em">OwnCampus School ERP</p>
      <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:800;letter-spacing:-0.02em">Your institution is ready.</h1>
      <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:10px 0 0;line-height:1.5">${instName} has been approved and provisioned.</p>
    </div>
    <div style="padding:32px 36px">
      <p style="color:#0f172a;font-size:15px;margin:0 0 6px">Hi <strong>${adminName}</strong>,</p>
      <p style="color:#64748b;font-size:13.5px;line-height:1.65;margin:0 0 24px">
        Use the credentials below to activate your account and set a permanent password.
        Keep them safe — do not share your temporary password.
      </p>

      <div style="background:#f1f5f9;border-radius:12px;padding:20px 24px;margin-bottom:20px">
        <p style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;margin:0 0 14px">YOUR CREDENTIALS</p>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="font-size:12.5px;color:#64748b;padding:6px 0;width:150px;vertical-align:top">Institution Name</td>
            <td style="font-size:13.5px;font-weight:700;color:#0f172a;padding:6px 0">${instName}</td>
          </tr>
          <tr>
            <td style="font-size:12.5px;color:#64748b;padding:6px 0;vertical-align:top">Institution Code</td>
            <td style="font-size:15px;font-weight:800;color:#1e40af;letter-spacing:0.12em;padding:6px 0;font-family:monospace">${code}</td>
          </tr>
          <tr>
            <td style="font-size:12.5px;color:#64748b;padding:6px 0;vertical-align:top">Admin Email</td>
            <td style="font-size:13.5px;font-weight:700;color:#0f172a;padding:6px 0">${email}</td>
          </tr>
          <tr>
            <td style="font-size:12.5px;color:#64748b;padding:6px 0;vertical-align:top">Temporary Password</td>
            <td style="font-size:15px;font-weight:800;color:#dc2626;font-family:monospace;letter-spacing:0.08em;padding:6px 0">${tempPassword}</td>
          </tr>
          <tr>
            <td style="font-size:12.5px;color:#64748b;padding:6px 0;vertical-align:top">Login URL</td>
            <td style="font-size:13px;padding:6px 0"><a href="${loginUrl}" style="color:#2563eb;font-weight:600">${loginUrl}</a></td>
          </tr>
        </table>
      </div>

      <a href="${activationUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#1e40af,#2563eb);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:15px 24px;border-radius:11px;margin-bottom:16px;letter-spacing:0.01em">
        Activate My Institution →
      </a>

      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:9px;padding:12px 16px;margin-bottom:20px">
        <p style="font-size:12.5px;color:#92400e;margin:0;line-height:1.55">
          ⚠️ This activation link is single-use and expires in <strong>7 days</strong>.
          After activation you'll be prompted to set a permanent password.
        </p>
      </div>

      <p style="font-size:12px;color:#94a3b8;line-height:1.7;margin:0">
        Questions? Contact us at
        <a href="mailto:support@owncampus.in" style="color:#2563eb">support@owncampus.in</a>
        · OwnCampus School ERP
      </p>
    </div>
  </div>
</body>
</html>`
}
