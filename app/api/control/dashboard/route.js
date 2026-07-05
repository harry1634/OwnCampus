import { requireControlUser } from '@/lib/control/auth'
import { createAdminClient }  from '@/lib/supabase/admin'

// GET /api/control/dashboard
// Returns aggregate stats for the control center dashboard.
export async function GET() {
  try {
    await requireControlUser()
    const admin = createAdminClient()

    const [
      { data: institutions },
      { data: payments },
      { data: tickets },
      { data: recentAudit },
    ] = await Promise.all([
      admin.from('institutions').select('id, name, control_status, type, created_at'),
      admin.from('institution_payments').select('institution_id, total_amount, payment_status, billing_month'),
      admin.from('support_tickets').select('id, status, priority, created_at'),
      admin.from('company_audit_logs').select('id, company_user_name, action, target_name, created_at').order('created_at', { ascending: false }).limit(10),
    ])

    const insts     = institutions || []
    const pmts      = payments     || []
    const tkts      = tickets      || []
    const auditRows = recentAudit  || []

    // Institution counts
    const totalInst     = insts.length
    const activeInst    = insts.filter(i => i.control_status === 'active').length
    const pendingInst   = insts.filter(i => i.control_status === 'pending').length
    const suspendedInst = insts.filter(i => i.control_status === 'suspended').length
    const trialInst     = insts.filter(i => i.control_status === 'trial').length

    // Revenue
    const thisMonth    = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
    const currMonthPmt = pmts.filter(p => p.billing_month?.startsWith(thisMonth))
    const mrr          = currMonthPmt.reduce((s, p) => s + (p.total_amount || 0), 0)
    const outstanding  = pmts.filter(p => p.payment_status === 'pending' || p.payment_status === 'overdue')
                             .reduce((s, p) => s + (p.total_amount || 0), 0)

    // Support
    const openTickets     = tkts.filter(t => t.status === 'open').length
    const criticalTickets = tkts.filter(t => t.priority === 'critical' && t.status !== 'closed' && t.status !== 'resolved').length

    // Pending approvals
    const pendingInstitutions = insts
      .filter(i => i.control_status === 'pending')
      .slice(0, 5)
      .map(i => ({ id: i.id, name: i.name, type: i.type, created_at: i.created_at }))

    return Response.json({
      stats: {
        totalInst, activeInst, pendingInst, suspendedInst, trialInst,
        mrr, outstanding, openTickets, criticalTickets,
      },
      pendingInstitutions,
      recentAudit: auditRows,
    })
  } catch (err) {
    const status = err.status || 500
    return Response.json({ error: err.message }, { status })
  }
}
