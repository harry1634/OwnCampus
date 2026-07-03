import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET /api/dashboard/student
// Single optimized response for the student portal dashboard.
// Replaces: /api/announcements + /api/timetable + /api/attendance?my=true
//         + /api/fee-payments + /api/examinations + /api/notifications

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Resolve student profile
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id, first_name, last_name, role, institution_id, phone')
      .eq('id', user.id)
      .single()

    const institutionId = profile?.institution_id || null

    // Resolve student record
    const { data: studentRow } = await admin
      .from('students')
      .select('id, roll_number, admission_number, class_id, total_fee, paid_amount, fee_status, status, classes(name, section)')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (!studentRow) {
      return Response.json({ error: 'Student record not found.' }, { status: 404 })
    }

    const classId   = studentRow.class_id
    const studentId = studentRow.id
    const todayDay  = DAYS[new Date().getDay()]
    const today     = new Date().toISOString().slice(0, 10)
    const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    // 7 parallel queries
    const [
      announcementsResult,
      timetableResult,
      attendanceResult,
      notificationsResult,
      examsResult,
      feeHistoryResult,
      marksResult,
      overdueResult,
    ] = await Promise.all([

      // 1. Announcements
      admin
        .from('announcements')
        .select('id, title, type, created_at, content')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false })
        .limit(5),

      // 2. Today's timetable for student's class
      classId ? admin
        .from('timetable_slots')
        .select(`
          id, start_time, end_time, room, period_number,
          subjects(name, code),
          user_profiles!faculty_user_id(first_name, last_name)
        `)
        .eq('class_id', classId)
        .eq('day_of_week', todayDay.toLowerCase())
        .order('period_number', { ascending: true })
        : { data: [] },

      // 3. Attendance last 30 days (no row limit — up to 30 days * periods per day)
      admin
        .from('attendance')
        .select('id, date, status, subjects(name)')
        .eq('student_id', studentId)
        .eq('institution_id', institutionId)
        .gte('date', sinceDate)
        .order('date', { ascending: false }),

      // 4. Unread notifications
      admin
        .from('notifications')
        .select('id, title, body, type, created_at, is_read, link')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(8),

      // 5. Upcoming exams for student's class
      classId ? admin
        .from('exams')
        .select('id, name, exam_date, start_time, total_marks, subjects(name)')
        .eq('class_id', classId)
        .eq('institution_id', institutionId)
        .eq('is_published', true)
        .is('deleted_at', null)
        .gte('exam_date', today)
        .order('exam_date', { ascending: true })
        .limit(5)
        : { data: [] },

      // 6. Recent fee payments
      admin
        .from('fee_payments')
        .select('id, amount, payment_date, receipt_number, payment_mode, status')
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .order('payment_date', { ascending: false })
        .limit(5),

      // 7. Recent exam marks
      admin
        .from('exam_marks')
        .select(`
          id, marks_obtained, grade, created_at,
          exams(name, exam_date, total_marks, subjects(name))
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(5),

      // 8. Overdue library books
      admin
        .from('book_issues')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'issued')
        .lt('due_date', today),
    ])

    // Attendance summary
    const attRows    = attendanceResult.data || []
    const attTotal   = attRows.length
    const attPresent = attRows.filter(r => r.status === 'present').length
    const attPct     = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : null

    // Fee summary
    const totalFee    = Number(studentRow.total_fee   || 0)
    const paidAmount  = Number(studentRow.paid_amount || 0)
    const outstanding = Math.max(totalFee - paidAmount, 0)

    return Response.json({
      profile: {
        id:              user.id,
        name:            `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
        rollNumber:      studentRow.roll_number,
        admissionNumber: studentRow.admission_number,
        className:       studentRow.classes
          ? `${studentRow.classes.name}${studentRow.classes.section ? '-' + studentRow.classes.section : ''}`
          : null,
        institutionId,
      },
      announcements: announcementsResult.data  || [],
      timetable:     timetableResult.data      || [],
      notifications: notificationsResult.data  || [],
      upcomingExams: examsResult.data          || [],
      recentMarks:   marksResult.data          || [],
      feeHistory:    feeHistoryResult.data     || [],
      stats: {
        attendance:    attPct,
        attendanceDays: attTotal,
        presentDays:    attPresent,
        totalFee,
        paidAmount,
        outstanding,
        feeStatus:      studentRow.fee_status || 'pending',
        unreadNotifications: (notificationsResult.data || []).length,
        upcomingExamCount: (examsResult.data || []).length,
        overdueBooks:   overdueResult.count || 0,
      },
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
