'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Menu, Bell, User, LogOut, Settings, ChevronDown, CheckCheck, Info, AlertCircle, Calendar, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getInitials } from '@/lib/utils'
import { useCurrentUser } from '@/lib/useCurrentUser'

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

export default function FacultyHeader({ user, profile, collapsed, isMobile, onHamburger }) {
  const router = useRouter()
  const [showMenu,            setShowMenu           ] = useState(false)
  const [showNotifications,   setShowNotifications  ] = useState(false)
  const [notifications,       setNotifications      ] = useState([])
  const [unreadCount,         setUnreadCount        ] = useState(0)
  const [mounted,             setMounted            ] = useState(false)
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

  useEffect(() => {
    setMounted(true)
    loadNotifications()
    const supabase = createClient()
    const ch = supabase.channel('fac-notif-bell')
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

  const name      = cu.name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'Faculty'
  const avatarUrl = cu.avatarUrl || profile?.avatar_url || null
  const today     = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') localStorage.removeItem('oc_role')
    router.push('/auth/login')
    toast.success('Signed out')
  }

  return (
    <header style={{
      position: 'fixed', top: 0,
      left: isMobile ? 0 : (collapsed ? 68 : 260),
      right: 0, height: 64, zIndex: 40,
      background: '#FFFFFF',
      borderBottom: '1px solid #D1FAE5',
      boxShadow: '0 1px 0 #D1FAE5, 0 2px 8px rgba(6,95,70,0.05)',
      display: 'flex', alignItems: 'center',
      paddingLeft: isMobile ? 14 : 32,
      paddingRight: isMobile ? 14 : 28,
      gap: 12,
      transition: 'left 0.28s cubic-bezier(0.4,0,0.2,1)',
    }}>
      <button onClick={onHamburger} style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
        <Menu size={16} color="#059669" />
      </button>

      {!isMobile && (
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#065F46' }}>Good {getGreeting()}, {name.split(' ')[0]}!</p>
          <p style={{ fontSize: 11, color: '#6EE7B7', marginTop: 1 }}>{today}</p>
        </div>
      )}
      {isMobile && <div style={{ flex: 1 }} />}

      {/* Notification Bell */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setShowNotifications(o => !o); setShowMenu(false) }}
          style={{ width: 36, height: 36, borderRadius: 10, background: showNotifications ? '#F0FDF4' : '#F8FAFC', border: `1px solid ${showNotifications ? '#A7F3D0' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
          <Bell size={15} color={showNotifications ? '#059669' : '#64748B'} />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: 99, background: '#EF4444', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {mounted && showNotifications && createPortal(
          <>
            <div onClick={() => setShowNotifications(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
            <div style={{ position: 'fixed', top: 72, right: isMobile ? 14 : 70, width: isMobile ? 'calc(100vw - 28px)' : 300, borderRadius: 16, background: '#FFFFFF', border: '1px solid #D1FAE5', boxShadow: '0 16px 48px rgba(6,95,70,0.14)', zIndex: 9999, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>Notifications</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: '#F0FDF4', color: '#059669', border: '1px solid #A7F3D0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
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
                    <div key={n.id} style={{ display: 'flex', gap: 10, padding: '10px 14px', background: n.is_read ? 'transparent' : '#F0FDF4', borderBottom: i < notifications.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <NIcon size={13} style={{ color: cfg.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: n.is_read ? 500 : 700, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>{n.title}</p>
                        <p style={{ fontSize: 11, color: '#64748B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</p>
                        <p style={{ fontSize: 10, color: '#CBD5E1', marginTop: 2 }}>{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && <div style={{ width: 6, height: 6, borderRadius: 99, background: '#059669', flexShrink: 0, marginTop: 4 }} />}
                    </div>
                  )
                })}
              </div>
            </div>
          </>,
          document.body
        )}
      </div>

      {/* User menu */}
      <div style={{ position: 'relative' }}>
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => setShowMenu(m => !m)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 12, background: '#F0FDF4', border: '1px solid #A7F3D0', cursor: 'pointer' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: avatarUrl ? 'transparent' : 'linear-gradient(135deg,#059669,#065F46)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#FFFFFF', overflow: 'hidden', flexShrink: 0 }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : getInitials(name)
            }
          </div>
          {!isMobile && <span style={{ fontSize: 13, fontWeight: 600, color: '#065F46' }}>{name.split(' ')[0]}</span>}
          <ChevronDown size={12} color="#059669" style={{ transform: showMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </motion.button>

        {showMenu && (
          <div style={{ position: 'fixed', right: isMobile ? 14 : 28, top: 72, width: 220, borderRadius: 14, background: '#FFFFFF', border: '1px solid #D1FAE5', boxShadow: '0 12px 40px rgba(6,95,70,0.14)', zIndex: 9999, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #F0FDF4' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>{name}</p>
              <p style={{ fontSize: 11, color: '#6EE7B7', marginTop: 2 }}>{user?.email}</p>
            </div>
            {[
              { label: 'My Profile', icon: User,     href: '/faculty/profile'  },
              { label: 'Settings',   icon: Settings, href: '/faculty/settings' },
            ].map(item => (
              <Link key={item.label} href={item.href} onClick={() => setShowMenu(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', textDecoration: 'none', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0FDF4'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <item.icon size={14} color="#059669" />
                <span style={{ fontSize: 13, color: '#065F46', fontWeight: 500 }}>{item.label}</span>
              </Link>
            ))}
            <div style={{ borderTop: '1px solid #F0FDF4' }}>
              <button onClick={handleLogout}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <LogOut size={14} color="#DC2626" />
                <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}
