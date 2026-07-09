// ─── Audit Service ───────────────────────────────────────────────────────────
// Call from API routes only (server-side).
// Every mutating action that matters should write one audit log row.

import { createAdminClient } from '@/lib/supabase/admin'
import logger from '@/lib/logger'

export async function writeAuditLog({ actorId, institutionId, action, resourceType, resourceId, oldValue, newValue, metadata } = {}) {
  try {
    const admin = createAdminClient()
    await admin.from('audit_logs').insert({
      actor_id:       actorId       || null,
      institution_id: institutionId || null,
      action:         action        || 'unknown',
      resource_type:  resourceType  || null,
      resource_id:    resourceId    ? String(resourceId) : null,
      old_value:      oldValue      ? JSON.stringify(oldValue)  : null,
      new_value:      newValue      ? JSON.stringify(newValue)  : null,
      metadata:       metadata      || {},
      created_at:     new Date().toISOString(),
    })
  } catch (err) {
    // Audit logging must never crash the main request
    logger.error({ err, action, resourceType, resourceId }, 'Failed to write audit log')
  }
}

export const AUDIT_ACTIONS = {
  // Students
  STUDENT_CREATE:       'student.create',
  STUDENT_UPDATE:       'student.update',
  STUDENT_DELETE:       'student.delete',
  // Faculty
  FACULTY_CREATE:       'faculty.create',
  FACULTY_UPDATE:       'faculty.update',
  FACULTY_DELETE:       'faculty.delete',
  // Attendance
  ATTENDANCE_MARK:      'attendance.mark',
  ATTENDANCE_UPDATE:    'attendance.update',
  // Fee
  FEE_PAYMENT:          'fee.payment',
  FEE_STRUCTURE_SET:    'fee.structure.set',
  // Admissions
  ADMISSION_APPROVE:    'admission.approve',
  ADMISSION_REJECT:     'admission.reject',
  // Library
  BOOK_ISSUE:           'library.issue',
  BOOK_RETURN:          'library.return',
  BOOK_ADD:             'library.add',
  // Transport
  TRANSPORT_ASSIGN:     'transport.assign',
  // Hostel
  HOSTEL_ASSIGN:        'hostel.assign',
  // Leaves
  LEAVE_REQUEST:        'leave.request',
  LEAVE_APPROVE:        'leave.approve',
  LEAVE_REJECT:         'leave.reject',
  // Announcements
  ANNOUNCEMENT_CREATE:  'announcement.create',
  ANNOUNCEMENT_DELETE:  'announcement.delete',
  // Auth
  USER_LOGIN:           'auth.login',
  USER_LOGOUT:          'auth.logout',
  PASSWORD_RESET:       'auth.password_reset',
  // Timetable
  TIMETABLE_UPDATE:     'timetable.update',
  // Exams
  EXAM_CREATE:          'exam.create',
  MARKS_PUBLISH:        'marks.publish',
  // Settings
  SETTINGS_UPDATE:      'settings.update',
}
