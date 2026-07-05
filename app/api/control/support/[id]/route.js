import { requireControlUser, writeAuditLog } from '@/lib/control/auth'
import { createAdminClient }                 from '@/lib/supabase/admin'

// GET /api/control/support/[id]
export async function GET(req, { params }) {
  try {
    await requireControlUser()
    const { id } = await params
    const admin = createAdminClient()

    const [
      { data: ticket, error: tErr },
      { data: messages },
    ] = await Promise.all([
      admin.from('support_tickets').select(`*, institutions(id,name), company_users!support_tickets_assigned_to_fkey(id,name)`).eq('id', id).single(),
      admin.from('support_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true }),
    ])

    if (tErr || !ticket) return Response.json({ error: 'Ticket not found.' }, { status: 404 })

    return Response.json({ ticket, messages: messages || [] })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}

// PATCH /api/control/support/[id]
// Update ticket status, priority, assignment; or add a reply message.
export async function PATCH(req, { params }) {
  try {
    const cu = await requireControlUser()
    const { id } = await params
    const body = await req.json()
    const admin = createAdminClient()

    const { action, status, priority, assigned_to, message } = body

    if (action === 'reply' && message) {
      const { error } = await admin.from('support_messages').insert({
        ticket_id:   id,
        sender_type: 'company_user',
        sender_id:   cu.id,
        sender_name: cu.name,
        message,
      })
      if (error) throw new Error(error.message)
      // Update ticket updated_at
      await admin.from('support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', id)
      return Response.json({ ok: true })
    }

    // Update ticket fields
    const updates = { updated_at: new Date().toISOString() }
    if (status)      updates.status      = status
    if (priority)    updates.priority    = priority
    if (assigned_to) updates.assigned_to = assigned_to
    if (status === 'resolved' || status === 'closed') {
      updates.resolved_at = new Date().toISOString()
    }

    const { error } = await admin.from('support_tickets').update(updates).eq('id', id)
    if (error) throw new Error(error.message)

    await writeAuditLog(cu, 'ticket.updated', 'ticket', id, id, { updates })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
