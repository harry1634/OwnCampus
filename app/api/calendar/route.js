import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET  /api/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD&type=exam|leave|general…&role=student|faculty
// POST /api/calendar   { title, event_type, start_date, end_date?, all_day?, color?, target_roles? }
// PATCH /api/calendar  { id, ...fields }
// DELETE /api/calendar?id=... → soft delete

const EVENT_COLORS = {
  exam:                 '#7C3AED',
  holiday:              '#DC2626',
  ptm:                  '#059669',
  event:                '#2563EB',
  assignment_due:       '#D97706',
  fee_deadline:         '#EA580C',
  seminar:              '#0891B2',
  hostel_event:         '#8B5CF6',
  transport_maintenance:'#64748B',
  timetable_change:     '#F59E0B',
  leave:                '#EF4444',
  general:              '#2563EB',
}

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const from  = searchParams.get('from') || new Date(Date.now() - 7  * 86400000).toISOString().slice(0, 10)
    const to    = searchParams.get('to')   || new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)
    const type  = searchParams.get('type') || null
    const role  = searchParams.get('role') || null

    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null
    if (!institutionId) return Response.json([], { status: 200 })

    // Try the unified view first (includes exams + leaves from DB)
    let query = admin
      .from('v_institutional_calendar')
      .select('id, title, description, event_type, color, start_date, end_date, start_time, end_time, all_day, target_roles, reference_type, reference_id')
      .eq('institution_id', institutionId)
      .gte('start_date', from)
      .lte('start_date', to)
      .order('start_date', { ascending: true })

    if (type) query = query.eq('event_type', type)

    const { data: events, error } = await query

    if (error) {
      // View not yet created — fall back to custom events table only
      const fallback = await admin
        .from('calendar_events')
        .select('id, title, description, event_type, color, start_date, end_date, start_time, end_time, all_day, target_roles, reference_type, reference_id')
        .eq('institution_id', institutionId)
        .gte('start_date', from)
        .lte('start_date', to)
        .is('deleted_at', null)
        .order('start_date', { ascending: true })

      return Response.json(fallback.data || [])
    }

    // Optional: filter by role visibility
    const filtered = role
      ? (events || []).filter(e =>
          !e.target_roles || e.target_roles.includes('all') || e.target_roles.includes(role)
        )
      : (events || [])

    return Response.json(filtered)
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
    const {
      title, event_type = 'general', start_date, end_date,
      description, all_day = true, color, target_roles,
      start_time, end_time, reference_type, reference_id, room_id,
    } = body

    if (!title || !start_date) {
      return Response.json({ error: 'title and start_date are required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    const { data, error } = await admin
      .from('calendar_events')
      .insert({
        institution_id: institutionId,
        title,
        event_type,
        description:     description || null,
        start_date,
        end_date:        end_date    || start_date,
        all_day,
        color:           color || EVENT_COLORS[event_type] || '#2563EB',
        target_roles:    target_roles || ['all'],
        start_time:      start_time  || null,
        end_time:        end_time    || null,
        reference_type:  reference_type || null,
        reference_id:    reference_id   || null,
        room_id:         room_id        || null,
        created_by:      user.id,
      })
      .select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, event: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const admin = createAdminClient()
    const allowed = ['title','description','event_type','start_date','end_date','start_time','end_time','all_day','color','target_roles','room_id']
    const patch   = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))

    const { data, error } = await admin
      .from('calendar_events').update(patch).eq('id', id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, event: data })
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
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin
      .from('calendar_events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
