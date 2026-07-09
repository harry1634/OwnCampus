import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const DAY_NAMES  = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

function classDisplayName(cls) {
  return cls.section ? `${cls.name} - ${cls.section}` : cls.name
}

// Normalize a grade/class display name for fuzzy matching.
// Strips spaces around hyphens and lowercases so "10-A", "10 - A", "10 -A" all compare equal.
function normGrade(s) {
  return String(s).trim().replace(/\s*-\s*/g, '-').toLowerCase()
}

// GET /api/timetable/grid
export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    // All classes for this institution
    let classQuery = admin.from('classes').select('id, name, section').order('name').order('section')
    if (institutionId) classQuery = classQuery.eq('institution_id', institutionId)
    const { data: classRows } = await classQuery
    const classes = (classRows || []).map(c => ({ ...c, displayName: classDisplayName(c) }))

    // All timetable slots
    let slotsQuery = admin
      .from('timetable_slots')
      .select('id, class_id, day_of_week, period_number, start_time, end_time, room, subject_id, faculty_id, faculty_user_id, subjects(name)')
      .order('period_number')
    if (institutionId) slotsQuery = slotsQuery.eq('institution_id', institutionId)
    const { data: slots, error: slotsErr } = await slotsQuery
    if (slotsErr) return Response.json({ error: slotsErr.message }, { status: 400 })

    // Build faculty name map: faculty.id → display name
    const facultyIds = [...new Set((slots || []).map(s => s.faculty_id).filter(Boolean))]
    const teacherNameMap = {}
    if (facultyIds.length > 0) {
      const { data: facultyRows } = await admin
        .from('faculty').select('id, user_id').in('id', facultyIds)
      const userIds = [...new Set((facultyRows || []).map(f => f.user_id).filter(Boolean))]
      if (userIds.length > 0) {
        const { data: profiles } = await admin
          .from('user_profiles').select('id, first_name, last_name, email').in('id', userIds)
        const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
        ;(facultyRows || []).forEach(f => {
          const up = profileMap[f.user_id] || {}
          teacherNameMap[f.id] = [up.first_name, up.last_name].filter(Boolean).join(' ') || up.email || ''
        })
      }
    }

    // Build unique period list
    const periodSet = {}
    ;(slots || []).forEach(s => {
      const key = s.period_number
      if (key != null && !periodSet[key]) {
        periodSet[key] = {
          id:    s.period_number,
          start: s.start_time ? s.start_time.slice(0, 5) : '',
          end:   s.end_time   ? s.end_time.slice(0, 5)   : '',
        }
      }
    })
    const periods = Object.values(periodSet).sort((a, b) => a.id - b.id)

    if (!periods.length) {
      return Response.json({ classes, grid: null })
    }

    const periodCount = periods.length
    const classMap    = {}
    classes.forEach(c => { classMap[c.id] = c.displayName })

    const schedules    = {}
    const rooms        = {}
    const cellTeachers = {}
    classes.forEach(c => {
      const g = c.displayName
      schedules[g]    = Array.from({ length: periodCount }, () => Array(7).fill(null))
      rooms[g]        = Array.from({ length: periodCount }, () => Array(7).fill(''))
      cellTeachers[g] = Array.from({ length: periodCount }, () => Array(7).fill(''))
    })

    ;(slots || []).forEach(slot => {
      const displayName = classMap[slot.class_id]
      if (!displayName) return
      const ti = periods.findIndex(p => p.id === slot.period_number)
      const di = DAY_NAMES.indexOf(slot.day_of_week)
      if (ti < 0 || di < 0) return
      schedules[displayName][ti][di]    = slot.subjects?.name || null
      rooms[displayName][ti][di]        = slot.room || ''
      cellTeachers[displayName][ti][di] = teacherNameMap[slot.faculty_id] || ''
    })

    const grades = classes.map(c => c.displayName)
    return Response.json({ classes, grid: { grades, periods, schedules, rooms, cellTeachers } })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/timetable/grid
