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

    const totalFee   = Number(student?.total_fee   ?? 0)
    const paidAmount = Number(student?.paid_amount  ?? 0)
    const feeStatus  = student?.fee_status || computeFeeStatus(totalFee, paidAmount)

    // Fallback: if no students row yet, read from user_profiles.metadata
    if (!student) {
      const { data: profile } = await admin
        .from('user_profiles')
        .select('metadata')
        .eq('id', user.id)
        .maybeSingle()
      const meta     = profile?.metadata || {}
      const mTotal   = Number(meta.total_fee   || 0)
      const mPaid    = Number(meta.paid_amount  || 0)
      const mStatus  = meta.fee_status || computeFeeStatus(mTotal, mPaid)
      return Response.json({ totalFee: mTotal, paidAmount: mPaid, feeStatus: mStatus, source: 'metadata' })
    }

    return Response.json({ totalFee, paidAmount, feeStatus, source: 'students' })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
