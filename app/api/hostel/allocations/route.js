import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getInstitutionId(admin, userId) {
  const { data } = await admin.from('user_profiles').select('institution_id').eq('id', userId).single()
  return data?.institution_id || null
}

// GET /api/hostel/allocations
// ?my=true       → only the caller's active allocation
// ?search=query  → student autocomplete for AllocateModal
export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const institutionId = await getInstitutionId(admin, user.id)
    const search = searchParams.get('search') || ''
    const my     = searchParams.get('my') === 'true'

    // ── Student search for Allocate Room autocomplete ─────────────
    if (search.trim()) {
      const q = search.trim()
      const { data: ups } = await admin
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .eq('institution_id', institutionId)
        .limit(8)

      const userIds = (ups || []).map(u => u.id)
      if (!userIds.length) return Response.json({ students: [] })

      const { data: studs } = await admin
        .from('students').select('id, roll_number, user_id, class_id').in('user_id', userIds)

      const classIds = (studs || []).map(s => s.class_id).filter(Boolean)
      const classMap = {}
      if (classIds.length) {
        const { data: clss } = await admin.from('classes').select('id, name, section').in('id', classIds)
        ;(clss || []).forEach(c => { classMap[c.id] = c.name + (c.section ? ' - ' + c.section : '') })
      }
      const upMap = {}
      ;(ups || []).forEach(u => { upMap[u.id] = u })

      const students = (studs || []).map(s => {
        const up = upMap[s.user_id] || {}
        return {
          id:         s.id,
          name:       [up.first_name, up.last_name].filter(Boolean).join(' ') || up.email || '',
          rollNumber: s.roll_number || '',
          class:      classMap[s.class_id] || '',
        }
      }).filter(s => s.name)

      return Response.json({ students })
    }

    // ── Allocations list (separate queries — no FK join ambiguity) ─
    let q = admin
      .from('hostel_allocations')
      .select('id, room_id, student_id, bed_number, check_in_date, status, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (my) {
      const { data: stuRow } = await admin.from('students').select('id').eq('user_id', user.id).single()
      if (stuRow?.id) q = q.eq('student_id', stuRow.id)
      else return Response.json({ allocations: [], pendingTotal: 0 })
    } else if (institutionId) {
      q = q.eq('institution_id', institutionId)
    }

    const { data: allocs, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 400 })
    if (!allocs?.length) return Response.json({ allocations: [], pendingTotal: 0 })

    // Fetch related data separately
    const roomIds    = [...new Set(allocs.map(a => a.room_id).filter(Boolean))]
    const studentIds = [...new Set(allocs.map(a => a.student_id).filter(Boolean))]

    const [roomsRes, studsRes] = await Promise.all([
      roomIds.length    > 0 ? admin.from('hostel_rooms').select('id, room_number, floor, monthly_fee, building_id').in('id', roomIds) : Promise.resolve({ data: [] }),
      studentIds.length > 0 ? admin.from('students').select('id, roll_number, user_id, class_id').in('id', studentIds) : Promise.resolve({ data: [] }),
    ])

    const rooms = roomsRes?.data || []
    const studs = studsRes?.data || []

    const buildingIds = [...new Set(rooms.map(r => r.building_id).filter(Boolean))]
    const userIds     = [...new Set(studs.map(s => s.user_id).filter(Boolean))]
    const classIds    = [...new Set(studs.map(s => s.class_id).filter(Boolean))]

    const [bldgsRes, upsRes, clssRes] = await Promise.all([
      buildingIds.length > 0 ? admin.from('hostel_buildings').select('id, name').in('id', buildingIds) : Promise.resolve({ data: [] }),
      userIds.length     > 0 ? admin.from('user_profiles').select('id, first_name, last_name, email').in('id', userIds) : Promise.resolve({ data: [] }),
      classIds.length    > 0 ? admin.from('classes').select('id, name, section').in('id', classIds) : Promise.resolve({ data: [] }),
    ])

    const bldgMap  = {}; (bldgsRes?.data || []).forEach(b => { bldgMap[b.id]  = b })
    const upMap    = {}; (upsRes?.data   || []).forEach(u => { upMap[u.id]    = u })
    const classMap = {}; (clssRes?.data  || []).forEach(c => { classMap[c.id] = c })
    const roomMap  = {}; rooms.forEach(r => { roomMap[r.id]  = r })
    const studMap  = {}; studs.forEach(s => { studMap[s.id]  = s })

    const result = allocs.map(a => {
      const room = roomMap[a.room_id]       || {}
      const stud = studMap[a.student_id]    || {}
      const bldg = bldgMap[room.building_id] || {}
      const up   = upMap[stud.user_id]      || {}
      const cls  = classMap[stud.class_id]  || {}
      const fee  = Number(room.monthly_fee  || 0)

      return {
        id:         a.id,
        student:    [up.first_name, up.last_name].filter(Boolean).join(' ') || up.email || 'Unknown',
        class:      cls.name ? `${cls.name}${cls.section ? ' - ' + cls.section : ''}` : '',
        building:   bldg.name || '',
        buildingId: bldg.id   || null,
        room:       room.room_number || '',
        roomId:     room.id   || null,
        bed:        `Bed ${a.bed_number || 1}`,
        date:       a.check_in_date
          ? new Date(a.check_in_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : '',
        monthlyFee: fee,
        paidAmount: 0,
        feeStatus:  'pending',
        balance:    fee,
      }
    })

    return Response.json({ allocations: result, pendingTotal: result.reduce((s, r) => s + (r.balance || 0), 0) })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/hostel/allocations?id=<uuid> — update allocation details
export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const body    = await req.json()
    const admin   = createAdminClient()
    const instId  = await getInstitutionId(admin, user.id)

    // Scope check
    const { data: existing } = await admin
      .from('hostel_allocations').select('institution_id').eq('id', id).single()
    if (instId && existing?.institution_id && existing.institution_id !== instId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updates = {}
    if (body.bed_number     != null) updates.bed_number     = Number(body.bed_number) || 1
    if (body.check_out_date != null) updates.check_out_date = body.check_out_date
    if (body.status         != null) updates.status         = body.status

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { error } = await admin
      .from('hostel_allocations')
      .update(updates)
      .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/hostel/allocations?id=<uuid> — soft-delete (deactivate) an allocation
export async function DELETE(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const admin = createAdminClient()
    const institutionId = await getInstitutionId(admin, user.id)

    let q = admin.from('hostel_allocations').update({ status: 'inactive' }).eq('id', id)
    if (institutionId) q = q.eq('institution_id', institutionId)
    const { error } = await q
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/hostel/allocations — allocate a room to a student
export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { studentName, className, buildingId, roomNumber, bedNumber } = body

    const admin = createAdminClient()
    const institutionId = await getInstitutionId(admin, user.id)

    // Find or create room by building + room_number
    let roomId = body.roomId || null
    if (!roomId && buildingId && roomNumber) {
      const { data: room } = await admin
        .from('hostel_rooms')
        .select('id')
        .eq('building_id', buildingId)
        .eq('room_number', roomNumber)
        .single()
      roomId = room?.id || null

      // Auto-create the room if it doesn't exist yet
      if (!roomId) {
        const { data: newRoom } = await admin
          .from('hostel_rooms')
          .insert({
            building_id:  buildingId,
            room_number:  roomNumber,
            floor:        1,
            capacity:     4,
            occupied:     0,
            is_available: true,
          })
          .select('id')
          .single()
        roomId = newRoom?.id || null
      }
    }

    // Find student by name (best-effort)
    let studentId = body.studentId || null
    if (!studentId && studentName) {
      const parts = studentName.trim().split(' ')
      const { data: ups } = await admin
        .from('user_profiles')
        .select('id')
        .ilike('first_name', parts[0] + '%')
        .eq('institution_id', institutionId)
        .limit(1)
      if (ups?.[0]) {
        const { data: stu } = await admin
          .from('students')
          .select('id')
          .eq('user_id', ups[0].id)
          .single()
        studentId = stu?.id || null
      }
    }

    if (!roomId) {
      return Response.json({ error: 'Building not found — add a building first' }, { status: 400 })
    }
    if (!studentId) {
      return Response.json({ error: 'Student not found in the system' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('hostel_allocations')
      .upsert({
        institution_id: institutionId,
        room_id:        roomId,
        student_id:     studentId,
        bed_number:     bedNumber || 1,
        check_in_date:  new Date().toISOString().slice(0, 10),
        status:         'active',
      }, { onConflict: 'student_id,check_in_date' })
      .select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Update room occupied count
    try {
      const { error: rpcErr } = await admin.rpc('increment_room_occupied', { room_id: roomId })
      if (rpcErr) {
        const { data: room } = await admin.from('hostel_rooms').select('occupied').eq('id', roomId).single()
        if (room) await admin.from('hostel_rooms').update({ occupied: (room.occupied || 0) + 1 }).eq('id', roomId)
      }
    } catch {
      try {
        const { data: room } = await admin.from('hostel_rooms').select('occupied').eq('id', roomId).single()
        if (room) await admin.from('hostel_rooms').update({ occupied: (room.occupied || 0) + 1 }).eq('id', roomId)
      } catch {}
    }

    // Notify student of hostel assignment
    if (studentId && institutionId) {
      const { data: stuRow } = await admin.from('students').select('user_id').eq('id', studentId).single()
      if (stuRow?.user_id) {
        const { data: bldg } = await admin.from('hostel_rooms')
          .select('room_number, hostel_buildings(name)')
          .eq('id', roomId).single()
        const roomLabel = bldg ? `${bldg.hostel_buildings?.name || 'Hostel'} Room ${bldg.room_number}` : 'a hostel room'
        await admin.from('notifications').insert({
          institution_id: institutionId,
          user_id:        stuRow.user_id,
          type:           'general',
          title:          'Hostel Room Assigned',
          body:           `You have been assigned ${roomLabel}. Bed #${bedNumber || 1}.`,
          is_broadcast:   false,
          is_read:        false,
          link:           '/student/transport',
        }).then(null, () => {})
      }
    }

    // Audit log
    await admin.from('audit_logs').insert({
      institution_id: institutionId,
      actor_id:       user.id,
      action:         'create',
      entity_type:    'hostel_allocation',
      entity_id:      data.id,
      new_value:      { room_id: roomId, student_id: studentId },
    }).then(null, () => {})

    return Response.json({ success: true, allocation: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
