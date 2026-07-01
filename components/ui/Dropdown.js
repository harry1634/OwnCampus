'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'

export default function Dropdown({ label, options, value, onChange, alignLeft = false, prefix = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const display = prefix ? `${prefix}: ${value}` : value

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-filter"
        style={{
          background:   open ? '#EFF6FF' : undefined,
          borderColor:  open ? '#BFDBFE' : undefined,
          color:        open ? '#2563EB' : undefined,
        }}
      >
        {display}
        <ChevronDown
          size={13}
          style={{ transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scaleY: 0.94 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              [alignLeft ? 'left' : 'right']: 0,
              minWidth: 200,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
              zIndex: 60,
              overflow: 'hidden',
            }}
          >
            {options.map((opt, i) => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderTop: i === 0 ? 'none' : '1px solid #F8FAFC',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: value === opt ? '#2563EB' : '#0F172A',
                  fontWeight: value === opt ? 600 : 400,
                  textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {opt}
                {value === opt && <Check size={13} style={{ color: '#2563EB', flexShrink: 0 }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
