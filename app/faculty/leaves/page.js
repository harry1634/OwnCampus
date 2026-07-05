'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, CheckCircle, XCircle, Plus, X, Calendar, FileText, Trash2, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrentUser } from '@/lib/useCurrentUser'

const LEAVE_TYPES = [
  { label: 'Sick Leave',          emoji: '🤒', value: 'sick',       color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  { label: 'Casual Leave',        emoji: '🏖️', value: 'casual',     color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { label: 'Earned Leave',        emoji: '🌴', value: 'earned',     color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  { label: 'Personal Leave',      emoji: '👤', value: 'personal',   color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  { label: 'Emergency Leave',     emoji: '🚨', value: 'emergency',  color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
  { label: 'Maternity/Paternity', emoji: '👶', value: 'maternity',  color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
]

const LEAVE_LIMITS = { sick: 12, casual: 10, earned: 15, personal: 5, emergency: 3, maternity: 90 }

const STATUS_CONF = {
  pending:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Clock,       label: 'Pending'  },
  approved: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: CheckCircle, label: 'Approved' },
  rejected: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: XCircle,     label: 'Rejected' },
}

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }
function daysBetween(from, to) { return Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1) }

function Ring({ pct, color, size = 56, stroke = 5 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }} />
    </svg>
  )
}

