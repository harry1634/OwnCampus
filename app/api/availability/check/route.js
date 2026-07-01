import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

// POST /api/availability/check
// Body: { date, startTime, endTime, room, facultyName }
// Returns: { conflicts: string[] }
// Uses Postgres TIME comparisons via .lt()/.gt() — much more reliable than JS string compare.

export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { date, startTime, endTime, room, facultyName } = await req.json()
    if (!date || !startTime) return Response.json({ conflicts: [] })

    const admin      = createAdminClient()
    const dayOfWeek  = DAYS[new Date(date).getDay()]

    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    const conflicts = []

    // ── Room conflict check ──────────────────────────────────────────────────
    if (room) {
      // 1. Another exam on the same date using the same hall, with overlapping time
      try {
        const q = admin
          .from('exams')
          .select('id, name, start_time, end_time')
          .eq('institution_id', institutionId)
          .eq('exam_date', date)
          .eq('hall_number', room)

        // Only apply time filter when both bounds are given
        const { data: examClash } = endTime
          ? await q.lt('start_time', endTime).gt('end_time', startTime)
          : await q

        if (examClash?.length > 0) {
          const other = examClash[0]
          const label = other.name ? ` (${other.name})` : ''
          conflicts.push(`Room "${room}" is already booked for another exam${label} at this time`)
        }
      } catch {}

      // 2. A timetable class on the same day-of-week using the same room, overlapping time
      try {
        const q = admin
          .from('timetable_slots')
          .select('id')
          .eq('institution_id', institutionId)
          .eq('day_of_week', dayOfWeek)
          .eq('room', room)

        const { data: ttClash } = endTime
          ? await q.lt('start_time', endTime).gt('end_time', startTime)
          : await q

        if (ttClash?.length > 0) {
          conflicts.push(`Room "${room}" has a timetable class scheduled at this time`)
        }
      } catch {}
    }

    // ── Faculty conflict check ───────────────────────────────────────────────
    if (facultyName) {
      // Find the faculty row that matches this name
      let facultyId = null
      try {
        const { data: facRows } = await admin
          .from('faculty')
          .select('id, user_profiles(first_name, last_name)')
          .eq('institution_id', institutionId)

        const match = (facRows || []).find(f => {
          const full = [f.user_profiles?.first_name, f.user_profiles?.last_name]
            .filter(Boolean).join(' ')
          return full === facultyName
        })
        facultyId = match?.id || null
      } catch {}

      if (facultyId) {
        try {
          const q = admin
            .from('timetable_slots')
            .select('id')
            .eq('institution_id', institutionId)
            .eq('day_of_week', dayOfWeek)
            .eq('faculty_id', facultyId)

          const { data: ttFacClash } = endTime
            ? await q.lt('start_time', endTime).gt('end_time', startTime)
            : await q

          if (ttFacClash?.length > 0) {
            conflicts.push(`${facultyName} already has a class scheduled at this time`)
          }
        } catch {}
      }
    }

    return Response.json({ conflicts, hasConflicts: conflicts.length > 0 })
  } catch (err) {
    return Response.json({ conflicts: [], error: err.message })
  }
}
