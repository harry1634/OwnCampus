import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET /api/timeline?entity_type=student&entity_id=UUID&limit=30&offset=0
// Returns unified activity timeline for any entity (student, faculty, leave, etc.)
// Sources: entity_timeline table (primary) → audit_logs fallback

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get('entity_type') || null
    const entityId   = searchParams.get('entity_id')   || null
    const limit      = Math.min(100, parseInt(searchParams.get('limit')  || '50'))
    const offset     = Math.max(0,   parseInt(searchParams.get('offset') || '0'))

    if (!entityId) return Response.json({ error: 'entity_id is required.' }, { status: 400 })

    // Verify caller belongs to same institution as entity
    const { data: callerProfile } = await admin
      .from('user_profiles')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()
    const institutionId = callerProfile?.institution_id || null

    // ── 1. Try entity_timeline table (available after migration 009) ───────────
    let timelineRows = []
    const { data: tlData, error: tlErr } = await admin
      .from('entity_timeline')
      .select('id, action, description, actor_id, actor_name, actor_role, metadata, created_at')
      .eq('entity_id', entityId)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (!tlErr && tlData && tlData.length > 0) {
      timelineRows = tlData.map(row => ({
        id:          row.id,
        action:      row.action,
        description: row.description || labelAction(row.action),
        actor:       row.actor_name || 'System',
        role:        row.actor_role || null,
        timestamp:   row.created_at,
        metadata:    row.metadata || {},
        icon:        iconForAction(row.action),
        color:       colorForAction(row.action),
      }))
      return Response.json({ timeline: timelineRows, total: timelineRows.length, source: 'timeline' })
    }

    // ── 2. Fallback: audit_logs table ───────────────────────────────────────────
    if (!institutionId) return Response.json({ timeline: [], total: 0, source: 'audit_logs' })

    const { data: auditData } = await admin
      .from('audit_logs')
      .select('id, action, old_value, new_value, created_at, actor_id')
      .eq('entity_id', entityId)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (auditData && auditData.length > 0) {
      // Batch-resolve actor names
      const actorIds = [...new Set((auditData).map(r => r.actor_id).filter(Boolean))]
      const actorMap = {}
      if (actorIds.length > 0) {
        const { data: actors } = await admin
          .from('user_profiles')
          .select('id, first_name, last_name, role')
          .in('id', actorIds)
        if (actors) actors.forEach(a => {
          actorMap[a.id] = {
            name: `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Unknown',
            role: a.role,
          }
        })
      }

      timelineRows = auditData.map(row => {
        const actor = actorMap[row.actor_id] || {}
        return {
          id:          row.id,
          action:      row.action,
          description: labelAction(row.action, row.new_value),
          actor:       actor.name || 'System',
          role:        actor.role || null,
          timestamp:   row.created_at,
          metadata:    row.new_value || {},
          icon:        iconForAction(row.action),
          color:       colorForAction(row.action),
        }
      })
    }

    return Response.json({ timeline: timelineRows, total: timelineRows.length, source: 'audit_logs' })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// ── POST /api/timeline — manually add a custom timeline event ─────────────────

export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { entity_type, entity_id, action, description, metadata = {} } = body

    if (!entity_id || !action) {
      return Response.json({ error: 'entity_id and action are required.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles')
      .select('institution_id, first_name, last_name, role')
      .eq('id', user.id)
      .single()

    const { data, error } = await admin.from('entity_timeline').insert({
      institution_id: profile?.institution_id || null,
      entity_type:    entity_type || 'general',
      entity_id,
      action,
      description:    description || action,
      actor_id:       user.id,
      actor_name:     `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown',
      actor_role:     profile?.role || null,
      metadata,
    }).select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, event: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function labelAction(action, data = {}) {
  const map = {
    'student.create':       'Student record created',
    'student.update':       'Student profile updated',
    'student.delete':       'Student record deleted',
    'restore':              'Record restored',
    'fee.payment':          `Fee payment recorded — ₹${Number(data?.amount || 0).toLocaleString('en-IN')}`,
    'fee_paid':             `Fee payment recorded — ₹${Number(data?.amount || 0).toLocaleString('en-IN')}`,
    'fee.structure.set':    'Fee structure configured',
    'attendance.mark':      'Attendance marked',
    'attendance.update':    'Attendance record corrected',
    'leave.request':        'Leave request submitted',
    'leave_approved':       'Leave approved',
    'leave_rejected':       'Leave rejected',
    'leave.approve':        'Leave approved',
    'leave.reject':         'Leave rejected',
    'library.issue':        'Book issued',
    'book_issued':          `Book issued — due ${data?.due_date || ''}`,
    'library.return':       'Book returned',
    'book_returned':        'Book returned',
    'hostel.assign':        'Hostel room assigned',
    'hostel_assigned':      'Hostel room assigned',
    'transport.assign':     'Transport route assigned',
    'exam.create':          'Exam scheduled',
    'exam_scheduled':       'Exam scheduled',
    'marks.publish':        'Marks published',
    'announcement.create':  'Announcement posted',
    'document.upload':      'Document uploaded',
    'update':               'Record updated',
    'create':               'Record created',
    'delete':               'Record deleted',
  }
  return map[action] || action.replace(/[._]/g, ' ')
}

function iconForAction(action) {
  if (action.includes('fee') || action.includes('payment')) return 'payment'
  if (action.includes('leave'))      return 'leave'
  if (action.includes('book') || action.includes('library')) return 'book'
  if (action.includes('hostel'))     return 'hostel'
  if (action.includes('transport'))  return 'transport'
  if (action.includes('exam') || action.includes('marks')) return 'exam'
  if (action.includes('attendance')) return 'attendance'
  if (action.includes('delete'))     return 'delete'
  if (action.includes('create') || action.includes('student.create')) return 'create'
  return 'update'
}

function colorForAction(action) {
  if (action.includes('create') || action.includes('approved') || action.includes('paid') || action.includes('issued')) return '#16A34A'
  if (action.includes('delete') || action.includes('rejected'))  return '#DC2626'
  if (action.includes('update') || action.includes('update'))    return '#D97706'
  if (action.includes('leave'))   return '#7C3AED'
  if (action.includes('fee') || action.includes('payment'))      return '#0891B2'
  return '#64748B'
}
