import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { computeFeeStatus }  from '@/lib/feeUtils'

// GET  /api/fee-payments?student_id=...  → payment history for a student
// POST /api/fee-payments                 → record a payment
// PATCH/api/fee-payments                 → update student's total_fee / fee structure

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('student_id') || null
    const userId    = searchParams.get('user_id')    || null

    // Resolve institution
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    // If user_id passed, resolve to student record first
    let resolvedStudentId = studentId
    if (!resolvedStudentId && userId) {
      const { data: stu } = await admin
        .from('students').select('id').eq('user_id', userId).single()
      resolvedStudentId = stu?.id || null
    }

    // Students can only see their own payments
    if (profile?.role === 'student' && !resolvedStudentId) {
      const { data: stu } = await admin
        .from('students').select('id').eq('user_id', user.id).single()
      resolvedStudentId = stu?.id || null
    }

    let query = admin
      .from('fee_payments')
      .select('id, amount, payment_date, status, payment_method, payment_mode, receipt_number, notes, created_at, student_id, institution_id')
      .order('payment_date', { ascending: false })

    if (resolvedStudentId) {
      query = query.eq('student_id', resolvedStudentId)
    }
    // Always scope to institution to prevent cross-tenant data leaks
    if (institutionId) {
      query = query.eq('institution_id', institutionId)
    }

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 400 })

    const payments = data || []

    // Manual student + profile lookup (PostgREST join unreliable across FK chains)
    const studentIds = [...new Set(payments.map(p => p.student_id).filter(Boolean))]
    let studentMap = {}
    if (studentIds.length > 0) {
      const { data: stuRows } = await admin
        .from('students')
        .select('id, user_id, roll_number, class_id, classes(name, section)')
        .in('id', studentIds)

      const userIds = [...new Set((stuRows || []).map(s => s.user_id).filter(Boolean))]
      let profileMap = {}
      if (userIds.length > 0) {
        const { data: profiles } = await admin
          .from('user_profiles')
          .select('id, first_name, last_name, metadata')
          .in('id', userIds)
        ;(profiles || []).forEach(p => { profileMap[p.id] = p })
      }

      ;(stuRows || []).forEach(s => {
        const up = (s.user_id && profileMap[s.user_id]) || {}
        const meta = up.metadata || {}
        const cls  = s.classes
          ? `${s.classes.name}${s.classes.section ? ' ' + s.classes.section : ''}`
          : meta.class_section || ''
        studentMap[s.id] = {
          name:  [up.first_name, up.last_name].filter(Boolean).join(' ') || '',
          class: cls,
        }
      })
    }

    const enriched = payments.map(p => ({
      ...p,
      student_name:  (p.student_id && studentMap[p.student_id]?.name)  || '',
      student_class: (p.student_id && studentMap[p.student_id]?.class) || '',
    }))

    return Response.json(enriched)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      student_id,       // UUID of students.id
      user_id,          // UUID of user_profiles.id (alternative)
      amount,
      payment_mode      = 'cash',
      notes,
      payment_date,
      payment_status    = 'paid',  // 'paid' | 'pending' — determines whether to update student balance
    } = body

    // Map UI status strings to DB enum values
    const dbStatus = payment_status === 'paid' || payment_status === 'Success' || payment_status === 'success'
      ? 'paid'
      : 'pending'

    if (!amount || amount <= 0) {
      return Response.json({ error: 'Amount must be greater than 0.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Resolve the calling admin's institution
    const { data: adminProfile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = adminProfile?.institution_id || null

    // Resolve student record
    let resolvedStudentId = student_id
    if (!resolvedStudentId && user_id) {
      const { data: stu } = await admin
        .from('students').select('id').eq('user_id', user_id).single()
      resolvedStudentId = stu?.id || null
    }

    // Student exists in user_profiles but has no students row yet — auto-create one
    // Only allowed when the target user belongs to the same institution as the caller
    if (!resolvedStudentId && user_id) {
      const { data: stuProfile } = await admin
        .from('user_profiles').select('institution_id, branch_id, metadata').eq('id', user_id).maybeSingle()
      if (!stuProfile) {
        return Response.json({ error: 'Target user not found.' }, { status: 404 })
      }
      // Cross-institution guard
      if (institutionId && stuProfile.institution_id && stuProfile.institution_id !== institutionId) {
        return Response.json({ error: 'Cannot record payment for a student from a different institution.' }, { status: 403 })
      }
      const meta = stuProfile?.metadata || {}
      const { data: created } = await admin
        .from('students')
        .insert({
          institution_id: institutionId || stuProfile?.institution_id || null,
          user_id:        user_id,
          branch_id:      stuProfile?.branch_id || null,
          roll_number:    meta.roll_number || null,
        })
        .select('id').single()
      resolvedStudentId = created?.id || null
    }

    if (!resolvedStudentId) {
      return Response.json({ error: 'Could not resolve student record. Ensure the student is registered.' }, { status: 400 })
    }

    // Fetch student info
    const { data: student } = await admin
      .from('students')
      .select('institution_id, total_fee, paid_amount, user_id')
      .eq('id', resolvedStudentId)
      .single()

    if (!student) return Response.json({ error: 'Student not found.' }, { status: 404 })

    // Insert payment record — trigger sets receipt_number from sequence + institution_id
    const { data: payment, error: payErr } = await admin
      .from('fee_payments')
      .insert({
        student_id:     resolvedStudentId,
        institution_id: student.institution_id || institutionId,
        amount:         Number(amount),
        total_paid:     Number(amount),
        status:         dbStatus,
        payment_method: payment_mode,
        payment_mode,
        payment_date:   payment_date || new Date().toISOString().slice(0, 10),
        notes:          notes || null,
        collected_by:   user.id,
        recorded_by:    user.id,
      })
      .select('id, receipt_number, amount, payment_date, payment_method, payment_mode')
      .single()
    const receiptNum = payment?.receipt_number

    if (payErr) return Response.json({ error: payErr.message }, { status: 400 })

    // Default balance values for pending payments (not updated in DB)
    let newPaid   = Number(student.paid_amount || 0)
    let newStatus = student.fee_status || 'pending'

    // Only update student balance for confirmed payments (not pending/failed)
    if (dbStatus === 'paid') {
      newPaid   = Number(student.paid_amount || 0) + Number(amount)
      newStatus = computeFeeStatus(Number(student.total_fee || 0), newPaid)

      await admin.from('students').update({
        paid_amount: newPaid,
        fee_status:  newStatus,
      }).eq('id', resolvedStudentId)

      // Update user_profiles.metadata for fast student-dashboard reads
      const { data: up } = await admin
        .from('user_profiles').select('metadata').eq('id', student.user_id).single()
      if (up) {
        const updatedMeta = {
          ...(up.metadata || {}),
          paid_amount: newPaid,
          fee_status:  newStatus,
          payments: [
            ...((up.metadata?.payments) || []),
            {
              id:      payment.id,
              amount:  Number(amount),
              date:    payment.payment_date,
              mode:    payment_mode,
              receipt: receiptNum,
            },
          ],
        }
        await admin.from('user_profiles')
          .update({ metadata: updatedMeta })
          .eq('id', student.user_id)
      }
    }

    // Notify the student of payment confirmation
    if (student.user_id && institutionId) {
      const fmtAmt = `₹${Number(amount).toLocaleString('en-IN')}`
      await admin.from('notifications').insert({
        institution_id: institutionId,
        user_id:        student.user_id,
        type:           'payment',
        title:          'Fee Payment Confirmed',
        body:           `Payment of ${fmtAmt} received. Receipt: ${payment.receipt_number || payment.id?.slice(0,8) || '—'}`,
        is_broadcast:   false,
        is_read:        false,
        link:           '/student/fees',
        metadata:       { amount: Number(amount), receipt: payment.receipt_number, mode: payment_mode },
        created_by:     user.id,
      }).then(null, () => {})
    }

    return Response.json({
      success:        true,
      payment_id:     payment.id,
      receipt_number: payment.receipt_number,
      amount:         payment.amount,
      payment_date:   payment.payment_date,
      payment_mode:   payment.payment_mode || payment.payment_method,
      new_paid_total: newPaid,
      new_status:     newStatus,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH: update student's total_fee structure
export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { student_id, user_id, total_fee } = body

    if (total_fee === undefined) {
      return Response.json({ error: 'total_fee is required.' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: callerProf } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = callerProf?.institution_id || null
    if (!institutionId) return Response.json({ error: 'Institution not resolved.' }, { status: 400 })

    let resolvedStudentId = student_id
    if (!resolvedStudentId && user_id) {
      const { data: stu } = await admin
        .from('students').select('id').eq('user_id', user_id).single()
      resolvedStudentId = stu?.id || null
    }
    if (!resolvedStudentId) {
      return Response.json({ error: 'student_id or user_id is required.' }, { status: 400 })
    }

    const { data: stu } = await admin
      .from('students').select('paid_amount, institution_id').eq('id', resolvedStudentId).single()

    // Verify the student belongs to the caller's institution
    if (stu?.institution_id && stu.institution_id !== institutionId) {
      return Response.json({ error: 'Forbidden: student does not belong to your institution.' }, { status: 403 })
    }

    const paid   = Number(stu?.paid_amount || 0)
    const newTot = Number(total_fee)
    const status = computeFeeStatus(newTot, paid)

    const { error } = await admin
      .from('students')
      .update({ total_fee: newTot, fee_status: status })
      .eq('id', resolvedStudentId)
      .eq('institution_id', institutionId)

    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Sync to metadata
    if (user_id || stu) {
      const { data: resolvedStudent } = await admin
        .from('students').select('user_id').eq('id', resolvedStudentId).single()
      if (resolvedStudent?.user_id) {
        const { data: up } = await admin
          .from('user_profiles').select('metadata').eq('id', resolvedStudent.user_id).single()
        if (up) {
          await admin.from('user_profiles').update({
            metadata: { ...(up.metadata || {}), total_fee: newTot, fee_status: status },
          }).eq('id', resolvedStudent.user_id)
        }
      }
    }

    return Response.json({ success: true, total_fee: newTot, fee_status: status })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
