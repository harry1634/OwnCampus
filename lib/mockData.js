// ─── SINGLE SOURCE OF TRUTH ───────────────────────────────────────────────────
// Every portal (Admin / Faculty / Student) imports from here.
// Changing a value here automatically fixes all pages that reference it.

// ─── Schedule Structure ───────────────────────────────────────────────────────

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const PERIODS = [
  { no: 1, label: 'Period 1', start: '9:00',  end: '9:45',  time: '9:00 – 9:45'   },
  { no: 2, label: 'Period 2', start: '9:45',  end: '10:30', time: '9:45 – 10:30'  },
  { no: 3, label: 'Period 3', start: '10:45', end: '11:30', time: '10:45 – 11:30' },
  { no: 4, label: 'Period 4', start: '11:30', end: '12:15', time: '11:30 – 12:15' },
  { no: 5, label: 'Period 5', start: '13:00', end: '13:45', time: '1:00 – 1:45'   },
  { no: 6, label: 'Period 6', start: '13:45', end: '14:30', time: '1:45 – 2:30'   },
]

// ─── Faculty Directory ────────────────────────────────────────────────────────

export const FACULTY_MAP = {
  'Mathematics':   { name: 'Mr. Rajesh Kumar',  short: 'Kumar',  dept: 'Mathematics', room: 'R-101' },
  'Physics':       { name: 'Ms. Priya Sharma',  short: 'Sharma', dept: 'Science',     room: 'R-201' },
  'Chemistry':     { name: 'Mr. Arjun Patel',   short: 'Patel',  dept: 'Science',     room: 'R-202' },
  'English':       { name: 'Ms. Ananya Iyer',   short: 'Iyer',   dept: 'Languages',   room: 'R-301' },
  'Biology':       { name: 'Dr. Meera Singh',   short: 'Singh',  dept: 'Science',     room: 'R-203' },
  'Computer Sci.': { name: 'Mr. Suresh Babu',   short: 'Babu',   dept: 'IT',          room: 'R-401' },
  'Statistics':    { name: 'Mr. Rajesh Kumar',  short: 'Kumar',  dept: 'Mathematics', room: 'R-101' },
}

// ─── Subject Colors (canonical) ───────────────────────────────────────────────

