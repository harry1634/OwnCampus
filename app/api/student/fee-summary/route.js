import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { computeFeeStatus }  from '@/lib/feeUtils'

// GET /api/student/fee-summary
// Returns the authenticated student's total_fee, paid_amount, fee_status
// Uses admin client to bypass RLS so the student's own row is always readable.
export async function GET() {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data: student, error } = await admin
      .from('students')
      .select('total_fee, paid_amount, fee_status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return Response.json({ error: error.message }, { status: 400 })

    let resolvedStudent = student

    // Fallback 1: student row exists but user_id wasn't linked yet —
    // find via institution + look up by matching profile record
    if (!resolvedStudent) {
      const { data: myProfile } = await admin
        .from('user_profiles')
        .select('institution_id, metadata')
        .eq('id', user.id)
        .maybeSingle()

      // Try metadata first (admin may have written fee data here directly)
      if (myProfile?.metadata?.total_fee) {
        const meta    = myProfile.metadata
        const mTotal  = Number(meta.total_fee  || 0)
        const mPaid   = Number(meta.paid_amount || 0)
        const mStatus = meta.fee_status || computeFeeStatus(mTotal, mPaid)
        return Response.json({ totalFee: mTotal, paidAmount: mPaid, feeStatus: mStatus, source: 'metadata' })
      }

      // Try finding an unlinked student record in same institution and link it
      if (myProfile?.institution_id) {
        const { data: unlinked } = await admin
          .from('students')
          .select('id, total_fee, paid_amount, fee_status')
          .eq('institution_id', myProfile.institution_id)
          .is('user_id', null)
          .is('deleted_at', null)
          .limit(1)
          .maybeSingle()

        if (unlinked) {
          // Link this student row to the auth user so future queries work
          await admin.from('students').update({ user_id: user.id }).eq('id', unlinked.id)
          resolvedStudent = unlinked
        }
      }
    }

    if (!resolvedStudent) {
      return Response.json({ totalFee: 0, paidAmount: 0, feeStatus: 'pending', source: 'none' })
    }

    const totalFee   = Number(resolvedStudent.total_fee   ?? 0)
    const paidAmount = Number(resolvedStudent.paid_amount  ?? 0)
    const feeStatus  = resolvedStudent.fee_status || computeFeeStatus(totalFee, paidAmount)

    return Response.json({ totalFee, paidAmount, feeStatus, source: 'students' })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
