// ─── Student Service ──────────────────────────────────────────────────────────
// Server-side only. Single source of truth for all student business logic.

import { createAdminClient } from '@/lib/supabase/admin'
import { notifyUser }        from './notification.service.js'
import { computeFeeStatus }  from './fee.service.js'

// ── Admission Number Generator ────────────────────────────────────────────────

export async function generateAdmissionNumber(institutionId) {
  const admin  = createAdminClient()
  const year   = new Date().getFullYear()
  const { count } = await admin
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', institutionId)
  const seq = String((count || 0) + 1).padStart(4, '0')
  return `ADM-${year}-${seq}`
}

// ── Create Student (atomic) ───────────────────────────────────────────────────

export async function createStudent({
  institutionId,
  actorId,
  firstName,
  lastName,
  email,
  phone,
  classId,
  branchId,
  rollNumber,
  admissionNumber,
  totalFee,
  academicYear,
  metadata = {},
} = {}) {
  if (!institutionId || !firstName) {
    return { success: false, error: 'institutionId and firstName are required.' }
  }

  const admin   = createAdminClient()
  const admNum  = admissionNumber || await generateAdmissionNumber(institutionId)

  // 1. Create user_profile entry (no auth user — credentials sent later via access_request flow)
  const { data: profile, error: profErr } = await admin
    .from('user_profiles')
    .insert({
      institution_id: institutionId,
      first_name:     firstName,
      last_name:      lastName  || '',
      email:          email     || null,
      phone:          phone     || null,
      role:           'student',
      metadata,
    })
    .select()
    .single()

  if (profErr) return { success: false, error: profErr.message }

  // 2. Create student record
  const { data: student, error: stuErr } = await admin
    .from('students')
    .insert({
      institution_id:   institutionId,
      user_id:          profile.id,
      class_id:         classId         || null,
      branch_id:        branchId        || null,
      roll_number:      rollNumber      || null,
      admission_number: admNum,
      total_fee:        Number(totalFee || 0),
      paid_amount:      0,
      fee_status:       totalFee > 0 ? 'pending' : null,
      academic_year:    academicYear    || String(new Date().getFullYear()),
      status:           'active',
    })
    .select()
    .single()

  if (stuErr) {
    // Rollback: delete the profile we just created
    await admin.from('user_profiles').delete().eq('id', profile.id).catch(() => {})
    return { success: false, error: stuErr.message }
  }

  // 3. Audit log
  await admin.from('audit_logs').insert({
    institution_id: institutionId,
    actor_id:       actorId || null,
    action:         'student.create',
    entity_type:    'student',
    entity_id:      student.id,
    new_value:      { admission_number: admNum, name: `${firstName} ${lastName}`, class_id: classId },
  }).catch(() => {})

  return { success: true, student, profile, admissionNumber: admNum }
}

// ── Update Student ────────────────────────────────────────────────────────────

export async function updateStudent({ institutionId, studentId, actorId, updates = {} } = {}) {
  if (!studentId || !institutionId) return { success: false, error: 'studentId and institutionId required.' }

  const ALLOWED_FIELDS = [
    'class_id', 'branch_id', 'roll_number', 'status', 'total_fee',
    'academic_year', 'guardian_name', 'guardian_phone', 'address', 'blood_group',
  ]
  const patch = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED_FIELDS.includes(k))
  )

  const admin = createAdminClient()

  // Re-compute fee_status if total_fee changed
  if (patch.total_fee !== undefined) {
    const { data: cur } = await admin.from('students').select('paid_amount').eq('id', studentId).single()
    patch.fee_status = computeFeeStatus(patch.total_fee, cur?.paid_amount)
  }

  const { data: prev } = await admin.from('students').select('*').eq('id', studentId).single()
  const { error } = await admin.from('students').update(patch).eq('id', studentId).eq('institution_id', institutionId)
  if (error) return { success: false, error: error.message }

  await admin.from('audit_logs').insert({
    institution_id: institutionId,
    actor_id:       actorId || null,
    action:         'student.update',
    entity_type:    'student',
    entity_id:      studentId,
    old_value:      prev || {},
    new_value:      patch,
  }).catch(() => {})

  return { success: true }
}

// ── Soft Delete Student ───────────────────────────────────────────────────────

export async function softDeleteStudent({ institutionId, studentId, actorId } = {}) {
  if (!studentId || !institutionId) return { success: false, error: 'studentId and institutionId required.' }

  const admin = createAdminClient()
  const now   = new Date().toISOString()

  const { error } = await admin
    .from('students')
    .update({ deleted_at: now, deleted_by: actorId || null, status: 'inactive' })
    .eq('id', studentId)
    .eq('institution_id', institutionId)

  if (error) return { success: false, error: error.message }

  await admin.from('audit_logs').insert({
    institution_id: institutionId,
    actor_id:       actorId || null,
    action:         'student.delete',
    entity_type:    'student',
    entity_id:      studentId,
    new_value:      { deleted_at: now },
  }).catch(() => {})

  return { success: true }
}

// ── Get Student with Full Profile ─────────────────────────────────────────────

export async function getStudentProfile(studentId, institutionId) {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('students')
    .select(`
      id, roll_number, admission_number, status, fee_status,
      total_fee, paid_amount, academic_year, created_at,
      class_id, branch_id, guardian_name, guardian_phone, blood_group,
      user_profiles ( id, first_name, last_name, email, phone, metadata ),
      classes ( id, name, section ),
      branches ( id, name )
    `)
    .eq('id', studentId)
    .eq('institution_id', institutionId)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null
  return data
}

// ── Student Timeline (from audit_logs) ────────────────────────────────────────

export async function getStudentTimeline(studentId, { limit = 30 } = {}) {
  const admin = createAdminClient()

  const { data } = await admin
    .from('audit_logs')
    .select(`
      id, action, entity_type, old_value, new_value, created_at,
      actor_id,
      user_profiles!audit_logs_actor_id_fkey ( first_name, last_name, role )
    `)
    .eq('entity_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data || []).map(log => ({
    id:          log.id,
    action:      log.action,
    description: describeAction(log.action, log.new_value),
    actor:       log.user_profiles
      ? `${log.user_profiles.first_name || ''} ${log.user_profiles.last_name || ''}`.trim()
      : 'System',
    role:        log.user_profiles?.role || null,
    timestamp:   log.created_at,
    old:         log.old_value,
    new:         log.new_value,
  }))
}

function describeAction(action, newValue) {
  const map = {
    'student.create':     'Student record created',
    'student.update':     'Student profile updated',
    'student.delete':     'Student record deleted',
    'fee.payment':        `Fee payment recorded — ₹${Number(newValue?.amount || 0).toLocaleString('en-IN')}`,
    'fee.structure.set':  'Fee structure set',
    'attendance.mark':    'Attendance marked',
    'attendance.update':  'Attendance corrected',
    'leave.request':      'Leave request submitted',
    'leave.approve':      'Leave approved',
    'leave.reject':       'Leave rejected',
    'library.issue':      'Book issued',
    'library.return':     'Book returned',
    'hostel.assign':      'Hostel room assigned',
    'transport.assign':   'Transport route assigned',
  }
  return map[action] || action
}
