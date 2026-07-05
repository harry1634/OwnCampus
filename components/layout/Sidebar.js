'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Building2, ChevronDown, Copy, Check, LayoutGrid } from 'lucide-react'
import { navigation } from '@/config/navigation'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'

export default function Sidebar({ profile, enabledModules }) {
  const pathname = usePathname()
  const {
    sidebarCollapsed: _sidebarCollapsed, toggleSidebar,
    activeCampus, setActiveCampus,
    mobileSidebarOpen, closeMobileSidebar,
  } = useAppStore()
  const [mounted,           setMounted          ] = useState(false)
  const [isMobile,          setIsMobile         ] = useState(false)
  const [campusOpen,        setCampusOpen       ] = useState(false)
  const [supabaseCampuses,  setSupabaseCampuses ] = useState([])
  const [codeCopied,        setCodeCopied       ] = useState(false)

  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    fetch('/api/branches').then(r => r.json()).then(d => {
      const names = (d.branches || []).map(b => b.name)
      setSupabaseCampuses(names)
    }).catch(() => {})
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (isMobile) closeMobileSidebar()
  }, [pathname]) // eslint-disable-line

  useEffect(() => {
    if (!campusOpen) return
    const close = () => setCampusOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [campusOpen])

  const sidebarCollapsed = mounted ? _sidebarCollapsed : false
  const showCollapsed    = isMobile ? false : sidebarCollapsed
  const mobileVisible    = isMobile && mobileSidebarOpen

  const isActive = (href) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const institutionName = profile?.institutions?.name || 'OwnCampus'
  const defaultCampus   = profile?.institutions?.campus || 'Main Campus'
  const roleLabel       = profile?.role?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || 'Admin'
  const currentCampus   = activeCampus || defaultCampus

  const instCode = (() => {
    const inst = profile?.institutions
    if (!inst) return null
    if (inst.code) return inst.code
    const nameChars = (inst.name || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X')
    const slugTail  = (inst.slug || '').replace(/-/g, '').toUpperCase().slice(-4)
    return nameChars + slugTail
  })()

  function copyCode() {
    if (!instCode) return
    navigator.clipboard.writeText(instCode).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    })
  }

  const campuses = supabaseCampuses.length > 0 ? supabaseCampuses : [defaultCampus]

  const SB = '#1E3A8A'   // sidebar background
  const SB2 = '#1E40AF'  // slightly darker accent

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileVisible && (
          <motion.div
            key="mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeMobileSidebar}
            style={{
              position: 'fixed', inset: 0, zIndex: 49,
              background: 'rgba(0,0,0,0.40)',
              backdropFilter: 'blur(4px)',
            }}
          />
        )}
      </AnimatePresence>

      <aside
        className="fixed top-0 left-0 h-full flex flex-col"
        style={{
          width:       isMobile ? 'var(--sidebar-width)' : (sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'),
          background:  SB,
          borderRight: '1px solid rgba(255,255,255,0.08)',
          boxShadow:   '4px 0 24px rgba(0,0,0,0.15)',
          zIndex:      50,
          transition:  isMobile
            ? 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)'
            : 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          transform:   isMobile
            ? (mobileVisible ? 'translateX(0)' : 'translateX(-100%)')
            : 'translateX(0)',
          overflow:    'hidden',
        }}
      >
        {/* ── Logo / Institution ── */}
        <div style={{
          height: 'var(--header-height)',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: showCollapsed ? '0 12px' : '0 12px 0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}>
          {showCollapsed ? (
            <button
              onClick={toggleSidebar}
              title="Expand sidebar"
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.70)', cursor: 'pointer',
                transition: 'background 0.14s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
            >
              <ChevronRight size={16} />
            </button>
          ) : (
            <>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <LayoutGrid size={15} color="white" strokeWidth={2} />
              </div>

              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.14 }}
                style={{ flex: 1, minWidth: 0 }}
              >
                <p style={{ fontWeight: 700, fontSize: 14, color: '#FFFFFF', lineHeight: 1.2, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  OwnCampus
                </p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {institutionName}
                </p>
              </motion.div>

              <button
                onClick={toggleSidebar}
                title="Collapse sidebar"
                style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.50)', cursor: 'pointer', flexShrink: 0,
                  transition: 'background 0.14s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              >
                <ChevronLeft size={12} />
              </button>
            </>
          )}
        </div>

        {/* ── Branch / Role pill ── */}
        <AnimatePresence>
          {!showCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              style={{ padding: '10px 10px 6px', flexShrink: 0 }}
            >
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setCampusOpen(o => !o)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 8,
                  background: campusOpen ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  cursor: 'pointer', transition: 'background 0.14s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
                onMouseLeave={e => { if (!campusOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              >
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 size={12} style={{ color: 'rgba(255,255,255,0.85)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentCampus}
                  </p>
                  <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                    {roleLabel}
                  </p>
                </div>
                <motion.div animate={{ rotate: campusOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
                  <ChevronDown size={11} style={{ color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} />
                </motion.div>
              </button>

              {/* Campus dropdown */}
              <AnimatePresence>
                {campusOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
                    animate={{ opacity: 1, y: 0, scaleY: 1 }}
                    exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
                    transition={{ duration: 0.14 }}
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                      marginTop: 4, borderRadius: 10, overflow: 'hidden',
                      background: '#1D4ED8', border: '1px solid rgba(255,255,255,0.14)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    }}
                  >
                    <p style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Switch Campus
                    </p>
                    {campuses.map((c, i) => {
                      const active = c === currentCampus
                      return (
                        <button
                          key={c}
                          onClick={() => { setActiveCampus(c); setCampusOpen(false) }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', background: 'transparent', border: 'none',
                            cursor: 'pointer', transition: 'background 0.12s',
                            borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{
                            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                            background: active ? '#60A5FA' : 'rgba(255,255,255,0.10)',
                            border: `1px solid ${active ? '#60A5FA' : 'rgba(255,255,255,0.15)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {active && (
                              <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span style={{ fontSize: 12.5, fontWeight: active ? 600 : 400, color: active ? '#FFFFFF' : 'rgba(255,255,255,0.65)' }}>
                            {c}
                          </span>
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Navigation ── */}
        <nav
          className="flex-1 overflow-y-auto no-scrollbar"
          style={{ padding: '4px 8px', paddingBottom: 8 }}
        >
          {navigation.map((group) => (
            <div key={group.label} style={{ marginBottom: 12 }}>
              {!showCollapsed && (
                <p style={{
                  padding: '0 8px',
                  marginBottom: 2,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.35)',
                }}>
                  {group.label}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {group.items.filter(item => {
                  if (!item.moduleKey) return true
                  if (!enabledModules) return true
                  return enabledModules[item.moduleKey] !== false
                }).map((item) => {
                  const active = isActive(item.href)
                  const Icon   = item.icon

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn('sidebar-item', active && 'active')}
                      title={showCollapsed ? item.name : undefined}
                      style={{ justifyContent: showCollapsed ? 'center' : undefined }}
                    >
                      <Icon
                        size={15}
                        style={{
                          color:     active ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                          flexShrink: 0,
                        }}
                      />

                      <AnimatePresence>
                        {!showCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            transition={{ duration: 0.12 }}
                            style={{ flex: 1, fontSize: 13.5, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {!showCollapsed && item.badge && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          padding: '1px 6px', borderRadius: 999,
                          background: active ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.10)',
                          color: active ? '#FFFFFF' : 'rgba(255,255,255,0.60)',
                          flexShrink: 0,
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Institution Code chip ── */}
        {instCode && !showCollapsed && (
          <div style={{ padding: '0 8px', paddingBottom: isMobile ? 'calc(72px + env(safe-area-inset-bottom, 0px))' : 'calc(12px + env(safe-area-inset-bottom, 0px))', flexShrink: 0 }}>
            <div style={{ borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', padding: '10px 12px' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                Institution Code
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.12em', fontFamily: 'monospace' }}>
                  {instCode}
                </span>
                <button onClick={copyCode} title="Copy code"
                  style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid rgba(255,255,255,0.15)', background: codeCopied ? 'rgba(22,163,74,0.25)' : 'rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}>
                  {codeCopied ? <Check size={11} color="#4ADE80" /> : <Copy size={11} color="rgba(255,255,255,0.50)" />}
                </button>
              </div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 5 }}>Share with students &amp; faculty</p>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
