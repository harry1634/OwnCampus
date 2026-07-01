'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutDashboard, Calendar, UserCheck, BookOpen, MoreHorizontal } from 'lucide-react'

const ITEMS = [
  { name: 'Home',       href: '/faculty/dashboard',   icon: LayoutDashboard },
  { name: 'Timetable',  href: '/faculty/timetable',   icon: Calendar        },
  { name: 'Attendance', href: '/faculty/attendance',  icon: UserCheck       },
  { name: 'Marks',      href: '/faculty/marks',       icon: BookOpen        },
  { name: 'More',       href: '/faculty/leaves',      icon: MoreHorizontal  },
]

export default function FacultyMobileNav() {
  const pathname = usePathname()
  const isActive = (href) => pathname === href || pathname.startsWith(href + '/')

  return (
    <nav style={{
      display: 'none',
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
      background: 'white', borderTop: '1px solid #D1FAE5',
      boxShadow: '0 -4px 16px rgba(6,95,70,0.08)',
      padding: '8px 0',
    }} className="mobile-faculty-nav">
      <style>{`@media(max-width:768px){.mobile-faculty-nav{display:flex!important;justify-content:space-around;}}`}</style>
      {ITEMS.map(item => {
        const active = isActive(item.href)
        const Icon = item.icon
        return (
          <Link key={item.name} href={item.href}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 12px', borderRadius: 12, textDecoration: 'none', position: 'relative' }}>
            {active && <motion.div layoutId="facNavBg" style={{ position: 'absolute', inset: 0, borderRadius: 12, background: '#ECFDF5' }} />}
            <Icon size={19} style={{ color: active ? '#059669' : '#94A3B8', position: 'relative', zIndex: 1 }} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? '#059669' : '#94A3B8', position: 'relative', zIndex: 1 }}>{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
