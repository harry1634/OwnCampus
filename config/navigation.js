import {
  LayoutDashboard, Users, GraduationCap, UserCheck, ClipboardList,
  BookOpen, CreditCard, Library, Home, Bus, Briefcase, Monitor,
  Calendar, MessageSquare, Award, Users2, BarChart3, Settings,
  Building2, ShoppingCart, Package, ChevronRight
} from 'lucide-react'

export const navigation = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: 'all' },
    ],
  },
  {
    label: 'Academics',
    items: [
      { name: 'Students',     href: '/students',     icon: Users,          roles: 'all',  moduleKey: 'students'     },
      { name: 'Faculty',      href: '/faculty',       icon: UserCheck,      roles: ['super_admin', 'principal', 'vice_principal', 'hr', 'director', 'owner'], moduleKey: 'faculty' },
      { name: 'Admissions',   href: '/admissions',    icon: ClipboardList,  roles: ['super_admin', 'admission_officer', 'counsellor', 'principal', 'director', 'owner'], moduleKey: 'admissions' },
      { name: 'Attendance',   href: '/attendance',    icon: UserCheck,      roles: 'all',  moduleKey: 'attendance'   },
      { name: 'Timetable',    href: '/timetable',     icon: Calendar,       roles: 'all',  moduleKey: 'timetable'    },
      { name: 'Examinations', href: '/examinations',  icon: BookOpen,       roles: 'all',  moduleKey: 'examinations' },
      { name: 'LMS',          href: '/lms',           icon: Monitor,        roles: 'all',  moduleKey: 'lms', badge: 'New' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { name: 'Fee & Finance', href: '/finance', icon: CreditCard, roles: ['super_admin', 'accountant', 'principal', 'director', 'owner'], moduleKey: 'finance' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'HRMS',        href: '/hrms',        icon: Briefcase, roles: ['super_admin', 'hr', 'principal', 'director', 'owner'], moduleKey: 'hrms'      },
      { name: 'Library',     href: '/library',     icon: Library,   roles: 'all',  moduleKey: 'library'   },
      { name: 'Hostel',      href: '/hostel',      icon: Home,      roles: ['super_admin', 'hostel_manager', 'principal', 'director'], moduleKey: 'hostel' },
      { name: 'Transport',   href: '/transport',   icon: Bus,       roles: ['super_admin', 'transport_manager', 'principal', 'director'], moduleKey: 'transport' },
      { name: 'Inventory',   href: '/inventory',   icon: Package,   roles: ['super_admin', 'principal', 'director', 'owner'] },
      { name: 'Procurement', href: '/procurement', icon: ShoppingCart, roles: ['super_admin', 'principal', 'director', 'owner'] },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { name: 'Announcements', href: '/communication', icon: MessageSquare, roles: 'all', moduleKey: 'communication' },
      { name: 'Alumni',        href: '/alumni',         icon: Users2,        roles: 'all', moduleKey: 'alumni'        },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['super_admin', 'principal', 'director', 'owner', 'academic_coordinator'], moduleKey: 'analytics' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { name: 'Institution', href: '/institution', icon: Building2, roles: ['super_admin', 'principal', 'director', 'owner'] },
      { name: 'Branches',    href: '/branches',    icon: Building2, roles: ['super_admin', 'principal', 'director', 'owner', 'admin', 'administrator'], moduleKey: 'branches' },
      { name: 'Settings',    href: '/settings',    icon: Settings,  roles: 'all' },
    ],
  },
]

export const mobileNavItems = [
  { name: 'Home',       href: '/dashboard', icon: LayoutDashboard },
  { name: 'Students',   href: '/students',  icon: Users           },
  { name: 'Attendance', href: '/attendance',icon: UserCheck       },
  { name: 'Finance',    href: '/finance',   icon: CreditCard      },
]
