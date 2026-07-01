import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET  /api/attendance?date=YYYY-MM-DD&class_id=...&type=student|faculty
// POST /api/attendance  { date, class_id, records: [{student_id|faculty_id, status}] }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeClassLabel(value) {
  return String(value || '')
    .replace(/^class\s+/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function classMatchesLabel(cls, label) {
  const wanted = normalizeClassLabel(label)
  if (!wanted) return false
  const name = cls?.name || ''
  const section = cls?.section || ''
  return [
    name,
    section ? `${name} ${section}` : '',
    section ? `${name}-${section}` : '',
  ].some(candidate => normalizeClassLabel(candidate) === wanted)
}

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const date     = searchParams.get('date')     || new Date().toISOString().slice(0, 10)
    const classId  = searchParams.get('class_id') || null
    const type     = searchParams.get('type')     || 'student'
    const myOwn    = searchParams.get('my')       === 'true'
    const page     = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const pageSize = Math.min(500, parseInt(searchParams.get('limit') || '500'))

    // Resolve institution
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    // ?my=true — return the logged-in student's full attendance history (last 90 days)
    if (myOwn) {
      const { data: studentRow } = await admin
        .from('students').select('id').eq('user_id', user.id).single()
      if (!studentRow) return Response.json({ records: [], summary: {} })

      const since = new Date()
      since.setDate(since.getDate() - 90)
      const sinceStr = since.toISOString().slice(0, 10)

      let q = admin
        .from('attendance')
        .select('id, date, status, class_id, subject_id, subjects(name, code), classes(name, section)')
        .eq('student_id', studentRow.id)
        .gte('date', sinceStr)
        .order('date', { ascending: false })

      if (institutionId) q = q.eq('institution_id', institutionId)

      const { data: rows, error } = await q
      if (error) return Response.json({ error: error.message }, { status: 400 })

      return Response.json({ records: rows || [], studentId: studentRow.id })
    }

    let query = admin
      .from('attendance')
      .select(`
        id, date, status, remarks,
        student_id, faculty_id, class_id, subject_id,
        students ( id, roll_number, user_id,
          user_profiles ( first_name, last_name, email )
        )
      `)
      .eq('date', date)

    if (institutionId) query = query.eq('institution_id', institutionId)
    if (classId)       query = query.eq('class_id', classId)
    if (type === 'student')  query = query.not('student_id', 'is', null)
    if (type === 'faculty')  query = query.not('faculty_id', 'is', null)
    query = query.range((page - 1) * pageSize, page * pageSize - 1)

    const { data, error } = await query.order('created_at', { ascending: true })
    if (error) return Response.json({ error: error.message }, { status: 400 })

    return Response.json(data || [])
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
    const { date, class_id, subject_id, records } = body

    if (!date || !Array.isArray(records) || records.length === 0) {
      return Response.json({ error: 'date and records[] are required.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Resolve institution
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    const type = body.type || 'student'

    const studentIds = [
      ...new Set(
        records
          .map(r => r.student_id)
          .filter(id => typeof id === 'string' && UUID_RE.test(id))
      ),
    ]

    const studentsById = {}
    const studentsByUserId = {}
    if (studentIds.length > 0) {
      const [byStudentId, byUserId] = await Promise.all([
        admin
          .from('students')
          .select('id, user_id, class_id, institution_id')
          .in('id', studentIds),
        admin
          .from('students')
          .select('id, user_id, class_id, institution_id')
          .in('user_id', studentIds),
      ])

      if (byStudentId.error) return Response.json({ error: byStudentId.error.message }, { status: 400 })
      if (byUserId.error)    return Response.json({ error: byUserId.error.message },    { status: 400 })

      ;[...(byStudentId.data || []), ...(byUserId.data || [])].forEach(s => {
        studentsById[s.id] = s
        if (s.user_id) studentsByUserId[s.user_id] = s
      })
    }

    let classRows = []
    const hasClassLabels = records.some(r => r.class_label || r.class || r.class_name) || body.class_label || body.class
    if (hasClassLabels && institutionId) {
      const { data: classes, error: classError } = await admin
        .from('classes')
        .select('id, name, section')
        .eq('institution_id', institutionId)
      if (classError) return Response.json({ error: classError.message }, { status: 400 })
      classRows = classes || []
    }

    const resolveClassId = (r, studentRow) => {
      if (class_id || r.class_id || studentRow?.class_id) return class_id || r.class_id || studentRow.class_id
      const label = r.class_label || r.class || r.class_name || body.class_label || body.class
      return classRows.find(c => classMatchesLabel(c, label))?.id || null
    }

    // Upsert each attendance record
    const rows = []
    for (const r of records) {
      const studentRow = r.student_id ? (studentsById[r.student_id] || studentsByUserId[r.student_id] || null) : null
      const studentId = studentRow?.id || r.student_id || null
      const resolvedClassId = resolveClassId(r, studentRow)

      if (type === 'student' && r.student_id && !studentRow) {
        return Response.json({
          error: 'Student attendance requires a student record. Re-save or import this student from the Students page first.',
        }, { status: 400 })
      }

      if (type === 'student' && !resolvedClassId) {
        return Response.json({
          error: 'Student attendance requires a class. Assign this student to an existing class before saving attendance.',
        }, { status: 400 })
      }

      rows.push({
        date,
        class_id:          resolvedClassId,
        subject_id:        subject_id || r.subject_id || null,
        student_id:        studentId,
        faculty_id:        r.faculty_id  || null,
        status:            r.status      || 'present',
        remarks:           r.remarks     || null,
        institution_id:    institutionId,
        marked_by: user.id,
      })
    }

    // Try upsert with correct unique constraint (student_id, date, subject_id)
    let saved = false
    const { data, error } = await admin
      .from('attendance')
      .upsert(rows, { onConflict: 'student_id,date,subject_id', ignoreDuplicates: false })
      .select('id')

    if (!error) {
      saved = true
      return Response.json({ success: true, count: data?.length || 0 })
    }

    // Fallback 1: try faculty conflict key
    if (type === 'faculty' || rows.some(r => r.faculty_id)) {
      const { data: d2, error: e2 } = await admin
        .from('attendance')
        .upsert(rows, { onConflict: 'faculty_id,date', ignoreDuplicates: false })
        .select('id')
      if (!e2) return Response.json({ success: true, count: d2?.length || 0 })
    }

    // Fallback 2: strip subject_id and retry with student_id,date conflict key (no subject)
    const rowsSimple = rows.map(({ subject_id: _s, ...rest }) => rest)
    const { data: d3, error: e3 } = await admin
      .from('attendance')
      .upsert(rowsSimple, { onConflict: 'student_id,date', ignoreDuplicates: false })
      .select('id')
    if (!e3) return Response.json({ success: true, count: d3?.length || 0 })

    // Fallback 3: plain insert (no conflict handling — some DBs don't have the unique index)
    const { data: d4, error: e4 } = await admin
      .from('attendance')
      .insert(rowsSimple)
      .select('id')
    if (e4) return Response.json({ error: e4.message }, { status: 400 })
    return Response.json({ success: true, count: d4?.length || 0 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PUT /api/attendance — correct an existing attendance record
export async function PUT(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const body  = await req.json()
    const { attendance_id, status, remarks } = body

    if (!attendance_id) return Response.json({ error: 'attendance_id required.' }, { status: 400 })
    if (!status)        return Response.json({ error: 'status required.' },        { status: 400 })

    // Scope: verify the record belongs to the caller's institution
    const { data: callerProfile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const institutionId = callerProfile?.institution_id || null
    const ALLOWED_ROLES = ['owner','super_admin','principal','vice_principal','academic_coordinator','teacher','faculty']
    if (!ALLOWED_ROLES.includes(callerProfile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions.' }, { status: 403 })
    }

    const { data: rec } = await admin.from('attendance').select('institution_id').eq('id', attendance_id).single()
    if (institutionId && rec?.institution_id && rec.institution_id !== institutionId) {
      return Response.json({ error: 'Record belongs to a different institution.' }, { status: 403 })
    }

    const { error } = await admin
      .from('attendance')
      .update({ status, remarks: remarks || null })
      .eq('id', attendance_id)

    if (error) return Response.json({ error: error.message }, { status: 400 })

    await admin.from('audit_logs').insert({
      institution_id: institutionId,
      actor_id:       user.id,
      action:         'update',
      entity_type:    'attendance',
      entity_id:      attendance_id,
      new_value:      { status, remarks },
    }).then(null, () => {})

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
