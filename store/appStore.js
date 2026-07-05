import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { OVERALL_PCT } from '@/lib/mockData'

const AVATAR_COLORS = ['#2563EB','#7C3AED','#0891B2','#16A34A','#D97706','#DB2777','#0F766E','#7C2D12']
const nextId   = (arr) => arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1
const getInits = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
const pickClr  = (arr) => AVATAR_COLORS[arr.length % AVATAR_COLORS.length]
const parseRs  = (str) => parseInt(String(str).replace(/[₹,]/g, ''), 10) || 0
const fmtRs    = (n)   => '₹' + n.toLocaleString('en-IN')

const SEED_STUDENTS = [
  { id: 1, name: 'Rahul Sharma',   roll: 'A001', class: '10-A', parent: 'Suresh Sharma',  phone: '+91 98765 43210', email: 'rahul@email.com',   attendance: OVERALL_PCT, fees: 'paid',    status: 'active' },
  { id: 2, name: 'Priya Patel',    roll: 'A002', class: '10-A', parent: 'Ramesh Patel',   phone: '+91 98765 43211', email: 'priya@email.com',   attendance: 88, fees: 'partial', status: 'active' },
  { id: 3, name: 'Arjun Singh',    roll: 'A003', class: '9-B',  parent: 'Vikram Singh',   phone: '+91 98765 43212', email: 'arjun@email.com',   attendance: 72, fees: 'pending', status: 'active' },
  { id: 4, name: 'Sneha Gupta',    roll: 'A004', class: '11-A', parent: 'Mohan Gupta',    phone: '+91 98765 43213', email: 'sneha@email.com',   attendance: 97, fees: 'paid',    status: 'active' },
  { id: 5, name: 'Rohit Kumar',    roll: 'A005', class: '12-B', parent: 'Anil Kumar',     phone: '+91 98765 43214', email: 'rohit@email.com',   attendance: 85, fees: 'paid',    status: 'active' },
  { id: 6, name: 'Ananya Mishra',  roll: 'A006', class: '10-B', parent: 'Sanjay Mishra',  phone: '+91 98765 43215', email: 'ananya@email.com',  attendance: 91, fees: 'paid',    status: 'active' },
  { id: 7, name: 'Karan Mehta',    roll: 'A007', class: '9-A',  parent: 'Rajan Mehta',    phone: '+91 98765 43216', email: 'karan@email.com',   attendance: 68, fees: 'overdue', status: 'active' },
  { id: 8, name: 'Pooja Verma',    roll: 'A008', class: '11-B', parent: 'Sunil Verma',    phone: '+91 98765 43217', email: 'pooja@email.com',   attendance: 95, fees: 'paid',    status: 'active' },
]

const SEED_FACULTY = [
  { id: 1, name: 'Dr. Anita Sharma',  code: 'FAC001', dept: 'Mathematics',       designation: 'HOD',            type: 'full_time', subjects: ['Mathematics','Statistics'],    exp: 12, email: 'anita@campus.edu',  phone: '+91 98765 11111', attendance: 96, rating: 4.8 },
  { id: 2, name: 'Prof. Rajan Mehta', code: 'FAC002', dept: 'Science',            designation: 'Senior Faculty', type: 'full_time', subjects: ['Physics','Chemistry'],         exp: 8,  email: 'rajan@campus.edu',  phone: '+91 98765 22222', attendance: 92, rating: 4.5 },
  { id: 3, name: 'Ms. Sneha Joshi',   code: 'FAC003', dept: 'English',            designation: 'Faculty',        type: 'full_time', subjects: ['English','Literature'],        exp: 5,  email: 'sneha@campus.edu',  phone: '+91 98765 33333', attendance: 94, rating: 4.7 },
  { id: 4, name: 'Mr. Vikram Rao',    code: 'FAC004', dept: 'Social Science',     designation: 'Faculty',        type: 'part_time', subjects: ['History','Geography'],         exp: 3,  email: 'vikram@campus.edu', phone: '+91 98765 44444', attendance: 88, rating: 4.2 },
  { id: 5, name: 'Dr. Priya Kumar',   code: 'FAC005', dept: 'Commerce',           designation: 'HOD',            type: 'full_time', subjects: ['Accounts','Business Studies'], exp: 15, email: 'priya@campus.edu',  phone: '+91 98765 55555', attendance: 98, rating: 4.9 },
  { id: 6, name: 'Mr. Arun Nair',     code: 'FAC006', dept: 'Physical Education', designation: 'Faculty',        type: 'full_time', subjects: ['PE','Sports'],                 exp: 7,  email: 'arun@campus.edu',   phone: '+91 98765 66666', attendance: 95, rating: 4.6 },
]

