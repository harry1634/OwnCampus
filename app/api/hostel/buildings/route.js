import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getInstitutionId(admin, userId) {
  const { data } = await admin.from('user_profiles').select('institution_id').eq('id', userId).single()
  return data?.institution_id || null
}

// GET /api/hostel/buildings
// Returns buildings with aggregated room + occupancy stats
export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const institutionId = await getInstitutionId(admin, user.id)

    let q = admin
      .from('hostel_buildings')
      .select('id, name, type, total_rooms, address, warden_id, institution_id')
      .order('created_at', { ascending: true })

    if (institutionId) q = q.eq('institution_id', institutionId)

    const { data: buildings, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 400 })

    const buildingIds = (buildings || []).map(b => b.id)

    // Fetch rooms, warden names, and actual active allocation counts in parallel
    const [roomsResult, wardenData, allocCountData] = await Promise.all([
      buildingIds.length > 0
        ? admin.from('hostel_rooms').select('id, building_id, floor, capacity, monthly_fee').in('building_id', buildingIds)
        : Promise.resolve({ data: [] }),
      (async () => {
        const wardenIds = (buildings || []).map(b => b.warden_id).filter(Boolean)
        if (!wardenIds.length) return {}
        const { data: ws } = await admin.from('user_profiles').select('id, first_name, last_name').in('id', wardenIds)
        const map = {}
        ;(ws || []).forEach(w => { map[w.id] = [w.first_name, w.last_name].filter(Boolean).join(' ') })
        return map
      })(),
      // Count actual active allocations per room (source of truth for occupancy)
      buildingIds.length > 0
        ? (async () => {
            const { data: rooms } = await admin.from('hostel_rooms').select('id, building_id').in('building_id', buildingIds)
            const allRoomIds = (rooms || []).map(r => r.id)
            if (!allRoomIds.length) return {}
            const { data: allocs } = await admin.from('hostel_allocations').select('room_id').in('room_id', allRoomIds).eq('status', 'active')
            const counts = {}
            ;(allocs || []).forEach(a => { counts[a.room_id] = (counts[a.room_id] || 0) + 1 })
            return counts
          })()
        : Promise.resolve({}),
    ])

    const rooms = roomsResult?.data || []
    const allocCounts = allocCountData || {}

    // Group rooms by building_id
    const roomsByBuilding = {}
    rooms.forEach(r => {
      if (!roomsByBuilding[r.building_id]) roomsByBuilding[r.building_id] = []
      roomsByBuilding[r.building_id].push(r)
    })

    const result = (buildings || []).map(b => {
      const bRooms       = roomsByBuilding[b.id] || []
      const totalRooms   = bRooms.length
      const totalBeds    = bRooms.reduce((s, r) => s + (r.capacity || 0), 0)
      // Use actual active allocation count instead of stale hostel_rooms.occupied
      const occupiedBeds = bRooms.reduce((s, r) => s + (allocCounts[r.id] || 0), 0)
      const floors       = bRooms.length > 0 ? Math.max(...bRooms.map(r => r.floor || 1)) : 0
      const fees         = bRooms.map(r => Number(r.monthly_fee) || 0).filter(f => f > 0)
      const monthlyFee   = fees.length > 0 ? Math.round(fees.reduce((a, x) => a + x, 0) / fees.length) : 0
      const warden       = b.warden_id ? (wardenData[b.warden_id] || null) : null

      return {
        id:            b.id,
        name:          b.name,
        type:          (b.type || 'boys').charAt(0).toUpperCase() + (b.type || 'boys').slice(1),
        floors,
        totalRooms,
        totalBeds,
        occupiedBeds,
        occupiedRooms: bRooms.filter(r => (allocCounts[r.id] || 0) > 0).length,
        warden:        warden || b.address || null,
        monthlyFee,
        wardenId:      b.warden_id,
      }
    })

    return Response.json(result)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/hostel/buildings — create a new hostel building + auto-create rooms
export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, type, address, floors, totalRooms, totalBeds, monthlyFee } = body
    if (!name) return Response.json({ error: 'name is required' }, { status: 400 })

    const admin = createAdminClient()
    const institutionId = await getInstitutionId(admin, user.id)

    const numFloors   = Math.max(1, parseInt(floors)     || 1)
    const numRooms    = Math.max(0, parseInt(totalRooms) || 0)
    const numBeds     = Math.max(0, parseInt(totalBeds)  || 0)
    const fee         = Math.max(0, parseInt(monthlyFee) || 0)
    const capacityPerRoom = numRooms > 0 && numBeds > 0
      ? Math.max(1, Math.ceil(numBeds / numRooms))
      : 1

    const { data, error } = await admin
      .from('hostel_buildings')
      .insert({
        name,
        type:           (type || 'boys').toLowerCase(),
        address:        address || null,
        total_rooms:    numRooms || null,
        institution_id: institutionId,
      })
      .select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Auto-create room records distributed across floors
    if (numRooms > 0) {
      const roomsPerFloor = Math.ceil(numRooms / numFloors)
      const roomRecords = []
      for (let i = 0; i < numRooms; i++) {
        const floor      = Math.floor(i / roomsPerFloor) + 1
        const roomInFloor = (i % roomsPerFloor) + 1
        roomRecords.push({
          building_id:  data.id,
          room_number:  `${floor}${String(roomInFloor).padStart(2, '0')}`,
          floor,
          capacity:     capacityPerRoom,
          occupied:     0,
          monthly_fee:  fee || null,
          is_available: true,
        })
      }
      await admin.from('hostel_rooms').insert(roomRecords)
    }

    return Response.json({ success: true, building: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/hostel/buildings?id=<uuid> — cascade delete a building
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

    // 1. Get all room IDs in this building
    const { data: rooms } = await admin.from('hostel_rooms').select('id').eq('building_id', id)
    const roomIds = (rooms || []).map(r => r.id)

    // 2. Hard-delete all allocations referencing those rooms (FK prevents room deletion otherwise)
    if (roomIds.length > 0) {
      await admin.from('hostel_allocations').delete().in('room_id', roomIds)
    }

    // 3. Delete the rooms
    if (roomIds.length > 0) {
      await admin.from('hostel_rooms').delete().in('id', roomIds)
    }

    // 4. Delete the building
    let q = admin.from('hostel_buildings').delete().eq('id', id)
    if (institutionId) q = q.eq('institution_id', institutionId)
    const { error } = await q
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/hostel/buildings — update building fields
export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const admin = createAdminClient()
    const allowed = ['name', 'type', 'address', 'total_rooms', 'warden_id']
    const patch   = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))
    if (patch.type) patch.type = patch.type.toLowerCase()

    const { data, error } = await admin.from('hostel_buildings').update(patch).eq('id', id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, building: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
