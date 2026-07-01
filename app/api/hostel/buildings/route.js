import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

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
      .select(`
        id, name, type, total_rooms, address,
        warden_id,
        user_profiles!hostel_buildings_warden_id_fkey ( first_name, last_name ),
        hostel_rooms ( id, floor, capacity, occupied, monthly_fee, is_available )
      `)
      .order('created_at', { ascending: true })

    if (institutionId) q = q.eq('institution_id', institutionId)

    const { data: buildings, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 400 })

    const result = (buildings || []).map(b => {
      const rooms       = b.hostel_rooms || []
      const totalRooms  = rooms.length
      const totalBeds   = rooms.reduce((s, r) => s + (r.capacity || 0), 0)
      const occupiedBeds= rooms.reduce((s, r) => s + (r.occupied  || 0), 0)
      const floors      = rooms.length > 0 ? Math.max(...rooms.map(r => r.floor || 1)) : 0
      const fees        = rooms.map(r => Number(r.monthly_fee) || 0).filter(f => f > 0)
      const monthlyFee  = fees.length > 0 ? Math.round(fees.reduce((a, b) => a + b, 0) / fees.length) : 0
      const warden      = b.user_profiles
        ? [b.user_profiles.first_name, b.user_profiles.last_name].filter(Boolean).join(' ')
        : null

      return {
        id:           b.id,
        name:         b.name,
        type:         (b.type || 'boys').charAt(0).toUpperCase() + (b.type || 'boys').slice(1),
        floors,
        totalRooms,
        totalBeds,
        occupiedBeds,
        occupiedRooms: rooms.filter(r => (r.occupied || 0) > 0).length,
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

// POST /api/hostel/buildings — create a new hostel building
export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, type, address } = body
    if (!name) return Response.json({ error: 'name is required' }, { status: 400 })

    const admin = createAdminClient()
    const institutionId = await getInstitutionId(admin, user.id)

    const { data, error } = await admin
      .from('hostel_buildings')
      .insert({ name, type: (type || 'boys').toLowerCase(), address: address || null, institution_id: institutionId })
      .select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, building: data })
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