const SEED_LEADS = [
  { id: 1, name: 'Ananya Singh', initials: 'AS', avatarColor: '#2563EB', phone: '+91 98765 11111', program: 'B.Tech CSE', source: 'website',   status: 'interested',     counsellor: 'Priya M.', score: 85, date: '15 Oct', city: 'Delhi'     },
  { id: 2, name: 'Rohan Verma',  initials: 'RV', avatarColor: '#7C3AED', phone: '+91 98765 22222', program: 'MBA',        source: 'facebook',  status: 'follow_up',      counsellor: 'Arjun K.', score: 72, date: '14 Oct', city: 'Mumbai'    },
  { id: 3, name: 'Shreya Jain',  initials: 'SJ', avatarColor: '#0891B2', phone: '+91 98765 33333', program: 'B.Com',      source: 'whatsapp',  status: 'new',            counsellor: null,       score: 60, date: '16 Oct', city: 'Pune'      },
  { id: 4, name: 'Akash Nair',   initials: 'AN', avatarColor: '#10B981', phone: '+91 98765 44444', program: 'B.Tech ECE', source: 'google',    status: 'converted',      counsellor: 'Priya M.', score: 95, date: '12 Oct', city: 'Bangalore' },
  { id: 5, name: 'Meera Pillai', initials: 'MP', avatarColor: '#F59E0B', phone: '+91 98765 55555', program: 'BBA',        source: 'referral',  status: 'not_interested', counsellor: 'Arjun K.', score: 30, date: '13 Oct', city: 'Chennai'   },
  { id: 6, name: 'Vikas Rao',    initials: 'VR', avatarColor: '#DB2777', phone: '+91 98765 66666', program: 'MCA',        source: 'instagram', status: 'follow_up',      counsellor: 'Sneha P.', score: 78, date: '11 Oct', city: 'Hyderabad' },
]

const SEED_BOOKS = [
  { id: 1, isbn: '978-0-06-112008-4', title: 'To Kill a Mockingbird', author: 'Harper Lee',         publisher: 'Lippincott',       category: 'Fiction',     total: 5,  available: 3, rack: 'A-12' },
  { id: 2, isbn: '978-0-7432-7356-5', title: 'Organic Chemistry',    author: 'Morrison & Boyd',    publisher: 'Pearson',          category: 'Science',     total: 8,  available: 2, rack: 'B-04' },
  { id: 3, isbn: '978-8-17-692023-8', title: 'NCERT Mathematics 12', author: 'NCERT',               publisher: 'NCERT',            category: 'Mathematics', total: 15, available: 8, rack: 'C-01' },
  { id: 4, isbn: '978-0-19-569602-9', title: 'Indian History',        author: 'Bipin Chandra',      publisher: 'Orient Blackswan', category: 'History',     total: 6,  available: 0, rack: 'D-08' },
  { id: 5, isbn: '978-0-07-338060-1', title: 'Computer Science',      author: 'Sumita Arora',       publisher: 'Dhanpat Rai',      category: 'Computer',    total: 10, available: 5, rack: 'E-03' },
  { id: 6, isbn: '978-0-13-468599-1', title: 'Physics Concepts',      author: 'Halliday & Resnick', publisher: 'Wiley',            category: 'Science',     total: 7,  available: 4, rack: 'B-09' },
]

const SEED_EMPLOYEES = [
  { id: 1, initials: 'MF', color: '#7C3AED', name: 'Meera Fernandes', dept: 'Mathematics',      gross: '₹98,000', deductions: '₹9,200', net: '₹88,800', status: 'Processed' },
  { id: 2, initials: 'AI', color: '#0891B2', name: 'Arjun Iyer',      dept: 'Physics',          gross: '₹86,500', deductions: '₹8,100', net: '₹78,400', status: 'Processed' },
  { id: 3, initials: 'PD', color: '#2563EB', name: 'Priya Das',        dept: 'English',          gross: '₹74,000', deductions: '₹6,900', net: '₹67,100', status: 'Pending'   },
  { id: 4, initials: 'SK', color: '#16A34A', name: 'Sahil Kapur',      dept: 'Computer Science', gross: '₹91,200', deductions: '₹8,600', net: '₹82,600', status: 'Processed' },
  { id: 5, initials: 'RM', color: '#D97706', name: 'Ritu Mehta',       dept: 'Mathematics',      gross: '₹78,500', deductions: '₹7,400', net: '₹71,100', status: 'Processed' },
  { id: 6, initials: 'KP', color: '#DB2777', name: 'Kiran Pillai',     dept: 'Science',          gross: '₹82,000', deductions: '₹7,800', net: '₹74,200', status: 'Pending'   },
]

