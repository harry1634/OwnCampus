'use client'

// ─── Domain Event Bus ───────────────────────────────────────────────────────
// Publish events from any module; any subscriber reacts automatically.
// Usage:
//   eventBus.emit('AttendanceMarked', { date, classId, records })
//   eventBus.on('AttendanceMarked', handler)

const listeners = {}

export const eventBus = {
  on(event, handler) {
    if (!listeners[event]) listeners[event] = []
    listeners[event].push(handler)
    // Return unsubscribe function
    return () => {
      listeners[event] = listeners[event].filter(h => h !== handler)
    }
  },

  emit(event, payload) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[EventBus] ${event}`, payload)
    }
    ;(listeners[event] || []).forEach(h => {
      try { h(payload) } catch (e) { console.error(`[EventBus] handler error for ${event}:`, e) }
    })
    // Wildcard listeners
    ;(listeners['*'] || []).forEach(h => {
      try { h(event, payload) } catch (e) {}
    })
  },

  once(event, handler) {
    const unsub = this.on(event, (payload) => {
      handler(payload)
      unsub()
    })
    return unsub
  },
}

// ─── Domain Events Registry ─────────────────────────────────────────────────
export const EVENTS = {
  // Students
  STUDENT_CREATED:          'StudentCreated',
  STUDENT_UPDATED:          'StudentUpdated',
  STUDENT_DELETED:          'StudentDeleted',
  // Faculty
  FACULTY_CREATED:          'FacultyCreated',
  FACULTY_UPDATED:          'FacultyUpdated',
  // Admissions
  ADMISSION_APPROVED:       'AdmissionApproved',
  ADMISSION_REJECTED:       'AdmissionRejected',
  // Attendance
  ATTENDANCE_MARKED:        'AttendanceMarked',
  ATTENDANCE_UPDATED:       'AttendanceUpdated',
  // Exams / Marks
  MARKS_PUBLISHED:          'MarksPublished',
  EXAM_SCHEDULED:           'ExamScheduled',
  // Fees
  FEE_PAID:                 'FeePaid',
  FEE_STRUCTURE_GENERATED:  'FeeStructureGenerated',
  // Library
  BOOK_ISSUED:              'LibraryBookIssued',
  BOOK_RETURNED:            'LibraryBookReturned',
  // Transport
  TRANSPORT_ASSIGNED:       'TransportAssigned',
  // Hostel
  HOSTEL_ASSIGNED:          'HostelAssigned',
  // Leaves
  LEAVE_REQUESTED:          'LeaveRequested',
  LEAVE_APPROVED:           'LeaveApproved',
  LEAVE_REJECTED:           'LeaveRejected',
  // Announcements
  ANNOUNCEMENT_PUBLISHED:   'AnnouncementPublished',
  // Notifications
  NOTIFICATION_RECEIVED:    'NotificationReceived',
  // Timetable
  TIMETABLE_UPDATED:        'TimetableUpdated',
  // Analytics
  ANALYTICS_REFRESH:        'AnalyticsRefresh',
}
