import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

async function getInstitutionId(admin, userId) {
  const { data } = await admin.from('user_profiles').select('institution_id').eq('id', userId).single()
  return data?.institution_id || null
}

// GET /api/hostel/allocations
// ?my=true → returns only the caller's active allocation
export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const my = searchParams.get('my') === 'true'

    const admin = createAdminClient()
    const institutionId = await getInstitutionId(admin, user.id)

    let q = admin
      .from('hostel_allocations')
      .select(`
        id, bed_number, check_in_date, check_out_date, monthly_fee, paid_amount, fee_status, status, created_at,
        hostel_rooms (
          id, room_number, floor, monthly_fee,
          hostel_buildings ( id, name, type )
        ),
        students (
          id, roll_number,
          user_profiles ( first_name, last_name, email ),
          classes ( name, section )
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (my) {
      // Filter to the student record that belongs to the calling user
      const { data: stuRow } = await admin
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (stuRow?.id) {
        q = q.eq('student_id', stuRow.id)
      } else {
        return Response.json({ allocations: [], pendingTotal: 0 })
      }
    } else if (institutionId) {
      q = q.eq('institution_id', institutionId)
    }

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 400 })

    const result = (data || []).map(a => {
      const up       = a.students?.user_profiles || {}
      const cls      = a.students?.classes
      const room     = a.hostel_rooms || {}
      const building = room.hostel_buildings || {}
      const fee      = Number(a.monthly_fee || room.monthly_fee || 0)

      const paidAmount = Number(a.paid_amount || 0)
      return {
        id:          a.id,
        student:     [up.first_name, up.last_name].filter(Boolean).join(' ') || up.email || 'Unknown',
        class:       cls ? `${cls.name}${cls.section ? ' - ' + cls.section : ''}` : '',
        building:    building.name || '',
        buildingId:  building.id   || null,
        room:        room.room_number || '',
        roomId:      room.id          || null,
        bed:         `Bed ${a.bed_number || 1}`,
        date:        a.check_in_date
          ? new Date(a.check_in_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : '',
        monthlyFee:  fee,
        paidAmount,
        feeStatus:   a.fee_status || (paidAmount >= fee && fee > 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending'),
        balance:     Math.max(0, fee - paidAmount),
      }
    })

    // Compute pending fees total for KPI
    const pendingTotal = result.reduce((s, r) => s + (r.balance || 0), 0)

    return Response.json({ allocations: result, pendingTotal })
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
    if (body.monthly_fee  != null)  updates.monthly_fee  = Number(body.monthly_fee)  || 0
    if (body.bed_number   != null)  updates.bed_number   = Number(body.bed_number)   || 1
    if (body.paid_amount  != null)  updates.paid_amount  = Number(body.paid_amount)  || 0
    if (body.fee_status   != null)  updates.fee_status   = body.fee_status
    if (body.check_out_date != null) updates.check_out_date = body.check_out_date

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

    // Find room by building + room_number
    let roomId = body.roomId || null
    if (!roomId && buildingId && roomNumber) {
      const { data: room } = await admin
        .from('hostel_rooms')
        .select('id')
        .eq('building_id', buildingId)
        .eq('room_number', roomNumber)
        .single()
      roomId = room?.id || null
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

    if (!roomId || !studentId) {
      return Response.json({
        error: !roomId ? 'Room not found' : 'Student not found in the system',
      }, { status: 400 })
    }

    const { data, error } = await admin
      .from('hostel_allocations')
      .insert({
        institution_id: institutionId,
        room_id:        roomId,
        student_id:     studentId,
        bed_number:     bedNumber || 1,
        check_in_date:  new Date().toISOString().slice(0, 10),
        status:         'active',
      })
      .select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Update room occupied count directly (RPC may not exist)
    await admin.rpc('increment_room_occupied', { room_id: roomId }).catch(async () => {
      // Fallback: update hostel_rooms.occupied directly
      const { data: room } = await admin.from('hostel_rooms').select('occupied').eq('id', roomId).single()
      if (room) await admin.from('hostel_rooms').update({ occupied: (room.occupied || 0) + 1 }).eq('id', roomId).catch(() => {})
    })

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