export const SUBJECT_COLORS = {
  'Mathematics':   { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  'Physics':       { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  'Chemistry':     { bg: '#FDF2F8', color: '#DB2777', border: '#FBCFE8' },
  'English':       { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  'Biology':       { bg: '#ECFEFF', color: '#0891B2', border: '#A5F3FC' },
  'Computer Sci.': { bg: '#FEFCE8', color: '#CA8A04', border: '#FDE68A' },
  'Statistics':    { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA' },
}

// ─── Announcement Tag Colors (canonical) ─────────────────────────────────────

export const TAG_COLORS = {
  Exam:     { bg: '#F5F3FF', color: '#7C3AED' },
  Academic: { bg: '#EFF6FF', color: '#2563EB' },
  Meeting:  { bg: '#FFF7ED', color: '#EA580C' },
  Holiday:  { bg: '#ECFDF5', color: '#059669' },
  Library:  { bg: '#EFF6FF', color: '#2563EB' },
  Sports:   { bg: '#ECFEFF', color: '#0891B2' },
}

// ─── Class 10-A Weekly Timetable ──────────────────────────────────────────────
// [dayIndex][periodIndex] → subject name (null = free period)
// dayIndex: 0=Mon … 5=Sat  |  periodIndex: 0=P1 … 5=P6

export const CLASS_10A_TIMETABLE = [
  ['Mathematics', 'Physics',     'Chemistry',    'English',      'Biology',      'Computer Sci.'], // Monday
  ['English',     'Mathematics', 'Physics',      'Biology',      'Mathematics',  'Chemistry'    ], // Tuesday
  ['Chemistry',   'English',     'Mathematics',  'Computer Sci.','Physics',      'Biology'      ], // Wednesday
  ['Biology',     'Chemistry',   'English',      'Mathematics',  'Computer Sci.','Physics'      ], // Thursday
  ['Physics',     'Biology',     'Computer Sci.','Chemistry',    'English',      'Mathematics'  ], // Friday
  ['Computer Sci.','Physics',    'Biology',       null,           null,           null           ], // Saturday
]

// ─── Per-Class Timetables ─────────────────────────────────────────────────────
// Each class has a distinct rotation of the same 6 subjects so every student
// sees their own class's schedule, not 10-A's.

const S6 = ['Mathematics', 'Physics', 'Chemistry', 'English', 'Biology', 'Computer Sci.']
function rot(n) {
  const r = [...S6.slice(n % 6), ...S6.slice(0, n % 6)]
  return r
}
function makeTT(offsets) {
  // offsets: 6 integers — each row (day) starts at that rotation offset
  return offsets.map((off, di) =>
    di === 5
      ? [...rot(off).slice(0, 3), null, null, null]  // Saturday half-day
      : rot(off)
  )
}

export const TIMETABLES_BY_CLASS = {
  '9-A':    makeTT([1, 3, 5, 2, 4, 0]),
  '9-B':    makeTT([2, 4, 0, 3, 5, 1]),
  '10-A':   CLASS_10A_TIMETABLE,
  '10-B':   makeTT([3, 5, 1, 4, 0, 2]),
  '11-A':   makeTT([4, 0, 2, 5, 1, 3]),
  '11-B':   makeTT([5, 1, 3, 0, 2, 4]),
  '11-Sci': makeTT([2, 5, 1, 4, 0, 3]),
  '11-Com': makeTT([0, 3, 5, 2, 4, 1]),
  '12-A':   makeTT([5, 2, 4, 1, 3, 0]),
  '12-B':   makeTT([4, 1, 3, 0, 2, 5]),
  '12-Sci': makeTT([3, 0, 2, 5, 1, 4]),
  '12-Com': makeTT([1, 4, 0, 3, 5, 2]),
}

// Fallback: if student's class isn't in the map, use 10-A
export function getTimetableForClass(classSection) {
  return TIMETABLES_BY_CLASS[classSection] || CLASS_10A_TIMETABLE
}

// ─── Mr. Kumar's Timetable (Faculty View) ────────────────────────────────────
// Derived from CLASS_10A_TIMETABLE: wherever 10-A has Mathematics, this shows '10-A Math'.
// Other slots are other classes Mr. Kumar teaches to fill his week.
// String format matches the faculty timetable page's rendering.

export const MR_KUMAR_TIMETABLE = {
  Monday:    ['10-A Math', '9-B Math',  null,        '10-B Math', null,        '12-A Math'],
  Tuesday:   ['11-A Stat', '10-A Math', '9-A Math',  null,        '10-A Math', '9-B Math' ],
  Wednesday: ['10-B Math', null,        '10-A Math', '12-A Math', '9-A Math',  '11-A Stat'],
  Thursday:  ['9-B Math',  null,        '11-A Stat', '10-A Math', '12-A Math', '9-A Math' ],
  Friday:    ['9-A Math',  '11-A Stat', '10-B Math', '9-B Math',  null,        '10-A Math'],
  Saturday:  [null,        null,        null,        null,        null,        null       ],
}
// Consistency check (auto-verified by design):
// Mon P1→10-A Math ↔ 10-A Mon P1=Mathematics ✓
// Tue P2→10-A Math ↔ 10-A Tue P2=Mathematics ✓
// Tue P5→10-A Math ↔ 10-A Tue P5=Mathematics ✓
// Wed P3→10-A Math ↔ 10-A Wed P3=Mathematics ✓
// Thu P4→10-A Math ↔ 10-A Thu P4=Mathematics ✓
// Fri P6→10-A Math ↔ 10-A Fri P6=Mathematics ✓

// Mr. Kumar's Monday schedule (used in faculty dashboard "Today's Schedule")
export const FACULTY_TODAY_SCHEDULE = [
  { period: 1, time: '9:00 – 9:45',   class: '10-A', subject: 'Mathematics', room: 'R-101', students: 42, done: true    },
  { period: 2, time: '9:45 – 10:30',  class: '9-B',  subject: 'Mathematics', room: 'R-205', students: 38, done: true    },
  { period: 3, time: '10:45 – 11:30', class: null,   subject: 'Free Period', room: '',      students: 0,  isFree: true  },
  { period: 4, time: '11:30 – 12:15', class: '10-B', subject: 'Mathematics', room: 'R-102', students: 40, current: true },
  { period: null, time: '12:15 – 1:00', subject: 'Lunch Break', isBreak: true },
  { period: 5, time: '1:00 – 1:45',   class: null,   subject: 'Free Period', room: '',      students: 0,  isFree: true  },
  { period: 6, time: '1:45 – 2:30',   class: '12-A', subject: 'Mathematics', room: 'R-401', students: 30                },
]

// ─── Student Profile ──────────────────────────────────────────────────────────

export const STUDENT_PROFILE = {
  name:    'Rahul Sharma',
  roll:    'A001',
  class:   '10-A',
  section: 'A',
  year:    '2025-26',
}

// ─── Class 10-A Student Roster ────────────────────────────────────────────────

export const CLASS_10A_STUDENTS = [
  { id: 1, roll: 'A001', name: 'Rahul Sharma',   photo: 'RS', attendance: 81 }, // ← derived from OVERALL_PCT below
  { id: 2, roll: 'A002', name: 'Priya Patel',    photo: 'PP', attendance: 88 },
  { id: 3, roll: 'A003', name: 'Arjun Singh',    photo: 'AS', attendance: 76 },
  { id: 4, roll: 'A004', name: 'Meera Nair',     photo: 'MN', attendance: 91 },
  { id: 5, roll: 'A005', name: 'Kiran Kumar',    photo: 'KK', attendance: 62 },
  { id: 6, roll: 'A006', name: 'Ananya Iyer',    photo: 'AI', attendance: 84 },
  { id: 7, roll: 'A007', name: 'Siddharth Rao',  photo: 'SR', attendance: 79 },
  { id: 8, roll: 'A008', name: 'Divya Menon',    photo: 'DM', attendance: 93 },
]

// ─── Rahul Sharma's Attendance ────────────────────────────────────────────────

export const STUDENT_SUBJECTS = [
  { name: 'Mathematics',   total: 42, present: 38, faculty: 'Mr. Rajesh Kumar'  },
  { name: 'Physics',       total: 40, present: 29, faculty: 'Ms. Priya Sharma'  },
  { name: 'Chemistry',     total: 40, present: 26, faculty: 'Mr. Arjun Patel'   },
  { name: 'English',       total: 38, present: 33, faculty: 'Ms. Ananya Iyer'   },
  { name: 'Biology',       total: 36, present: 30, faculty: 'Dr. Meera Singh'   },
  { name: 'Computer Sci.', total: 30, present: 26, faculty: 'Mr. Suresh Babu'   },
]

export const OVERALL_PRESENT = STUDENT_SUBJECTS.reduce((a, s) => a + s.present, 0) // 182
export const OVERALL_TOTAL   = STUDENT_SUBJECTS.reduce((a, s) => a + s.total,   0) // 226
export const OVERALL_PCT     = Math.round((OVERALL_PRESENT / OVERALL_TOTAL) * 100)  // 81

export const MONTHLY_TREND = [
  { month: 'Aug', pct: 82 },
  { month: 'Sep', pct: 75 },
  { month: 'Oct', pct: 64 },
]

export const RECENT_DAYS = [
  { date: 'Nov 3, Mon', s: ['P','P','A','P','P','P'] },
  { date: 'Nov 4, Tue', s: ['P','P','P','A','P','P'] },
  { date: 'Nov 5, Wed', s: ['P','A','A','P','P','P'] },
  { date: 'Nov 6, Thu', s: ['P','P','P','P','P','P'] },
]

// ─── Rahul Sharma's Marks (canonical) ────────────────────────────────────────
// These values appear in: Student Marks page, Faculty Marks entry (pre-filled),
// Student Dashboard warning, and any admin report that queries 10-A grades.

export const STUDENT_MARKS = {
  'Unit Test 1': [
    { subject: 'Mathematics',   marks: 85, max: 100, remarks: 'Good performance, work on speed'        },
    { subject: 'Physics',       marks: 72, max: 100, remarks: 'Needs improvement in optics'            },
    { subject: 'Chemistry',     marks: 42, max: 100, remarks: 'Needs improvement in Organic Chemistry' },
    { subject: 'English',       marks: 88, max: 100, remarks: 'Excellent writing skills'               },
    { subject: 'Biology',       marks: 76, max: 100, remarks: 'Satisfactory, focus on diagrams'        },
    { subject: 'Computer Sci.', marks: 93, max: 100, remarks: 'Outstanding'                            },
  ],
  'Unit Test 2': [
    { subject: 'Mathematics',   marks: 78, max: 100, remarks: 'Good effort'                           },
    { subject: 'Physics',       marks: 80, max: 100, remarks: 'Good understanding of Mechanics'       },
    { subject: 'Chemistry',     marks: 55, max: 100, remarks: 'Better effort, keep it up'             },
    { subject: 'English',       marks: 91, max: 100, remarks: 'Excellent'                             },
    { subject: 'Biology',       marks: 70, max: 100, remarks: 'Good'                                  },
    { subject: 'Computer Sci.', marks: 88, max: 100, remarks: 'Excellent'                             },
  ],
  'Mid Term': [
    { subject: 'Mathematics',   marks: 82, max: 100, remarks: 'Good'                                  },
    { subject: 'Physics',       marks: 69, max: 100, remarks: 'Good understanding of Mechanics'       },
    { subject: 'Chemistry',     marks: 60, max: 100, remarks: 'Showing steady improvement'            },
    { subject: 'English',       marks: 86, max: 100, remarks: 'Very good'                             },
    { subject: 'Biology',       marks: 74, max: 100, remarks: 'Good'                                  },
    { subject: 'Computer Sci.', marks: 90, max: 100, remarks: 'Excellent'                             },
  ],
}

// Pre-computed lookup: subject → exam → { marks, remarks }  (used by student marks page)
export const MARKS_BY_SUBJECT = Object.fromEntries(
  ['Mathematics', 'Physics', 'Chemistry', 'English', 'Biology', 'Computer Sci.'].map(sub => [
    sub,
    Object.fromEntries(
      Object.entries(STUDENT_MARKS).map(([exam, rows]) => {
        const r = rows.find(row => row.subject === sub)
        return [exam, { marks: r?.marks ?? 0, remarks: r?.remarks ?? '' }]
      })
    ),
  ])
)

// Pre-filled initial marks for faculty marks entry (class 10-A, for Rahul Sharma A001)
// Keyed by exam → student_id → marks value
export const FACULTY_INITIAL_MARKS = Object.fromEntries(
  Object.entries(STUDENT_MARKS).map(([exam, rows]) => [
    exam,
    { 1: rows.find(r => r.subject === 'Mathematics')?.marks ?? 0 }, // student id=1 is Rahul
  ])
)

// ─── Unified Announcements ────────────────────────────────────────────────────
// audience: 'faculty' | 'student' | 'all'
// Filter on each portal: faculty portal shows audience===faculty || all
//                        student portal shows audience===student || all

export const ANNOUNCEMENTS = [
  {
    id: 1, title: 'Unit Test 2 Schedule Released',
    body: 'Unit Test 2 will be conducted from November 10–14. Bring your admit card and stationery on each exam day.',
    from: 'Principal Office', time: '2h ago', priority: 'high', tag: 'Exam', audience: 'all',
  },
  {
    id: 2, title: 'Staff Meeting – Friday 3 PM',
    body: 'Mandatory monthly review meeting in the conference hall. Agenda: Annual Day preparations and Q3 review. All teaching staff must attend.',
    from: 'Admin Office', time: '5h ago', priority: 'medium', tag: 'Meeting', audience: 'faculty',
  },
  {
    id: 3, title: 'New Marking Scheme Updated',
    body: 'The internal assessment marking scheme has been updated this term. Please review and confirm on the portal before entering Unit Test 2 marks.',
    from: 'Academic Coordinator', time: '1d ago', priority: 'medium', tag: 'Academic', audience: 'faculty',
  },
  {
    id: 4, title: 'Holiday on November 1',
    body: 'The institution will remain closed on November 1 for Kannada Rajyotsava. Classes resume November 2. Make-up classes scheduled separately.',
    from: 'Admin Office', time: '2d ago', priority: 'low', tag: 'Holiday', audience: 'all',
  },
  {
    id: 5, title: 'Parent-Teacher Meeting – Nov 8',
    body: 'PTM is scheduled on Saturday, November 8, from 10 AM to 1 PM. All subject teachers must be present. Students must inform their parents.',
    from: 'Principal Office', time: '3d ago', priority: 'high', tag: 'Meeting', audience: 'all',
  },
  {
    id: 6, title: 'Library Book Return Reminder',
    body: 'All library books issued before October 15 must be returned by November 8. A late fee of ₹2 per day will be charged beyond the due date.',
    from: 'Librarian', time: '2d ago', priority: 'medium', tag: 'Library', audience: 'student',
  },
  {
    id: 7, title: 'Sports Day Registration Open',
    body: 'Students interested in participating in Sports Day (November 20) must register by November 10. Contact the Sports Department for the event list.',
    from: 'Sports Department', time: '4d ago', priority: 'low', tag: 'Sports', audience: 'student',
  },
  {
    id: 8, title: 'New Attendance Policy',
    body: 'Effective immediately: minimum 75% attendance is mandatory for all students to appear in semester examinations. This applies to each subject individually.',
    from: 'Academic Coordinator', time: '1w ago', priority: 'high', tag: 'Academic', audience: 'all',
  },
]

export const FACULTY_ANNOUNCEMENTS = ANNOUNCEMENTS.filter(a => a.audience === 'faculty' || a.audience === 'all')
export const STUDENT_ANNOUNCEMENTS = ANNOUNCEMENTS.filter(a => a.audience === 'student' || a.audience === 'all')
