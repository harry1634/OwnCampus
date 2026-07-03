'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Menu, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getInitials } from '@/lib/utils'
import { useCurrentUser } from '@/lib/useCurrentUser'

export default function FacultyHeader({ user, profile, collapsed, isMobile, onHamburger }) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const cu = useCurrentUser()

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
