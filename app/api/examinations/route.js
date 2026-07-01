import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET  /api/examinations?class_id=...&status=upcoming|ongoing|completed
// POST /api/examinations        → create exam
// PATCH /api/examinations       → update exam
// DELETE /api/examinations?id=. → delete exam

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const classId  = searchParams.get('class_id') || null
    const status   = searchParams.get('status')   || null
    const examId   = searchParams.get('id')       || null
    const page     = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const pageSize = Math.min(200, parseInt(searchParams.get('limit') || '100'))

    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    // Resolve student's class for student portal
    let resolvedClassId = classId
    if (!resolvedClassId && profile?.role === 'student') {
      const { data: stu } = await admin
        .from('students').select('class_id').eq('user_id', user.id).single()
      resolvedClassId = stu?.class_id || null
    }

    let query = admin
      .from('exams')
      .select(`
        id, name, type, exam_date, start_time, end_time, hall_number, total_marks, passing_marks, is_published,
        class_id, subject_id, institution_id, created_at, invigilator_id,
        classes  ( id, name, section ),
        subjects ( id, name, code ),
        invigilator_profile:invigilator_id ( first_name, last_name )
      `)
      .order('exam_date', { ascending: false })

    if (institutionId)   query = query.eq('institution_id', institutionId)
    if (resolvedClassId) query = query.eq('class_id', resolvedClassId)
    if (examId)          query = query.eq('id', examId)
    if (!examId)         query = query.range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 400 })

    const today = new Date().toISOString().slice(0, 10)
    const exams = (data || []).map(e => ({
      ...e,
      computed_status: !e.exam_date
        ? 'upcoming'
        : e.exam_date > today
          ? 'upcoming'
          : 'completed',
    })).filter(e => !status || e.computed_status === status)

    return Response.json(exams)
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
    const {
      name, type, exam_date, start_time, end_time, hall_number,
      total_marks, passing_marks, class_id, subject_id, invigilator_id,
    } = body

    if (!name || !type || !exam_date) {
      return Response.json({ error: 'name, type and exam_date are required.' }, { status: 400 })
    }
    if (!class_id) {
      return Response.json({ error: 'class_id is required.' }, { status: 400 })
    }
    if (!subject_id) {
      return Response.json({ error: 'subject_id is required.' }, { status: 400 })
    }
    if (total_marks !== undefined && Number(total_marks) <= 0) {
      return Response.json({ error: 'total_marks must be a positive number.' }, { status: 400 })
    }
    if (passing_marks !== undefined && total_marks !== undefined && Number(passing_marks) > Number(total_marks)) {
      return Response.json({ error: 'passing_marks cannot exceed total_marks.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()

    const { data, error } = await admin
      .from('exams')
      .insert({
        name,
        type,
        exam_date:      exam_date      || null,
        start_time:     start_time     || null,
        end_time:       end_time       || null,
        hall_number:    hall_number    || null,
        total_marks:    total_marks    || 100,
        passing_marks:  passing_marks  || 35,
        class_id:       class_id       || null,
        subject_id:     subject_id     || null,
        invigilator_id: invigilator_id || null,
        institution_id: profile?.institution_id || null,
      })
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 400 })

    await admin.from('audit_logs').insert({
      institution_id: profile?.institution_id || null,
      actor_id:       user.id,
      action:         'create',
      entity_type:    'exam',
      entity_id:      data.id,
      new_value:      { name, type, exam_date, class_id, subject_id },
    }).then(null, () => {})

    return Response.json({ success: true, exam: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return Response.json({ error: 'id is required.' }, { status: 400 })

    const admin = createAdminClient()
    const allowed = ['name','type','exam_date','start_time','end_time','hall_number','total_marks','passing_marks','class_id','subject_id','is_published','invigilator_id']
    const patch   = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))

    const { data: prevExam } = await admin.from('exams').select('is_published, name, class_id, institution_id').eq('id', id).single()

    // Scope to caller's institution
    const { data: callerProfile } = await admin.from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = callerProfile?.institution_id || null

    const { data, error } = await admin.from('exams').update(patch)
      .eq('id', id)
      .eq('institution_id', institutionId)
      .select().single()
    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Audit log
    await admin.from('audit_logs').insert({
      institution_id: institutionId,
      actor_id:       user.id,
      action:         'update',
      entity_type:    'exam',
      entity_id:      id,
      new_value:      patch,
    }).then(null, () => {})

    // Notify students in the class when exam is published for the first time
    if (patch.is_published === true && prevExam && !prevExam.is_published && prevExam.class_id) {
      try {
        const { data: stuRows } = await admin
          .from('students')
          .select('user_id')
          .eq('class_id', prevExam.class_id)
          .eq('status', 'active')

        const notifications = (stuRows || []).map(s => ({
          institution_id: prevExam.institution_id,
          user_id:        s.user_id,
          type:           'exam',
          title:          'Exam Scheduled',
          body:           `📋 ${prevExam.name || 'An exam'} has been scheduled for your class.`,
          is_broadcast:   false,
          is_read:        false,
          metadata:       { exam_id: id },
        }))

        if (notifications.length > 0) {
          await admin.from('notifications').insert(notifications)
        }
      } catch {}
    }

    return Response.json({ success: true, exam: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id is required.' }, { status: 400 })

    const admin = createAdminClient()
    const { data: callerP } = await admin.from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const ADMIN_ROLES = ['owner','super_admin','principal','vice_principal','academic_coordinator']
    if (!ADMIN_ROLES.includes(callerP?.role || '')) return Response.json({ error: 'Insufficient permissions.' }, { status: 403 })

    // Scope to institution so cross-institution deletion is impossible
    const { error } = await admin.from('exams').delete()
      .eq('id', id)
      .eq('institution_id', callerP?.institution_id)
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
