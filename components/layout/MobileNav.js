'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreHorizontal, X } from 'lucide-react'
import { mobileNavItems, navigation } from '@/config/navigation'

// The 4 pinned items (exclude "More")
const PINNED = mobileNavItems.filter(i => i.href !== '/menu')

// All nav items that aren't already pinned
const pinnedHrefs = new Set(PINNED.map(i => i.href))
const MORE_ITEMS  = navigation.map(group => ({
  ...group,
  items: group.items.filter(i => !pinnedHrefs.has(i.href)),
})).filter(g => g.items.length > 0)

export default function MobileNav() {
  const pathname   = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <>
      {/* ── Bottom nav bar ── */}
      <nav className="mobile-nav justify-around items-center px-2">
        {PINNED.map((item) => {
          const Icon   = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all relative"
            >
              {active && (
                <motion.div
                  layoutId="mobileActiveTab"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: '#EEF2FF' }}
                />
              )}
              <Icon size={19} className="relative z-10" style={{ color: active ? '#4F46E5' : '#94A3B8' }} />
              <span className="relative z-10 font-medium" style={{ color: active ? '#4F46E5' : '#94A3B8', fontSize: '10px' }}>
                {item.name}
              </span>
            </Link>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all"
        >
          <MoreHorizontal size={19} style={{ color: open ? '#4F46E5' : '#94A3B8' }} />
          <span className="font-medium" style={{ color: open ? '#4F46E5' : '#94A3B8', fontSize: '10px' }}>More</span>
        </button>
      </nav>

      {/* ── More sheet ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 998,
                background: 'rgba(2,6,23,0.55)',
                backdropFilter: 'blur(4px)',
              }}
            />

            {/* Sheet */}
            <motion.div
              key="more-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              style={{
                position: 'fixed', left: 0, right: 0, bottom: 0,
                zIndex: 999,
                background: '#FFFFFF',
                borderRadius: '20px 20px 0 0',
                padding: '0 0 env(safe-area-inset-bottom, 12px)',
                maxHeight: '80vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
              }}
            >
              {/* Handle + header */}
              <div style={{ padding: '12px 20px 10px', flexShrink: 0 }}>
                <div style={{
                  width: 36, height: 4, borderRadius: 99,
                  background: '#E2E8F0', margin: '0 auto 14px',
                }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
                    All Modules
                  </p>
                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: '#F1F5F9', border: '1px solid #E2E8F0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} color="#64748B" />
                  </button>
                </div>
              </div>

              {/* Scrollable list */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 16px' }}>
                {MORE_ITEMS.map((group) => (
                  <div key={group.label} style={{ marginBottom: 20 }}>
                    <p style={{
                      fontSize: 10, fontWeight: 700, color: '#94A3B8',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      marginBottom: 8, paddingLeft: 4,
                    }}>
                      {group.label}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {group.items.map((item) => {
                        const Icon   = item.icon
                        const active = isActive(item.href)
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            style={{ textDecoration: 'none' }}
                          >
                            <motion.div
                              whileTap={{ scale: 0.97 }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '11px 14px', borderRadius: 12,
                                background: active ? '#EEF2FF' : '#F8FAFC',
                                border: `1px solid ${active ? '#C7D2FE' : '#E2E8F0'}`,
                              }}
                            >
                              <div style={{
                                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                                background: active ? '#E0E7FF' : '#F1F5F9',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <Icon size={15} style={{ color: active ? '#4F46E5' : '#64748B' }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                  fontSize: 12, fontWeight: 600, margin: 0,
                                  color: active ? '#4338CA' : '#1E293B',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>{item.name}</p>
                                {item.badge && (
                                  <span style={{
                                    display: 'inline-block', marginTop: 2,
                                    fontSize: 9, fontWeight: 700, padding: '1px 6px',
                                    borderRadius: 99, background: '#E0E7FF', color: '#4338CA',
                                  }}>{item.badge}</span>
                                )}
                              </div>
                            </motion.div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