const SEED_COMPANIES = [
  { id: 1, name: 'Infosys',  industry: 'Technology', role: 'Software Engineer',  ctc: '4.5 LPA', date: '2025-11-10', slots: 20, applied: 45, shortlisted: 12, status: 'upcoming'  },
  { id: 2, name: 'HDFC Bank',industry: 'Banking',    role: 'Management Trainee', ctc: '6.0 LPA', date: '2025-11-15', slots: 10, applied: 38, shortlisted: 8,  status: 'upcoming'  },
  { id: 3, name: 'Wipro',    industry: 'Technology', role: 'Project Engineer',   ctc: '3.8 LPA', date: '2025-10-20', slots: 15, applied: 52, shortlisted: 18, status: 'completed' },
  { id: 4, name: 'Deloitte', industry: 'Consulting', role: 'Business Analyst',   ctc: '8.5 LPA', date: '2025-11-20', slots: 5,  applied: 28, shortlisted: 6,  status: 'upcoming'  },
]

const SEED_ITEMS = [
  { id: 1, name: 'Whiteboard Marker (Pack of 10)', category: 'Stationery',    quantity: 45, unit: 'Packs', minStock: 20, value: 18000,  status: 'ok'       },
  { id: 2, name: 'A4 Paper Ream',                  category: 'Stationery',    quantity: 8,  unit: 'Reams', minStock: 20, value: 4000,   status: 'low'      },
  { id: 3, name: 'Projector — Epson',              category: 'Electronics',   quantity: 12, unit: 'Units', minStock: 2,  value: 360000, status: 'ok'       },
  { id: 4, name: 'Laptop — Dell Inspiron',         category: 'Electronics',   quantity: 2,  unit: 'Units', minStock: 5,  value: 80000,  status: 'critical' },
  { id: 5, name: 'Chemistry Lab Glassware Set',    category: 'Lab Equipment', quantity: 15, unit: 'Sets',  minStock: 10, value: 75000,  status: 'ok'       },
  { id: 6, name: 'Science Textbook Grade 9',       category: 'Books',         quantity: 0,  unit: 'Books', minStock: 40, value: 0,      status: 'out'      },
]

const SEED_BRANCHES = [
  { id: 1, name: 'Main Campus',      code: 'MAIN-01',  type: 'main',      address: '14, Education Avenue, Connaught Place', city: 'New Delhi',   state: 'Delhi',         pin: '110001', phone: '+91 11 2345 6789',  email: 'main@owncampus.edu',       principal: 'Dr. Anand Kumar',   capacity: 3500, established: '2005-06-01', status: 'active',   students: 3184, staff: 52 },
  { id: 2, name: 'Branch Campus',    code: 'BRANCH-01', type: 'branch',    address: '56, Knowledge Park, Sector 62',         city: 'Noida',       state: 'Uttar Pradesh', pin: '201301', phone: '+91 120 456 7890',  email: 'branch@owncampus.edu',     principal: 'Mrs. Sunita Rao',   capacity: 1500, established: '2012-07-15', status: 'active',   students: 1420, staff: 26 },
  { id: 3, name: 'Satellite Campus', code: 'SAT-01',   type: 'satellite', address: '89, Learning Hub, DLF Phase 2',         city: 'Gurugram',    state: 'Haryana',       pin: '122002', phone: '+91 124 234 5678',  email: 'satellite@owncampus.edu',  principal: 'Mr. Rajesh Sharma', capacity: 900,  established: '2018-04-01', status: 'active',   students: 860,  staff: 16 },
]

