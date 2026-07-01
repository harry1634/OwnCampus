import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET  /api/faculty/marks?className=...&examName=...&subject=...
// POST /api/faculty/marks
// Body: { className, examName, subject, maxMark, marks: [{userAuthId, marksObtained, remarks}] }
// Finds/creates subject + class + exam in Supabase, upserts exam_marks, publishes the exam.

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const className = searchParams.get('className') || ''
    const examName  = searchParams.get('examName')  || ''
    const subject   = searchParams.get('subject')   || ''

    if (!examName || !subject || !className) {
      return Response.json({ marks: {}, remarks: {}, maxMark: 100, found: false })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null
    if (!institutionId) return Response.json({ marks: {}, remarks: {}, maxMark: 100, found: false })

    // Find subject
    const { data: subjRow } = await admin
      .from('subjects').select('id').eq('name', subject).eq('institution_id', institutionId).maybeSingle()
    if (!subjRow) return Response.json({ marks: {}, remarks: {}, maxMark: 100, found: false })

    // Find class
    const raw     = (className || '').replace(/^class\s+/i, '').trim()
    const dashIdx = raw.lastIndexOf('-')
    const clsName = dashIdx > -1 ? raw.slice(0, dashIdx).trim() : raw
    const section = dashIdx > -1 ? raw.slice(dashIdx + 1).trim() : null
    let q = admin.from('classes').select('id').eq('institution_id', institutionId).eq('name', clsName)
    if (section) q = q.eq('section', section); else q = q.is('section', null)
    const { data: clsRow } = await q.maybeSingle()
    if (!clsRow) return Response.json({ marks: {}, remarks: {}, maxMark: 100, found: false })

    // Find exam
    const { data: examRow } = await admin
      .from('exams').select('id, total_marks')
      .eq('name', examName).eq('subject_id', subjRow.id).eq('class_id', clsRow.id).maybeSingle()
    if (!examRow) return Response.json({ marks: {}, remarks: {}, maxMark: 100, found: false })

    // Load exam_marks with student's user_id for keying
    const { data: markRows } = await admin
      .from('exam_marks')
      .select('marks_obtained, remarks, students!inner(user_id)')
      .eq('exam_id', examRow.id)

    const marks   = {}
    const remarks = {}
    ;(markRows || []).forEach(m => {
      const uid = m.students?.user_id
      if (uid) {
        marks[uid]   = m.marks_obtained
        remarks[uid] = m.remarks || ''
      }
    })

    return Response.json({ marks, remarks, maxMark: Number(examRow.total_marks || 100), found: true })
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
    const { className, examName, subject, maxMark, marks } = body

    if (!examName || !subject || !Array.isArray(marks) || marks.length === 0) {
      return Response.json({ error: 'examName, subject, and marks[] are required.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const totalMarks   = Number(maxMark) || 100
    const passingMarks = Math.round(totalMarks * 0.35)

    // ── 1. Get faculty institution_id ────────────────────────────────────────
    const { data: profile } = await admin
      .from('user_profiles')
      .select('institution_id')
      .eq('id', user.id)
      .single()

    const institutionId = profile?.institution_id || null
    if (!institutionId) {
      return Response.json({ error: 'Your account is not linked to an institution.' }, { status: 400 })
    }

    // ── 2. Find or create subject ────────────────────────────────────────────
    let subjectId = null
    {
      const { data: existing } = await admin
        .from('subjects')
        .select('id')
        .eq('name', subject)
        .eq('institution_id', institutionId)
        .maybeSingle()

      if (existing) {
        subjectId = existing.id
      } else {
        const { data: created, error: insErr } = await admin
          .from('subjects')
          .insert({ name: subject, institution_id: institutionId })
          .select('id')
          .single()
        if (insErr) return Response.json({ error: `Subject create failed: ${insErr.message}` }, { status: 400 })
        subjectId = created.id
      }
    }

    // ── 3. Find or create class ──────────────────────────────────────────────
    let classId = null
    {
      // Parse "Class 11-A" → { name: "11", section: "A" }
      const raw     = (className || '').replace(/^class\s+/i, '').trim()
      const dashIdx = raw.lastIndexOf('-')
      const clsName = dashIdx > -1 ? raw.slice(0, dashIdx).trim() : raw
      const section = dashIdx > -1 ? raw.slice(dashIdx + 1).trim() : null

      // Try to find by name + section
      let q = admin.from('classes').select('id').eq('institution_id', institutionId).eq('name', clsName)
      if (section) q = q.eq('section', section)
      else         q = q.is('section', null)
      const { data: existing } = await q.maybeSingle()

      if (existing) {
        classId = existing.id
      } else {
        // Also try case-insensitive / without section
        const { data: fuzzy } = await admin
          .from('classes')
          .select('id, name, section')
          .eq('institution_id', institutionId)
          .ilike('name', clsName)
          .limit(5)
        const match = (fuzzy || []).find(c =>
          (!section || (c.section || '').toLowerCase() === section.toLowerCase())
        )
        if (match) {
          classId = match.id
        } else {
          // Create class
          const ins = { institution_id: institutionId, name: clsName }
          if (section) ins.section = section
          const { data: created, error: insErr } = await admin
            .from('classes')
            .insert(ins)
            .select('id')
            .single()
          if (insErr) return Response.json({ error: `Class create failed: ${insErr.message}` }, { status: 400 })
          classId = created.id
        }
      }
    }

    // ── 4. Find or create exam ───────────────────────────────────────────────
    let examId = null
    {
      const { data: existing } = await admin
        .from('exams')
        .select('id')
        .eq('name', examName)
        .eq('subject_id', subjectId)
        .eq('class_id', classId)
        .maybeSingle()

      if (existing) {
        examId = existing.id
        await admin.from('exams').update({
          total_marks:   totalMarks,
          passing_marks: passingMarks,
          is_published:  true,
        }).eq('id', examId)
      } else {
        const today = new Date().toISOString().slice(0, 10)
        const { data: created, error: insErr } = await admin
          .from('exams')
          .insert({
            institution_id: institutionId,
            class_id:       classId,
            subject_id:     subjectId,
            name:           examName,
            type:           deriveExamType(examName),
            exam_date:      today,
            total_marks:    totalMarks,
            passing_marks:  passingMarks,
            is_published:   true,
            created_by:     user.id,
          })
          .select('id')
          .single()
        if (insErr) return Response.json({ error: `Exam create failed: ${insErr.message}` }, { status: 400 })
        examId = created.id
      }
    }

    // ── 5. Resolve each student → students.id ───────────────────────────────
    // Priority: use studentRowId if provided, else look up by user_id, else create a row.
    const rows = []
    for (const m of marks) {
      let stuId = m.studentRowId || null

      if (!stuId && m.userAuthId) {
        const { data: found } = await admin
          .from('students')
          .select('id')
          .eq('user_id', m.userAuthId)
          .maybeSingle()
        stuId = found?.id || null
      }

      // Student exists in user_profiles but not yet in students table — create an enriched row
      if (!stuId && m.userAuthId) {
        const { data: up } = await admin
          .from('user_profiles')
          .select('institution_id, branch_id, metadata')
          .eq('id', m.userAuthId)
          .maybeSingle()
        const meta = up?.metadata || {}
        const ins = {
          institution_id: institutionId,
          user_id:        m.userAuthId,
          class_id:       classId || null,
          branch_id:      up?.branch_id || null,
          roll_number:    meta.roll_number || null,
        }
        const { data: created } = await admin
          .from('students')
          .insert(ins)
          .select('id')
          .single()
        stuId = created?.id || null
      }

      if (!stuId) continue

      const obtained = Number(m.marksObtained ?? 0)
      rows.push({
        exam_id:        examId,
        student_id:     stuId,
        marks_obtained: Math.min(obtained, totalMarks),
        is_absent:      false,
        remarks:        m.remarks || null,
        entered_by:     user.id,
      })
    }

    if (rows.length === 0) {
      return Response.json({ error: 'Could not resolve any student records. Check that students are registered in Supabase.' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('exam_marks')
      .upsert(rows, { onConflict: 'exam_id,student_id' })
      .select('id')

    if (error) return Response.json({ error: error.message }, { status: 400 })

    return Response.json({ success: true, examId, subjectId, classId, count: data?.length || 0 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

function deriveExamType(name) {
  const n = (name || '').toLowerCase()
  if (n.includes('unit')) return 'unit_test'
  if (n.includes('mid'))  return 'midterm'
  if (n.includes('half')) return 'midterm'
  if (n.includes('annual') || n.includes('final')) return 'final'
  return 'internal'
}
