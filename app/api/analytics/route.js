import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET /api/analytics — returns real computed KPIs and trend data for the institution

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null
    if (!institutionId) return Response.json({ error: 'Institution not found.' }, { status: 404 })

    // ── Parallel queries ────────────────────────────────────────────────
    const [
      { count: totalStudents },
      { count: totalFaculty  },
      { data: feeRows        },
      { data: attendanceRows },
      { data: examRows       },
      { data: leaveRows      },
      { data: recentPayments },
      { data: examMarksRaw   },
      { data: leadsRaw       },
      { data: bookIssuesRaw  },
    ] = await Promise.all([
      // Students (exclude soft-deleted)
      admin.from('students')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId).eq('status', 'active').is('deleted_at', null),

      // Faculty
      admin.from('faculty')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId).eq('status', 'active'),

      // Fee totals (exclude soft-deleted)
      admin.from('students')
        .select('total_fee, paid_amount, fee_status')
        .eq('institution_id', institutionId).eq('status', 'active').is('deleted_at', null),

      // Attendance (last 30 days)
      admin.from('attendance')
        .select('date, status')
        .eq('institution_id', institutionId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        .order('date', { ascending: true }),

      // Exams (no row limit — use date filter instead of truncated count)
      admin.from('exams')
        .select('id, exam_date, is_published')
        .eq('institution_id', institutionId)
        .is('deleted_at', null)
        .order('exam_date', { ascending: false }),

      // Leaves (current month — anchor to start_date for consistency with faculty dashboard)
      admin.from('leaves')
        .select('status')
        .eq('institution_id', institutionId)
        .gte('start_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),

      // Recent fee payments (last 6 months for trend)
      admin.from('fee_payments')
        .select('amount, payment_date, status')
        .eq('institution_id', institutionId)
        .eq('status', 'paid')
        .gte('payment_date', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        .order('payment_date', { ascending: true }),

      // Exam marks with subject info (for subject performance + pass rate)
      admin.from('exam_marks')
        .select('marks_obtained, passing_marks, exams!inner(institution_id, total_marks, subjects(name))')
        .eq('exams.institution_id', institutionId)
        .not('marks_obtained', 'is', null)
        .eq('is_absent', false),

      // Admission leads by source
      admin.from('leads')
        .select('source')
        .eq('institution_id', institutionId),

      // Book issues (last 6 months)
      admin.from('book_issues')
        .select('issued_date, status')
        .eq('institution_id', institutionId)
        .gte('issued_date', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
    ])

    // ── KPI Calculations ────────────────────────────────────────────────
    const rows         = feeRows || []
    const totalFee     = rows.reduce((s, r) => s + Number(r.total_fee   || 0), 0)
    const totalPaid    = rows.reduce((s, r) => s + Number(r.paid_amount || 0), 0)
    const outstanding  = Math.max(totalFee - totalPaid, 0)
    const feePct       = totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 0

    const feePending   = rows.filter(r => r.fee_status === 'pending').length
    const feePaid      = rows.filter(r => r.fee_status === 'paid').length
    const feePartial   = rows.filter(r => r.fee_status === 'partial').length

    // Attendance average (30 days)
    const attRows   = attendanceRows || []
    const attTotal  = attRows.length
    const attPresent= attRows.filter(r => r.status === 'present').length
    const attPct    = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0

    // Attendance trend (last 7 unique dates)
    const byDate = {}
    attRows.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { total: 0, present: 0 }
      byDate[r.date].total++
      if (r.status === 'present') byDate[r.date].present++
    })
    const attTrend = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([date, v]) => ({
        date:  new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        value: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
      }))

    // Exam stats
    const exRows    = examRows || []
    const today     = new Date().toISOString().slice(0, 10)
    const upcoming  = exRows.filter(e => e.exam_date > today).length
    const completed = exRows.filter(e => e.exam_date < today).length
    const published = exRows.filter(e => e.is_published).length

    // Leave stats (current month)
    const lvRows    = leaveRows || []
    const lvPending = lvRows.filter(l => l.status === 'pending').length
    const lvApproved= lvRows.filter(l => l.status === 'approved').length

    // Fee collection trend (last 6 months)
    const monthlyFee = {}
    const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    ;(recentPayments || []).forEach(p => {
      const d = new Date(p.payment_date)
      const k = MONTHS[d.getMonth()]
      monthlyFee[k] = (monthlyFee[k] || 0) + Number(p.amount || 0)
    })

    // Build last 6 months labels
    const now         = new Date()
    const feeChartData= Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const lbl = MONTHS[d.getMonth()]
      return { month: lbl, collected: Math.round((monthlyFee[lbl] || 0) / 1000) } // in thousands
    })

    // ── Subject Performance ─────────────────────────────────────────────
    const marksRows = (examMarksRaw || []).filter(r => r.exams && r.exams.subjects)
    const subjectMap = {}
    marksRows.forEach(r => {
      const name = r.exams.subjects?.name
      if (!name) return
      const totalMarks = Number(r.exams.total_marks || 0)
      const obtained   = Number(r.marks_obtained   || 0)
      const pct        = totalMarks > 0 ? (obtained / totalMarks) * 100 : 0
      if (!subjectMap[name]) subjectMap[name] = { sum: 0, count: 0 }
      subjectMap[name].sum   += pct
      subjectMap[name].count += 1
    })
    const subjectPerformance = Object.entries(subjectMap).map(([subject, v]) => ({
      subject,
      A: Math.round(v.sum / v.count),
    }))

    // ── Pass Rate ───────────────────────────────────────────────────────
    let passCount = 0
    let totalCount = 0
    marksRows.forEach(r => {
      const passing  = Number(r.passing_marks    || 0)
      const obtained = Number(r.marks_obtained   || 0)
      if (passing > 0) {
        totalCount++
        if (obtained >= passing) passCount++
      }
    })
    const passRate = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : null

    // ── Admission Sources ───────────────────────────────────────────────
    const SOURCE_COLORS = ['#2563EB', '#10B981', '#EC4899', '#F59E0B', '#0891B2', '#7C3AED', '#DB2777']
    const sourceMap = {}
    ;(leadsRaw || []).forEach(l => {
      const src = l.source || 'Unknown'
      sourceMap[src] = (sourceMap[src] || 0) + 1
    })
    const admissionSources = Object.entries(sourceMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([source, count], i) => ({ source, count, color: SOURCE_COLORS[i] || '#94A3B8' }))

    // ── Library Trend ───────────────────────────────────────────────────
    const libMonthMap = {}
    ;(bookIssuesRaw || []).forEach(b => {
      if (!b.issued_date) return
      const d   = new Date(b.issued_date)
      const k   = MONTHS[d.getMonth()]
      libMonthMap[k] = (libMonthMap[k] || 0) + 1
    })
    const libraryTrend = Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const lbl = MONTHS[d.getMonth()]
      return { month: lbl, issued: libMonthMap[lbl] || 0 }
    })

    return Response.json({
      kpis: {
        students:    totalStudents || 0,
        faculty:     totalFaculty  || 0,
        attendance:  attPct,
        feeCollection: feePct,
        feeCollected:  totalPaid,
        feeOutstanding: outstanding,
        feePending,
        feePaid,
        feePartial,
        examsUpcoming:  upcoming,
        examsCompleted: completed,
        examsPublished: published,
        leavesPending:  lvPending,
        leavesApproved: lvApproved,
        passRate,
      },
      charts: {
        attendanceTrend: attTrend,
        feeCollectionTrend: feeChartData,
        feeStatus: [
          { name: 'Paid',    value: feePaid,    color: '#16A34A' },
          { name: 'Partial', value: feePartial, color: '#D97706' },
          { name: 'Pending', value: feePending, color: '#94A3B8' },
        ],
        subjectPerformance,
        admissionSources,
        libraryTrend,
      },
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