const SEED_ROUTES = [
  { id: 1, name: 'Route A — Rajouri Garden',   vehicle: 'DL-1C-1234', capacity: 45, enrolled: 3, driver: 'Ram Kumar',    departure: '07:15', arrival: '08:00', stops: ['Rajouri Garden','Tilak Nagar','Subhash Nagar'],     status: 'active',      assignedStudents: [{ name: 'Priya Patel', class: '11-A', stop: 'Rajouri Garden' }, { name: 'Rohit Gupta', class: '10-B', stop: 'Tilak Nagar' }, { name: 'Sneha Rao', class: '12-A', stop: 'Subhash Nagar' }] },
  { id: 2, name: 'Route B — Dwarka Sector 10', vehicle: 'DL-1P-5678', capacity: 52, enrolled: 2, driver: 'Suresh Singh', departure: '07:00', arrival: '08:15', stops: ['Dwarka Sec 10','Uttam Nagar','Vikaspuri'],           status: 'active',      assignedStudents: [{ name: 'Arjun Mehta', class: '11-B', stop: 'Dwarka Sec 10' }, { name: 'Kavya Nair', class: '9-A', stop: 'Uttam Nagar' }] },
  { id: 3, name: 'Route C — Rohini Sector 8',  vehicle: 'DL-8C-9012', capacity: 40, enrolled: 2, driver: 'Mahesh Yadav', departure: '07:30', arrival: '08:20', stops: ['Rohini Sec 8','Pitampura','Shalimar Bagh'],          status: 'active',      assignedStudents: [{ name: 'Ananya Singh', class: '12-B', stop: 'Rohini Sec 8' }, { name: 'Yash Sharma', class: '10-A', stop: 'Pitampura' }] },
  { id: 4, name: 'Route D — Noida Sector 18',  vehicle: 'UP-81-3456', capacity: 50, enrolled: 1, driver: 'Ajay Verma',   departure: '06:45', arrival: '08:10', stops: ['Noida Sec 18','Noida Sec 62','Delhi Border'],        status: 'maintenance', assignedStudents: [{ name: 'Rahul Sharma', class: '10-A', stop: 'Noida Sec 18' }] },
]

const SEED_HOSTEL_BUILDINGS = [
  { id: 1, name: 'Shivalaya Boys Hostel',  type: 'Boys',  floors: 3, totalRooms: 60, totalBeds: 180, warden: 'Mr. Rajesh Kumar',   monthlyFee: 8000  },
  { id: 2, name: 'Saraswati Girls Hostel', type: 'Girls', floors: 2, totalRooms: 40, totalBeds: 120, warden: 'Mrs. Kavitha Nair',  monthlyFee: 8500  },
]

const SEED_HOSTEL_ALLOCATIONS = [
  { id: 1, student: 'Priya Patel',  class: '10-A', building: 'Saraswati Girls Hostel', room: 'G-204', bed: 'Bed 2', date: '01 Oct 2025', paidAmount: 0, feeStatus: 'pending' },
  { id: 2, student: 'Rahul Sharma', class: '10-A', building: 'Shivalaya Boys Hostel',  room: 'B-312', bed: 'Bed 1', date: '05 Oct 2025', paidAmount: 0, feeStatus: 'pending' },
  { id: 3, student: 'Ananya Singh', class: '12-B', building: 'Saraswati Girls Hostel', room: 'G-108', bed: 'Bed 3', date: '08 Oct 2025', paidAmount: 0, feeStatus: 'pending' },
]

const SEED_INSTITUTION = {
  name:          'OwnCampus School of Excellence',
  shortName:     'OwnCampus',
  type:          'School',
  board:         'CBSE',
  accreditation: 'NAAC A+',
  established:   '2005-06-01',
  principal:     'Dr. Anand Kumar',
  chairman:      'Mr. Vikram Nair',
  tagline:       'Empowering Minds, Building Futures',
  about:         'OwnCampus School of Excellence is a premier institution dedicated to holistic education, combining academic rigour with character development. Serving students across multiple campuses in India.',
  address:       '14, Education Avenue, Connaught Place',
  city:          'New Delhi',
  state:         'Delhi',
  pin:           '110001',
  phone:         '+91 11 2345 6789',
  email:         'admin@owncampus.edu',
  website:       'www.owncampus.edu',
  logo:          '',
}

