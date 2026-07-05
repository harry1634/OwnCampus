import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_ROLES = new Set([
  'owner','super_admin','principal','vice_principal','academic_coordinator',
  'chairman','director','administrator','hr','transport_manager','hostel_manager',
])

async function getProfile() {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const admin = createAdminClient()
  const { data: profile } = await admin.from('user_profiles')
    .select('id, institution_id, role').eq('id', user.id).single()
  if (!profile?.institution_id) return { error: 'No institution', status: 400 }
  return { user, profile, institutionId: profile.institution_id, admin }
}

function computeStatus(qty, minStock) {
  qty     = parseInt(qty)     || 0
  minStock = parseInt(minStock) || 0
  if (qty === 0)           return 'out'
  if (qty < minStock / 2)  return 'critical'
  if (qty < minStock)      return 'low'
  return 'ok'
}

// GET /api/inventory
export async function GET(req) {
  try {
    const ctx = await getProfile()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { institutionId, admin } = ctx

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''

    let query = admin.from('inventory_items')
      .select('*')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })

    if (q) query = query.ilike('name', `%${q}%`)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ items: data || [] })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/inventory — add an item
export async function POST(req) {
  try {
    const ctx = await getProfile()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { user, institutionId, admin } = ctx

    if (!ADMIN_ROLES.has(ctx.profile.role)) {
      return Response.json({ error: 'Only admins can add inventory items.' }, { status: 403 })
    }

    const { name, category, quantity, unit, minStock, value } = await req.json()
    if (!name?.trim()) return Response.json({ error: 'Item name is required.' }, { status: 400 })

    const qty     = parseInt(quantity) || 0
    const minSt   = parseInt(minStock) || 0
    const status  = computeStatus(qty, minSt)

    const { data, error } = await admin.from('inventory_items').insert({
      institution_id: institutionId,
      name:           name.trim(),
      category:       category || 'Other',
      quantity:       qty,
      unit:           unit || 'Units',
      min_stock:      minSt,
      value:          parseFloat(value) || 0,
      status,
      added_by:       user.id,
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ item: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/inventory — update quantity or fields
export async function PATCH(req) {
  try {
    const ctx = await getProfile()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { institutionId, admin } = ctx

    if (!ADMIN_ROLES.has(ctx.profile.role)) {
      return Response.json({ error: 'Only admins can update inventory items.' }, { status: 403 })
    }

    const { id, ...updates } = await req.json()
    if (!id) return Response.json({ error: 'id is required.' }, { status: 400 })

    const allowed = ['name','category','quantity','unit','min_stock','value']
    const patch   = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))
    if ('quantity' in patch || 'min_stock' in patch) {
      const { data: cur } = await admin.from('inventory_items').select('quantity,min_stock').eq('id', id).single()
      const qty     = parseInt('quantity' in patch ? patch.quantity : cur?.quantity) || 0
      const minSt   = parseInt('min_stock' in patch ? patch.min_stock : cur?.min_stock) || 0
      patch.status  = computeStatus(qty, minSt)
    }
    patch.updated_at = new Date().toISOString()

    const { error } = await admin.from('inventory_items')
      .update(patch).eq('id', id).eq('institution_id', institutionId)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
