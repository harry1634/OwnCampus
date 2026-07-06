import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const FACULTY_ROLES = [
  'teacher','faculty','trainer','hod','staff','librarian','counsellor','hr',
  'admission_officer','transport_manager','hostel_manager','coordinator','tutor',
  'instructor','professor','dean','vice_principal','principal','receptionist',
]

// GET /api/homework/submissions?homework_id=<uuid>
// Faculty: returns all students in the homework's class with submission status
export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data: caller } = await admin
      .from('user_profiles')
      .select('role, institution_id')
      .eq('id', user.id)
      .single()

    if (!FACULTY_ROLES.includes(caller?.role) && !['super_admin','admin','owner'].includes(caller?.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const homeworkId = searchParams.get('homework_id')
    if (!homeworkId) return Response.json({ error: 'homework_id required' }, { status: 400 })

    // Get homework details to find the class
    const { data: hw } = await admin
      .from('homework')
      .select('id, title, class_id, institution_id')
      .eq('id', homeworkId)
      .single()

    if (!hw) return Response.json({ error: 'Homework not found' }, { status: 404 })

    // Get all students in the class
    let studentsQuery = admin
      .from('students')
      .select(`
        id, roll_number, admission_number,
        user_profiles!user_id ( id, first_name, last_name, email )
      `)
      .eq('institution_id', hw.institution_id)
      .is('deleted_at', null)
      .order('roll_number', { ascending: true })

    if (hw.class_id) studentsQuery = studentsQuery.eq('class_id', hw.class_id)

    const { data: students, error: stuErr } = await studentsQuery
    if (stuErr) return Response.json({ error: stuErr.message }, { status: 400 })

    // Get all submissions for this homework
    const { data: subs } = await admin
      .from('homework_submissions')
      .select('student_id, status, submitted_at, file_url, file_name, notes')
      .eq('homework_id', homeworkId)

    const subMap = Object.fromEntries((subs || []).map(s => [s.student_id, s]))

    const rows = (students || []).map(stu => {
      const up  = stu.user_profiles || {}
      const sub = subMap[stu.id]    || null
      return {
        student_id:       stu.id,
        roll_number:      stu.roll_number      || stu.admission_number || '—',
        name:             [up.first_name, up.last_name].filter(Boolean).join(' ') || 'Unknown',
        email:            up.email || '',
        submitted:        !!sub,
        status:           sub?.status      || null,
        submitted_at:     sub?.submitted_at || null,
        file_url:         sub?.file_url     || null,
        file_name:        sub?.file_name    || null,
        notes:            sub?.notes        || null,
      }
    })

    const submittedCount = rows.filter(r => r.submitted).length

    return Response.json({
      homework: { id: hw.id, title: hw.title },
      total:     rows.length,
      submitted: submittedCount,
      pending:   rows.length - submittedCount,
      students:  rows,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
