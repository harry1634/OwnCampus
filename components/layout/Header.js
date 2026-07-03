'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, ChevronDown, LogOut, Settings, User, Command, Menu, Search, CheckCheck, AlertCircle, CreditCard, Calendar, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store/appStore'
import { toast } from 'sonner'
import { getInitials } from '@/lib/utils'
import { navigation } from '@/config/navigation'
import CommandPalette from './CommandPalette'

const allNavItems = navigation.flatMap(g => g.items)

const NOTIF_ICONS = {
  payment:      { icon: CreditCard,   color: '#2563EB', bg: '#EFF6FF' },
  attendance:   { icon: AlertCircle,  color: '#D97706', bg: '#FFFBEB' },
  exam:         { icon: Calendar,     color: '#7C3AED', bg: '#F5F3FF' },
  leave:        { icon: Calendar,     color: '#16A34A', bg: '#F0FDF4' },
  general:      { icon: Info,         color: '#0891B2', bg: '#ECFEFF' },
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

const ROLE_LABELS = {
  owner:              'Owner',
  super_admin:        'Super Admin',
  admin:              'Administrator',
  principal:          'Principal',
  vice_principal:     'Vice Principal',
  academic_coordinator: 'Coordinator',
  hod:                'HOD',
  teacher:            'Teacher',
  faculty:            'Faculty',
  trainer:            'Trainer',
  librarian:          'Librarian',
  counsellor:         'Counsellor',
  hr:                 'HR',
  admission_officer:  'Admission Officer',
  receptionist:       'Receptionist',
  transport_manager:  'Transport Manager',
  hostel_manager:     'Hostel Manager',
  staff:              'Staff',
  student:            'Student',
  guest:              'Guest',
}

export default function Header({ user, profile, institution }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { toggleSidebar, sidebarCollapsed: _sidebarCollapsed, openMobileSidebar } = useAppStore()
  const [showUserMenu,       setShowUserMenu]       = useState(false)
  const [showNotifications,  setShowNotifications]  = useState(false)
  const [paletteOpen,        setPaletteOpen]        = useState(false)
  const [mounted,            setMounted]            = useState(false)
  const [isMobile,           setIsMobile]           = useState(false)
  const [notifications,      setNotifications]      = useState([])
  const [unreadCount,        setUnreadCount]        = useState(0)
  const channelRef = useRef(null)

  // Fetch notifications from API
  const loadNotifications = useCallback(async () => {
    try {
      const res  = await fetch('/api/notifications?limit=20')
      const json = await res.json()
      if (!json.error) {
        setNotifications(json.notifications || [])
        setUnreadCount(json.unreadCount     || 0)
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadNotifications()

    // Supabase Realtime: subscribe to new notifications for this user
    const supabase = createClient()
    const channel  = supabase
      .channel('notifications-bell')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
      }, () => {
        loadNotifications()
      })
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [loadNotifications])

  async function markAllRead() {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {}
  }

  async function markOneRead(id) {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {}
  }

  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const sidebarCollapsed = mounted ? _sidebarCollapsed : false

  const currentPage = allNavItems.find(item =>
    pathname === item.href ||
    (item.href !== '/dashboard' && pathname.startsWith(item.href))
  )

  const pageName = currentPage?.name || 'Dashboard'
  const PageIcon = currentPage?.icon || null

  const userName = user?.user_metadata?.first_name
    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
    : user?.email?.split('@')[0] || 'User'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
    toast.success('Logged out successfully')
  }

  const openPalette = useCallback(() => {
    setShowUserMenu(false)
    setShowNotifications(false)
    setPaletteOpen(true)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openPalette()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openPalette])

  return (
    <>
      <header
        className="fixed top-0 right-0 z-40"
        style={{
          left: isMobile ? 0 : (sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'),
          height: 'var(--header-height)',
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          boxShadow: '0 1px 0 #E2E8F0, 0 2px 8px rgba(15,23,42,0.04)',
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: isMobile ? 14 : 40,
          paddingRight: isMobile ? 14 : 24,
          gap: 10,
        }}
      >
        {/* Mobile toggle */}
        <button
          onClick={() => isMobile ? openMobileSidebar() : toggleSidebar()}
          className="lg:hidden"
          style={{ width: 36, height: 36, borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', cursor: 'pointer', flexShrink: 0 }}
        >
          <Menu size={16} />
        </button>

        {/* Page identity */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {PageIcon && (
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PageIcon size={15} style={{ color: '#2563EB' }} />
            </div>
          )}
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            {pageName}
          </span>
        </div>

        {/* Divider */}
        <div className="hidden md:block" style={{ width: 1, height: 24, background: '#E2E8F0', flexShrink: 0, margin: '0 4px' }} />

        {/* Search — full bar on desktop, icon-only on mobile */}
        {isMobile ? (
          <div style={{ flex: 1 }} />
        ) : (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={openPalette}
              style={{
                width: '100%', maxWidth: 420,
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', borderRadius: 10,
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                cursor: 'text', transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
            >
              <Search size={14} style={{ color: '#CBD5E1', flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: 'left', fontSize: 13, color: '#94A3B8' }}>
                Search students, staff, invoices…
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 7px', borderRadius: 6, background: '#FFFFFF', border: '1px solid #E2E8F0', flexShrink: 0 }}>
                <Command size={10} style={{ color: '#94A3B8' }} />
                <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>K</span>
              </div>
            </button>
          </div>
        )}

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

          {/* Search icon — mobile only */}
          {isMobile && (
            <motion.button
              whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
              onClick={openPalette}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Search size={15} style={{ color: '#64748B' }} />
            </motion.button>
          )}

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false) }}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: showNotifications ? '#EFF6FF' : '#F8FAFC',
                border: `1px solid ${showNotifications ? '#BFDBFE' : '#E2E8F0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative', transition: 'all 0.15s',
              }}
            >
              <Bell size={15} style={{ color: showNotifications ? '#2563EB' : '#64748B' }} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -3, right: -3,
                  width: 16, height: 16, borderRadius: 99,
                  background: '#EF4444', border: '2px solid #FFFFFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: '#FFFFFF',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.14 }}
                  style={{
                    position: isMobile ? 'fixed' : 'absolute',
                    right: isMobile ? 14 : 0,
                    top: isMobile ? 'calc(var(--header-height) + 8px)' : 'calc(100% + 10px)',
                    width: isMobile ? 'calc(100vw - 28px)' : 320,
                    borderRadius: 16, overflow: 'hidden', zIndex: 9999,
                    background: '#FFFFFF', border: '1px solid #E2E8F0',
                    boxShadow: '0 20px 60px rgba(15,23,42,0.14)',
                  }}
                >
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>Notifications</p>
                      <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCheck size={11} /> Mark all read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                        <Bell size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                        <p style={{ margin: 0, fontWeight: 500 }}>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((n, i) => {
                        const cfg   = NOTIF_ICONS[n.type] || NOTIF_ICONS.general
                        const NIcon = cfg.icon
                        return (
                          <div key={n.id}
                            onClick={() => { if (!n.is_read) markOneRead(n.id) }}
                            style={{
                              display: 'flex', gap: 12, padding: '12px 16px', cursor: 'pointer',
                              transition: 'background 0.12s',
                              background: n.is_read ? 'transparent' : '#FAFBFF',
                              borderBottom: i < notifications.length - 1 ? '1px solid #F8FAFC' : 'none',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                            onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : '#FAFBFF'}
                          >
                            <div style={{ width: 32, height: 32, borderRadius: 9, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <NIcon size={14} style={{ color: cfg.color }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                <p style={{ fontSize: 12, fontWeight: n.is_read ? 500 : 700, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>{n.title}</p>
                                {!n.is_read && <div style={{ width: 6, height: 6, borderRadius: 99, background: '#2563EB', flexShrink: 0, marginTop: 3 }} />}
                              </div>
                              <p style={{ fontSize: 11, color: '#64748B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</p>
                              <p style={{ fontSize: 10, color: '#CBD5E1', marginTop: 3 }}>{timeAgo(n.created_at)}</p>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div style={{ padding: '10px 12px', borderTop: '1px solid #F1F5F9' }}>
                    <Link href="/announcements" onClick={() => setShowNotifications(false)} style={{ display: 'block', textAlign: 'center', fontSize: 12, fontWeight: 600, padding: '8px', borderRadius: 10, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', textDecoration: 'none' }}>
                      View all announcements
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 10px 4px 4px', borderRadius: 99,
                background: showUserMenu ? '#F8FAFC' : '#FFFFFF',
                border: '1px solid #E2E8F0',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#CBD5E1'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}
            >
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #2563EB, #1E40AF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#FFFFFF', fontFamily: 'Inter, sans-serif', flexShrink: 0, overflow: 'hidden' }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : getInitials(userName)
                }
              </div>
              <span className="hidden lg:block" style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName.split(' ')[0]}
              </span>
              <ChevronDown size={12} style={{ color: '#94A3B8', transition: 'transform 0.2s', transform: showUserMenu ? 'rotate(180deg)' : 'none', flexShrink: 0 }} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.14 }}
                  style={{ position: isMobile ? 'fixed' : 'absolute', right: isMobile ? 14 : 0, top: isMobile ? 'calc(var(--header-height) + 8px)' : 'calc(100% + 10px)', width: isMobile ? 'calc(100vw - 28px)' : 260, borderRadius: 16, background: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 20px 56px rgba(15,23,42,0.14)', zIndex: 9999, overflow: 'hidden' }}
                >
                  {/* User info */}
                  <div style={{ padding: '16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #2563EB, #1E40AF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#FFFFFF', fontFamily: 'Inter, sans-serif', flexShrink: 0, overflow: 'hidden' }}>
                      {profile?.avatar_url
                        ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : getInitials(userName)
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>{userName}</p>
                      <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                      <span style={{ display: 'inline-block', marginTop: 5, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', letterSpacing: '0.03em' }}>
                        {ROLE_LABELS[profile?.role] || profile?.role || 'User'}
                      </span>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div style={{ padding: '8px' }}>
                    {[
                      { label: 'My Profile', icon: User,     href: '/settings/profile', desc: 'View & edit profile' },
                      { label: 'Settings',   icon: Settings, href: '/settings',          desc: 'App preferences'   },
                    ].map(item => (
                      <Link key={item.label} href={item.href} onClick={() => setShowUserMenu(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, textDecoration: 'none', transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <item.icon size={14} style={{ color: '#64748B' }} />
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>{item.label}</p>
                          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{item.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Sign out */}
                  <div style={{ padding: '8px', borderTop: '1px solid #F1F5F9' }}>
                    <button onClick={handleLogout}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <LogOut size={14} style={{ color: '#EF4444' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', margin: 0, lineHeight: 1.2 }}>Sign Out</p>
                        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>End your session</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {(showUserMenu || showNotifications) && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => { setShowUserMenu(false); setShowNotifications(false) }} />
        )}
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}
