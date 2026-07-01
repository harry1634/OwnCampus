import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// Days ordered consistently for grid index mapping
const DAY_NAMES = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// Parse "Class 9 - A" → { name: "Class 9", section: "A" }
function parseGradeName(displayName) {
  const m = displayName.match(/^(.+?)\s*[-–]\s*([A-Za-z0-9]+)\s*$/)
  if (m) return { name: m[1].trim(), section: m[2].trim() }
  return { name: displayName.trim(), section: null }
}

// Format class record → display name
function classDisplayName(cls) {
  return cls.section ? `${cls.name} - ${cls.section}` : cls.name
}

// GET /api/timetable/grid
// Returns all classes for the institution + their timetable slots in grid format
export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    // Fetch all classes for this institution
    let classQuery = admin.from('classes').select('id, name, section').order('name').order('section')
    if (institutionId) classQuery = classQuery.eq('institution_id', institutionId)
    const { data: classRows } = await classQuery
    const classes = (classRows || []).map(c => ({ ...c, displayName: classDisplayName(c) }))

    // Fetch all timetable slots with joins
    let slotsQuery = admin
      .from('timetable_slots')
      .select(`
        id, class_id, day_of_week, period_number, start_time, end_time, room,
        subject_id, faculty_id,
        subjects     ( name )
      `)
      .order('period_number')
    if (institutionId) slotsQuery = slotsQuery.eq('institution_id', institutionId)
    const { data: slots } = await slotsQuery

    const facultyIds = [...new Set((slots || []).map(s => s.faculty_id).filter(Boolean))]
    const teacherNameMap = {}
    if (facultyIds.length > 0) {
      const { data: facultyRows } = await admin
        .from('faculty')
        .select('id, user_id')
        .in('id', facultyIds)
      const userIds = [...new Set((facultyRows || []).map(f => f.user_id).filter(Boolean))]
      let profileMap = {}
      if (userIds.length > 0) {
        const { data: profiles } = await admin
          .from('user_profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds)
        profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      }
      ;(facultyRows || []).forEach(f => {
        const up = profileMap[f.user_id] || {}
        teacherNameMap[f.id] = [up.first_name, up.last_name].filter(Boolean).join(' ') || up.email || ''
      })
    }

    // Build unique period list from slots
    const periodSet = {}
    ;(slots || []).forEach(s => {
      const key = s.period_number
      if (!periodSet[key]) {
        periodSet[key] = {
          id:    s.period_number,
          start: s.start_time ? s.start_time.slice(0, 5) : '',
          end:   s.end_time   ? s.end_time.slice(0,   5) : '',
        }
      }
    })
    const periods = Object.values(periodSet).sort((a, b) => a.id - b.id)
    if (!periods.length) {
      // No slots yet — return classes with empty grid hint
      return Response.json({ classes, grid: null })
    }

    const periodCount = periods.length

    // Build grade → grid maps
    const classMap = {}
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

    return Response.json({
      classes,
      grid: { grades, periods, schedules, rooms, cellTeachers },
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/timetable/grid
// Body: { grades, periods, schedules, rooms, cellTeachers }
// Resolves names → IDs and upserts into timetable_slots.
// Clears all existing slots for the institution first (full replace).
export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    const body = await req.json()
    const { grades = [], periods = [], schedules = {}, rooms = {}, cellTeachers = {} } = body

    // ── Resolve classes ──────────────────────────────────────────────────────
    let classQuery = admin.from('classes').select('id, name, section')
    if (institutionId) classQuery = classQuery.eq('institution_id', institutionId)
    const { data: classRows } = await classQuery
    const classLookup = {} // displayName → class_id
    ;(classRows || []).forEach(c => { classLookup[classDisplayName(c)] = c.id })

    // ── Cache for subject name → subject_id ─────────────────────────────────
    const subjectCache = {}
    async function resolveSubject(name) {
      if (!name || !institutionId) return null
      if (subjectCache[name]) return subjectCache[name]
      const { data: existing } = await admin
        .from('subjects').select('id').eq('institution_id', institutionId).ilike('name', name).maybeSingle()
      if (existing) { subjectCache[name] = existing.id; return existing.id }
      const { data: created } = await admin
        .from('subjects').insert({ name, institution_id: institutionId }).select('id').single()
      if (created) { subjectCache[name] = created.id; return created.id }
      return null
    }

    // ── Cache for teacher name → faculty_id (user_profiles.id) ──────────────
    let facultyRows = null
    async function getFaculty() {
      if (facultyRows) return facultyRows
      let q = admin.from('faculty').select('id, user_id, institution_id').eq('status', 'active')
      if (institutionId) q = q.eq('institution_id', institutionId)
      let { data } = await q
      if (!data || data.length === 0) {
        let retryQ = admin.from('faculty').select('id, user_id, institution_id')
        if (institutionId) retryQ = retryQ.eq('institution_id', institutionId)
        const retry = await retryQ
        data = retry.data || []
      }

      const userIds = [...new Set((data || []).map(f => f.user_id).filter(Boolean))]
      let profileMap = {}
      if (userIds.length > 0) {
        const { data: profiles } = await admin
          .from('user_profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds)
        profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      }

      facultyRows = (data || []).map(f => {
        const up = profileMap[f.user_id] || {}
        return {
          id: f.id,
          name: [up.first_name, up.last_name].filter(Boolean).join(' ') || up.email || '',
        }
      }).filter(f => f.name)
      return facultyRows
    }
    const teacherCache = {}
    async function resolveTeacher(name) {
      if (!name) return null
      if (teacherCache[name]) return teacherCache[name]
      const fac = await getFaculty()
      const lower = name.toLowerCase()
      const found = fac.find(f => {
        const full = f.name.toLowerCase()
        return full === lower || full.includes(lower) || lower.includes(full)
      })
      teacherCache[name] = found?.id || null
      return teacherCache[name]
    }

    // ── Build slots ──────────────────────────────────────────────────────────
    const rows = []
    for (const grade of grades) {
      const classId = classLookup[grade]
      if (!classId) continue  // skip grades not yet in the DB classes table

      const gradeSchedule    = schedules[grade]    || []
      const gradeRooms       = rooms[grade]         || []
      const gradeTeachers    = cellTeachers[grade]  || []

      for (let ti = 0; ti < periods.length; ti++) {
        const period = periods[ti]
        for (let di = 0; di < 7; di++) {
          const subjectName = gradeSchedule[ti]?.[di]
          if (!subjectName) continue  // empty cell → no slot

          const subjectId  = await resolveSubject(subjectName)
          const teacherName = gradeTeachers[ti]?.[di]
          const facultyId  = await resolveTeacher(teacherName)
          const room       = gradeRooms[ti]?.[di] || null
          const dayName    = DAY_NAMES[di]

          rows.push({
            institution_id: institutionId,
            class_id:       classId,
            day_of_week:    dayName,
            period_number:  period.id ?? (ti + 1),
            start_time:     period.start || null,
            end_time:       period.end   || null,
            subject_id:     subjectId,
            faculty_id:     facultyId,
            room,
          })
        }
      }
    }

    // Delete existing slots for this institution then insert fresh
    if (institutionId) {
      await admin.from('timetable_slots').delete().eq('institution_id', institutionId)
    }

    if (rows.length > 0) {
      const { error } = await admin.from('timetable_slots').insert(rows)
      if (error) return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ success: true, slots_written: rows.length })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