const SEED_ALUMNI = [
  { id: 1, name: 'Vikram Nair',  batch: '2018', program: 'B.Tech CSE',  company: 'Google',        role: 'Software Engineer', location: 'Bangalore', isMentor: true,  avatarColor: '#2563EB' },
  { id: 2, name: 'Ananya Patel', batch: '2019', program: 'MBA',          company: 'McKinsey',      role: 'Business Analyst',  location: 'Mumbai',    isMentor: false, avatarColor: '#7C3AED' },
  { id: 3, name: 'Rohit Sharma', batch: '2017', program: 'B.Com',        company: 'HDFC Bank',     role: 'Branch Manager',    location: 'Delhi',     isMentor: true,  avatarColor: '#0891B2' },
  { id: 4, name: 'Priya Mehta',  batch: '2020', program: 'B.Tech ECE',   company: 'Qualcomm',      role: 'VLSI Engineer',     location: 'Hyderabad', isMentor: false, avatarColor: '#10B981' },
  { id: 5, name: 'Arjun Kumar',  batch: '2016', program: 'B.Sc Physics', company: 'ISRO',          role: 'Scientist',         location: 'Ahmedabad', isMentor: true,  avatarColor: '#F59E0B' },
  { id: 6, name: 'Sneha Joshi',  batch: '2021', program: 'B.Ed',         company: 'Self-Employed', role: 'Educator',          location: 'Pune',      isMentor: false, avatarColor: '#DB2777' },
]

