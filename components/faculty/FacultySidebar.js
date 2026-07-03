'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Calendar, UserCheck, BookOpen, ClipboardList,
  Bell, User, ChevronLeft, ChevronRight, GraduationCap,
  Package, Megaphone, Settings,
} from 'lucide-react'
import { useCurrentUser } from '@/lib/useCurrentUser'

const NAV = [
  { label: 'Main', items: [
    { name: 'Dashboard',        href: '/faculty/dashboard',    icon: LayoutDashboard },
  ]},
  { label: 'Teaching', items: [
    { name: 'My Timetable',     href: '/faculty/timetable',    icon: Calendar        },
    { name: 'Mark Attendance',  href: '/faculty/attendance',   icon: UserCheck       },
    { name: 'Student Marks',    href: '/faculty/marks',        icon: BookOpen        },
    { name: 'Invigilation',     href: '/faculty/invigilation', icon: ClipboardList   },
  ]},
  { label: 'Campus', items: [
    { name: 'Leave Apply',      href: '/faculty/leaves',       icon: ClipboardList   },
    { name: 'Procurement',      href: '/faculty/procurement',  icon: Package         },
    { name: 'Announcements',    href: '/faculty/announcements',icon: Megaphone       },
    { name: 'My Profile',       href: '/faculty/profile',      icon: User            },
    { name: 'Settings',         href: '/faculty/settings',     icon: Settings        },
  ]},
]

const BG    = '#065F46'
const HOVER = '#047857'

export default function FacultySidebar({ profile, collapsed, setCollapsed, isMobile, mobileOpen, setMobileOpen }) {
  const pathname = usePathname()
  const showCollapsed = isMobile ? false : collapsed
  const isActive = (href) => pathname === href || pathname.startsWith(href + '/')

  const cu = useCurrentUser()
  const institutionName = profile?.institutions?.name || 'OwnCampus'
  const displayName  = cu.name || profile?.name || profile?.full_name || 'Faculty Member'
  const displayDept  = cu.dept ? `${cu.dept}${cu.designation ? ' · ' + cu.designation : ''}` : (profile?.role?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || 'Faculty')
  const displayInitial = cu.initials || displayName.charAt(0).toUpperCase()

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div key="fab-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(2,6,23,0.60)', backdropFilter: 'blur(3px)' }}
          />
        )}
      </AnimatePresence>

      <aside style={{
        position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 50,
        width: isMobile ? 260 : (collapsed ? 68 : 260),
        background: BG, boxShadow: '2px 0 20px rgba(6,95,70,0.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: isMobile ? 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' : 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
        transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
      }}>
        {/* Header */}
        <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: showCollapsed ? '0 12px' : '0 14px 0 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          {showCollapsed ? (
            <button onClick={() => setCollapsed(false)} style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.80)', cursor: 'pointer' }}>
              <ChevronRight size={17} />
            </button>
          ) : (
            <>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.20)' }}>
                <GraduationCap size={17} color="white" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#FFFFFF', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Faculty Portal</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{institutionName}</p>
              </div>
              {!isMobile && (
                <button onClick={() => setCollapsed(true)} style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', flexShrink: 0 }}>
                  <ChevronLeft size={13} />
                </button>
              )}
            </>
          )}
        </div>

        {/* Faculty pill */}
        {!showCollapsed && (
          <div style={{ padding: '10px 14px 6px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: cu.avatarUrl ? 'transparent' : 'linear-gradient(135deg,#34D399,#10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#FFFFFF', flexShrink: 0, overflow: 'hidden' }}>
                {cu.avatarUrl
                  ? <img src={cu.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : displayInitial
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.90)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayName}
                </p>
                <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{displayDept}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 12px' }} className="no-scrollbar">
          {NAV.map(group => (
            <div key={group.label} style={{ marginBottom: 14 }}>
              {!showCollapsed && (
                <p style={{ padding: '0 10px', marginBottom: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>
                  {group.label}
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {group.items.map(item => {
                  const active = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <Link key={item.name} href={item.href}
                      onClick={() => isMobile && setMobileOpen(false)}
                      title={showCollapsed ? item.name : undefined}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: showCollapsed ? '10px' : '9px 10px',
                        borderRadius: 9, textDecoration: 'none',
                        justifyContent: showCollapsed ? 'center' : undefined,
                        background: active ? '#FFFFFF' : 'transparent',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.10)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                    >
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

        {/* Footer */}
        <div style={{ padding: '10px 10px 12px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: cu.avatarUrl ? 'transparent' : 'linear-gradient(135deg,#34D399,#10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: 'white', flexShrink: 0, overflow: 'hidden' }}>
              {cu.avatarUrl
                ? <img src={cu.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : displayInitial
              }
            </div>
            {!showCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.88)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayName}
                </p>
                <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>{displayDept} · Active</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
