import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { isModuleEnabled }   from '@/lib/licenseEngine'

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
      total_marks, passing_marks, invigilator_id,
      class_id:    rawClassId,
      subject_id:  rawSubjectId,
      class_name:  className,
      subject_name: subjectName,
    } = body

    if (!name || !type || !exam_date) {
      return Response.json({ error: 'name, type and exam_date are required.' }, { status: 400 })
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
    const institutionId = profile?.institution_id || null

    if (institutionId && !(await isModuleEnabled(institutionId, 'examinations'))) {
      return Response.json({ error: 'Examinations module is not enabled for your institution.' }, { status: 403 })
    }

    // ── Resolve class_id ──────────────────────────────────────────────────────
    let resolvedClassId = rawClassId || null
    if (!resolvedClassId && className) {
      // Strip " - " or "-" separator for section matching
      const namePart    = className.split(/\s*[-–]\s*/)[0].trim()
      const sectionPart = className.split(/\s*[-–]\s*/)[1]?.trim() || null
      let q = admin.from('classes').select('id').ilike('name', namePart)
      if (institutionId) q = q.eq('institution_id', institutionId)
      if (sectionPart)   q = q.ilike('section', sectionPart)
      const { data: classRows } = await q.limit(1)
      resolvedClassId = classRows?.[0]?.id || null

      // If still not found, try a broader search (class stored without section)
      if (!resolvedClassId) {
        let q2 = admin.from('classes').select('id').ilike('name', `%${namePart}%`)
        if (institutionId) q2 = q2.eq('institution_id', institutionId)
        const { data: classRows2 } = await q2.limit(1)
        resolvedClassId = classRows2?.[0]?.id || null
      }
    }
    if (!resolvedClassId) {
      return Response.json({ error: 'Class not found. Please ensure the class exists in Admin → Classes.' }, { status: 400 })
    }

    // ── Resolve subject_id (create if missing) ────────────────────────────────
    let resolvedSubjectId = rawSubjectId || null
    const subName = (subjectName || name || '').trim()
    if (!resolvedSubjectId && subName) {
      let sq = admin.from('subjects').select('id').ilike('name', subName)
      if (institutionId) sq = sq.eq('institution_id', institutionId)
      const { data: subRows } = await sq.limit(1)
      if (subRows?.[0]?.id) {
        resolvedSubjectId = subRows[0].id
      } else {
        // Create the subject on the fly
        const { data: newSub } = await admin.from('subjects')
          .insert({ name: subName, institution_id: institutionId })
          .select('id').single()
        resolvedSubjectId = newSub?.id || null
      }
    }
    if (!resolvedSubjectId) {
      return Response.json({ error: 'subject_id or subject_name is required.' }, { status: 400 })
    }

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
        class_id:       resolvedClassId,
        subject_id:     resolvedSubjectId,
        invigilator_id: invigilator_id || null,
        institution_id: institutionId,
      })
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 400 })

    // ── Audit log ─────────────────────────────────────────────────────────────
    await admin.from('audit_logs').insert({
      institution_id: institutionId,
      actor_id:       user.id,
      action:         'create',
      entity_type:    'exam',
      entity_id:      data.id,
      new_value:      { name, type, exam_date, class_id: resolvedClassId, subject_id: resolvedSubjectId },
    }).then(null, () => {})

    // ── Notify invigilator ────────────────────────────────────────────────────
    if (invigilator_id) {
      await admin.from('notifications').insert({
        institution_id: institutionId,
        user_id:        invigilator_id,
        type:           'exam',
        title:          'Invigilation Assigned',
        body:           `📋 You have been assigned to invigilate ${name} — ${subName} on ${exam_date}.`,
        is_broadcast:   false,
        is_read:        false,
        metadata:       { exam_id: data.id },
      }).then(null, () => {})
    }

    // ── Notify students in the class ──────────────────────────────────────────
    try {
      const { data: stuRows } = await admin
        .from('students')
        .select('user_id')
        .eq('class_id', resolvedClassId)
        .eq('status', 'active')
        .not('user_id', 'is', null)

      const stuNotifs = (stuRows || []).map(s => ({
        institution_id: institutionId,
        user_id:        s.user_id,
        type:           'exam',
        title:          'Exam Scheduled',
        body:           `📅 ${name} — ${subName} scheduled on ${exam_date}${hall_number ? ' at ' + hall_number : ''}.`,
        is_broadcast:   false,
        is_read:        false,
        metadata:       { exam_id: data.id },
      }))
      if (stuNotifs.length > 0) await admin.from('notifications').insert(stuNotifs)
    } catch {}

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

    // Notify invigilator when newly assigned via update
    if (patch.invigilator_id && patch.invigilator_id !== (prevExam?.invigilator_id || null)) {
      await admin.from('notifications').insert({
        institution_id: institutionId,
        user_id:        patch.invigilator_id,
        type:           'exam',
        title:          'Invigilation Assigned',
        body:           `📋 You have been assigned to invigilate an exam. Check your schedule.`,
        is_broadcast:   false,
        is_read:        false,
        metadata:       { exam_id: id },
      }).then(null, () => {})
    }

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
