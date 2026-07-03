'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, UserCheck, BookOpen, Calendar, ClipboardList,
  CreditCard, Library, Bus, Megaphone, User, CalendarDays, Phone,
  ChevronLeft, ChevronRight, GraduationCap, Settings, LogOut,
} from 'lucide-react'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { label: 'Main', items: [
    { name: 'Dashboard',     href: '/student/dashboard',     icon: LayoutDashboard },
  ]},
  { label: 'Academics', items: [
    { name: 'My Attendance', href: '/student/attendance',    icon: UserCheck       },
    { name: 'My Marks',      href: '/student/marks',         icon: BookOpen        },
    { name: 'Homework',      href: '/student/homework',      icon: ClipboardList   },
    { name: 'Timetable',     href: '/student/timetable',     icon: Calendar        },
    { name: 'Examinations',  href: '/student/exams',         icon: ClipboardList   },
  ]},
  { label: 'Campus', items: [
    { name: 'Fee Details',    href: '/student/fees',          icon: CreditCard   },
    { name: 'Library',        href: '/student/library',       icon: Library      },
    { name: 'Transport',      href: '/student/transport',     icon: Bus          },
    { name: 'Announcements',  href: '/student/announcements', icon: Megaphone    },
    { name: 'Leave Request',  href: '/student/leaves',        icon: CalendarDays },
    { name: 'Contact Faculty', href: '/student/contact',      icon: Phone        },
    { name: 'My Profile',     href: '/student/profile',       icon: User         },
  ]},
]

const BG = '#4C1D95'

export default function StudentSidebar({ profile, collapsed, setCollapsed, isMobile, mobileOpen, setMobileOpen }) {
  const pathname = usePathname()
  const router   = useRouter()
  const showCollapsed = isMobile ? false : collapsed
  const isActive = (href) => pathname === href || pathname.startsWith(href + '/')
  const cu = useCurrentUser()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('oc_role')
      window.location.href = '/auth/login'
    }
  }

  const institutionName = profile?.institutions?.name || 'OwnCampus'
  const displayName     = cu.name  || profile?.full_name || 'Student'
  const displayClass    = cu.classSection ? `Class ${cu.classSection}${cu.roll ? ' · Roll ' + cu.roll : ''}` : 'Class 10-A · Roll A001'
  const displayInitial  = cu.initials || (displayName.charAt(0).toUpperCase())

  return (
    <>
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div key="stb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(2,6,23,0.60)', backdropFilter: 'blur(3px)' }} />
        )}
      </AnimatePresence>

      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 50,
        width: isMobile ? 260 : (collapsed ? 68 : 260),
        background: BG, boxShadow: '2px 0 20px rgba(76,29,149,0.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: isMobile ? 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' : 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
        transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
      }}>
        {/* Header */}
        <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: showCollapsed ? '0 12px' : '0 14px 0 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          {showCollapsed ? (
            <button onClick={() => setCollapsed(false)} style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronRight size={17} color="rgba(255,255,255,0.80)" />
            </button>
          ) : (
            <>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GraduationCap size={17} color="white" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#FFFFFF', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Student Portal</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{institutionName}</p>
              </div>
              {!isMobile && (
                <button onClick={() => setCollapsed(true)} style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <ChevronLeft size={13} color="rgba(255,255,255,0.55)" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Student pill */}
        {!showCollapsed && (
          <div style={{ padding: '10px 14px 6px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: cu.avatarUrl ? 'transparent' : 'linear-gradient(135deg,#A78BFA,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#FFFFFF', flexShrink: 0, overflow: 'hidden' }}>
                {cu.avatarUrl
                  ? <img src={cu.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : displayInitial
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.90)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayName}
                </p>
                <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{displayClass}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 12px' }} className="no-scrollbar">
          {NAV.map(group => (
            <div key={group.label} style={{ marginBottom: 14 }}>
              {!showCollapsed && (
                <p style={{ padding: '0 10px', marginBottom: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>{group.label}</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {group.items.map(item => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <Link key={item.name} href={item.href}
                      onClick={() => isMobile && setMobileOpen(false)}
                      title={showCollapsed ? item.name : undefined}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: showCollapsed ? '10px' : '9px 10px', borderRadius: 9, textDecoration: 'none', justifyContent: showCollapsed ? 'center' : undefined, background: active ? '#FFFFFF' : 'transparent', transition: 'background 0.12s' }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.10)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                      <Icon size={16} style={{ color: active ? BG : 'rgba(255,255,255,0.72)', flexShrink: 0 }} />
                      {!showCollapsed && (
                        <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 400, color: active ? BG : 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer: Settings + Sign Out */}
        <div style={{ padding: '8px 10px 12px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Link href="/student/settings"
            onClick={() => isMobile && setMobileOpen(false)}
            title={showCollapsed ? 'Settings' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: showCollapsed ? '10px' : '9px 10px', borderRadius: 9, textDecoration: 'none', justifyContent: showCollapsed ? 'center' : undefined, transition: 'background 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Settings size={16} style={{ color: 'rgba(255,255,255,0.72)', flexShrink: 0 }} />
            {!showCollapsed && <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.72)', letterSpacing: '-0.01em' }}>Settings</span>}
          </Link>
          <button onClick={handleSignOut}
            title={showCollapsed ? 'Sign Out' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: showCollapsed ? '10px' : '9px 10px', borderRadius: 9, border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', justifyContent: showCollapsed ? 'center' : undefined, transition: 'background 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <LogOut size={16} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
            {!showCollapsed && <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.65)', letterSpacing: '-0.01em' }}>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
