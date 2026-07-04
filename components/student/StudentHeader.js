'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Menu, Bell, ChevronDown, LogOut, User, Settings, CheckCheck, Info, AlertCircle, Calendar, CreditCard } from 'lucide-react'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { motion, AnimatePresence } from 'framer-motion'

const NOTIF_ICONS = {
  payment:    { icon: CreditCard,  color: '#2563EB', bg: '#EFF6FF' },
  attendance: { icon: AlertCircle, color: '#D97706', bg: '#FFFBEB' },
  exam:       { icon: Calendar,    color: '#7C3AED', bg: '#F5F3FF' },
  general:    { icon: Info,        color: '#0891B2', bg: '#ECFEFF' },
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}



export default function StudentHeader({ user, profile, isMobile, collapsed, onHamburger }) {
  const [userMenuOpen,       setUserMenuOpen      ] = useState(false)
  const [showNotifications,  setShowNotifications ] = useState(false)
  const [notifications,      setNotifications     ] = useState([])
  const [unreadCount,        setUnreadCount       ] = useState(0)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const cu = useCurrentUser()

  const loadNotifications = useCallback(async () => {
    try {
      const res  = await fetch('/api/notifications?limit=20', { cache: 'no-store' })
      const json = await res.json()
      if (!json.error) {
        setNotifications(json.notifications || [])
        setUnreadCount(json.unreadCount     || 0)
      }
    } catch {}
  }, [])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    loadNotifications()
    const supabase = createClient()
    const ch = supabase.channel('stu-notif-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, loadNotifications)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [loadNotifications])

  async function markAllRead() {
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {}
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('oc_role')
      localStorage.removeItem('oc_user_name')
      localStorage.removeItem('oc_user_email')
      localStorage.removeItem('oc_user_class')
      localStorage.removeItem('oc_user_roll')
      // Full page reload so server-side session cookie is cleared
      window.location.href = '/auth/login'
    }
  }

  const displayName = cu.name || profile?.full_name || user?.email?.split('@')[0] || 'Student'
  const displayClass = cu.classSection
    ? `Class ${cu.classSection}${cu.roll ? ' · Roll ' + cu.roll : ''}`
    : 'Student Portal'
  const initials = cu.initials || displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const sidebarLeft = isMobile ? 0 : (mounted ? (collapsed ? 68 : 260) : 260)

  return (
    <header style={{ position: 'fixed', top: 0, left: sidebarLeft, right: 0, height: 64, zIndex: 40, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E9D5FF', display: 'flex', alignItems: 'center', paddingLeft: isMobile ? 14 : 40, paddingRight: isMobile ? 14 : 40, gap: 12, transition: 'left 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
      <button onClick={onHamburger} style={{ width: 36, height: 36, borderRadius: 9, background: '#F5F3FF', border: '1px solid #E9D5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
        <Menu size={17} color="#7C3AED" />
      </button>

      <div style={{ flex: 1 }}>
        {!isMobile && (
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Student Portal</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{displayClass} · {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          </div>
        )}
      </div>

      {/* Notification Bell */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setShowNotifications(o => !o); setUserMenuOpen(false) }}
          style={{ width: 36, height: 36, borderRadius: 9, background: showNotifications ? '#F5F3FF' : '#F8FAFC', border: `1px solid ${showNotifications ? '#E9D5FF' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, position: 'relative' }}>
          <Bell size={16} color={showNotifications ? '#7C3AED' : '#64748B'} />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: 99, background: '#EF4444', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {mounted && showNotifications && createPortal(
          <>
            <div onClick={() => setShowNotifications(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
            <div style={{ position: 'fixed', top: 72, right: isMobile ? 14 : 60, width: isMobile ? 'calc(100vw - 28px)' : 300, borderRadius: 16, background: '#FFFFFF', border: '1px solid #E9D5FF', boxShadow: '0 16px 48px rgba(124,58,237,0.14)', zIndex: 9999, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>Notifications</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: '#F5F3FF', color: '#7C3AED', border: '1px solid #E9D5FF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCheck size={11} /> Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                    <Bell size={24} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No notifications yet</p>
                  </div>
                ) : notifications.map((n, i) => {
                  const cfg = NOTIF_ICONS[n.type] || NOTIF_ICONS.general
                  const NIcon = cfg.icon
                  return (
                    <div key={n.id} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: n.is_read ? 'transparent' : '#FAFBFF', borderBottom: i < notifications.length - 1 ? '1px solid #F8FAFC' : 'none', cursor: 'pointer' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <NIcon size={13} style={{ color: cfg.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: n.is_read ? 500 : 700, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>{n.title}</p>
                        <p style={{ fontSize: 11, color: '#64748B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</p>
                        <p style={{ fontSize: 10, color: '#CBD5E1', marginTop: 2 }}>{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && <div style={{ width: 6, height: 6, borderRadius: 99, background: '#7C3AED', flexShrink: 0, marginTop: 4 }} />}
                    </div>
                  )
                })}
              </div>
            </div>
          </>,
          document.body
        )}
      </div>

      <div style={{ flexShrink: 0 }}>
        <button onClick={() => setUserMenuOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '8px 12px 8px 8px' : '5px 10px 5px 5px', borderRadius: 10, background: '#F5F3FF', border: '1px solid #E9D5FF', cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: cu.avatarUrl ? 'transparent' : 'linear-gradient(135deg,#A78BFA,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#FFFFFF', flexShrink: 0, overflow: 'hidden' }}>
            {cu.avatarUrl
              ? <img src={cu.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          {!isMobile && <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{displayName.split(' ')[0]}</span>}
          <ChevronDown size={13} color="#94A3B8" />
        </button>
      </div>

      {/* Portal: renders directly in document.body, escaping the header's stacking context */}
      {mounted && userMenuOpen && createPortal(
        <>
          {/* Backdrop — closes menu on outside tap */}
          <div onClick={() => setUserMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
          {/* Dropdown menu */}
          <div style={{
            position: 'fixed',
            top: 72,
            bottom: 'auto',
            right: 14,
            width: isMobile ? 'calc(100vw - 28px)' : 220,
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #E9D5FF',
            boxShadow: '0 16px 48px rgba(124,58,237,0.18)',
            zIndex: 9999,
            overflow: 'hidden',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', margin: 0 }}>{displayName}</p>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{cu.email || user?.email}</p>
            </div>
            {[
              { label: 'My Profile', icon: User,    href: '/student/profile' },
              { label: 'Settings',   icon: Settings, href: '/student/profile' },
            ].map(item => (
              <button key={item.label}
                onClick={() => { setUserMenuOpen(false); router.push(item.href) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#374151', fontFamily: 'inherit', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F5F3FF'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <item.icon size={15} color="#94A3B8" />{item.label}
              </button>
            ))}
            <div style={{ padding: '6px', borderTop: '1px solid #F1F5F9' }}>
              <button onClick={handleLogout}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 9, background: '#FEF2F2', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#DC2626', fontFamily: 'inherit', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                <LogOut size={14} color="#DC2626" /> Sign Out
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </header>
  )
}
