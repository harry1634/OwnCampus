'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Plus, Clock, CheckCircle, XCircle, X, Trash2, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrentUser } from '@/lib/useCurrentUser'

const STATUS_CONF = {
  approved: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: CheckCircle, label: 'Approved' },
  pending:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Clock,        label: 'Pending'  },
  rejected: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: XCircle,      label: 'Rejected' },
}

const URGENCY_CONF = {
  low:    { color: '#64748B', bg: '#F8FAFC', label: 'Low'    },
  medium: { color: '#D97706', bg: '#FFFBEB', label: 'Medium' },
  high:   { color: '#DC2626', bg: '#FEF2F2', label: 'Urgent' },
}

export default function FacultyProcurement() {
  const cu = useCurrentUser()

  const [requests, setRequests] = useState([])
  const [showForm, setShowForm ] = useState(false)
  const [filter,   setFilter  ] = useState('all')
  const [form, setForm] = useState({ item: '', reason: '', qty: '', urgency: 'medium' })

  const fetchRequests = async () => {
    try {
      const res  = await fetch('/api/procurement/requests')
      const data = await res.json()
      setRequests(data.requests || [])
    } catch {}
  }

  useEffect(() => {
    if (!cu.mounted) return
    fetchRequests()
  }, [cu.mounted])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.item.trim() || !form.reason.trim()) { toast.error('Fill all required fields'); return }
    try {
      const res  = await fetch('/api/procurement/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: form.item, reason: form.reason, qty: form.qty, urgency: form.urgency }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to submit'); return }
      setRequests(prev => [data.request, ...prev])
      setShowForm(false)
      setForm({ item: '', reason: '', qty: '', urgency: 'medium' })
      toast.success('Request submitted to admin!')
    } catch { toast.error('Network error') }
  }

  const cancelRequest = async (id) => {
    try {
      await fetch('/api/procurement/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, cancel: true }),
      })
      setRequests(prev => prev.filter(r => r.id !== id))
      toast.success('Request cancelled')
    } catch { toast.error('Cancel failed') }
  }

  const filtered   = filter === 'all' ? requests : requests.filter(r => r.status === filter)
  const pending    = requests.filter(r => r.status === 'pending').length
  const approved   = requests.filter(r => r.status === 'approved').length

  if (!cu.mounted) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Equipment Requests</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Request supplies and equipment from admin</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: '#064E3B', color: '#FFFFFF', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(6,78,59,0.30)' }}>
          <Plus size={15} /> New Request
        </motion.button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Total',    value: requests.length, color: '#0F172A', bg: '#F8FAFC', border: '#E2E8F0' },
          { label: 'Pending',  value: pending,         color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
          { label: 'Approved', value: approved,        color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
        ].map(s => (
          <div key={s.label} style={{ padding: '10px 18px', borderRadius: 12, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 12, color: '#64748B' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 10, padding: 4, alignSelf: 'flex-start' }}>
        {['all','pending','approved','rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '5px 14px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: filter===f ? 700 : 500, cursor: 'pointer', background: filter===f ? '#FFFFFF' : 'transparent', color: filter===f ? '#0F172A' : '#64748B', boxShadow: filter===f ? '0 1px 3px rgba(0,0,0,0.10)' : 'none', textTransform: 'capitalize', transition: 'all 0.15s', fontFamily: 'inherit' }}>
            {f === 'all' ? `All (${requests.length})` : `${f.charAt(0).toUpperCase()+f.slice(1)} (${requests.filter(r=>r.status===f).length})`}
          </button>
        ))}
      </div>

      {/* Request list */}
      {filtered.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0' }}>
          <Package size={36} style={{ color: '#CBD5E1', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>
            {filter === 'all' ? 'No equipment requests yet' : `No ${filter} requests`}
          </p>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
            {filter === 'all' ? 'Click "New Request" to request supplies from admin.' : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence>
            {filtered.map((req, i) => {
              const conf    = STATUS_CONF[req.status] || STATUS_CONF.pending
              const urgConf = URGENCY_CONF[req.urgency] || URGENCY_CONF.medium
              const Icon    = conf.icon
              return (
                <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.04 }}
                  style={{ background: '#FFFFFF', borderRadius: 14, border: `1px solid ${conf.border}`, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: conf.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} style={{ color: conf.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', margin: 0 }}>{req.item}</p>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: conf.bg, color: conf.color, border: `1px solid ${conf.border}`, textTransform: 'uppercase' }}>{conf.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: urgConf.bg, color: urgConf.color }}>{urgConf.label}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 4px', lineHeight: 1.5 }}>{req.reason}</p>
                    <p style={{ fontSize: 11, color: '#94A3B8' }}>Requested on {(req.created_at || req.date || '').split('T')[0]}</p>
                  </div>
                  {req.status === 'pending' && (
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => cancelRequest(req.id)} title="Cancel request"
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <Trash2 size={12} style={{ color: '#DC2626' }} />
                    </motion.button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.50)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => setShowForm(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFFFFF', borderRadius: 22, width: '100%', maxWidth: 460, boxShadow: '0 32px 80px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6,78,59,0.06)' }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>New Equipment Request</p>
                  <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Will be reviewed by admin</p>
                </div>
                <button onClick={() => setShowForm(false)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} color="#64748B" />
                </button>
              </div>
              <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Item / Equipment *</label>
                  <input type="text" value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))} required
                    placeholder="e.g. Scientific Calculators"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', background: '#F8FAFC' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Quantity</label>
                  <input type="number" min="1" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                    placeholder="e.g. 30"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', background: '#F8FAFC' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Reason *</label>
                  <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} required
                    placeholder="Why is this needed?"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', background: '#F8FAFC', resize: 'none', lineHeight: 1.6 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Urgency</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['low','medium','high'].map(u => {
                      const uc = URGENCY_CONF[u]
                      const active = form.urgency === u
                      return (
                        <button key={u} type="button" onClick={() => setForm(f => ({ ...f, urgency: u }))}
                          style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `2px solid ${active ? uc.color : '#E2E8F0'}`, background: active ? uc.bg : '#F8FAFC', fontSize: 12, fontWeight: active ? 700 : 500, color: active ? uc.color : '#64748B', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                          {uc.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button type="button" onClick={() => setShowForm(false)}
                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                  <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    style={{ flex: 2, padding: '12px', borderRadius: 12, background: '#064E3B', color: '#FFFFFF', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(6,78,59,0.30)' }}>
                    Send Request
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
