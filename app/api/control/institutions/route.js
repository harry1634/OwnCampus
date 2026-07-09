import { randomBytes }                       from 'crypto'
import { requireControlUser, writeAuditLog } from '@/lib/control/auth'
import { createAdminClient }                 from '@/lib/supabase/admin'

function generateCode(name) {
  const prefix = (name || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X')
  const chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const suffix = Array.from({ length: 4 }, () => chars[randomBytes(1)[0] % chars.length]).join('')
  return prefix + suffix
}

function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)
}

// POST /api/control/institutions — create a new institution
export async function POST(req) {
  try {
    const cu   = await requireControlUser()
    const body = await req.json()
    const admin = createAdminClient()

    const { name, type, email, phone, initial_status } = body
    if (!name?.trim())  return Response.json({ error: 'Institution name is required.' }, { status: 400 })
    if (!type?.trim())  return Response.json({ error: 'Institution type is required.' }, { status: 400 })
    if (!email?.trim()) return Response.json({ error: 'Institution email is required.' }, { status: 400 })

    // Generate a unique code — retry up to 5 times on collision
    let code, attempts = 0
    while (attempts < 5) {
      const candidate = generateCode(name.trim())
      const { data: existing } = await admin.from('institutions').select('id').ilike('code', candidate).maybeSingle()
      if (!existing) { code = candidate; break }
      attempts++
    }
    if (!code) return Response.json({ error: 'Could not generate a unique code. Please try again.' }, { status: 500 })

    const slug           = generateSlug(name.trim())
    const control_status = ['pending', 'trial', 'active'].includes(initial_status) ? initial_status : 'pending'

    const { data, error } = await admin.from('institutions').insert({
      name:           name.trim(),
      type:           type.trim(),
      email:          email.trim().toLowerCase(),
      phone:          phone?.trim() || null,
      code,
      slug,
      is_active:      true,
      setup_done:     false,
      control_status,
      approved_at:    control_status === 'active' ? new Date().toISOString() : null,
      approved_by:    control_status === 'active' ? cu.id : null,
    }).select('id, name, code, control_status').single()

    if (error) throw new Error(error.message)

    await writeAuditLog(cu, 'institution.created', 'institution', data.id, data.name, { code, type, control_status })

    return Response.json({ ok: true, institution: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}

// GET /api/control/institutions?status=&search=&page=&limit=
export async function GET(req) {
  try {
    await requireControlUser()
    const admin  = createAdminClient()
    const { searchParams } = new URL(req.url)
    const status  = searchParams.get('status')  || ''
    const search  = searchParams.get('search')  || ''
    const page    = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit   = Math.min(50, parseInt(searchParams.get('limit') || '20'))
    const offset  = (page - 1) * limit

    let query = admin
      .from('institutions')
      .select(`
        id, name, type, slug, code, email, is_active, control_status,
        created_at, approved_at,
        institution_licenses ( monthly_fee, billing_cycle, max_students, valid_until, license_status:billing_cycle ),
        institution_payments  ( total_amount, payment_status, billing_month )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('control_status', status)
    if (search) query = query.ilike('name', `%${search}%`)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    return Response.json({ institutions: data || [], total: count || 0, page, limit })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
