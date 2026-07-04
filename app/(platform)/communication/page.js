'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send, Bell, Mail, Plus, Search, Pin, Trash2, Loader2, X, Megaphone } from 'lucide-react'

const TYPE_META = {
  general: { color: '#2563EB', bg: '#EFF6FF', label: 'General'  },
  exam:    { color: '#7C3AED', bg: '#F5F3FF', label: 'Exam'     },
  event:   { color: '#059669', bg: '#ECFDF5', label: 'Event'    },
  holiday: { color: '#DC2626', bg: '#FEF2F2', label: 'Holiday'  },
  meeting: { color: '#D97706', bg: '#FFFBEB', label: 'Meeting'  },
}

const AUDIENCE_META = {
  all:      { label: 'Everyone',  color: '#7C3AED' },
  students: { label: 'Students',  color: '#2563EB' },
  faculty:  { label: 'Faculty',   color: '#059669' },
  parents:  { label: 'Parents',   color: '#DB2777' },
}

const channels = [
  { icon: Bell,         label: 'In-App',  color: '#2563EB', bg: '#EFF6FF' },
  { icon: Mail,         label: 'Email',   color: '#10B981', bg: '#F0FDF4' },
  { icon: MessageSquare,label: 'SMS',     color: '#F59E0B', bg: '#FFFBEB' },
  { icon: Send,         label: 'WhatsApp',color: '#16A34A', bg: '#ECFDF5' },
]

function ComposeModal({ onClose, onPosted }) {
  const [title,    setTitle   ] = useState('')
  const [content,  setContent ] = useState('')
  const [type,     setType    ] = useState('general')
  const [audience, setAudience] = useState('all')
  const [pinned,   setPinned  ] = useState(false)
  const [loading,  setLoading ] = useState(false)
  const [error,    setError   ] = useState('')

  async function handleSend() {
    if (!title.trim())   { setError('Title is required.'); return }
    if (!content.trim()) { setError('Content is required.'); return }
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/announcements', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title, content, type, target_audience: audience, is_pinned: pinned }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to post announcement.'); return }
      onPosted(data.announcement)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: 'calc(var(--header-height) + 24px) 16px 40px', background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        style={{ width: '100%', maxWidth: 520, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 28, boxShadow: '0 24px 64px rgba(15,23,42,0.16)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: 0 }}>New Announcement</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4, borderRadius: 6 }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <p style={{ fontSize: 12.5, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', margin: 0 }}>{error}</p>}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Announcement title..." className="input-premium" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Message</label>
            <textarea rows={4} value={content} onChange={e => setContent(e.target.value)}
              placeholder="Write your announcement..." className="input-premium" style={{ width: '100%', resize: 'none' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="input-premium" style={{ width: '100%', fontSize: 13 }}>
                <option value="general">General</option>
                <option value="exam">Exam</option>
                <option value="event">Event</option>
                <option value="holiday">Holiday</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Audience</label>
              <select value={audience} onChange={e => setAudience(e.target.value)} className="input-premium" style={{ width: '100%', fontSize: 13 }}>
                <option value="all">Everyone</option>
                <option value="students">Students</option>
                <option value="faculty">Faculty</option>
                <option value="parents">Parents</option>
              </select>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 }}>
            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
            Pin this announcement
          </label>

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button onClick={onClose} className="btn-secondary" style={{ flex: 1, fontSize: 13, padding: '10px 0' }}>Cancel</button>
            <button onClick={handleSend} disabled={loading} className="btn-primary"
              style={{ flex: 1, fontSize: 13, padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: loading ? 0.7 : 1 }}>
              {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              {loading ? 'Posting…' : 'Post Announcement'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function CommunicationPage() {
  const [announcements, setAnnouncements] = useState([])
  const [loading,       setLoading      ] = useState(true)
  const [showCompose,   setShowCompose  ] = useState(false)
  const [search,        setSearch       ] = useState('')
  const [deleting,      setDeleting     ] = useState(null)

  useEffect(() => {
    fetch('/api/announcements')
      .then(r => r.json())
      .then(d => setAnnouncements(d.announcements || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handlePosted(ann) {
    setAnnouncements(prev => [ann, ...prev])
  }

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return
    setDeleting(id)
    try {
      await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  const filtered = announcements.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.content || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Announcements</h1>
          <p className="page-header-sub">Post and manage announcements for faculty, students &amp; parents</p>
        </div>
        <div className="page-actions">
          <motion.button whileHover={{ scale: 1.02 }} onClick={() => setShowCompose(true)} className="btn-primary">
            <Plus size={15} /> New Announcement
          </motion.button>
        </div>
      </div>

      {/* Channel indicators (decorative) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
        {channels.map((ch, i) => {
          const Icon = ch.icon
          return (
            <motion.div key={ch.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: ch.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={17} style={{ color: ch.color }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{ch.label}</p>
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>In-App only</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Announcements list */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.05)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #F1F5F9', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Posted Announcements</h3>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{filtered.length} announcement{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <div style={{ position: 'relative', minWidth: 0, flex: '0 1 220px' }}>
            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1' }} />
            <input type="text" placeholder="Search announcements…" value={search} onChange={e => setSearch(e.target.value)}
              className="input-premium" style={{ paddingLeft: 34, paddingTop: 7, paddingBottom: 7, fontSize: 12, width: '100%' }} />
          </div>
        </div>

        {loading && (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Loader2 size={24} color="#CBD5E1" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          </div>
        )}

        {!loading && !filtered.length && (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Megaphone size={36} color="#E2E8F0" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, color: '#94A3B8', margin: 0 }}>No announcements yet. Click "New Announcement" to post one.</p>
          </div>
        )}

        <AnimatePresence>
          {filtered.map((ann, i) => {
            const typeMeta = TYPE_META[ann.type] || TYPE_META.general
            const audMeta  = AUDIENCE_META[ann.target_audience] || AUDIENCE_META.all
            const ts = new Date(ann.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            return (
              <motion.div key={ann.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 24px', borderBottom: i < filtered.length - 1 ? '1px solid #F1F5F9' : 'none', background: ann.is_pinned ? '#FFFBEB' : 'transparent' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: typeMeta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <Megaphone size={15} style={{ color: typeMeta.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
                    {ann.is_pinned && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>
                        <Pin size={9} /> PINNED
                      </span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: typeMeta.bg, color: typeMeta.color }}>{typeMeta.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: `${audMeta.color}14`, color: audMeta.color }}>→ {audMeta.label}</span>
                    <span style={{ fontSize: 11, color: '#CBD5E1' }}>{ts}</span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 4, lineHeight: 1.4 }}>{ann.title}</p>
                  <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.55, marginBottom: 0 }}>{ann.content}</p>
                  <p style={{ fontSize: 11.5, color: '#CBD5E1', marginTop: 6 }}>Posted by {ann.created_by_name || 'Admin'}</p>
                </div>
                <button onClick={() => handleDelete(ann.id)} disabled={deleting === ann.id}
                  style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: '#CBD5E1', marginTop: 2 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
                  onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                  {deleting === ann.id
                    ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Trash2 size={15} />}
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} onPosted={handlePosted} />}
    </div>
  )
}
