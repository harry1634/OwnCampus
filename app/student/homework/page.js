'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DueBadge({ due_date, submitted }) {
  if (submitted) return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>Submitted</span>
  )
  if (!due_date) return null
  const days = Math.ceil((new Date(due_date) - new Date()) / 86400000)
  if (days < 0)  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>Overdue</span>
  if (days === 0) return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>Due Today</span>
  if (days <= 2)  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>Due in {days}d</span>
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>Due {formatDate(due_date)}</span>
}

function HomeworkCard({ hw, onSubmit }) {
  const [open,        setOpen       ] = useState(false)
  const [submitting,  setSubmitting ] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res  = await fetch(`/api/homework?id=${hw.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'submit' }),
      })
      const json = await res.json()
      if (res.ok && !json.error) {
        toast.success(json.status === 'late' ? 'Submitted (late)' : 'Homework submitted!')
        onSubmit(hw.id, json.status || 'submitted')
      } else {
        toast.error(json.error || 'Failed to submit')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const isOverdue = hw.is_overdue && !hw.submitted

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#FFFFFF', border: `1px solid ${isOverdue ? '#FECACA' : '#E2E8F0'}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {isOverdue && <div style={{ height: 3, background: '#EF4444' }} />}
      {hw.submitted && <div style={{ height: 3, background: '#059669' }} />}

      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 11, background: hw.submitted ? '#ECFDF5' : isOverdue ? '#FEF2F2' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {hw.submitted
            ? <CheckCircle size={18} color="#059669" />
            : isOverdue
              ? <AlertTriangle size={18} color="#DC2626" />
              : <BookOpen size={18} color="#2563EB" />
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>{hw.title}</h3>
            <DueBadge due_date={hw.due_date} submitted={hw.submitted} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: '#EFF6FF', color: '#2563EB' }}>{hw.subject}</span>
            {hw.class_name && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: '#F1F5F9', color: '#475569' }}>Class {hw.class_name}</span>}
            {hw.faculty_name && <span style={{ fontSize: 11, color: '#94A3B8' }}>by {hw.faculty_name}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {hw.description && (
              <button onClick={() => setOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {open ? 'Hide details' : 'View details'}
              </button>
            )}
            {!hw.submitted && (
              <button onClick={handleSubmit} disabled={submitting}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 8, border: 'none', background: isOverdue ? '#FEF2F2' : '#2563EB', color: isOverdue ? '#DC2626' : '#FFFFFF', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? <><Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Submitting…</> : <><CheckCircle size={12} /> Mark Complete</>}
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && hw.description && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 20px 16px 76px', fontSize: 13, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{hw.description}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function StudentHomeworkPage() {
  const [homework, setHomework] = useState([])
  const [loading,  setLoading ] = useState(true)
  const [tab,      setTab     ] = useState('pending')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/homework?my=true', { cache: 'no-store' })
      const json = res.ok ? await res.json() : {}
      setHomework(json.homework || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function markSubmitted(id, status) {
    setHomework(prev => prev.map(h => h.id === id ? { ...h, submitted: true, submission_status: status } : h))
  }

  const pending   = homework.filter(h => !h.submitted)
  const submitted = homework.filter(h =>  h.submitted)
  const overdue   = pending.filter(h => h.is_overdue)

  const displayed = tab === 'pending' ? pending : submitted

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>My Homework</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Assignments from your teachers</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {[
          { label: 'Pending',   value: pending.length,   color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Overdue',   value: overdue.length,   color: '#DC2626', bg: '#FEF2F2' },
          { label: 'Submitted', value: submitted.length, color: '#059669', bg: '#ECFDF5' },
        ].map(s => (
          <div key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: '0 0 3px', letterSpacing: '-0.02em' }}>{loading ? '—' : s.value}</p>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'pending',   label: `Pending (${pending.length})`   },
          { key: 'submitted', label: `Submitted (${submitted.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              background: tab === t.key ? '#FFFFFF' : 'transparent',
              color:      tab === t.key ? '#0F172A' : '#64748B',
              boxShadow:  tab === t.key ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <Loader2 size={24} color="#CBD5E1" style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '48px 32px', textAlign: 'center' }}>
          <BookOpen size={32} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: '#64748B', margin: '0 0 4px' }}>
            {tab === 'pending' ? 'No pending homework' : 'No submitted homework yet'}
          </p>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
            {tab === 'pending' ? 'You\'re all caught up!' : 'Mark homework as complete to see it here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.map(h => (
            <HomeworkCard key={h.id} hw={h} onSubmit={markSubmitted} />
          ))}
        </div>
      )}
    </div>
  )
}
