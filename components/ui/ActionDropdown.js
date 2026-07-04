'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * ActionDropdown — dropdown that portals to document.body so it escapes
 * any overflow:hidden / overflow-x:auto ancestor (e.g. .page-actions on mobile).
 */
export default function ActionDropdown({ label, icon: Icon, items = [], className, style, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos ] = useState({ top: 0, right: 0, left: 0 })
  const btnRef  = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current  && !btnRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleToggle() {
    if (!open && btnRef.current) {
      const r   = btnRef.current.getBoundingClientRect()
      const w   = 210 // minWidth of menu
      const pad = 8
      // Start right-aligned to button; clamp so menu never leaves the screen
      const raw  = align === 'left' ? r.left : r.right - w
      const left = Math.min(Math.max(raw, pad), window.innerWidth - w - pad)
      setPos({ top: r.bottom + 6, left })
    }
    setOpen(v => !v)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className={className || 'btn-secondary'}
        style={style}
        aria-haspopup="true"
        aria-expanded={open}>
        {Icon && <Icon size={14} />}
        {label}
        <ChevronDown size={13} style={{ marginLeft: 2, transition: 'transform 0.18s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
      </button>

      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              role="menu"
              data-dropdown-menu
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                minWidth: 210,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 14,
                boxShadow: '0 12px 32px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06)',
                zIndex: 9999,
                overflow: 'hidden',
                padding: 6,
              }}>
              {items.map((item, i) =>
                item.divider ? (
                  <div key={i} style={{ height: 1, background: '#F1F5F9', margin: '4px 2px' }} />
                ) : (
                  <button
                    key={i}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => { item.onClick?.(); setOpen(false) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 9, border: 'none',
                      background: 'none', textAlign: 'left', fontFamily: 'inherit',
                      cursor: item.disabled ? 'not-allowed' : 'pointer',
                      opacity: item.disabled ? 0.45 : 1,
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = item.danger ? '#FEF2F2' : '#F8FAFC' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
                    {item.icon && (
                      <span style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.danger ? '#FEF2F2' : (item.iconBg || '#F1F5F9') }}>
                        <item.icon size={14} style={{ color: item.danger ? '#DC2626' : (item.iconColor || '#64748B') }} />
                      </span>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: item.danger ? '#DC2626' : '#0F172A', margin: 0 }}>{item.label}</p>
                      {item.desc && <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>{item.desc}</p>}
                    </div>
                  </button>
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
