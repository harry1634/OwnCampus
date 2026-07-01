import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET  /api/notifications?limit=20&unread=true
// PATCH /api/notifications  { id } or { all: true }  → mark read
// POST /api/notifications   { title, body, type, target_roles, target_user_ids, is_broadcast }

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const limit       = Math.min(parseInt(searchParams.get('limit') || '30'), 100)
    const unreadOnly  = searchParams.get('unread') === 'true'

    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null
    const role          = profile?.role            || null

    // Fetch notifications targeting this user specifically (user_id = me)
    // OR broadcast to their role (target_roles contains their role)
    // OR institution-wide broadcast (is_broadcast = true)
    let q = admin
      .from('notifications')
      .select('id, title, body, type, is_broadcast, is_read, user_id, link, metadata, created_at, sent_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (institutionId) q = q.eq('institution_id', institutionId)
    if (unreadOnly)    q = q.eq('is_read', false)

    // Filter: notifications for me personally OR broadcast
    q = q.or(`user_id.eq.${user.id},user_id.is.null,is_broadcast.eq.true`)

    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 400 })

    const notifications = data || []
    const unreadCount   = notifications.filter(n => !n.is_read).length

    return Response.json({ notifications, unreadCount })
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
    const { id, all } = body

    const admin = createAdminClient()

    if (all) {
      const { data: profile } = await admin
        .from('user_profiles').select('institution_id').eq('id', user.id).single()
      const institutionId = profile?.institution_id || null

      // Only mark notifications addressed to this user — never mutate broadcast rows globally
      let q = admin.from('notifications').update({ is_read: true })
        .eq('user_id', user.id)
      if (institutionId) q = q.eq('institution_id', institutionId)
      await q
    } else if (id) {
      // Scope to caller's user_id so one user cannot mark another's notification as read
      await admin.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user.id)
    } else {
      return Response.json({ error: 'id or all:true required.' }, { status: 400 })
    }

    return Response.json({ success: true })
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
    const { title, body: msgBody, type = 'general', target_roles, target_user_ids, is_broadcast = false, link, metadata, user_id } = body

    if (!title || !msgBody) return Response.json({ error: 'title and body are required.' }, { status: 400 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    const { data, error } = await admin.from('notifications').insert({
      institution_id:  institutionId,
      user_id:         user_id || null,
      title,
      body:            msgBody,
      type,
      target_roles:    target_roles || null,
      target_user_ids: target_user_ids || null,
      is_broadcast,
      link:            link     || null,
      metadata:        metadata || {},
      is_read:         false,
      created_by:      user.id,
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, notification: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