export const useAppStore = create(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      theme:            'dark',
      institution:      null,
      user:             null,
      notifications:    [],
      unreadCount:      0,

      // ── Portal Access Requests ──
      accessRequests: [],
      addAccessRequest: (req) => set(state => {
        const existing = Array.isArray(state.accessRequests) ? state.accessRequests : []
        return {
          accessRequests: [
            ...existing.filter(r => r.email !== req.email),
            { ...req, id: Date.now(), status: 'pending', date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
          ],
        }
      }),
      approveAccessRequest: (id) => set(state => {
        const req = state.accessRequests.find(r => r.id === id)
        if (!req) return {}

        const updatedRequests = state.accessRequests.map(r =>
          r.id === id ? { ...r, status: 'approved' } : r
        )

        if (req.role === 'student') {
          // Parse class and roll from the dept field (e.g. "Class 12-B · Roll 103")
          const classMatch = req.dept.match(/Class\s+([\w-]+)/)
          const rollMatch  = req.dept.match(/Roll\s+(\w+)/)
          const classVal   = classMatch ? classMatch[1] : ''
          const newId      = nextId(state.students)
          const rollVal    = rollMatch ? rollMatch[1] : `A${String(newId).padStart(3, '0')}`
          const newStudent = {
            id:         newId,
            name:       req.name,
            roll:       rollVal,
            class:      classVal,
            parent:     '',
            phone:      req.phone || '',
            email:      req.email,
            attendance: 100,
            fees:       'pending',
            status:     'active',
          }
          return { accessRequests: updatedRequests, students: [...state.students, newStudent] }
        }

        if (req.role === 'faculty') {
          // Parse dept and designation (e.g. "Mathematics · HOD")
          const parts       = req.dept.split(' · ')
          const newId       = nextId(state.faculty)
          const newFaculty  = {
            id:          newId,
            name:        req.name,
            code:        `FAC${String(newId).padStart(3, '0')}`,
            dept:        parts[0] || req.dept,
            designation: parts[1] || 'Faculty',
            type:        'full_time',
            subjects:    [],
            exp:         0,
            email:       req.email,
            phone:       req.phone || '',
            attendance:  100,
            rating:      0,
          }
          return { accessRequests: updatedRequests, faculty: [...state.faculty, newFaculty] }
        }

        return { accessRequests: updatedRequests }
      }),
      rejectAccessRequest: (id) => set(state => ({
        accessRequests: state.accessRequests.filter(r => r.id !== id),
      })),

      // ── Students ──
      students: [],
      removeStudentsByIds: (ids) => set(state => ({ students: state.students.filter(s => !ids.includes(s.id)) })),
      // attendanceByDate: { "YYYY-MM-DD": { studentId: "present"|"absent"|"late" } }
      studentAttByDate: {},
      setStudentAttByDate: (updater) => set(state => ({
        studentAttByDate: typeof updater === 'function' ? updater(state.studentAttByDate) : updater
      })),
      setStudentAttendance: (updates) => {
        // updates: [{ id, attendance }]
        set(state => ({
          students: state.students.map(s => {
            const u = updates.find(u => u.id === s.id)
            return u ? { ...s, attendance: u.attendance } : s
          })
        }))
      },
      updateStudent: (id, updates) => set(state => ({
        students: state.students.map(s => s.id === id ? { ...s, ...updates } : s)
      })),
      addStudent: (f) => {
        const cur = get().students
        const id  = nextId(cur)
        const cls = f.class ? `${f.class.replace('Grade ','')}${f.section?`-${f.section}`:''}` : ''
        set({ students: [{ id, name: `${f.firstName} ${f.lastName}`.trim(), roll: f.rollNo||`A${String(id).padStart(3,'0')}`, class: cls, parent: f.parentName||'', phone: f.phone||'', email: f.email||'', attendance: 100, fees: 'pending', status: 'active', branch: f.branch||'', branchId: f.branchId||null }, ...cur] })
      },

      // ── Faculty ──
      faculty: [],
      // facultyAttByDate: { "YYYY-MM-DD": { facultyId: "present"|"absent"|"late" } }
      facultyAttByDate: {},
      setFacultyAttByDate: (updater) => set(state => ({
        facultyAttByDate: typeof updater === 'function' ? updater(state.facultyAttByDate) : updater
      })),
      setFacultyAttendance: (updates) => {
        // updates: [{ id, attendance }]
        set(state => ({
          faculty: state.faculty.map(f => {
            const u = updates.find(u => u.id === f.id)
            return u ? { ...f, attendance: u.attendance } : f
          })
        }))
      },
      addFaculty: (f) => {
        const cur = get().faculty
        const id  = nextId(cur)
        set({ faculty: [{ id, name: `${f.prefix?f.prefix+' ':''}${f.firstName} ${f.lastName}`.trim(), code: f.code||`FAC${String(id).padStart(3,'0')}`, dept: f.dept||'', designation: f.designation||'Faculty', type: f.type||'full_time', subjects: f.subjects?f.subjects.split(',').map(s=>s.trim()).filter(Boolean):[], exp: parseInt(f.exp)||0, email: f.email||'', phone: f.phone||'', attendance: 100, rating: 0, branch: f.branch||'', branchId: f.branchId||null }, ...cur] })
      },

      // ── Admissions Leads ──
      leads: SEED_LEADS,
      addLead: (f) => {
        const cur = get().leads
        const id  = nextId(cur)
        const today = new Date()
        set({ leads: [{ id, name: f.name, initials: getInits(f.name), avatarColor: pickClr(cur), phone: f.phone||'', program: f.program||'', source: f.source||'website', status: f.status||'new', counsellor: f.counsellor||null, score: parseInt(f.score)||0, date: `${today.getDate()} ${today.toLocaleString('en',{month:'short'})}`, city: f.city||'' }, ...cur] })
      },
      updateLead: (id, updates) => {
        set({ leads: get().leads.map(l => l.id === id ? { ...l, ...updates, initials: updates.name ? getInits(updates.name) : l.initials } : l) })
      },

      // ── Library Books ──
      books: SEED_BOOKS,
      addBook: (f) => {
        const cur = get().books
        const id  = nextId(cur)
        const tot = parseInt(f.total)||1
        set({ books: [{ id, isbn: f.isbn||'', title: f.title, author: f.author||'', publisher: f.publisher||'', category: f.category||'Other', total: tot, available: tot, rack: f.rack||'' }, ...cur] })
      },
      removeBook: (id) => set(state => ({ books: state.books.filter(b => b.id !== id) })),

      // ── Issued Books ──
      issuedBooks: [],
      issueBook: (bookId, bookTitle, studentName, dueDate) => {
        const cur = get().issuedBooks
        const id  = nextId(cur)
        const today = new Date().toISOString().slice(0, 10)
        set({
          books:       get().books.map(b => b.id === bookId ? { ...b, available: Math.max(0, b.available - 1) } : b),
          issuedBooks: [{ id, bookId, book: bookTitle, student: studentName, issued: today, due: dueDate, returned: false, fine: 0 }, ...cur],
        })
      },
      returnBook: (issuedId) => {
        const issued = get().issuedBooks.find(i => i.id === issuedId)
        if (!issued) return
        const today = new Date().toISOString().slice(0, 10)
        set({
          books:       get().books.map(b => b.id === issued.bookId ? { ...b, available: Math.min(b.total, b.available + 1) } : b),
          issuedBooks: get().issuedBooks.map(i => i.id === issuedId ? { ...i, returned: true, returnedDate: today } : i),
        })
      },

      // ── HRMS Employees ──
      employees: [],
      addEmployee: (f) => {
        const cur = get().employees
        const id  = nextId(cur)
        const g   = parseRs(f.gross||'0')
        const ded = Math.round(g * 0.094)
        set({ employees: [{ id, initials: getInits(f.name), color: pickClr(cur), name: f.name, dept: f.dept||'', gross: fmtRs(g), deductions: fmtRs(ded), net: fmtRs(g-ded), status: 'Pending' }, ...cur] })
      },

      // ── Placement Companies ──
      companies: SEED_COMPANIES,
      addCompany: (f) => {
        const cur = get().companies
        const id  = nextId(cur)
        set({ companies: [{ id, name: f.name, industry: f.industry||'Other', role: f.role||'', ctc: f.ctc||'', date: f.date||'', slots: parseInt(f.slots)||0, applied: 0, shortlisted: 0, status: 'upcoming' }, ...cur] })
      },

      // ── Inventory Items ──
      items: SEED_ITEMS,
      addItem: (f) => {
        const cur = get().items
        const id  = nextId(cur)
        const qty = parseInt(f.quantity)||0
        const min = parseInt(f.minStock)||0
        const st  = qty===0?'out':qty<min?(qty<min/2?'critical':'low'):'ok'
        set({ items: [{ id, name: f.name, category: f.category||'Other', quantity: qty, unit: f.unit||'Units', minStock: min, value: parseInt(f.value)||0, status: st }, ...cur] })
      },

      // ── Branches ──
      branches: SEED_BRANCHES,
      addBranch: (f) => {
        const cur = get().branches
        const id  = nextId(cur)
        set({ branches: [...cur, { id, name: f.name, code: f.code, type: f.type || 'branch', address: f.address || '', city: f.city || '', state: f.state || '', pin: f.pin || '', phone: f.phone || '', email: f.email || '', principal: f.principal || '', capacity: parseInt(f.capacity) || 0, established: f.established || '', status: 'active', students: 0, staff: 0 }] })
      },
      updateBranch: (id, updates) => set((state) => ({ branches: state.branches.map(b => b.id === id ? { ...b, ...updates } : b) })),

      // ── Transport Routes ──
      routes: SEED_ROUTES,
      addRoute: (f) => {
        const cur = get().routes
        const id  = nextId(cur)
        set({ routes: [{ id, name: f.name, vehicle: f.vehicle||'', capacity: parseInt(f.capacity)||0, enrolled: 0, driver: f.driver||'', departure: f.departure||'', arrival: f.arrival||'', stops: f.stops?f.stops.split(',').map(s=>s.trim()).filter(Boolean):[], status: 'active', assignedStudents: [] }, ...cur] })
      },
      updateRoute: (id, updates) => set(state => ({ routes: state.routes.map(r => r.id === id ? { ...r, ...updates } : r) })),
      assignStudentToRoute: (routeId, student) => set(state => ({
        routes: state.routes.map(r => {
          if (r.id !== routeId) return r
          const already = r.assignedStudents.some(s => s.name === student.name)
          if (already) return r
          const next = [...(r.assignedStudents || []), student]
          return { ...r, assignedStudents: next, enrolled: next.length }
        })
      })),
      removeStudentFromRoute: (routeId, studentName) => set(state => ({
        routes: state.routes.map(r => {
          if (r.id !== routeId) return r
          const next = (r.assignedStudents || []).filter(s => s.name !== studentName)
          return { ...r, assignedStudents: next, enrolled: next.length }
        })
      })),

      // ── Institution Profile ──
      institutionProfile: SEED_INSTITUTION,
      updateInstitutionProfile: (updates) => set(state => ({ institutionProfile: { ...state.institutionProfile, ...updates } })),

      // ── Hostel ──
      hostelBuildings: SEED_HOSTEL_BUILDINGS,
      hostelAllocations: SEED_HOSTEL_ALLOCATIONS,
      hostelRequests: [],
      updateHostelBuilding: (id, updates) => set(state => ({ hostelBuildings: state.hostelBuildings.map(b => b.id === id ? { ...b, ...updates } : b) })),
      addHostelAllocation: (alloc) => set(state => { const id = nextId(state.hostelAllocations); return { hostelAllocations: [{ ...alloc, id }, ...state.hostelAllocations] } }),
      updateHostelAllocation: (id, updates) => set(state => ({ hostelAllocations: state.hostelAllocations.map(a => a.id === id ? { ...a, ...updates } : a) })),
      removeHostelAllocation: (id) => set(state => ({ hostelAllocations: state.hostelAllocations.filter(a => a.id !== id) })),
      addHostelRequest: (req) => set(state => {
        const id = nextId(state.hostelRequests || [])
        return { hostelRequests: [{ ...req, id, status: 'pending', createdAt: new Date().toISOString() }, ...(state.hostelRequests || [])] }
      }),
      updateHostelRequest: (id, updates) => set(state => ({ hostelRequests: (state.hostelRequests || []).map(r => r.id === id ? { ...r, ...updates } : r) })),

      // ── Student Leaves ──
      studentLeaves: [],
      addStudentLeave: (leave) => set(state => {
        const id = nextId(state.studentLeaves || [])
        return { studentLeaves: [{ ...leave, id, status: 'pending', submittedAt: new Date().toISOString() }, ...(state.studentLeaves || [])] }
      }),
      updateStudentLeave: (id, updates) => set(state => ({ studentLeaves: (state.studentLeaves || []).map(l => l.id === id ? { ...l, ...updates } : l) })),

      // ── Alumni ──
      alumni: SEED_ALUMNI,
      addAlumni: (f) => {
        const cur = get().alumni
        const id  = nextId(cur)
        set({ alumni: [{ id, name: f.name, batch: f.batch||'', program: f.program||'', company: f.company||'', role: f.role||'', location: f.location||'', isMentor: f.isMentor===true||f.isMentor==='true', avatarColor: pickClr(cur) }, ...cur] })
      },

      // ── Campus ──
      activeCampus: null,
      setActiveCampus: (campus) => set({ activeCampus: campus }),

      // ── Role ──
      userRole: 'admin',
      setUserRole: (role) => set({ userRole: role }),

      // ── Mobile sidebar drawer ──
      mobileSidebarOpen: false,
      openMobileSidebar:  () => set({ mobileSidebarOpen: true  }),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),

      // ── Generic ──
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setInstitution: (institution) => set({ institution }),
      setUser: (user) => set({ user }),
      setNotifications: (notifications) => set({ notifications, unreadCount: notifications.filter(n=>!n.read).length }),
      markNotificationRead: (id) => set((state) => ({ notifications: state.notifications.map(n=>n.id===id?{...n,read:true}:n), unreadCount: Math.max(0,state.unreadCount-1) })),
      clearAll: () => set({ institution: null, user: null, notifications: [], unreadCount: 0 }),
    }),
    {
      name: 'owncampus-store',
      version: 12,
      migrate: (old, fromVersion) => {
        if (fromVersion < 3) { old.students = []; old.faculty = [] }
        if (fromVersion < 4) { old.employees = [] }
        if (fromVersion < 5) { old.studentAttByDate = {}; old.facultyAttByDate = {} }
        if (fromVersion < 6) { old.issuedBooks = [] }
        if (fromVersion < 7) { old.routes = (old.routes || []).map(r => ({ ...r, assignedStudents: r.assignedStudents || [] })) }
        if (fromVersion < 8) { old.institutionProfile = SEED_INSTITUTION }
        if (fromVersion < 9) {
          old.hostelBuildings    = SEED_HOSTEL_BUILDINGS
          old.hostelAllocations  = SEED_HOSTEL_ALLOCATIONS
          old.hostelRequests     = []
          old.studentLeaves      = []
          old.issuedBooks        = (old.issuedBooks || []).map(b => ({ ...b, returned: b.returned || false }))
        }
        if (fromVersion < 11) {
          old.faculty = (old.faculty || []).filter(f => f.supabaseId)
        }
        if (fromVersion < 12) {
          // Flush cached students — the API now fetches them fresh with correct profile data.
          old.students = []
        }
        return old
      },
      partialize: (state) => ({
        sidebarCollapsed:  state.sidebarCollapsed,
        activeCampus:      state.activeCampus,
        theme:             state.theme,
        accessRequests:    state.accessRequests,
        students:          state.students,
        faculty:           state.faculty,
        leads:             state.leads,
        books:             state.books,
        issuedBooks:       state.issuedBooks,
        employees:         state.employees,
        companies:         state.companies,
        items:             state.items,
        branches:          state.branches,
        routes:              state.routes,
        alumni:              state.alumni,
        institutionProfile:  state.institutionProfile,
        hostelBuildings:     state.hostelBuildings,
        hostelAllocations:   state.hostelAllocations,
        hostelRequests:      state.hostelRequests,
        studentLeaves:       state.studentLeaves,
        studentAttByDate:    state.studentAttByDate,
        facultyAttByDate:  state.facultyAttByDate,
      }),
    }
  )
)
