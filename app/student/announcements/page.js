'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Megaphone, Bell, AlertCircle, Info, Pin } from 'lucide-react'

const TYPE_META = {
  general: { color: '#2563EB', bg: '#EFF6FF', label: 'General'  },
  exam:    { color: '#7C3AED', bg: '#F5F3FF', label: 'Exam'     },
  event:   { color: '#059669', bg: '#ECFDF5', label: 'Event'    },
  holiday: { color: '#DC2626', bg: '#FEF2F2', label: 'Holiday'  },
  meeting: { color: '#D97706', bg: '#FFFBEB', label: 'Meeting'  },
}
const FILTERS = ['All', 'general', 'exam', 'event', 'holiday', 'meeting']

export default function StudentAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading,       setLoading      ] = useState(true)
  const [filter,        setFilter       ] = useState('All')

  useEffect(() => {
    fetch('/api/announcements')
      .then(r => r.json())
      .then(d => {
        const all = d.announcements || []
        setAnnouncements(all.filter(a => a.target_audience === 'all' || a.target_audience === 'student'))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'All' ? announcements : announcements.filter(a => a.type === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Announcements</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Notices and updates from your institution</p>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const meta = TYPE_META[f]
          const active = filter === f
          return (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? (meta?.bg ?? '#DDD6FE') : '#E2E8F0'}`, background: active ? (meta?.bg ?? '#F5F3FF') : '#FFFFFF', color: active ? (meta?.color ?? '#7C3AED') : '#64748B', transition: 'all 0.12s' }}>
              {f === 'All' ? 'All' : meta?.label ?? f}
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading && <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>Loading…</p>}
      {!loading && !filtered.length && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Megaphone size={36} color="#E2E8F0" style={{ marginBottom: 12 }} />
          <p style={{ color: '#94A3B8', fontSize: 14, margin: 0 }}>No announcements{filter !== 'All' ? ` for "${filter}"` : ''} yet.</p>
        </div>
      )}
      {filtered.map((ann, i) => {
        const meta = TYPE_META[ann.type] || TYPE_META.general
        const ts   = new Date(ann.created_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
        return (
          <motion.div key={ann.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            style={{ background: '#FFFFFF', borderRadius: 16, border: `1px solid ${ann.is_pinned ? '#FDE68A' : '#E2E8F0'}`, padding: '18px 20px', boxShadow: ann.is_pinned ? '0 0 0 2px #FBBF24' : '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', gap: 16 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
              <Megaphone size={18} color={meta.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                {ann.is_pinned && <Pin size={12} color="#D97706" />}
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: meta.bg, color: meta.color }}>{meta.label}</span>
                <span style={{ fontSize: 10.5, color: '#CBD5E1' }}>{ts}</span>
              </div>
              <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>{ann.title}</h3>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.6 }}>{ann.content}</p>
              <p style={{ fontSize: 11.5, color: '#CBD5E1', marginTop: 8 }}>Posted by {ann.created_by_name || 'Admin'}</p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
