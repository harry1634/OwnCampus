'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutGrid, Building2, CreditCard, LifeBuoy,
  ClipboardList, Settings, LogOut, Menu, X,
  ChevronRight, Bell, User, Shield,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const NAV = [
  { label: 'Dashboard',     href: '/control/dashboard',     icon: LayoutGrid   },
  { label: 'Institutions',  href: '/control/institutions',  icon: Building2    },
  { label: 'Payments',      href: '/control/payments',      icon: CreditCard   },
  { label: 'Support',       href: '/control/support',       icon: LifeBuoy     },
  { label: 'Audit Logs',    href: '/control/audit',         icon: ClipboardList },
  { label: 'Settings',      href: '/control/settings',      icon: Settings     },
]

const ROLE_LABEL = {
  company_owner:   'Owner',
  company_admin:   'Admin',
  company_support: 'Support',
  company_sales:   'Sales',
}

const SB = {
  bg:      'linear-gradient(180deg, #080E2E 0%, #0F1F6B 45%, #1E40AF 100%)',
  border:  'rgba(255,255,255,0.08)',
  accent:  '#93C5FD',
  text:    '#FFFFFF',
  muted:   'rgba(255,255,255,0.48)',
  hover:   'rgba(255,255,255,0.07)',
  active:  'rgba(255,255,255,0.14)',
  surface: 'rgba(255,255,255,0.08)',
}

function NavItem({ item, current, onClick }) {
  const Icon    = item.icon
  const active  = current === item.href || current.startsWith(item.href + '/')
  return (
    <Link
      href={item.href}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px', borderRadius: 10,
        background:  active ? SB.active  : 'transparent',
        color:       active ? '#FFFFFF'  : SB.muted,
        textDecoration: 'none', fontSize: 13.5, fontWeight: active ? 700 : 500,
        transition: 'all 0.15s', marginBottom: 2,
        borderLeft: active ? '3px solid rgba(255,255,255,0.7)' : '3px solid transparent',
        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = SB.hover; e.currentTarget.style.color = 'rgba(255,255,255,0.85)' }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = SB.muted }}}>
      <Icon size={16} strokeWidth={active ? 2.1 : 1.7} />
      <span>{item.label}</span>
      {active && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
    </Link>
  )
}

function Sidebar({ user, current, onClose, mobile }) {
  const router = useRouter()

  async function handleLogout() {
    try {
      await fetch('/api/control/auth/logout', { method: 'POST' })
      router.push('/control/login')
    } catch {
      toast.error('Logout failed.')
    }
  }

  return (
    <div style={{
      width: 240, height: '100%', background: SB.bg,
      borderRight: `1px solid ${SB.border}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle dot grid texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '22px 22px', zIndex: 0,
      }} />
      {/* Ambient glow bottom */}
      <div style={{
        position: 'absolute', bottom: -60, left: -40, width: 280, height: 280,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 65%)',
      }} />

      {/* Logo */}
      <div style={{
        padding: '20px 16px 16px', position: 'relative', zIndex: 1,
        borderBottom: `1px solid ${SB.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: 'rgba(255,255,255,0.14)',
            border: '1px solid rgba(255,255,255,0.20)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}>
            <LayoutGrid size={15} color="white" strokeWidth={1.9} />
          </div>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>OwnCampus</p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', margin: 0, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Control Center</p>
          </div>
        </div>
        {mobile && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 4px 10px', paddingLeft: 4 }}>
          Navigation
        </p>
        {NAV.map(item => (
          <NavItem key={item.href} item={item} current={current} onClick={mobile ? onClose : undefined} />
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px 10px', borderTop: `1px solid ${SB.border}`, position: 'relative', zIndex: 1 }}>
        {/* User info */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 10,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.10)',
          marginBottom: 6,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={14} color="white" strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 4px #4ADE80' }} />
              <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 500 }}>{ROLE_LABEL[user.role] || user.role}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8, border: 'none',
            background: 'transparent', color: 'rgba(255,255,255,0.38)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#FCA5A5' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.38)' }}>
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function ControlShell({ user, children }) {
  const pathname    = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div style={{
      height: '100vh', display: 'flex', overflow: 'hidden',
      background: '#F8FAFC', fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex" style={{ height: '100%' }}>
        <Sidebar user={user} current={pathname} />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} />
            <motion.div
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 260, zIndex: 50 }}>
              <Sidebar user={user} current={pathname} mobile onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          height: 56, background: '#FFFFFF', borderBottom: '1px solid #E8EDF4',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0,
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
        }}>
          {/* Mobile menu button */}
          <button
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            style={{
              width: 34, height: 34, borderRadius: 8, border: '1px solid #E2E8F0',
              background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
            <Menu size={16} color="#475569" />
          </button>

          {/* Breadcrumb / page title area — children can override via a portal but default to empty */}
          <div style={{ flex: 1 }} id="control-header-portal" />

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 99,
              background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)',
            }}>
              <Shield size={11} color="#3B82F6" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {ROLE_LABEL[user.role] || user.role}
              </span>
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>
                {user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
