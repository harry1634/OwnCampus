'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
    { name: 'Dashboard',      href: '/student/dashboard',     icon: LayoutDashboard },
  ]},
  { label: 'Academics', items: [
    { name: 'My Attendance',  href: '/student/attendance',    icon: UserCheck       },
    { name: 'My Marks',       href: '/student/marks',         icon: BookOpen        },
    { name: 'Homework',       href: '/student/homework',      icon: ClipboardList   },
    { name: 'Timetable',      href: '/student/timetable',     icon: Calendar        },
    { name: 'Examinations',   href: '/student/exams',         icon: ClipboardList   },
  ]},
  { label: 'Campus', items: [
    { name: 'Fee Details',    href: '/student/fees',          icon: CreditCard      },
    { name: 'Library',        href: '/student/library',       icon: Library         },
    { name: 'Transport',      href: '/student/transport',     icon: Bus             },
    { name: 'Announcements',  href: '/student/announcements', icon: Megaphone       },
    { name: 'Leave Request',  href: '/student/leaves',        icon: CalendarDays    },
    { name: 'Contact Faculty', href: '/student/contact',      icon: Phone           },
    { name: 'My Profile',     href: '/student/profile',       icon: User            },
  ]},
]

const SB = '#3B0764'   // dark purple — student portal

export default function StudentSidebar({ profile, collapsed, setCollapsed, isMobile, mobileOpen, setMobileOpen }) {
  const pathname    = usePathname()
  const showCollapsed = isMobile ? false : collapsed
  const isActive    = (href) => pathname === href || pathname.startsWith(href + '/')
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
  const displayClass    = cu.classSection ? `Class ${cu.classSection}${cu.roll ? ' · Roll ' + cu.roll : ''}` : 'Student'
  const displayInitial  = cu.initials || (displayName.charAt(0).toUpperCase())

  return (
    <>
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div key="stb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(4px)' }} />
        )}
      </AnimatePresence>

      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 50,
        width: isMobile ? 260 : (collapsed ? 64 : 260),
        background: SB,
        borderRight: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: isMobile ? 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' : 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
        transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
      }}>
        {/* Header */}
        <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 10, padding: showCollapsed ? '0 12px' : '0 12px 0 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          {showCollapsed ? (
            <button onClick={() => setCollapsed(false)} style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}>
              <ChevronRight size={16} color="rgba(255,255,255,0.70)" />
            </button>
          ) : (
            <>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GraduationCap size={15} color="white" strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#FFFFFF', lineHeight: 1.2, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Student Portal</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{institutionName}</p>
              </div>
              {!isMobile && (
                <button onClick={() => setCollapsed(true)} style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
                  <ChevronLeft size={12} color="rgba(255,255,255,0.50)" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Student user pill */}
        {!showCollapsed && (
          <div style={{ padding: '10px 10px 6px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: cu.avatarUrl ? 'transparent' : 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#FFFFFF', flexShrink: 0, overflow: 'hidden' }}>
                {cu.avatarUrl
                  ? <img src={cu.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : displayInitial
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayName}
                </p>
                <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{displayClass}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px' }} className="no-scrollbar">
          {NAV.map(group => (
            <div key={group.label} style={{ marginBottom: 12 }}>
              {!showCollapsed && (
                <p style={{ padding: '0 8px', marginBottom: 2, fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{group.label}</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {group.items.map(item => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <Link key={item.name} href={item.href}
                      onClick={() => isMobile && setMobileOpen(false)}
                      title={showCollapsed ? item.name : undefined}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: showCollapsed ? '10px' : '7px 10px', borderRadius: 8, textDecoration: 'none', justifyContent: showCollapsed ? 'center' : undefined, background: active ? 'rgba(255,255,255,0.15)' : 'transparent', transition: 'background 0.12s' }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                      <Icon size={15} style={{ color: active ? '#FFFFFF' : 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
                      {!showCollapsed && (
                        <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 500, color: active ? '#FFFFFF' : 'rgba(255,255,255,0.70)', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

        {/* Footer */}
        <div style={{ padding: isMobile ? '8px 8px calc(70px + env(safe-area-inset-bottom, 0px))' : '8px 8px 12px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Link href="/student/profile"
            onClick={() => isMobile && setMobileOpen(false)}
            title={showCollapsed ? 'Settings' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: showCollapsed ? '10px' : '7px 10px', borderRadius: 8, textDecoration: 'none', justifyContent: showCollapsed ? 'center' : undefined, transition: 'background 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Settings size={15} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
            {!showCollapsed && <span style={{ fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.70)', letterSpacing: '-0.01em' }}>Settings</span>}
          </Link>
          <button onClick={handleSignOut}
            title={showCollapsed ? 'Sign Out' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: showCollapsed ? '10px' : '7px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', justifyContent: showCollapsed ? 'center' : undefined, transition: 'background 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.20)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            <LogOut size={15} style={{ color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} />
            {!showCollapsed && <span style={{ fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,0.55)', letterSpacing: '-0.01em' }}>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
