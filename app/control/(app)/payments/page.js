'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Check, Clock, AlertTriangle, X, Plus } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_CONFIG = {
  paid:     { bg: '#F0FDF4', color: '#15803D', label: 'Paid'     },
  pending:  { bg: '#FFF7ED', color: '#C2410C', label: 'Pending'  },
  overdue:  { bg: '#FEF2F2', color: '#B91C1C', label: 'Overdue'  },
  waived:   { bg: '#EEF4FA', color: '#475569', label: 'Waived'   },
}

function Badge({ status }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: s.bg, color: s.color }}>{s.label}</span>
}

// Month picker: last 12 months
function monthOptions() {
  const opts = []
  const now = new Date()
  for (let i = 0; i < 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push({
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }),
    })
  }
  return opts
}

const MONTHS = monthOptions()

export default function PaymentsPage() {
  const [payments,  setPayments ] = useState([])
  const [total,     setTotal    ] = useState(0)
  const [loading,   setLoading  ] = useState(true)
  const [filter,    setFilter   ] = useState({ month: '', status: '' })
  const [page,      setPage     ] = useState(1)

  // Mark paid modal
  const [modal, setModal] = useState(null) // null | payment row
  const [form,  setForm ] = useState({ institution_id: '', billing_month: MONTHS[0].value, amount: '', gst_percent: 18, payment_status: 'paid', payment_method: 'bank_transfer', payment_date: new Date().toISOString().slice(0, 10), notes: '' })
  const [saving, setSaving] = useState(false)

  async function load(f = filter, pg = page) {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (f.month)  p.set('month', f.month)
      if (f.status) p.set('status', f.status)
      p.set('page', pg)
      const res  = await fetch('/api/control/payments?' + p)
      const json = await res.json()
      setPayments(json.payments || [])
      setTotal(json.total || 0)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function changeFilter(k, v) {
    const f = { ...filter, [k]: v }
    setFilter(f); setPage(1); load(f, 1)
  }

  async function savePayment() {
    setSaving(true)
    try {
      const res = await fetch('/api/control/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(json.invoiceNumber ? `Saved. Invoice: ${json.invoiceNumber}` : 'Payment saved.')
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally { setSaving(false) }
  }

  const inputStyle = {
    width: '100%', height: 40, boxSizing: 'border-box', padding: '0 12px',
    border: '1px solid #C0D5E9', borderRadius: 8, fontSize: 13.5, color: '#0F172A',
    fontFamily: 'inherit', outline: 'none', background: '#FAFCFF',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 4px' }}>Payments</h1>
          <p style={{ fontSize: 13.5, color: '#64748B', margin: 0 }}>Track monthly billing across all institutions</p>
        </div>
        <button
          onClick={() => { setForm({ institution_id: '', billing_month: MONTHS[0].value, amount: '', gst_percent: 18, payment_status: 'paid', payment_method: 'bank_transfer', payment_date: new Date().toISOString().slice(0, 10), notes: '' }); setModal('new') }}
          className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Plus size={14} /> Record Payment
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filter.month} onChange={e => changeFilter('month', e.target.value)}
          style={{ height: 38, padding: '0 12px', borderRadius: 9, border: '1px solid #C0D5E9', background: 'white', fontSize: 13.5, color: '#0F172A', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
          <option value="">All Months</option>
          {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={filter.status} onChange={e => changeFilter('status', e.target.value)}
          style={{ height: 38, padding: '0 12px', borderRadius: 9, border: '1px solid #C0D5E9', background: 'white', fontSize: 13.5, color: '#0F172A', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', border: '1px solid #C0D5E9', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(26,58,96,0.08)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: 12, padding: '12px 20px', borderBottom: '1px solid #DDE9F5', background: '#EEF4FA' }}>
          {['Institution', 'Month', 'Amount', 'GST', 'Total', 'Status'].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: 24, height: 24, border: '2.5px solid #C0D5E9', borderTop: '2.5px solid #3B82F6', borderRadius: '50%', margin: '0 auto' }} className="animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>
            <CreditCard size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No payment records found</p>
          </div>
        ) : payments.map(p => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: 12, padding: '13px 20px', borderBottom: '1px solid #F8FAFC', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A', margin: '0 0 1px' }}>{p.institutions?.name || '—'}</p>
              <p style={{ fontSize: 11.5, color: '#94A3B8', margin: 0 }}>{p.invoice_number || 'No invoice'}</p>
            </div>
            <span style={{ fontSize: 13, color: '#475569' }}>{new Date(p.billing_month).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>₹{(p.amount || 0).toLocaleString('en-IN')}</span>
            <span style={{ fontSize: 12.5, color: '#64748B' }}>₹{(p.gst_amount || 0).toLocaleString('en-IN')}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>₹{(p.total_amount || 0).toLocaleString('en-IN')}</span>
            <Badge status={p.payment_status} />
          </div>
        ))}
      </div>

      {/* Record Payment Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 32, width: '100%', maxWidth: 500, boxShadow: '0 24px 64px rgba(15,23,42,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>Record Payment</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Institution ID</label>
                <input value={form.institution_id} onChange={e => setForm(p => ({ ...p, institution_id: e.target.value }))} placeholder="Paste institution UUID" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Billing Month</label>
                  <select value={form.billing_month} onChange={e => setForm(p => ({ ...p, billing_month: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Amount (₹ excl. GST)</label>
                  <input type="number" min="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>GST %</label>
                  <input type="number" min="0" max="100" value={form.gst_percent} onChange={e => setForm(p => ({ ...p, gst_percent: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Status</label>
                  <select value={form.payment_status} onChange={e => setForm(p => ({ ...p, payment_status: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Payment Method</label>
                  <select value={form.payment_method} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {['bank_transfer','upi','card','cheque','other'].map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Payment Date</label>
                  <input type="date" value={form.payment_date} onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={savePayment} disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={14} /> {saving ? 'Saving…' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
