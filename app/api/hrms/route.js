import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET  /api/hrms?type=leaves|employees
// POST /api/hrms  { type: 'leave', leave_type, start_date, end_date, days_count, reason, user_id? }
// PATCH /api/hrms { id, status, rejection_reason? }  — approve / reject a leave

async function getCallerProfile(admin, userId) {
  const { data } = await admin.from('user_profiles').select('institution_id, role, first_name, last_name').eq('id', userId).single()
  return data || {}
}

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'leaves'

    const caller = await getCallerProfile(admin, user.id)
    const institutionId = caller.institution_id || null

    if (type === 'employees') {
      let q = admin
        .from('faculty')
        .select(`
          id, designation, employment_type, joining_date, salary, status,
          department_id, departments(name),
          user_profiles!faculty_user_id_fkey(id, first_name, last_name, email, phone, role)
        `)
        .eq('status', 'active')
      if (institutionId) q = q.eq('institution_id', institutionId)

      const { data: facRows, error: facErr } = await q
      if (facErr) return Response.json({ error: facErr.message }, { status: 400 })

      // Fetch current-month payroll records for these faculty
      const facIds = (facRows || []).map(f => f.id)
      const now = new Date()
      let payrollRows = []
      if (facIds.length > 0) {
        const { data: pr } = await admin
          .from('payroll')
          .select('faculty_id, gross_salary, net_salary, pf_deduction, tax_deduction, status')
          .in('faculty_id', facIds)
          .eq('month', now.getMonth() + 1)
          .eq('year', now.getFullYear())
        payrollRows = pr || []
      }
      const payrollMap = {}
      payrollRows.forEach(p => { payrollMap[p.faculty_id] = p })

      // Leave balance: approved leaves this month per faculty
      let leaveRows = []
      if (facRows && facRows.length > 0) {
        const userIds = facRows.map(f => f.user_profiles?.id).filter(Boolean)
        if (userIds.length > 0) {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
          const { data: lr } = await admin
            .from('leaves')
            .select('user_id, days_count, leave_type')
            .in('user_id', userIds)
            .eq('status', 'approved')
            .gte('start_date', monthStart)
          leaveRows = lr || []
        }
      }
      const leaveMap = {}
      leaveRows.forEach(l => {
        leaveMap[l.user_id] = (leaveMap[l.user_id] || 0) + (l.days_count || 1)
      })

      const employees = (facRows || []).map(f => {
        const pr = payrollMap[f.id]
        const up = f.user_profiles || {}
        const name = [up.first_name, up.last_name].filter(Boolean).join(' ') || '—'
        const baseSalary = Number(f.salary || 0)
        const gross = pr ? Number(pr.gross_salary) : baseSalary
        const net   = pr ? Number(pr.net_salary)   : baseSalary
        const ded   = pr ? Number(pr.pf_deduction || 0) + Number(pr.tax_deduction || 0) : 0
        return {
          id:             f.id,
          supabaseId:     up.id || null,
          name,
          email:          up.email || '',
          phone:          up.phone || '',
          role:           up.role  || '',
          dept:           f.departments?.name || '—',
          designation:    f.designation || '—',
          employmentType: f.employment_type || 'full_time',
          joiningDate:    f.joining_date || null,
          baseSalary,
          gross:          `₹${gross.toLocaleString('en-IN')}`,
          deductions:     `₹${ded.toLocaleString('en-IN')}`,
          net:            `₹${net.toLocaleString('en-IN')}`,
          grossRaw:       gross,
          netRaw:         net,
          status:         pr?.status || 'Pending',
          leaveUsed:      leaveMap[up.id] || 0,
        }
      })

      // Aggregate KPIs
      const totalPayroll     = employees.reduce((s, e) => s + e.grossRaw, 0)
      const avgSalary        = employees.length > 0 ? Math.round(totalPayroll / employees.length) : 0
      const deptSet          = new Set(employees.map(e => e.dept).filter(d => d !== '—'))
      const payrollProcessed = employees.filter(e => e.status === 'Processed').length

      return Response.json({
        employees,
        kpis: {
          totalEmployees:    employees.length,
          departments:       deptSet.size,
          totalPayroll,
          avgSalary,
          payrollProcessed,
        },
      })
    }

    if (type === 'leaves') {
      // Step 1: fetch leaves without FK joins (two FKs to user_profiles causes ambiguity)
      let q = admin
        .from('leaves')
        .select('id, leave_type, start_date, end_date, days_count, reason, status, approved_at, rejection_reason, created_at, user_id')
        .order('created_at', { ascending: false })
      if (institutionId) q = q.eq('institution_id', institutionId)

      const { data: leavesRaw, error } = await q
      if (error) return Response.json({ error: error.message }, { status: 400 })

      // Step 2: fetch user profiles for all user_ids in one query
      const userIds = [...new Set((leavesRaw || []).map(l => l.user_id).filter(Boolean))]
      let userMap = {}
      if (userIds.length > 0) {
        const { data: users } = await admin
          .from('user_profiles')
          .select('id, first_name, last_name, email, role, phone')
          .in('id', userIds)
        ;(users || []).forEach(u => { userMap[u.id] = u })
      }

      const leaves = (leavesRaw || []).map(l => {
        const u = userMap[l.user_id] || {}
        return {
          id:              l.id,
          name:            [u.first_name, u.last_name].filter(Boolean).join(' ') || '—',
          email:           u.email || '',
          role:            u.role  || '',
          type:            l.leave_type,
          from:            l.start_date ? new Date(l.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '',
          to:              l.end_date   ? new Date(l.end_date).toLocaleDateString('en-IN',   { day: 'numeric', month: 'short' }) : '',
          rawFrom:         l.start_date || '',
          rawTo:           l.end_date   || '',
          days:            l.days_count || 1,
          reason:          l.reason || '',
          status:          l.status || 'pending',
          rejectionReason: l.rejection_reason || '',
          createdAt:       l.created_at,
          userId:          l.user_id || null,
        }
      })

      return Response.json({ leaves })
    }

    return Response.json({ error: 'Invalid type' }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const caller = await getCallerProfile(admin, user.id)
    const institutionId = caller.institution_id || null

    const body = await req.json()
    const { type, leave_type, start_date, end_date, days_count, reason, user_id } = body

    if (type !== 'leave') return Response.json({ error: 'type must be "leave"' }, { status: 400 })
    if (!leave_type || !start_date || !end_date) {
      return Response.json({ error: 'leave_type, start_date, end_date are required' }, { status: 400 })
    }

    const targetUserId = user_id || user.id

    const { data, error } = await admin.from('leaves').insert({
      institution_id: institutionId,
      user_id:        targetUserId,
      leave_type,
      start_date,
      end_date,
      days_count:     days_count || 1,
      reason:         reason || null,
      status:         'pending',
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })

    return Response.json({ success: true, leave: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const caller = await getCallerProfile(admin, user.id)
    const institutionId = caller.institution_id || null

    const adminRoles = ['owner','super_admin','principal','vice_principal','hr','academic_coordinator']
    const isAdmin = adminRoles.includes(caller.role || '')

    const body = await req.json()
    const { id, status, rejection_reason } = body
    if (!id || !status) return Response.json({ error: 'id and status are required' }, { status: 400 })

    // Faculty may only cancel their own pending leave; admins can approve/reject any leave
    if (!isAdmin) {
      if (status !== 'cancelled') {
        return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
      // Verify the leave belongs to the caller and is still pending
      const { data: ownLeave } = await admin
        .from('leaves')
        .select('id, user_id, status')
        .eq('id', id)
        .single()
      if (!ownLeave || ownLeave.user_id !== user.id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (ownLeave.status !== 'pending') {
        return Response.json({ error: 'Only pending leaves can be cancelled' }, { status: 400 })
      }
    }

    const patch = { status, updated_at: new Date().toISOString() }
    if (status === 'approved') { patch.approved_by = user.id; patch.approved_at = new Date().toISOString() }
    if (status === 'rejected' && rejection_reason) patch.rejection_reason = rejection_reason

    // Fetch leave to get the faculty user_id before updating
    const { data: leaveRow } = await admin
      .from('leaves')
      .select('user_id, leave_type, start_date, end_date, institution_id')
      .eq('id', id)
      .single()

    let q = admin.from('leaves').update(patch).eq('id', id)
    if (institutionId) q = q.eq('institution_id', institutionId)
    const { error } = await q

    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Notify the faculty member of the decision
    if (leaveRow?.user_id) {
      const notifTitle = status === 'approved' ? 'Leave Approved' : 'Leave Rejected'
      const notifBody  = status === 'approved'
        ? `Your ${leaveRow.leave_type || 'leave'} request (${leaveRow.start_date} – ${leaveRow.end_date}) has been approved.`
        : `Your ${leaveRow.leave_type || 'leave'} request has been rejected.${rejection_reason ? ' Reason: ' + rejection_reason : ''}`
      await admin.from('notifications').insert({
        institution_id: leaveRow.institution_id || institutionId,
        user_id:        leaveRow.user_id,
        type:           'general',
        title:          notifTitle,
        body:           notifBody,
        is_broadcast:   false,
        is_read:        false,
        link:           '/hrms',
      }).then(null, () => {})
    }

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
