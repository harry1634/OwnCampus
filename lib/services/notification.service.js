// ─── Notification Service ─────────────────────────────────────────────────────
// Server-side only. Call from API routes.
// Single source of truth for all notification creation.
// Supports: targeted (user_id), broadcast (institution), bulk (user_id[])

import { createAdminClient } from '@/lib/supabase/admin'

// Notification types
export const NOTIF_TYPE = {
  PAYMENT:     'payment',
  ATTENDANCE:  'attendance',
  EXAM:        'exam',
  LEAVE:       'leave',
  GENERAL:     'general',
  ALERT:       'alert',
  SYSTEM:      'system',
}

// Templates ensure consistency — each event has exactly one canonical message
const TEMPLATES = {
  fee_paid: (data) => ({
    type:  NOTIF_TYPE.PAYMENT,
    title: 'Fee Payment Confirmed',
    body:  `Payment of ${fmtAmount(data.amount)} received. Receipt: ${data.receipt || 'N/A'}.`,
    link:  '/student/fees',
  }),
  fee_due: (data) => ({
    type:  NOTIF_TYPE.PAYMENT,
    title: 'Fee Due Reminder',
    body:  `Your fee of ${fmtAmount(data.amount)} is due on ${fmtDate(data.due_date)}.`,
    link:  '/student/fees',
  }),
  attendance_absent: (data) => ({
    type:  NOTIF_TYPE.ATTENDANCE,
    title: 'Attendance Marked Absent',
    body:  `You were marked absent on ${fmtDate(data.date)}${data.subject ? ` for ${data.subject}` : ''}.`,
    link:  '/student/attendance',
  }),
  attendance_low: (data) => ({
    type:  NOTIF_TYPE.ATTENDANCE,
    title: 'Low Attendance Warning',
    body:  `Your attendance is ${data.pct}% over the last 30 days. Minimum required: 75%.`,
    link:  '/student/attendance',
  }),
  exam_scheduled: (data) => ({
    type:  NOTIF_TYPE.EXAM,
    title: 'Exam Scheduled',
    body:  `${data.name} scheduled on ${fmtDate(data.date)}${data.hall ? ` in ${data.hall}` : ''}.`,
    link:  '/student/examinations',
  }),
  marks_published: (data) => ({
    type:  NOTIF_TYPE.EXAM,
    title: 'Marks Published',
    body:  `Results for ${data.exam_name} are now available.`,
    link:  '/student/examinations',
  }),
  leave_approved: (data) => ({
    type:  NOTIF_TYPE.LEAVE,
    title: 'Leave Approved',
    body:  `Your leave request from ${fmtDate(data.from)} to ${fmtDate(data.to)} has been approved.`,
    link:  '/faculty/leaves',
  }),
  leave_rejected: (data) => ({
    type:  NOTIF_TYPE.LEAVE,
    title: 'Leave Rejected',
    body:  `Your leave request from ${fmtDate(data.from)} to ${fmtDate(data.to)} was not approved${data.reason ? `: ${data.reason}` : ''}.`,
    link:  '/faculty/leaves',
  }),
  book_issued: (data) => ({
    type:  NOTIF_TYPE.GENERAL,
    title: 'Book Issued',
    body:  `"${data.title}" issued. Due date: ${fmtDate(data.due_date)}.`,
    link:  '/student/library',
  }),
  book_overdue: (data) => ({
    type:  NOTIF_TYPE.ALERT,
    title: 'Book Overdue',
    body:  `"${data.title}" is overdue by ${data.days} day(s). Fine: ${fmtAmount(data.fine)}.`,
    link:  '/student/library',
  }),
  hostel_assigned: (data) => ({
    type:  NOTIF_TYPE.GENERAL,
    title: 'Hostel Room Assigned',
    body:  `You have been assigned to ${data.building} Room ${data.room_number}, Bed #${data.bed || 1}.`,
    link:  '/student/transport',
  }),
  transport_assigned: (data) => ({
    type:  NOTIF_TYPE.GENERAL,
    title: 'Transport Route Assigned',
    body:  `Assigned to Route ${data.route_name}${data.stop ? ` — Stop: ${data.stop}` : ''}.`,
    link:  '/student/transport',
  }),
  announcement: (data) => ({
    type:  NOTIF_TYPE.GENERAL,
    title: data.title,
    body:  data.body,
    link:  '/communication',
  }),
  access_approved: (data) => ({
    type:  NOTIF_TYPE.SYSTEM,
    title: 'Account Access Granted',
    body:  `Welcome to ${data.institution_name}! Your account is now active.`,
    link:  '/auth/login',
  }),
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAmount(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

function fmtDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Core send functions ───────────────────────────────────────────────────────

/**
 * Send a notification to a single user.
 */
export async function notifyUser({ institutionId, userId, template, data = {}, createdBy = null, metadata = {} } = {}) {
  if (!userId || !institutionId) return
  const tpl = TEMPLATES[template]
  if (!tpl) throw new Error(`Unknown notification template: ${template}`)
  const payload = tpl(data)

  const admin = createAdminClient()
  const { error } = await admin.from('notifications').insert({
    institution_id: institutionId,
    user_id:        userId,
    type:           payload.type,
    title:          payload.title,
    body:           payload.body,
    link:           payload.link || null,
    is_broadcast:   false,
    is_read:        false,
    metadata:       { ...metadata, template },
    created_by:     createdBy || null,
  })
  if (error) console.error('[NotificationService] insert error:', error.message)
}

/**
 * Send the same notification to multiple users.
 */
export async function notifyUsers({ institutionId, userIds, template, data = {}, createdBy = null, metadata = {} } = {}) {
  if (!userIds?.length || !institutionId) return
  const tpl = TEMPLATES[template]
  if (!tpl) throw new Error(`Unknown notification template: ${template}`)
  const payload = tpl(data)

  const admin = createAdminClient()
  const rows = userIds.filter(Boolean).map(uid => ({
    institution_id: institutionId,
    user_id:        uid,
    type:           payload.type,
    title:          payload.title,
    body:           payload.body,
    link:           payload.link || null,
    is_broadcast:   false,
    is_read:        false,
    metadata:       { ...metadata, template },
    created_by:     createdBy || null,
  }))

  if (!rows.length) return

  // Batch insert in chunks of 100 to avoid payload limits
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await admin.from('notifications').insert(rows.slice(i, i + 100))
    if (error) console.error('[NotificationService] bulk insert error:', error.message)
  }
}

/**
 * Broadcast a notification to all users in an institution.
 * Stored as is_broadcast=true with null user_id — displayed to everyone.
 */
export async function broadcastNotification({ institutionId, title, body, link = null, type = NOTIF_TYPE.GENERAL, createdBy = null } = {}) {
  if (!institutionId || !title) return
  const admin = createAdminClient()
  const { error } = await admin.from('notifications').insert({
    institution_id: institutionId,
    user_id:        null,
    type,
    title,
    body,
    link,
    is_broadcast:   true,
    is_read:        false,
    created_by:     createdBy || null,
  })
  if (error) console.error('[NotificationService] broadcast error:', error.message)
}

/**
 * Notify all students in a class.
 */
export async function notifyClass({ institutionId, classId, template, data = {}, createdBy = null } = {}) {
  const admin = createAdminClient()
  const { data: stuRows } = await admin
    .from('students')
    .select('user_id')
    .eq('class_id', classId)
    .eq('status', 'active')
    .eq('institution_id', institutionId)
    .is('deleted_at', null)

  const userIds = (stuRows || []).map(s => s.user_id).filter(Boolean)
  if (!userIds.length) return
  await notifyUsers({ institutionId, userIds, template, data, createdBy })
}

export { TEMPLATES }
