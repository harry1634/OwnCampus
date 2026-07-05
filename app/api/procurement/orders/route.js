import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_ROLES = new Set([
  'owner','super_admin','principal','vice_principal','academic_coordinator',
  'chairman','director','administrator',
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

// GET /api/procurement/orders
export async function GET() {
  try {
    const ctx = await getProfile()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { institutionId, admin } = ctx

    const { data, error } = await admin.from('purchase_orders')
      .select('*')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ orders: data || [] })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/procurement/orders — create a purchase order
export async function POST(req) {
  try {
    const ctx = await getProfile()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { user, institutionId, admin } = ctx

    const { vendor, items, amount, category } = await req.json()
    if (!vendor?.trim() || !items?.trim()) {
      return Response.json({ error: 'Vendor and items are required.' }, { status: 400 })
    }

    // Generate PO number: PO-YYYY-NNN
    const { count } = await admin.from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
    const year = new Date().getFullYear()
    const poNumber = `PO-${year}-${String((count || 0) + 1).padStart(3, '0')}`

    const { data, error } = await admin.from('purchase_orders').insert({
      institution_id: institutionId,
      po_number:      poNumber,
      vendor:         vendor.trim(),
      items:          items.trim(),
      amount:         parseFloat(amount) || 0,
      category:       category || 'Other',
      status:         'pending',
      raised_by:      user.id,
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ order: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/procurement/orders — update status (admin only)
export async function PATCH(req) {
  try {
    const ctx = await getProfile()
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { profile, institutionId, admin } = ctx

    if (!ADMIN_ROLES.has(profile.role)) {
      return Response.json({ error: 'Only admins can update order status.' }, { status: 403 })
    }

    const { id, status } = await req.json()
    if (!id) return Response.json({ error: 'id is required.' }, { status: 400 })
    const valid = ['pending','approved','delivered','rejected']
    if (!valid.includes(status)) return Response.json({ error: 'Invalid status.' }, { status: 400 })

    const { error } = await admin.from('purchase_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('institution_id', institutionId)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
