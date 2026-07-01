import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET /api/dashboard/faculty
// Single optimized response for the faculty portal dashboard.
// Replaces: /api/announcements + /api/timetable + /api/leaves + /api/attendance

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Resolve faculty profile + institution
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id, first_name, last_name, role, institution_id, phone, metadata')
      .eq('id', user.id)
      .single()

    const institutionId = profile?.institution_id || null
    const todayDay      = DAYS[new Date().getDay()]
    const today         = new Date().toISOString().slice(0, 10)

    // Resolve faculty record
    const { data: facultyRow } = await admin
      .from('faculty')
      .select('id, designation, department_id, employee_code, departments(name)')
      .eq('user_id', user.id)
      .single()

    // All 6 queries in parallel
    const [
      announcementsResult,
      timetableResult,
      leavesResult,
      pendingAttendanceResult,
      leaveBalanceResult,
      upcomingExamsResult,
    ] = await Promise.all([

      // 1. Recent announcements
      admin
        .from('announcements')
        .select('id, title, type, created_at, content')
        .eq('institution_id', institutionId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5),

      // 2. Today's timetable
      admin
        .from('timetable_slots')
        .select(`
          id, start_time, end_time, subject_id, class_id, period_number,
          subjects(name, code), classes(name, section)
        `)
        .eq('institution_id', institutionId)
        .eq('faculty_id', facultyRow?.id || '00000000-0000-0000-0000-000000000000')
        .eq('day_of_week', todayDay.toLowerCase())
        .order('period_number', { ascending: true }),

      // 3. My pending leave requests
      admin
        .from('leaves')
        .select('id, leave_type, start_date, end_date, days_count, status, reason, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),

      // 4. Today's attendance sessions I should have marked
      admin
        .from('attendance')
        .select('id, class_id, date, status, classes(name, section)')
        .eq('marked_by', user.id)
        .eq('date', today)
        .limit(5),

      // 5. Leave balance: approved leaves this month
      admin
        .from('leaves')
        .select('leave_type, days_count')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .gte('start_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString().slice(0, 10)),

      // 6. Upcoming published exams (faculty sees same published view as students)
      admin
        .from('exams')
        .select('id, name, exam_date, start_time, is_published, classes(name, section)')
        .eq('institution_id', institutionId)
        .eq('is_published', true)
        .is('deleted_at', null)
        .gte('exam_date', today)
        .order('exam_date', { ascending: true })
        .limit(5),
    ])

    // Calculate leave balance
    const usedLeaves = (leaveBalanceResult.data || []).reduce((s, l) => s + (l.days_count || 1), 0)
    const leaveAllowance = 12 // configurable
    const leaveBalance   = Math.max(leaveAllowance - usedLeaves, 0)

    return Response.json({
      profile: {
        id:          user.id,
        name:        `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
        role:        profile?.role || 'faculty',
        designation: facultyRow?.designation || '',
        department:  facultyRow?.departments?.name || '',
        employeeCode: facultyRow?.employee_code || '',
        institutionId,
      },
      announcements:  announcementsResult.data || [],
      timetable:      timetableResult.data     || [],
      leaves:         leavesResult.data        || [],
      upcomingExams:  upcomingExamsResult.data  || [],
      stats: {
        classesToday:  (timetableResult.data || []).length,
        leaveBalance,
        leaveUsed:     usedLeaves,
        pendingLeaves: (leavesResult.data || []).filter(l => l.status === 'pending').length,
      },
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
