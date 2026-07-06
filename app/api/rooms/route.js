import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET  /api/rooms?type=classroom|lab|hall|exam_room…&available_from=ISO&available_to=ISO
//      Returns rooms + their upcoming bookings (conflict detection)
// POST /api/rooms  { name, code?, type, capacity, floor?, building?, facilities? }
// PATCH /api/rooms { id, ...fields }
// DELETE /api/rooms?id=... → soft delete

// GET  /api/rooms?bookings=true&room_id=...
//      Returns bookings for a specific room

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const typeFilter     = searchParams.get('type')           || null
    const bookings       = searchParams.get('bookings') === 'true'
    const roomId         = searchParams.get('room_id')        || null
    const availFrom      = searchParams.get('available_from') || null
    const availTo        = searchParams.get('available_to')   || null

    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    // ── Bookings for a specific room ───────────────────────────────────────
    if (bookings && roomId) {
      const now = new Date().toISOString()
      let bq = admin
        .from('room_bookings')
        .select('id, booking_type, title, start_time, end_time, status, notes, booked_by, reference_id')
        .eq('room_id', roomId)
        .eq('status', 'confirmed')
        .is('deleted_at', null)
        .gte('end_time', now)
        .order('start_time', { ascending: true })

      const { data: bkData, error: bkErr } = await bq
      if (bkErr) return Response.json({ error: bkErr.message }, { status: 400 })
      return Response.json({ bookings: bkData || [] })
    }

    // ── Room list ──────────────────────────────────────────────────────────
    let query = admin
      .from('rooms')
      .select('id, name, code, type, floor, building, capacity, facilities, is_active, created_at')
      .eq('institution_id', institutionId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('building', { ascending: true })
      .order('name',     { ascending: true })

    if (typeFilter) query = query.eq('type', typeFilter)

    const { data: rooms, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 400 })

    // If availability window requested, annotate each room with conflict flag
    if (availFrom && availTo) {
      const { data: conflicts } = await admin
        .from('room_bookings')
        .select('room_id')
        .eq('institution_id', institutionId)
        .eq('status', 'confirmed')
        .is('deleted_at', null)
        .lt('start_time', availTo)
        .gt('end_time', availFrom)

      const conflictRoomIds = new Set((conflicts || []).map(c => c.room_id))

      return Response.json(
        (rooms || []).map(r => ({ ...r, available: !conflictRoomIds.has(r.id) }))
      )
    }

    return Response.json(rooms || [])
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

    // Detect if this is a booking request
    if (body.action === 'book') {
      return handleBookRoom(req, user, body)
    }

    const { name, code, type = 'classroom', capacity = 30, floor = 0, building, facilities } = body
    if (!name) return Response.json({ error: 'name is required' }, { status: 400 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()

    const adminRoles = ['owner','super_admin','principal','vice_principal','academic_coordinator']
    if (!adminRoles.includes(profile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data, error } = await admin
      .from('rooms')
      .insert({
        institution_id: profile.institution_id,
        name, code: code || null,
        type, capacity: Number(capacity), floor: Number(floor),
        building: building || null,
        facilities: facilities || null,
        is_active: true,
      })
      .select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, room: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

async function handleBookRoom(req, user, body) {
  const { room_id, booking_type, title, start_time, end_time, notes, reference_id } = body
  if (!room_id || !booking_type || !title || !start_time || !end_time) {
    return Response.json({ error: 'room_id, booking_type, title, start_time, end_time are required' }, { status: 400 })
  }
  if (new Date(start_time) >= new Date(end_time)) {
    return Response.json({ error: 'end_time must be after start_time' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles').select('institution_id').eq('id', user.id).single()

  // The DB trigger fn_check_room_booking_conflict handles conflict enforcement
  const { data, error } = await admin
    .from('room_bookings')
    .insert({
      institution_id: profile.institution_id,
      room_id, booking_type, title,
      start_time, end_time,
      notes:        notes        || null,
      reference_id: reference_id || null,
      booked_by:    user.id,
      status:       'confirmed',
    })
    .select().single()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ success: true, booking: data })
}

export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, booking_id, ...updates } = body

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null
    if (!institutionId) return Response.json({ error: 'Institution not resolved.' }, { status: 400 })

    // Patch a booking
    if (booking_id) {
      const bookingAllowed = ['status', 'title', 'notes', 'start_time', 'end_time']
      const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => bookingAllowed.includes(k)))
      const { data, error } = await admin
        .from('room_bookings').update(patch)
        .eq('id', booking_id).eq('institution_id', institutionId)
        .select().single()
      if (error) return Response.json({ error: error.message }, { status: 400 })
      return Response.json({ success: true, booking: data })
    }

    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })
    const allowed = ['name', 'code', 'type', 'capacity', 'floor', 'building', 'facilities', 'is_active']
    const patch   = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))

    const { data, error } = await admin.from('rooms').update(patch)
      .eq('id', id).eq('institution_id', institutionId)
      .select().single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, room: data })
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
    const id        = searchParams.get('id')
    const bookingId = searchParams.get('booking_id')

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null
    if (!institutionId) return Response.json({ error: 'Institution not resolved.' }, { status: 400 })

    if (bookingId) {
      const { error } = await admin
        .from('room_bookings')
        .update({ status: 'cancelled', deleted_at: new Date().toISOString() })
        .eq('id', bookingId).eq('institution_id', institutionId)
      if (error) return Response.json({ error: error.message }, { status: 400 })
      return Response.json({ success: true })
    }

    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })
    const { error } = await admin
      .from('rooms')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id).eq('institution_id', institutionId)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
