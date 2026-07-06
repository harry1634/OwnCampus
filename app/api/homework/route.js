import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const FACULTY_ROLES = [
  'teacher','faculty','trainer','hod','staff','librarian','counsellor','hr',
  'admission_officer','transport_manager','hostel_manager','coordinator','tutor',
  'instructor','professor','dean','vice_principal','principal','receptionist',
]

async function getCallerProfile(admin, userId) {
  const { data } = await admin
    .from('user_profiles')
    .select('role, institution_id')
    .eq('id', userId)
    .single()
  return data || {}
}

// GET /api/homework
//   ?my=true          → student: homework for their class (published only)
//   ?faculty=true     → faculty: all homework they created
//   ?class_id=<uuid>  → admin: filter by class
export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin  = createAdminClient()
    const caller = await getCallerProfile(admin, user.id)
    const { searchParams } = new URL(req.url)
    const myMode      = searchParams.get('my')      === 'true'
    const facultyMode = searchParams.get('faculty') === 'true'
    const classFilter = searchParams.get('class_id') || null

    let q = admin
      .from('homework')
      .select(`
        id, title, description, subject, due_date, is_published,
        attachment_url, created_at, updated_at,
        faculty_id,
        faculty:faculty_id ( first_name, last_name ),
        class_id,
        classes ( id, name, section )
      `)
      .eq('institution_id', caller.institution_id)
      .order('created_at', { ascending: false })

    if (myMode) {
      // Student: find their class_id first
      const { data: stu } = await admin
        .from('students')
        .select('id, class_id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single()

      if (!stu?.class_id) return Response.json({ homework: [] })

      // Find submitted ids for this student
      const { data: subs } = await admin
        .from('homework_submissions')
        .select('homework_id, status, submitted_at, file_url, file_name')
        .eq('student_id', stu.id)
      const submittedMap = Object.fromEntries((subs || []).map(s => [s.homework_id, s]))

      q = q.eq('class_id', stu.class_id).eq('is_published', true)
      const { data, error } = await q
      if (error) return Response.json({ error: error.message }, { status: 400 })

      const rows = (data || []).map(h => ({
        id:           h.id,
        title:        h.title,
        subject:      h.subject,
        description:  h.description,
        due_date:     h.due_date,
        attachment_url: h.attachment_url,
        class_name:   h.classes ? `${h.classes.name}${h.classes.section ? '-' + h.classes.section : ''}` : null,
        faculty_name: h.faculty ? [h.faculty.first_name, h.faculty.last_name].filter(Boolean).join(' ') : null,
        created_at:   h.created_at,
        submitted:         !!submittedMap[h.id],
        submission_status: submittedMap[h.id]?.status     || null,
        submitted_at:      submittedMap[h.id]?.submitted_at || null,
        file_url:          submittedMap[h.id]?.file_url   || null,
        file_name:         submittedMap[h.id]?.file_name  || null,
        is_overdue:   h.due_date && new Date(h.due_date) < new Date(),
      }))

      return Response.json({ homework: rows })
    }

    if (facultyMode || FACULTY_ROLES.includes(caller.role)) {
      // Faculty sees only their own homework
      q = q.eq('faculty_id', user.id)
    }
    if (classFilter) q = q.eq('class_id', classFilter)

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 400 })

    // For faculty mode: count submissions per homework
    const hwIds = (data || []).map(h => h.id)
    let subCountMap = {}
    if (hwIds.length > 0) {
      const { data: subs } = await admin
        .from('homework_submissions')
        .select('homework_id')
        .in('homework_id', hwIds)
      ;(subs || []).forEach(s => {
        subCountMap[s.homework_id] = (subCountMap[s.homework_id] || 0) + 1
      })
    }

    const rows = (data || []).map(h => ({
      id:           h.id,
      title:        h.title,
      subject:      h.subject,
      description:  h.description,
      due_date:     h.due_date,
      is_published: h.is_published,
      attachment_url: h.attachment_url,
      class_id:     h.class_id,
      class_name:   h.classes ? `${h.classes.name}${h.classes.section ? '-' + h.classes.section : ''}` : null,
      faculty_name: h.faculty ? [h.faculty.first_name, h.faculty.last_name].filter(Boolean).join(' ') : null,
      created_at:   h.created_at,
      updated_at:   h.updated_at,
      submission_count: subCountMap[h.id] || 0,
    }))

    return Response.json({ homework: rows })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/homework — create homework (faculty only)