function ApplyModal({ onClose, onSubmit, myName }) {
  const [selType, setSelType] = useState(LEAVE_TYPES[0].value)
  const [from,    setFrom   ] = useState('')
  const [to,      setTo     ] = useState('')
  const [reason,  setReason ] = useState('')
  const [busy,    setBusy   ] = useState(false)

  const days     = from && to && new Date(to) >= new Date(from) ? daysBetween(from, to) : null
  const typeConf = LEAVE_TYPES.find(t => t.value === selType)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!from || !to)   { toast.error('Select from and to dates'); return }
    if (!reason.trim()) { toast.error('Enter a reason'); return }
    if (new Date(to) < new Date(from)) { toast.error('End date must be after start date'); return }
    setBusy(true)
    try {
      await onSubmit({ type: selType, from, to, reason: reason.trim() })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.50)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#FFFFFF', borderRadius: 24, width: '100%', maxWidth: 520, boxShadow: '0 32px 80px rgba(0,0,0,0.22)', overflow: 'hidden' }}>

        <div style={{ padding: '20px 24px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6,78,59,0.06)' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>Apply for Leave</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Submitting as <strong>{myName}</strong></p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} color="#64748B" />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Leave Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {LEAVE_TYPES.map(t => {
                const active = selType === t.value
                return (
                  <motion.button key={t.value} type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setSelType(t.value)}
                    style={{ padding: '10px 8px', borderRadius: 12, border: `2px solid ${active ? t.color : '#E2E8F0'}`, background: active ? t.bg : '#F8FAFC', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', boxShadow: active ? `0 0 0 3px ${t.color}20` : 'none' }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{t.emoji}</div>
                    <p style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? t.color : '#64748B', margin: 0, lineHeight: 1.3 }}>{t.label}</p>
                  </motion.button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Date Range</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['From', from, setFrom], ['To', to, setTo]].map(([lbl, val, setter]) => (
                <div key={lbl}>
                  <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 5 }}>{lbl}</p>
                  <input type="date" value={val} onChange={e => setter(e.target.value)}
                    min="2000-01-01" max="2099-12-31"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', background: '#F8FAFC', cursor: 'pointer' }} />
                </div>
              ))}
            </div>
            <AnimatePresence>
              {days && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 10, background: typeConf?.bg, border: `1px solid ${typeConf?.border}` }}>
                  <Calendar size={13} style={{ color: typeConf?.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: typeConf?.color }}>{days} day{days > 1 ? 's' : ''}</span>
                  <span style={{ fontSize: 12, color: typeConf?.color, opacity: 0.7 }}>· {fmtDate(from)} → {fmtDate(to)}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Reason</label>
              <span style={{ fontSize: 10, color: reason.length > 200 ? '#DC2626' : '#94A3B8' }}>{reason.length}/250</span>
            </div>
            <textarea value={reason} onChange={e => setReason(e.target.value.slice(0, 250))} rows={3}
              placeholder="Briefly explain your reason..."
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', background: '#F8FAFC', resize: 'none', lineHeight: 1.6 }} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <motion.button type="submit" disabled={busy} whileHover={{ scale: busy ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}
              style={{ flex: 2, padding: '12px', borderRadius: 12, background: '#064E3B', color: '#FFFFFF', border: 'none', fontSize: 13, fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(6,78,59,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Submitting…' : <><FileText size={14} /> Submit Application</>}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default function FacultyLeaves() {
  const cu     = useCurrentUser()
  const myName = cu.name || cu.email || ''

  const [myLeaves,      setMyLeaves     ] = useState([])
  const [studentLeaves, setStudentLeaves] = useState([])
  const [loading,       setLoading      ] = useState(true)
  const [showModal,     setShowModal    ] = useState(false)
  const [filter,        setFilter       ] = useState('all')

  const loadMyLeaves = useCallback(async () => {
    try {
      const res  = await fetch('/api/leaves?my=true')
      const data = await res.json()
      setMyLeaves(Array.isArray(data) ? data : [])
    } catch { setMyLeaves([]) }
    finally { setLoading(false) }
  }, [])

  const loadStudentLeaves = useCallback(async () => {
    try {
      const res  = await fetch('/api/leaves?status=pending')
      const data = await res.json()
      setStudentLeaves(Array.isArray(data) ? data.filter(l => l.user_profiles?.role === 'student') : [])
    } catch { setStudentLeaves([]) }
  }, [])

  useEffect(() => {
    if (!cu.mounted) return
    loadMyLeaves()
    loadStudentLeaves()
  }, [cu.mounted])

  const handleSubmit = async ({ type, from, to, reason }) => {
    const res  = await fetch('/api/leaves', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ leave_type: type, start_date: from, end_date: to, reason }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || 'Failed')
    toast.success('Leave application submitted!')
    loadMyLeaves()
  }

  const cancelLeave = async (id) => {
    try {
      await fetch(`/api/leaves?id=${id}`, { method: 'DELETE' })
      toast.success('Leave request cancelled')
      loadMyLeaves()
    } catch { toast.error('Failed to cancel leave') }
  }

  const handleStudentLeaveAction = async (id, status) => {
    try {
      const res  = await fetch('/api/leaves', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id, status }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed')
      toast.success(`Leave ${status === 'approved' ? 'approved' : 'rejected'}`)
      loadStudentLeaves()
    } catch (err) { toast.error(err.message || 'Action failed') }
  }

  const balance = LEAVE_TYPES.map(t => {
    const total    = LEAVE_LIMITS[t.value] || 10
    const approved = myLeaves.filter(l => (l.leave_type || l.type) === t.value && l.status === 'approved').reduce((s, l) => s + (l.days_count || 1), 0)
    return { ...t, total, used: Math.min(approved, total), remaining: Math.max(0, total - approved) }
  })

  const filtered = filter === 'all' ? myLeaves : myLeaves.filter(l => l.status === filter)
  const pending  = myLeaves.filter(l => l.status === 'pending').length
  const approved = myLeaves.filter(l => l.status === 'approved').length

  if (!cu.mounted) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Leave Management</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Apply for leave and track your requests</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: '#064E3B', color: '#FFFFFF', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(6,78,59,0.35)' }}>
          <Plus size={15} /> Apply Leave
        </motion.button>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Applied', value: myLeaves.length,                                    color: '#0F172A', bg: '#F8FAFC', border: '#E2E8F0' },
          { label: 'Pending',       value: pending,                                             color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
          { label: 'Approved',      value: approved,                                            color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
          { label: 'Rejected',      value: myLeaves.filter(l => l.status === 'rejected').length, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: '12px 20px', borderRadius: 12, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</span>
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{s.label}</span>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
        {balance.map((lb, i) => {
          const pct = lb.total > 0 ? Math.min(100, (lb.used / lb.total) * 100) : 0
          return (
            <motion.div key={lb.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{ background: '#FFFFFF', borderRadius: 16, border: `1px solid ${lb.border}`, padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 18 }}>{lb.emoji}</span>
                <div style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ring pct={pct} color={lb.color} size={48} stroke={5} />
                  <span style={{ position: 'absolute', fontSize: 11, fontWeight: 800, color: lb.color }}>{lb.remaining}</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', margin: '0 0 2px', lineHeight: 1.3 }}>{lb.label}</p>
                <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>{lb.used} used · {lb.total} total</p>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
                  style={{ height: '100%', borderRadius: 99, background: lb.color }} />
              </div>
            </motion.div>
          )
        })}
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Leave History</h3>
          <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 10, padding: 4 }}>
            {['all', 'pending', 'approved', 'rejected'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '5px 12px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: filter === f ? 700 : 500, cursor: 'pointer', background: filter === f ? '#FFFFFF' : 'transparent', color: filter === f ? '#0F172A' : '#64748B', boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.10)' : 'none', textTransform: 'capitalize', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                {f === 'all' ? `All (${myLeaves.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${myLeaves.filter(l => l.status === f).length})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#059669', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <Calendar size={36} style={{ color: '#E2E8F0', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>No {filter === 'all' ? '' : filter} leave requests</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
              {filter === 'all' ? 'Click "Apply Leave" to submit your first request.' : `No ${filter} applications found.`}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((leave, i) => {
              const conf       = STATUS_CONF[leave.status] || STATUS_CONF.pending
              const StatusIcon = conf.icon
              const leaveType  = leave.leave_type || leave.type || ''
              const typeConf   = LEAVE_TYPES.find(t => t.value === leaveType) || LEAVE_TYPES[0]
              const fromDate   = leave.start_date || leave.from || ''
              const toDate     = leave.end_date   || leave.to   || ''
              return (
                <motion.div key={leave.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}
                  style={{ padding: '16px 20px', borderBottom: i < filtered.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'flex-start', gap: 14 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>

                  <div style={{ width: 44, height: 44, borderRadius: 12, background: typeConf.bg, border: `1px solid ${typeConf.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
                    {typeConf.emoji}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', margin: 0 }}>{typeConf.label}</p>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: conf.bg, color: conf.color, border: `1px solid ${conf.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <StatusIcon size={9} /> {conf.label}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: '#F1F5F9', color: '#64748B' }}>
                        {leave.days_count} day{leave.days_count > 1 ? 's' : ''}
                      </span>
                    </div>
                    {leave.reason && <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 4px', lineHeight: 1.5 }}>{leave.reason}</p>}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={10} />
                        {fmtDate(fromDate)}{fromDate !== toDate ? ` → ${fmtDate(toDate)}` : ''}
                      </span>
                      {leave.created_at && (
                        <>
                          <span style={{ fontSize: 11, color: '#CBD5E1' }}>·</span>
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>Applied {fmtDate(leave.created_at)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {leave.status === 'pending' && (
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => cancelLeave(leave.id)}
                      title="Cancel request"
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <Trash2 size={12} style={{ color: '#DC2626' }} />
                    </motion.button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Student Leave Requests (pending approvals) */}
      {studentLeaves.length > 0 && (
        <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={15} style={{ color: '#D97706' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Student Leave Requests</h2>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                {studentLeaves.filter(l => l.status === 'pending').length} pending · {studentLeaves.length} total
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {studentLeaves.map((leave, i) => {
              const leaveType = leave.leave_type || leave.type || ''
              const typeConf  = LEAVE_TYPES.find(t => t.value === leaveType) || LEAVE_TYPES[0]
              const profile   = leave.user_profiles || {}
              const name      = profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Student'
              const fromDate  = leave.start_date || leave.from_date || ''
              const toDate    = leave.end_date   || leave.to_date   || ''
              const isPending = leave.status === 'pending'
              return (
                <div key={leave.id} style={{ padding: '14px 22px', borderBottom: i < studentLeaves.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: typeConf.bg, border: `1px solid ${typeConf.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {typeConf.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>{name}</p>
                      <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: '#F5F3FF', color: '#7C3AED', fontWeight: 600 }}>{typeConf.label}</span>
                    </div>
                    {leave.reason && <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 3px', fontStyle: 'italic' }}>"{leave.reason}"</p>}
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{fromDate} → {toDate} · {leave.days_count} day{leave.days_count > 1 ? 's' : ''}</p>
                  </div>
                  {isPending ? (
                    <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => handleStudentLeaveAction(leave.id, 'approved')}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid #A7F3D0', background: '#ECFDF5', color: '#059669', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        <CheckCircle size={11} /> Approve
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => handleStudentLeaveAction(leave.id, 'rejected')}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        <XCircle size={11} /> Reject
                      </motion.button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: leave.status === 'approved' ? '#ECFDF5' : '#FEF2F2', color: leave.status === 'approved' ? '#059669' : '#DC2626', border: `1px solid ${leave.status === 'approved' ? '#A7F3D0' : '#FECACA'}`, flexShrink: 0 }}>
                      {leave.status === 'approved' ? 'Approved' : 'Rejected'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showModal && <ApplyModal onClose={() => setShowModal(false)} onSubmit={handleSubmit} myName={myName} />}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
