import { requireControlUser, writeAuditLog } from '@/lib/control/auth'
import { createAdminClient }                 from '@/lib/supabase/admin'

// GET /api/control/support?status=&priority=&page=
export async function GET(req) {
  try {
    await requireControlUser()
    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const status   = searchParams.get('status')   || ''
    const priority = searchParams.get('priority') || ''
    const page     = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit    = 25
    const offset   = (page - 1) * limit

    let query = admin
      .from('support_tickets')
      .select(`
        *,
        institutions ( id, name ),
        company_users!support_tickets_assigned_to_fkey ( id, name )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status)   query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    return Response.json({ tickets: data || [], total: count || 0, page, limit })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}

// POST /api/control/support
// Creates a new support ticket (from institution or company side)
export async function POST(req) {
  try {
    const cu   = await requireControlUser()
    const body = await req.json()
    const admin = createAdminClient()

    const { institution_id, raised_by_name, raised_by_email, subject, description, category, priority } = body
    if (!raised_by_name || !raised_by_email || !subject || !description) {
      return Response.json({ error: 'raised_by_name, raised_by_email, subject, and description are required.' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('support_tickets')
      .insert({
        ticket_number:  '',  // trigger fills this
        institution_id: institution_id || null,
        raised_by_name,
        raised_by_email,
        subject,
        description,
        category:  category  || 'general',
        priority:  priority  || 'medium',
        status:    'open',
      })
      .select('id, ticket_number')
      .single()

    if (error) throw new Error(error.message)

    await writeAuditLog(cu, 'ticket.created', 'ticket', data.id, subject, { priority })
    return Response.json({ ok: true, ticketId: data.id, ticketNumber: data.ticket_number })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
