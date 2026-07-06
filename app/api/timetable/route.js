import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { isModuleEnabled }   from '@/lib/licenseEngine'

// GET  /api/timetable?class_id=...&day=monday
// POST /api/timetable  { class_id, day_of_week, slots: [...] }
// DELETE /api/timetable?slot_id=...

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const classId = searchParams.get('class_id') || null
    const day     = searchParams.get('day')      || null

    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    // Resolve the class for student callers
    let resolvedClassId = classId
    if (!resolvedClassId && profile?.role === 'student') {
      const { data: stu } = await admin
        .from('students').select('class_id').eq('user_id', user.id).single()
      resolvedClassId = stu?.class_id || null
    }

    // Resolve faculty.id for faculty callers so we filter to their slots only
    const FACULTY_ROLES = [
      'teacher','faculty','trainer','hod','staff','librarian','counsellor','hr',
      'admission_officer','transport_manager','hostel_manager','coordinator','tutor',
      'instructor','professor','dean','vice_principal','principal','receptionist',
    ]
    let facultyId = null
    if (FACULTY_ROLES.includes(profile?.role) && !classId) {
      const { data: fac } = await admin
        .from('faculty').select('id').eq('user_id', user.id).single()
      facultyId = fac?.id || null
    }

    let query = admin
      .from('timetable_slots')
      .select(`
        id, day_of_week, period_number, start_time, end_time, room,
        class_id, subject_id, faculty_id, faculty_user_id,
        classes   ( id, name, section ),
        subjects  ( id, name, code ),
        user_profiles!faculty_user_id ( id, first_name, last_name )
      `)
      .order('day_of_week')
      .order('period_number')

    if (institutionId)   query = query.eq('institution_id', institutionId)
    if (resolvedClassId) query = query.eq('class_id',       resolvedClassId)
    if (facultyId)       query = query.eq('faculty_id',     facultyId)
    if (day)             query = query.eq('day_of_week',    day)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 400 })

    const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
    const byDay = {}
    DAYS.forEach(d => { byDay[d] = [] })
    ;(data || []).forEach(slot => {
      const d = slot.day_of_week
      if (byDay[d]) byDay[d].push(slot)
    })

    return Response.json({ slots: data || [], byDay })
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
    const { class_id, day_of_week, slots, replace_day } = body

    if (!class_id || !day_of_week || !Array.isArray(slots)) {
      return Response.json({ error: 'class_id, day_of_week, and slots[] are required.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    if (!institutionId) return Response.json({ error: 'Institution not resolved.' }, { status: 400 })

    if (!(await isModuleEnabled(institutionId, 'timetable'))) {
      return Response.json({ error: 'Timetable module is not enabled for your institution.' }, { status: 403 })
    }

    if (replace_day) {
      await admin.from('timetable_slots')
        .delete()
        .eq('class_id', class_id)
        .eq('day_of_week', day_of_week)
        .eq('institution_id', institutionId)
    }

    const rows = slots.map((s, i) => ({
      class_id,
      day_of_week,
      institution_id:  institutionId,
      period_number:   s.period_number ?? (i + 1),
      start_time:      s.start_time || null,
      end_time:        s.end_time   || null,
      subject_id:      s.subject_id || null,
      faculty_id:      s.faculty_id || null,
      faculty_user_id: s.faculty_user_id || null,
      room:            s.room       || null,
    }))

    const { data, error } = await admin
      .from('timetable_slots')
      .upsert(rows, { onConflict: 'class_id,day_of_week,period_number' })
      .select('id')

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, count: data?.length || 0 })
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
    const slotId  = searchParams.get('slot_id')
    const classId = searchParams.get('class_id')
    const day     = searchParams.get('day')

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null
    if (!institutionId) return Response.json({ error: 'Institution not resolved.' }, { status: 400 })

    if (slotId) {
      const { error } = await admin.from('timetable_slots')
        .delete().eq('id', slotId).eq('institution_id', institutionId)
      if (error) return Response.json({ error: error.message }, { status: 400 })
    } else if (classId && day) {
      const { error } = await admin.from('timetable_slots')
        .delete().eq('class_id', classId).eq('day_of_week', day).eq('institution_id', institutionId)
      if (error) return Response.json({ error: error.message }, { status: 400 })
    } else {
      return Response.json({ error: 'slot_id or class_id+day required.' }, { status: 400 })
    }

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
