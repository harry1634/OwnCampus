'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Menu, Bell, ChevronDown, LogOut, User, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCurrentUser } from '@/lib/useCurrentUser'

export default function StudentHeader({ user, profile, isMobile, collapsed, onHamburger }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const cu = useCurrentUser()

  useEffect(() => { setMounted(true) }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('oc_role')
      localStorage.removeItem('oc_user_name')
      localStorage.removeItem('oc_user_email')
      localStorage.removeItem('oc_user_class')
      localStorage.removeItem('oc_user_roll')
    }
    router.push('/auth/login')
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

      <button style={{ width: 36, height: 36, borderRadius: 9, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
        <Bell size={16} color="#64748B" />
      </button>

      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button onClick={() => setUserMenuOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 5px', borderRadius: 10, background: '#F5F3FF', border: '1px solid #E9D5FF', cursor: 'pointer' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#A78BFA,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#FFFFFF' }}>
            {initials}
          </div>
          {!isMobile && <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{displayName.split(' ')[0]}</span>}
          <ChevronDown size={13} color="#94A3B8" />
        </button>
        <AnimatePresence>
          {userMenuOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setUserMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
              <motion.div initial={{ opacity: 0, scale: 0.96, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                style={{ position: isMobile ? 'fixed' : 'absolute', top: isMobile ? 'auto' : 'calc(100% + 8px)', bottom: isMobile ? 80 : 'auto', right: isMobile ? 14 : 0, width: isMobile ? `calc(100vw - 28px)` : 210, background: '#FFFFFF', borderRadius: 14, border: '1px solid #E9D5FF', boxShadow: '0 16px 48px rgba(124,58,237,0.14)', zIndex: 99, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', margin: 0 }}>{displayName}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{cu.email || user?.email}</p>
                </div>
                {[
                  { label: 'My Profile', icon: User, href: '/student/profile' },
                  { label: 'Settings',   icon: Settings, href: '/student/profile' },
                ].map(item => (
                  <button key={item.label} onClick={() => { setUserMenuOpen(false); router.push(item.href) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#374151', fontFamily: 'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F5F3FF'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <item.icon size={15} color="#94A3B8" />{item.label}
                  </button>
                ))}
                <div style={{ padding: '6px', borderTop: '1px solid #F1F5F9' }}>
                  <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, background: '#FEF2F2', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#DC2626', fontFamily: 'inherit' }}>
                    <LogOut size={14} color="#DC2626" /> Sign Out
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
