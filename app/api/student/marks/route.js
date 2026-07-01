import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET /api/student/marks
// Returns all published exam marks for the logged-in student,
// grouped by subject with per-exam-type breakdown.

export async function GET() {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Find the student record for this auth user
    const { data: student } = await admin
      .from('students')
      .select('id, roll_number, class_id, classes(name, section)')
      .eq('user_id', user.id)
      .single()

    if (!student) {
      return Response.json({ marks: [], subjects: [], student: null })
    }

    // Fetch all exam_marks for this student with exam + subject info
    const { data: rawMarks, error } = await admin
      .from('exam_marks')
      .select(`
        id, marks_obtained, is_absent, remarks, grade,
        exams (
          id, name, type, total_marks, passing_marks, exam_date, is_published,
          subjects ( id, name, code )
        )
      `)
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Only show published exam marks
    const publishedMarks = (rawMarks || []).filter(m => m.exams?.is_published === true)

    // Compute grade + percentage for each mark
    const marks = publishedMarks.map(m => {
      const total    = Number(m.exams?.total_marks   || 100)
      const pass     = Number(m.exams?.passing_marks || 35)
      const obtained = m.is_absent ? 0 : Number(m.marks_obtained || 0)
      const pct      = total > 0 ? Math.round((obtained / total) * 100) : 0
      const grade    = m.is_absent ? 'AB'
        : pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+'
        : pct >= 60 ? 'B'  : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F'
      return {
        id:          m.id,
        examId:      m.exams?.id,
        examName:    m.exams?.name,
        examType:    m.exams?.type,
        examDate:    m.exams?.exam_date,
        totalMarks:  total,
        passingMarks:pass,
        obtained:    m.is_absent ? null : Number(m.marks_obtained || 0),
        isAbsent:    m.is_absent || false,
        remarks:     m.remarks || null,
        grade,
        percentage:  pct,
        passed:      !m.is_absent && Number(m.marks_obtained || 0) >= pass,
        subject: {
          id:   m.exams?.subjects?.id,
          name: m.exams?.subjects?.name || 'Unknown Subject',
          code: m.exams?.subjects?.code || '',
        },
      }
    })

    // Group by subject
    const subjectMap = {}
    marks.forEach(m => {
      const sid = m.subject.id || m.subject.name
      if (!subjectMap[sid]) {
        subjectMap[sid] = { subject: m.subject, exams: [] }
      }
      subjectMap[sid].exams.push(m)
    })

    const subjects = Object.values(subjectMap).map(s => {
      const validMarks = s.exams.filter(e => !e.isAbsent && e.obtained !== null)
      const avgPct = validMarks.length > 0
        ? Math.round(validMarks.reduce((sum, e) => sum + e.percentage, 0) / validMarks.length)
        : null
      return { ...s, averagePercentage: avgPct }
    })

    return Response.json({
      student: {
        id:        student.id,
        rollNumber:student.roll_number,
        className: student.classes ? `${student.classes.name}${student.classes.section ? ' - ' + student.classes.section : ''}` : null,
      },
      marks,
      subjects,
      totalExams:   marks.length,
      passedExams:  marks.filter(m => m.passed).length,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