export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin  = createAdminClient()
    const caller = await getCallerProfile(admin, user.id)

    if (!FACULTY_ROLES.includes(caller.role) && caller.role !== 'super_admin') {
      return Response.json({ error: 'Only faculty can create homework' }, { status: 403 })
    }

    const body = await req.json()
    const { title, subject, description, due_date, class_id, is_published, attachment_url } = body

    if (!title?.trim())   return Response.json({ error: 'title is required' }, { status: 400 })
    if (!subject?.trim()) return Response.json({ error: 'subject is required' }, { status: 400 })

    const { data, error } = await admin
      .from('homework')
      .insert({
        institution_id: caller.institution_id,
        faculty_id:     user.id,
        class_id:       class_id     || null,
        subject:        subject.trim(),
        title:          title.trim(),
        description:    description  || null,
        due_date:       due_date     || null,
        is_published:   is_published ?? false,
        attachment_url: attachment_url || null,
      })
      .select(`
        id, title, subject, description, due_date, is_published,
        attachment_url, created_at,
        classes ( id, name, section )
      `)
      .single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, homework: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/homework?id=<uuid> — update or submit
//   body.action = 'submit'   → student marks homework as completed
//   body.action = 'update'   → faculty edits
//   body.action = 'publish'  → faculty publishes
//   body.action = 'unpublish'→ faculty unpublishes
export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin  = createAdminClient()
    const caller = await getCallerProfile(admin, user.id)
    const { searchParams } = new URL(req.url)
    const id     = searchParams.get('id')
    const body   = await req.json()
    const action = body.action || 'update'

    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    if (action === 'submit') {
      // Student submits homework
      const { data: stu } = await admin
        .from('students').select('id').eq('user_id', user.id).single()
      if (!stu) return Response.json({ error: 'Student not found' }, { status: 404 })

      const { data: hw } = await admin
        .from('homework').select('due_date, institution_id').eq('id', id).single()
      const isLate = hw?.due_date && new Date(hw.due_date) < new Date()

      const { error } = await admin
        .from('homework_submissions')
        .upsert({
          homework_id:    id,
          student_id:     stu.id,
          institution_id: hw?.institution_id || caller.institution_id,
          status:         isLate ? 'late' : 'submitted',
          notes:          body.notes    || null,
          file_url:       body.file_url || null,
          file_name:      body.file_name || null,
          submitted_at:   new Date().toISOString(),
        }, { onConflict: 'homework_id,student_id' })

      if (error) return Response.json({ error: error.message }, { status: 400 })
      return Response.json({ success: true, status: isLate ? 'late' : 'submitted' })
    }

    // Faculty update / publish
    if (!FACULTY_ROLES.includes(caller.role) && caller.role !== 'super_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updates = {}
    if (action === 'publish')   updates.is_published = true
    if (action === 'unpublish') updates.is_published = false

    if (action === 'update') {
      for (const k of ['title', 'subject', 'description', 'due_date', 'is_published', 'attachment_url', 'class_id']) {
        if (k in body) updates[k] = body[k] || null
      }
    }
    updates.updated_at = new Date().toISOString()

    const { error } = await admin
      .from('homework').update(updates).eq('id', id).eq('faculty_id', user.id)
    if (error) return Response.json({ error: error.message }, { status: 400 })

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/homework?id=<uuid> — faculty deletes own homework
export async function DELETE(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin  = createAdminClient()
    const caller = await getCallerProfile(admin, user.id)

    if (!FACULTY_ROLES.includes(caller.role) && caller.role !== 'super_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const { error } = await admin
      .from('homework').delete().eq('id', id).eq('faculty_id', user.id)
    if (error) return Response.json({ error: error.message }, { status: 400 })

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
