import { createAdminClient }            from '@/lib/supabase/admin'
import { createClient }                 from '@/lib/supabase/server'
import { checkStudentLimit, limitExceededResponse } from '@/lib/licenseEngine'

const ADMIN_ROLES = ['owner','super_admin','principal','vice_principal','academic_coordinator','chairman','director','administrator']

async function getAuthedAdmin(req) {
  const serverClient = await createClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
  if (!ADMIN_ROLES.includes(profile?.role || '')) {
    return { error: 'Insufficient permissions', status: 403 }
  }
  return { user, admin, profile, institutionId: profile?.institution_id || null }
}

function mapLeadToRow(lead) {
  const nameParts = (lead.name || '').trim().split(/\s+/)
  return {
    first_name:        nameParts[0] || lead.name || '',
    last_name:         nameParts.slice(1).join(' ') || null,
    phone:             lead.phone || '',
    city:              lead.city  || null,
    interested_program: lead.program || null,
    source:            lead.source || 'walk_in',
    status:            lead.status || 'new',
    score:             parseInt(lead.score) || 0,
    notes:             lead.notes || null,
    metadata:          { counsellor: lead.counsellor || null },
  }
}

function mapRowToLead(row) {
  return {
    id:         row.id,
    name:       [row.first_name, row.last_name].filter(Boolean).join(' '),
    phone:      row.phone || '',
    city:       row.city  || '',
    program:    row.interested_program || '',
    source:     row.source || 'walk_in',
    status:     row.status || 'new',
    score:      row.score  || 0,
    counsellor: row.metadata?.counsellor || '',
    notes:      row.notes  || '',
    date:       row.created_at ? new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    fromApi:    true,
  }
}

// GET /api/admissions — list leads for the institution
export async function GET(req) {
  try {
    const ctx = await getAuthedAdmin(req)
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { admin, institutionId } = ctx

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''
    const q      = searchParams.get('q')      || ''

    let query = admin
      .from('leads')
      .select('id, first_name, last_name, phone, city, interested_program, source, status, score, notes, metadata, created_at')
      .order('created_at', { ascending: false })

    if (institutionId) query = query.eq('institution_id', institutionId)
    if (status)        query = query.eq('status', status)
    if (q)             query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 400 })

    return Response.json((data || []).map(mapRowToLead))
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/admissions — create lead(s) or add a follow-up
// body: { type: 'lead', ...leadFields }
// body: { type: 'bulk', leads: [...] }
// body: { type: 'follow_up', lead_id, follow_up_date, follow_up_type, notes }
export async function POST(req) {
  try {
    const ctx = await getAuthedAdmin(req)
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { admin, institutionId } = ctx

    const body = await req.json()
    const type = body.type || 'lead'

    if (type === 'follow_up') {
      const { lead_id, follow_up_date, follow_up_type, notes } = body
      if (!lead_id) return Response.json({ error: 'lead_id required' }, { status: 400 })
      const { data, error } = await admin.from('lead_follow_ups').insert({
        lead_id,
        follow_up_date: follow_up_date || new Date().toISOString(),
        follow_up_type: follow_up_type || 'call',
        notes:          notes || null,
      }).select('id').single()
      if (error) return Response.json({ error: error.message }, { status: 400 })
      return Response.json({ success: true, follow_up: data })
    }

    if (type === 'bulk') {
      const leads = Array.isArray(body.leads) ? body.leads : []
      if (!leads.length) return Response.json({ inserted: 0 })
      if (institutionId) {
        const limit = await checkStudentLimit(institutionId)
        if (!limit.allowed) return limitExceededResponse('Student', limit.current, limit.max)
      }
      const rows = leads.map(l => ({ ...mapLeadToRow(l), institution_id: institutionId }))
      const { data, error } = await admin.from('leads').insert(rows).select('id, first_name, last_name, phone, city, interested_program, source, status, score, notes, metadata, created_at')
      if (error) return Response.json({ error: error.message }, { status: 400 })
      return Response.json({ success: true, leads: (data || []).map(mapRowToLead), inserted: data?.length || 0 })
    }

    // Single lead
    const { name, phone } = body
    if (!name?.trim() || !phone?.trim()) {
      return Response.json({ error: 'name and phone are required' }, { status: 400 })
    }
    if (institutionId) {
      const limit = await checkStudentLimit(institutionId)
      if (!limit.allowed) return limitExceededResponse('Student', limit.current, limit.max)
    }
    const row = { ...mapLeadToRow(body), institution_id: institutionId }
    const { data, error } = await admin.from('leads').insert(row)
      .select('id, first_name, last_name, phone, city, interested_program, source, status, score, notes, metadata, created_at')
      .single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, lead: mapRowToLead(data) })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/admissions?id=<lead_id> — update a lead
export async function PATCH(req) {
  try {
    const ctx = await getAuthedAdmin(req)
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { admin, institutionId } = ctx

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const body = await req.json()
    const updates = {}
    if (body.name      !== undefined) {
      const parts = body.name.trim().split(/\s+/)
      updates.first_name = parts[0] || ''
      updates.last_name  = parts.slice(1).join(' ') || null
    }
    if (body.phone    !== undefined) updates.phone             = body.phone
    if (body.city     !== undefined) updates.city              = body.city
    if (body.program  !== undefined) updates.interested_program = body.program
    if (body.source   !== undefined) updates.source            = body.source
    if (body.status   !== undefined) updates.status            = body.status
    if (body.score    !== undefined) updates.score             = parseInt(body.score) || 0
    if (body.notes    !== undefined) updates.notes             = body.notes
    if (body.counsellor !== undefined) updates.metadata        = { counsellor: body.counsellor }

    const { data, error } = await admin
      .from('leads')
      .update(updates)
      .eq('id', id)
      .eq('institution_id', institutionId)
      .select('id, first_name, last_name, phone, city, interested_program, source, status, score, notes, metadata, created_at')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, lead: mapRowToLead(data) })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/admissions?id=<lead_id> — delete a lead
export async function DELETE(req) {
  try {
    const ctx = await getAuthedAdmin(req)
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status })
    const { admin, institutionId } = ctx

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const { error } = await admin
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('institution_id', institutionId)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
