import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const FACULTY_ROLES = ['teacher','faculty','trainer','hod','academic_coordinator',
                       'librarian','counsellor','hr','admission_officer','receptionist',
                       'transport_manager','hostel_manager']

export async function GET() {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Resolve institution of the calling admin
    const { data: profile } = await admin
      .from('user_profiles')
      .select('institution_id')
      .eq('id', user.id)
      .single()

    const institutionId = profile?.institution_id || null

    // Build queries — always scope to institution if available
    let pendingQ     = admin.from('access_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
    let stuTableQ    = admin.from('students').select('user_id').eq('status', 'active').is('deleted_at', null)
    let stuProfileQ  = admin.from('user_profiles').select('id').eq('role', 'student')
    let facTableQ    = admin.from('faculty').select('user_id').eq('status', 'active')
    let facProfileQ  = admin.from('user_profiles').select('id').in('role', FACULTY_ROLES)
    // Fee from fee_payments table (same source as Finance page)
    let feePayQ      = admin.from('fee_payments').select('amount').eq('status', 'paid')
    // Outstanding: total_fee - paid_amount from students table (exclude soft-deleted)
    let stuFeeQ      = admin.from('students').select('total_fee, paid_amount').eq('status', 'active').is('deleted_at', null)

    if (institutionId) {
      pendingQ    = pendingQ.or(`institution_id.eq.${institutionId},institution_id.is.null`)
      stuTableQ   = stuTableQ.eq('institution_id', institutionId)
      stuProfileQ = stuProfileQ.eq('institution_id', institutionId)
      facTableQ   = facTableQ.eq('institution_id', institutionId)
      facProfileQ = facProfileQ.eq('institution_id', institutionId)
      // Include payments where institution_id matches OR is null (payments recorded before institution was set)
      feePayQ     = feePayQ.or(`institution_id.eq.${institutionId},institution_id.is.null`)
      stuFeeQ     = stuFeeQ.eq('institution_id', institutionId)
    }

    const [
      { count: pendingCount },
      { data: stuTableRows },
      { data: stuProfileRows },
      { data: facTableRows },
      { data: facProfileRows },
      { data: feePayRows },
      { data: stuFeeRows },
    ] = await Promise.all([pendingQ, stuTableQ, stuProfileQ, facTableQ, facProfileQ, feePayQ, stuFeeQ])

    // Union students: students table + user_profiles student role (deduplicated by user_id/id)
    const stuTableUserIds = new Set((stuTableRows  || []).map(s => s.user_id).filter(Boolean))
    const stuProfileExtra = (stuProfileRows || []).filter(p => !stuTableUserIds.has(p.id))
    const orphanCount     = (stuTableRows  || []).filter(s => !s.user_id).length
    const studentCount    = stuTableUserIds.size + stuProfileExtra.length + orphanCount

    // Union faculty: faculty table + user_profiles faculty role (deduplicated)
    const facTableUserIds = new Set((facTableRows  || []).map(f => f.user_id).filter(Boolean))
    const facProfileExtra = (facProfileRows || []).filter(p => !facTableUserIds.has(p.id))
    const facultyCount    = facTableUserIds.size + facProfileExtra.length

    // Fee: collected = sum of paid fee_payments; outstanding = sum(total_fee - paid_amount)
    const collected   = (feePayRows   || []).reduce((s, p) => s + Number(p.amount      || 0), 0)
    const totalFee    = (stuFeeRows   || []).reduce((s, r) => s + Number(r.total_fee   || 0), 0)
    const paidOnFile  = (stuFeeRows   || []).reduce((s, r) => s + Number(r.paid_amount || 0), 0)
    const outstanding = Math.max(totalFee - paidOnFile, 0)

    return Response.json({
      students:    studentCount,
      faculty:     facultyCount,
      pending:     pendingCount || 0,
      feeCollected:   collected,
      feeOutstanding: outstanding,
      totalFee,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
