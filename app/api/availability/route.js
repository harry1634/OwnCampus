import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET /api/availability?date=YYYY-MM-DD&time=HH:MM&duration=60
// Returns rooms and faculty with available/busy flags for the given date+time.

const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number)
  const total  = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`
}

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const date     = searchParams.get('date')
    const time     = searchParams.get('time')
    const duration = parseInt(searchParams.get('duration') || '60')

    if (!date || !time) return Response.json({ error: 'date and time are required' }, { status: 400 })

    const admin      = createAdminClient()
    const dayOfWeek  = DAYS[new Date(date).getDay()]
    const endTime    = addMinutes(time, duration)

    // Resolve institution
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    // ── Collect all known rooms ──────────────────────────────────────────────
    const [{ data: ttRooms }, { data: examRooms }] = await Promise.all([
      admin.from('timetable_slots')
        .select('room')
        .eq('institution_id', institutionId)
        .not('room', 'is', null),
      admin.from('exams')
        .select('hall_number')
        .eq('institution_id', institutionId)
        .not('hall_number', 'is', null),
    ])

    const allRooms = [...new Set([
      ...(ttRooms  || []).map(r => r.room).filter(Boolean),
      ...(examRooms|| []).map(r => r.hall_number).filter(Boolean),
    ])].sort()

    // ── Find busy rooms at this date+time ────────────────────────────────────
    // Exams on same date with overlapping time
    const { data: busyExams } = await admin
      .from('exams')
      .select('hall_number, start_time, end_time')
      .eq('institution_id', institutionId)
      .eq('exam_date', date)
      .not('hall_number', 'is', null)

    // Timetable slots on same day-of-week with overlapping time
    const { data: busySlots } = await admin
      .from('timetable_slots')
      .select('room, start_time, end_time')
      .eq('institution_id', institutionId)
      .eq('day_of_week', dayOfWeek)
      .not('room', 'is', null)

    const busyRooms = new Set()

    ;(busyExams || []).forEach(e => {
      const s = e.start_time || time
      const f = e.end_time   || addMinutes(s, 60)
      if (s < endTime && f > time) busyRooms.add(e.hall_number)
    })
    ;(busySlots || []).forEach(s => {
      if (s.start_time < endTime && s.end_time > time) busyRooms.add(s.room)
    })

    const rooms = allRooms.map(r => ({ name: r, available: !busyRooms.has(r) }))

    // ── Fetch all faculty ────────────────────────────────────────────────────
    const { data: facRows } = await admin
      .from('faculty')
      .select(`
        id, designation,
        user_profiles ( id, first_name, last_name, email )
      `)
      .eq('institution_id', institutionId)
      .eq('status', 'active')

    // Faculty busy in timetable at this day+time
    const { data: busyFacSlots } = await admin
      .from('timetable_slots')
      .select('faculty_id, start_time, end_time')
      .eq('institution_id', institutionId)
      .eq('day_of_week', dayOfWeek)
      .not('faculty_id', 'is', null)

    const busyFacultyIds = new Set()
    ;(busyFacSlots || []).forEach(s => {
      if (s.start_time < endTime && s.end_time > time) busyFacultyIds.add(s.faculty_id)
    })

    // Fallback: user_profiles with faculty role if faculty table is empty
    let facultyList = (facRows || []).map(f => ({
      id:          f.id,
      userId:      f.user_profiles?.id,
      name:        [f.user_profiles?.first_name, f.user_profiles?.last_name].filter(Boolean).join(' ') || f.user_profiles?.email || 'Faculty',
      designation: f.designation || 'Teacher',
      available:   !busyFacultyIds.has(f.id),
    }))

    if (facultyList.length === 0) {
      const FACULTY_ROLES = ['teacher','faculty','trainer','hod','principal','vice_principal','librarian','counsellor']
      const { data: upRows } = await admin
        .from('user_profiles')
        .select('id, first_name, last_name, email, role')
        .in('role', FACULTY_ROLES)
        .eq('institution_id', institutionId)

      facultyList = (upRows || []).map(p => ({
        id:          null,
        userId:      p.id,
        name:        [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email,
        designation: p.role || 'Teacher',
        available:   true,
      }))
    }

    return Response.json({ rooms, faculty: facultyList, dayOfWeek, timeSlot: `${time} – ${endTime}` })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
