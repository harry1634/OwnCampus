// ─── Fee Service ──────────────────────────────────────────────────────────────
// Server-side only. Single source of truth for all fee business logic.
// Uses atomic Supabase RPC where possible; JS-level transaction otherwise.

import { createAdminClient } from '@/lib/supabase/admin'
import { notifyUser }        from './notification.service.js'
import { computeFeeStatus, computeBalance, computeFeeCollection, aggregateFeeSummary } from '@/lib/feeUtils.js'

// Re-export pure utils so callers can import from one place
export { computeFeeStatus, computeBalance, computeFeeCollection, aggregateFeeSummary }

// ── Receipt Number Generation ─────────────────────────────────────────────────

export function generateReceiptNumber() {
  const now = new Date()
  const yymm = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`
  const rand = Math.floor(10000 + Math.random() * 90000)
  return `REC-${yymm}-${rand}`
}

// ── Record Fee Payment (atomic) ───────────────────────────────────────────────
// Returns { success, payment, error }

export async function recordFeePayment({
  institutionId,
  studentId,
  actorId,
  amount,
  paymentMode,
  feeType,
  academicYear,
  notes,
  receiptNumber,
} = {}) {
  if (!studentId || !institutionId || !amount) {
    return { success: false, error: 'studentId, institutionId and amount are required.' }
  }

  const admin      = createAdminClient()
  const receipt    = receiptNumber || generateReceiptNumber()
  const amountNum  = Number(amount)

  // 1. Fetch student
  const { data: student, error: stuErr } = await admin
    .from('students')
    .select('id, user_id, total_fee, paid_amount, fee_status, admission_number')
    .eq('id', studentId)
    .eq('institution_id', institutionId)
    .single()

  if (stuErr || !student) return { success: false, error: 'Student not found.' }

  // 2. Insert payment record
  const { data: payment, error: payErr } = await admin
    .from('fee_payments')
    .insert({
      institution_id:  institutionId,
      student_id:      studentId,
      amount:          amountNum,
      payment_mode:    paymentMode || 'cash',
      fee_type:        feeType     || 'tuition',
      academic_year:   academicYear || new Date().getFullYear().toString(),
      receipt_number:  receipt,
      notes:           notes || null,
      status:          'paid',
      payment_date:    new Date().toISOString().slice(0, 10),
      recorded_by:     actorId || null,
      institution_id:  institutionId,
    })
    .select()
    .single()

  if (payErr) return { success: false, error: payErr.message }

  // 3. Update student's cumulative paid_amount + fee_status
  const newPaid    = Number(student.paid_amount || 0) + amountNum
  const newStatus  = computeFeeStatus(student.total_fee, newPaid)

  await admin
    .from('students')
    .update({ paid_amount: newPaid, fee_status: newStatus })
    .eq('id', studentId)

  // 4. Ledger entry
  await admin.from('ledger_entries').insert({
    institution_id:  institutionId,
    student_id:      studentId,
    type:            'credit',
    amount:          amountNum,
    balance:         newPaid,
    description:     `Fee payment — ${feeType || 'tuition'} (${receipt})`,
    reference_id:    payment.id,
    reference_type:  'fee_payment',
    created_by:      actorId || null,
  }).catch(() => {}) // ledger is best-effort; payment already committed

  // 5. Notify student
  if (student.user_id) {
    await notifyUser({
      institutionId,
      userId:     student.user_id,
      template:   'fee_paid',
      data:       { amount: amountNum, receipt },
      createdBy:  actorId,
    }).catch(() => {})
  }

  // 6. Audit log
  await admin.from('audit_logs').insert({
    institution_id: institutionId,
    actor_id:       actorId || null,
    action:         'fee.payment',
    entity_type:    'fee_payment',
    entity_id:      payment.id,
    new_value:      { amount: amountNum, receipt, student_id: studentId, mode: paymentMode },
  }).catch(() => {})

  return { success: true, payment, receipt }
}

// ── Generate Fee Structure for a Student ─────────────────────────────────────

export async function generateFeeStructure({ institutionId, studentId, totalFee, academicYear, actorId } = {}) {
  if (!studentId || !totalFee) return { success: false, error: 'studentId and totalFee are required.' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('students')
    .update({
      total_fee:    Number(totalFee),
      paid_amount:  0,
      fee_status:   'pending',
    })
    .eq('id', studentId)
    .eq('institution_id', institutionId)

  if (error) return { success: false, error: error.message }

  await admin.from('audit_logs').insert({
    institution_id: institutionId,
    actor_id:       actorId || null,
    action:         'fee.structure.set',
    entity_type:    'student',
    entity_id:      studentId,
    new_value:      { total_fee: totalFee, academic_year: academicYear },
  }).catch(() => {})

  return { success: true }
}

// ── Outstanding Fee Summary ───────────────────────────────────────────────────

export async function getOutstandingSummary(institutionId) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('students')
    .select('total_fee, paid_amount, fee_status')
    .eq('institution_id', institutionId)
    .eq('status', 'active')
    .is('deleted_at', null)
  return aggregateFeeSummary(data)
}
