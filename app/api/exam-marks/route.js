import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET  /api/exam-marks?exam_id=...&class_id=...
// POST /api/exam-marks  { exam_id, marks: [{student_id, marks_obtained, is_absent}] }

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const examId    = searchParams.get('exam_id')  || null
    const studentId = searchParams.get('student_id') || null
    const userId    = searchParams.get('user_id')  || null

    const { data: callerProfile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const callerInstitution = callerProfile?.institution_id || null

    let resolvedStudentId = studentId
    if (!resolvedStudentId && userId) {
      const { data: stu } = await admin
        .from('students').select('id').eq('user_id', userId).single()
      resolvedStudentId = stu?.id || null
    }

    // If a specific exam is requested, verify it belongs to caller's institution
    if (examId && callerInstitution) {
      const { data: examCheck } = await admin
        .from('exams').select('institution_id').eq('id', examId).single()
      if (examCheck && examCheck.institution_id && examCheck.institution_id !== callerInstitution) {
        return Response.json([], { status: 200 })
      }
    }

    // If a specific student is requested, verify they belong to caller's institution
    if (resolvedStudentId && callerInstitution) {
      const { data: stuCheck } = await admin
        .from('students').select('institution_id').eq('id', resolvedStudentId).single()
      if (stuCheck && stuCheck.institution_id && stuCheck.institution_id !== callerInstitution) {
        return Response.json([], { status: 200 })
      }
    }

    if (!callerInstitution) return Response.json({ error: 'Institution not resolved.' }, { status: 400 })

    let query = admin
      .from('exam_marks')
      .select(`
        id, marks_obtained, is_absent, remarks, grade, created_at,
        exam_id, student_id,
        exams ( id, name, type, total_marks, passing_marks, exam_date, is_published,
          subjects ( id, name, code )
        ),
        students (
          id, roll_number,
          user_profiles ( first_name, last_name )
        )
      `)
      .order('created_at', { ascending: false })
      .eq('institution_id', callerInstitution)

    if (examId)              query = query.eq('exam_id', examId)
    if (resolvedStudentId)   query = query.eq('student_id', resolvedStudentId)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Compute grade + percentage
    const result = (data || []).map(m => {
      const total    = Number(m.exams?.total_marks    || 100)
      const pass     = Number(m.exams?.passing_marks  || 35)
      const obtained = Number(m.marks_obtained        || 0)
      const pct      = total > 0 ? Math.round((obtained / total) * 100) : 0
      const grade    = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F'
      return { ...m, percentage: pct, grade, passed: !m.is_absent && obtained >= pass }
    })

    return Response.json(result)
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
    const { exam_id, marks } = body

    if (!exam_id || !Array.isArray(marks) || marks.length === 0) {
      return Response.json({ error: 'exam_id and marks[] are required.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify role — only faculty and admins can enter marks
    const { data: callerProfile } = await admin.from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const MARKS_WRITE_ROLES = new Set([
      'owner','super_admin','principal','vice_principal','academic_coordinator',
      'chairman','director','administrator',
      'teacher','faculty','trainer','hod','coordinator','tutor','instructor','professor','dean',
    ])
    if (!MARKS_WRITE_ROLES.has(callerProfile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions to enter exam marks.' }, { status: 403 })
    }

    // Fetch exam for validation
    const { data: exam } = await admin.from('exams').select('total_marks, institution_id').eq('id', exam_id).single()
    if (!exam) return Response.json({ error: 'Exam not found.' }, { status: 404 })

    // Security: verify exam belongs to caller's institution
    if (callerProfile?.institution_id && exam.institution_id && callerProfile.institution_id !== exam.institution_id) {
      return Response.json({ error: 'Exam does not belong to your institution.' }, { status: 403 })
    }

    const totalMarks = Number(exam?.total_marks || 100)

    // Validate that no mark exceeds total_marks
    const overLimit = marks.filter(m => !m.is_absent && Number(m.marks_obtained ?? 0) > totalMarks)
    if (overLimit.length > 0) {
      return Response.json({
        error: `marks_obtained cannot exceed total_marks (${totalMarks}). ${overLimit.length} record(s) are over the limit.`,
      }, { status: 400 })
    }

    const rows = marks.map(m => {
      const obtained = Number(m.marks_obtained ?? 0)
      const clamped  = Math.min(obtained, totalMarks)
      const pct      = totalMarks > 0 ? Math.round((clamped / totalMarks) * 100) : 0
      const grade    = m.is_absent ? 'AB'
        : pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+'
        : pct >= 60 ? 'B'  : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F'
      return {
        exam_id,
        student_id:      m.student_id,
        marks_obtained:  clamped,
        is_absent:       m.is_absent || false,
        remarks:         m.remarks   || null,
        grade,
        entered_by:      user.id,
      }
    })

    const { data, error } = await admin
      .from('exam_marks')
      .upsert(rows, { onConflict: 'exam_id,student_id' })
      .select('id')

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, count: data?.length || 0 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
