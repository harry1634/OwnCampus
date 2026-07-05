'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, CheckCircle, Clock, XCircle, Send, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrentUser } from '@/lib/useCurrentUser'

const LEAVE_TYPES = [
  { value: 'sick',       label: 'Sick Leave',      color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  { value: 'casual',     label: 'Casual Leave',    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { value: 'emergency',  label: 'Emergency Leave', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  { value: 'personal',   label: 'Personal Leave',  color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
  { value: 'family',     label: 'Family Function', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  { value: 'other',      label: 'Other',            color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
]

const STATUS_CONF = {
  pending:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Pending',  icon: Clock       },
  approved: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Approved', icon: CheckCircle },
  rejected: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Rejected', icon: XCircle     },
}

const EMPTY_FORM = { type: 'sick', dateFrom: '', dateTo: '', reason: '' }
const inp = { style: { width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } }

export default function StudentLeaves() {
  const cu = useCurrentUser()

  const [leaves,    setLeaves   ] = useState([])
  const [loading,   setLoading  ] = useState(true)
  const [showForm,  setShowForm ] = useState(false)
  const [form,      setForm     ] = useState(EMPTY_FORM)
  const [saving,    setSaving   ] = useState(false)
  const [error,     setError    ] = useState('')

  const loadLeaves = () => {
    setLoading(true)
    fetch('/api/leaves?my=true')
      .then(r => r.json())
      .then(d => setLeaves(Array.isArray(d) ? d : []))
      .catch(() => setLeaves([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!cu.mounted) return
    loadLeaves()
  }, [cu.mounted])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.dateFrom || !form.dateTo) { setError('Please select dates.'); return }
    if (new Date(form.dateTo) < new Date(form.dateFrom)) { setError('End date must be after start date.'); return }
    if (!form.reason.trim()) { setError('Please provide a reason.'); return }
    setError('')
    setSaving(true)

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leave_type: form.type,
          start_date: form.dateFrom,
          end_date:   form.dateTo,
          reason:     form.reason.trim(),
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to submit')
      toast.success('Leave request submitted!')
      setShowForm(false)
      setForm(EMPTY_FORM)
      loadLeaves()
    } catch (err) {
      toast.error(err.message || 'Failed to submit leave request')
    } finally {
      setSaving(false)
    }
  }

  const pendingCount  = leaves.filter(l => l.status === 'pending').length
  const approvedCount = leaves.filter(l => l.status === 'approved').length
  const totalDays     = leaves.filter(l => l.status === 'approved').reduce((s, l) => s + (l.days_count || 1), 0)

  if (!cu.mounted) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Leave Requests</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Submit and track your leave applications</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 11, border: 'none', background: '#7C3AED', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(124,58,237,0.30)' }}>
          <Plus size={14} /> Apply for Leave
        </motion.button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Total Applications', value: leaves.length, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Pending Review',     value: pendingCount,  color: '#D97706', bg: '#FFFBEB' },
          { label: 'Days Approved',      value: totalDays,     color: '#059669', bg: '#ECFDF5' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-0.02em', margin: '0 0 4px' }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Leave list */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>My Leave History</h2>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#7C3AED', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Loading leave history…</p>
          </div>
        ) : leaves.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <CalendarDays size={32} color="#E2E8F0" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', margin: 0 }}>No leave applications yet</p>
            <p style={{ fontSize: 12, color: '#CBD5E1', marginTop: 6 }}>Click "Apply for Leave" to submit your first request</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {leaves.map((leave, i) => {
              const lt     = LEAVE_TYPES.find(t => t.value === (leave.leave_type || leave.type)) || LEAVE_TYPES[5]
              const st     = STATUS_CONF[leave.status] || STATUS_CONF.pending
              const Icon   = st.icon
              const fromDate = leave.start_date || leave.from_date || ''
              const toDate   = leave.end_date   || leave.to_date   || ''
              return (
                <motion.div key={leave.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  style={{ padding: '16px 20px', borderBottom: i < leaves.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: lt.bg, border: `1px solid ${lt.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <CalendarDays size={17} style={{ color: lt.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', margin: 0 }}>{lt.label}</p>
                      {leave.days_count && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', background: '#F1F5F9', padding: '1px 7px', borderRadius: 99 }}>
                          {leave.days_count} day{leave.days_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 4px' }}>
                      {fromDate} → {toDate}
                    </p>
                    {leave.reason && <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>"{leave.reason}"</p>}
                    <p style={{ fontSize: 10, color: '#CBD5E1', marginTop: 4 }}>
                      Submitted: {new Date(leave.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: st.bg, color: st.color, border: `1px solid ${st.border}`, flexShrink: 0 }}>
                    <Icon size={10} /> {st.label}
                  </span>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Leave Application Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.52)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={() => { setShowForm(false); setError('') }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: '#FFF', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,23,42,0.22)' }}
              onClick={e => e.stopPropagation()}>

              <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#FFF', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CalendarDays size={15} style={{ color: '#7C3AED' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Apply for Leave</p>
                    <p style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>Request will be sent for approval</p>
                  </div>
                </div>
                <button onClick={() => { setShowForm(false); setError('') }} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
                  <X size={13} />
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>Applicant</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>{cu.name || '—'}</p>
                  <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{cu.classSection ? `Class ${cu.classSection}` : 'Class not set'}</p>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Leave Type *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {LEAVE_TYPES.map(lt => (
                      <button key={lt.value} type="button" onClick={() => setForm(f => ({ ...f, type: lt.value }))}
                        style={{ padding: '8px 4px', borderRadius: 9, border: `1.5px solid ${form.type === lt.value ? lt.border : '#E2E8F0'}`, background: form.type === lt.value ? lt.bg : '#F8FAFC', color: form.type === lt.value ? lt.color : '#64748B', fontSize: 11, fontWeight: form.type === lt.value ? 700 : 500, cursor: 'pointer', transition: 'all 0.13s', textAlign: 'center' }}>
                        {lt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>From *</label>
                    <input type="date" value={form.dateFrom} onChange={set('dateFrom')} required min="2000-01-01" max="2099-12-31" {...inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>To *</label>
                    <input type="date" value={form.dateTo} onChange={set('dateTo')} min={form.dateFrom || '2000-01-01'} max="2099-12-31" required {...inp} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Reason *</label>
                  <textarea value={form.reason} onChange={set('reason')} placeholder="Briefly explain the reason for your leave..." rows={3} required
                    style={{ ...inp.style, resize: 'vertical', lineHeight: 1.5 }} />
                </div>

                {error && <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 500, margin: 0 }}>{error}</p>}

                <motion.button type="submit" disabled={saving} whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: 0.98 }}
                  style={{ padding: '11px 20px', borderRadius: 11, border: 'none', background: '#7C3AED', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Submitting…' : <><Send size={14} /> Submit Leave Request</>}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
