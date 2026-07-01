'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, UserCheck, BookOpen, Calendar, CreditCard } from 'lucide-react'

const ITEMS = [
  { label: 'Home',       href: '/student/dashboard',  icon: LayoutDashboard },
  { label: 'Attendance', href: '/student/attendance', icon: UserCheck       },
  { label: 'Marks',      href: '/student/marks',      icon: BookOpen        },
  { label: 'Timetable',  href: '/student/timetable',  icon: Calendar        },
  { label: 'Fees',       href: '/student/fees',       icon: CreditCard      },
]

export default function StudentMobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden flex"
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)', borderTop: '1px solid #E9D5FF', padding: '6px 4px calc(6px + env(safe-area-inset-bottom,0px))' }}>
      {ITEMS.map(item => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        const Icon = item.icon
        return (
          <Link key={item.href} href={item.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 4px', textDecoration: 'none', borderRadius: 10, background: active ? '#F5F3FF' : 'transparent' }}>
            <Icon size={20} style={{ color: active ? '#7C3AED' : '#94A3B8' }} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? '#7C3AED' : '#94A3B8', lineHeight: 1 }}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