// Body: { grades, periods, schedules, rooms, cellTeachers }
// Full replace: deletes all existing slots for this institution, inserts fresh.
export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    if (!institutionId) {
      return Response.json({ error: 'Your account is not linked to an institution.' }, { status: 400 })
    }

    const TIMETABLE_ADMIN_ROLES = new Set([
      'owner','super_admin','principal','vice_principal','academic_coordinator',
      'chairman','director','administrator',
    ])
    if (!TIMETABLE_ADMIN_ROLES.has(profile?.role || '')) {
      return Response.json({ error: 'Only admins can modify the timetable.' }, { status: 403 })
    }

    const body = await req.json()
    const { grades = [], periods = [], schedules = {}, rooms = {}, cellTeachers = {} } = body

    if (!grades.length || !periods.length) {
      return Response.json({ error: 'grades and periods are required.' }, { status: 400 })
    }

    // ── Resolve classes (create if missing) ───────────────────────────────────
    let classQuery = admin.from('classes').select('id, name, section')
    classQuery = classQuery.eq('institution_id', institutionId)
    const { data: classRows } = await classQuery
    // Build both exact and normalized lookups so "10-A" matches DB entry "10 - A"
    const classLookup = {}
    const classLookupNorm = {}
    ;(classRows || []).forEach(c => {
      const dn = c.section ? `${c.name} - ${c.section}` : c.name
      classLookup[dn] = c.id
      classLookupNorm[normGrade(dn)] = c.id
    })

    // Pre-resolve all grades — auto-create any that don't yet exist in the classes table
    const resolvedClassIds = {}
    for (const grade of grades) {
      let classId = classLookup[grade] || classLookupNorm[normGrade(grade)]
      if (!classId) {
        // Grade was added on the timetable page but not yet in the classes table — create it
        const { data: created } = await admin
          .from('classes')
          .insert({ name: grade, institution_id: institutionId })
          .select('id')
          .single()
        classId = created?.id || null
        if (classId) {
          classLookup[grade] = classId
          classLookupNorm[normGrade(grade)] = classId
        }
      }
      if (classId) resolvedClassIds[grade] = classId
    }

    // ── Resolve subjects (create if missing) ──────────────────────────────────
    const subjectCache = {}
    async function resolveSubject(name) {
      if (!name) return null
      if (subjectCache[name]) return subjectCache[name]
      const { data: existing } = await admin
        .from('subjects').select('id').eq('institution_id', institutionId).ilike('name', name).maybeSingle()
      if (existing) { subjectCache[name] = existing.id; return existing.id }
      const { data: created } = await admin
        .from('subjects').insert({ name, institution_id: institutionId }).select('id').single()
      if (created) { subjectCache[name] = created.id; return created.id }
      return null
    }

    // ── Resolve faculty: name → { faculty_id, faculty_user_id } ───────────────
    let allFacultyRows = null
    async function getFacultyRows() {
      if (allFacultyRows) return allFacultyRows
      let q = admin.from('faculty').select('id, user_id').eq('institution_id', institutionId)
      const { data: fRows } = await q
      const userIds = [...new Set((fRows || []).map(f => f.user_id).filter(Boolean))]
      let profileMap = {}
      if (userIds.length > 0) {
        const { data: profiles } = await admin
          .from('user_profiles').select('id, first_name, last_name, email').in('id', userIds)
        profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      }
      allFacultyRows = (fRows || []).map(f => {
        const up = profileMap[f.user_id] || {}
        return {
          faculty_id:      f.id,
          faculty_user_id: f.user_id,
          name: [up.first_name, up.last_name].filter(Boolean).join(' ') || up.email || '',
        }
      }).filter(f => f.name)
      return allFacultyRows
    }
    const teacherCache = {}
    async function resolveTeacher(name) {
      if (!name) return { faculty_id: null, faculty_user_id: null }
      if (teacherCache[name]) return teacherCache[name]
      const fac = await getFacultyRows()
      const lower = name.toLowerCase()
      const found = fac.find(f => {
        const full = f.name.toLowerCase()
        return full === lower || full.includes(lower) || lower.includes(full)
      })
      teacherCache[name] = found
        ? { faculty_id: found.faculty_id, faculty_user_id: found.faculty_user_id }
        : { faculty_id: null, faculty_user_id: null }
      return teacherCache[name]
    }

    // ── Build rows ─────────────────────────────────────────────────────────────
    const rows = []
    for (const grade of grades) {
      const classId = resolvedClassIds[grade]
      if (!classId) continue  // class creation failed (shouldn't happen)

      const gradeSchedule = schedules[grade]    || []
      const gradeRooms    = rooms[grade]         || []
      const gradeTeachers = cellTeachers[grade]  || []

      for (let ti = 0; ti < periods.length; ti++) {
        const period = periods[ti]
        for (let di = 0; di < 7; di++) {
          const subjectName = gradeSchedule[ti]?.[di]
          if (!subjectName) continue  // empty cell — no slot

          const subjectId  = await resolveSubject(subjectName)
          const teacherName = gradeTeachers[ti]?.[di]
          const { faculty_id, faculty_user_id } = await resolveTeacher(teacherName)

          rows.push({
            institution_id:  institutionId,
            class_id:        classId,
            day_of_week:     DAY_NAMES[di],
            period_number:   period.id ?? (ti + 1),
            start_time:      period.start || null,
            end_time:        period.end   || null,
            subject_id:      subjectId,
            faculty_id,
            faculty_user_id,
            room:            gradeRooms[ti]?.[di] || null,
          })
        }
      }
    }

    // Detect grades that still couldn't be resolved (class creation failed)
    const skippedGrades = grades.filter(g => !resolvedClassIds[g])

    // ── Full replace: delete existing, insert fresh ────────────────────────────
    const { error: delErr } = await admin
      .from('timetable_slots').delete().eq('institution_id', institutionId)
    if (delErr) return Response.json({ error: `Delete failed: ${delErr.message}` }, { status: 400 })

    if (rows.length > 0) {
      const { error: insErr } = await admin.from('timetable_slots').insert(rows)
      if (insErr) return Response.json({ error: `Insert failed: ${insErr.message}` }, { status: 400 })
    }

    return Response.json({
      success: true,
      slots_written: rows.length,
      skipped_grades: skippedGrades,
      warning: skippedGrades.length > 0
        ? `${skippedGrades.length} grade(s) not found in DB and were skipped: ${skippedGrades.join(', ')}. Add these classes first.`
        : null,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
