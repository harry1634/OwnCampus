'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Plus, CreditCard, AlertCircle, BookOpen, TrendingUp, ArrowUpRight, ArrowDownRight, X, Check } from 'lucide-react'
import { downloadCSV } from '@/lib/exportUtils'
import { toast } from 'sonner'
import Pagination from '@/components/ui/Pagination'
import Dropdown from '@/components/ui/Dropdown'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const TERMS    = ['2026-27, Term 1', '2025-26, Term 2', '2025-26, Term 1', '2024-25, Term 2']
const STATUSES = ['All', 'Success', 'Pending', 'Failed']
const MODES    = ['UPI', 'Card', 'Bank Transfer', 'Cash', 'Cheque']
const AVATAR_COLORS = ['#2563EB','#7C3AED','#0891B2','#16A34A','#D97706','#DB2777']

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const statusStyle = {
  Success: { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  Pending: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  Failed:  { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
}

const parseAmt = (s) => parseInt(String(s).replace(/[₹,]/g, ''), 10) || 0
const fmtL     = (n) => `₹${(n / 100000).toFixed(1)}L`

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 14px', fontSize: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}>
      <p style={{ fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{label}</p>
      {payload.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.color }} />
          <span style={{ color: '#64748B' }}>{e.name === 'collected' ? 'Collected' : 'Target'}:</span>
          <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{(e.value / 100000).toFixed(1)}L</span>
        </div>
      ))}
    </div>
  )
}

// ── Record Payment Modal ──
function PaymentModal({ onClose, onAdd, students = [] }) {
  const [form, setForm] = useState({ name: '', cls: '', amount: '', mode: 'Cash', status: 'Success' })
  const [saved,    setSaved   ] = useState(false)
  const [saving,   setSaving  ] = useState(false)
  const [matches,  setMatches ] = useState([])
  const [selected, setSelected] = useState(null)   // matched student object
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Live student search as user types the name
  const handleNameChange = (e) => {
    const val = e.target.value
    setForm(f => ({ ...f, name: val }))
    setSelected(null)
    if (val.trim().length >= 2) {
      const q = val.toLowerCase()
      setMatches(students.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.roll?.toLowerCase().includes(q)
      ).slice(0, 5))
    } else {
      setMatches([])
    }
  }

  const pickStudent = (s) => {
    setSelected(s)
    setForm(f => ({ ...f, name: s.name, cls: s.class || s.cls || '' }))
    setMatches([])
  }

  const handleSave = async () => {
    if (!form.name || !form.amount) return
    setSaving(true)
    const paidNow = parseInt(String(form.amount).replace(/,/g, '') || 0)
    if (paidNow <= 0) { setSaving(false); return }

    try {
      let receiptNumber = null

      // ── Primary: use the fee-payments API (persists to Supabase) ──
      const match = selected || students.find(s => {
        const n = form.name.toLowerCase()
        return s.name?.toLowerCase().includes(n) || n.includes(s.name?.toLowerCase() || '')
      })

      if (match) {
        // Always write to DB regardless of payment status
        // payment_status: 'paid' updates student balance; 'pending' records the attempt only
        const dbPaymentStatus = form.status === 'Success' ? 'paid' : 'pending'
        const body = match.studentRowId
          ? { student_id: match.studentRowId, amount: paidNow, payment_mode: form.mode.toLowerCase(), payment_status: dbPaymentStatus }
          : { user_id:    match.supabaseId,   amount: paidNow, payment_mode: form.mode.toLowerCase(), payment_status: dbPaymentStatus }

        const res  = await fetch('/api/fee-payments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!json.success) {
          toast.error(json.error || 'Failed to save payment. Please try again.')
          setSaving(false)
          return
        }
        receiptNumber = json.receipt_number
      } else if (form.status === 'Success') {
        toast.error('No matching student found. Select a student from the dropdown first.')
        setSaving(false)
        return
      }

      setSaved(true)
      await new Promise(r => setTimeout(r, 400))

      const inits = form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      onAdd({
        initials: inits,
        color:    AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        name:     form.name,
        cls:      form.cls,
        amount:   `₹${paidNow.toLocaleString('en-IN')}`,
        mode:     form.mode,
        receipt:  receiptNumber,
        date:     new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        status:   form.status,
      })
      onClose()
    } catch {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: 'calc(var(--header-height) + 24px) 24px 40px' }}
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#FFFFFF', borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(100vh - var(--header-height) - 64px)' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Record Payment</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Add a fee payment transaction</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="rg-2">
            <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>Student Name / Roll No. *</label>
              <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Type name or roll number…" value={form.name} onChange={handleNameChange} autoComplete="off" />
              {matches.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden', marginTop: 2 }}>
                  {matches.map(s => (
                    <button key={s.supabaseId || s.id} onClick={() => pickStudent(s)}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#0F172A', borderBottom: '1px solid #F1F5F9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                      <span style={{ color: '#94A3B8', marginLeft: 8, fontSize: 11 }}>{s.roll} · {s.class || s.cls || ''}</span>
                      {s.totalFee > 0 && <span style={{ float: 'right', fontSize: 11, color: s.fees === 'paid' ? '#16A34A' : '#F59E0B' }}>
                        ₹{(s.paidAmount||0).toLocaleString('en-IN')} / ₹{(s.totalFee||0).toLocaleString('en-IN')}
                      </span>}
                    </button>
                  ))}
                </div>
              )}
              {selected && <p style={{ fontSize: 11, color: '#16A34A', marginTop: 4 }}>✓ Matched: {selected.name} — Balance ₹{Math.max((selected.totalFee||0)-(selected.paidAmount||0),0).toLocaleString('en-IN')}</p>}
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>Class</label>
              <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="e.g. 10-A" value={form.cls} onChange={set('cls')} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>Amount (₹) *</label>
              <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="e.g. 24500" value={form.amount} onChange={set('amount')} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>Payment Mode</label>
              <select className="input-premium" style={{ width: '100%' }} value={form.mode} onChange={set('mode')}>
                {MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>Status</label>
              <select className="input-premium" style={{ width: '100%' }} value={form.status} onChange={set('status')}>
                {['Success', 'Pending', 'Failed'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave}
            disabled={saving}
            style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: saved ? '#16A34A' : '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: 'background 0.2s', opacity: saving ? 0.7 : 1 }}>
            {saved ? <><Check size={14} /> Saved!</> : saving ? <>Saving…</> : <><Plus size={14} /> Record Payment</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

const TX_PAGE_SIZE = 5

export default function FinancePage() {
  const [students, setStudents] = useState([])

  const [term, setTerm]       = useState('2026-27, Term 1')
  const [status, setStatus]   = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [mounted, setMounted]     = useState(false)
  const [loadingTx, setLoadingTx] = useState(true)
  const [showAll, setShowAll]     = useState(false)
  const [txPage, setTxPage]       = useState(1)

  useEffect(() => {
    setMounted(true)
    fetch('/api/students').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setStudents(d) }).catch(() => {})

    fetch('/api/fee-payments')
      .then(r => r.ok ? r.json() : [])
      .then(apiRows => {
        const apiTx = (Array.isArray(apiRows) ? apiRows : []).map(p => ({
          id:       p.id,
          initials: '',
          color:    AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
          name:     p.student_name || '—',
          cls:      p.student_class || '',
          amount:   `₹${Number(p.amount || 0).toLocaleString('en-IN')}`,
          mode:     p.payment_mode || p.payment_method || 'Cash',
          receipt:  p.receipt_number || null,
          date:     p.payment_date
            ? new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
            : '',
          status:   p.status === 'paid' ? 'Success' : p.status === 'pending' ? 'Pending' : 'Failed',
          fromApi:  true,
        }))
        setTransactions(apiTx)
      })
      .catch(() => setTransactions([]))
      .finally(() => setLoadingTx(false))
  }, [])

  const addTransaction = (tx) => {
    setTransactions(prev => [tx, ...prev])
  }

  // ── Derived financials from real transactions ──────────────────────────────
  const collectedAmt   = transactions.filter(t => t.status === 'Success').reduce((s, t) => s + parseAmt(t.amount), 0)
  const pendingAmt     = transactions.filter(t => t.status === 'Pending').reduce((s, t) => s + parseAmt(t.amount), 0)
  // Include Failed transactions in totalAmt so collection rate is not artificially inflated
  const failedAmt      = transactions.filter(t => t.status === 'Failed').reduce((s, t) => s + parseAmt(t.amount), 0)
  const totalAmt       = collectedAmt + pendingAmt + failedAmt
  const collRate       = totalAmt > 0 ? Math.round((collectedAmt / totalAmt) * 100) : 0

  const kpis = [
    { label: 'Collected',       value: collectedAmt > 0 ? fmtL(collectedAmt) : '₹0',  icon: CreditCard,  iconColor: '#16A34A', iconBg: '#F0FDF4', positive: true, change: `${transactions.filter(t=>t.status==='Success').length} payments`, sub: 'successful transactions' },
    { label: 'Pending Dues',    value: pendingAmt > 0   ? fmtL(pendingAmt)   : '₹0',  icon: AlertCircle, iconColor: '#EF4444', iconBg: '#FEF2F2', positive: false, change: `${transactions.filter(t=>t.status==='Pending').length} pending`,  sub: 'awaiting confirmation'   },
    { label: 'Total Recorded',  value: String(transactions.length),                    icon: BookOpen,    iconColor: '#7C3AED', iconBg: '#F5F3FF', positive: true, change: `${transactions.filter(t=>t.status==='Failed').length} failed`, sub: 'all transactions' },
    { label: 'Collection Rate', value: `${collRate}%`,                                 icon: TrendingUp,  iconColor: '#2563EB', iconBg: '#EFF6FF', positive: collRate >= 50, change: collRate >= 50 ? 'On track' : 'Needs attention', sub: 'success vs total' },
  ]

  // Build chart from real data — group successful payments by month
  const chartData = MONTH_ABBR.map(m => ({
    month: m,
    collected: transactions.filter(t => t.status === 'Success' && (t.date || '').includes(m)).reduce((s, t) => s + parseAmt(t.amount), 0),
    target: 9000000,
  }))

  // Overdue: students with Pending/Failed transactions
  const overdueStudents = transactions
    .filter(t => t.status === 'Pending' || t.status === 'Failed')
    .reduce((acc, t) => {
      const key = t.cls || 'Unknown'
      if (!acc[key]) acc[key] = { grade: key, students: 0, total: 0 }
      acc[key].students++
      acc[key].total += parseAmt(t.amount)
      return acc
    }, {})
  const overdueBreakdown = Object.values(overdueStudents)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)
    .map(d => ({ ...d, outstanding: fmtL(d.total), pct: Math.min(100, Math.round((d.total / Math.max(pendingAmt, 1)) * 100)) }))
  // ──────────────────────────────────────────────────────────────────────────

  const filtered = status === 'All' ? transactions : transactions.filter(t => t.status === status)
  const txTotalPages = Math.max(1, Math.ceil(filtered.length / TX_PAGE_SIZE))
  const paginatedTx  = showAll ? filtered : filtered.slice((txPage - 1) * TX_PAGE_SIZE, txPage * TX_PAGE_SIZE)

  const exportLedger = () => {
    const headers = ['Student Name', 'Class', 'Amount', 'Payment Mode', 'Date', 'Status']
    const rows = transactions.map(t => [t.name, t.cls, t.amount, t.mode, t.date, t.status])
    downloadCSV(`finance-ledger-${term.replace(/[^a-z0-9]/gi, '-')}.csv`, headers, rows)
  }

  if (!mounted) return null

  const rateColor = collRate >= 75 ? '#16A34A' : collRate >= 50 ? '#D97706' : '#EF4444'
  const rateBg    = collRate >= 75 ? '#F0FDF4' : collRate >= 50 ? '#FFFBEB' : '#FEF2F2'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Finance</h1>
          <p className="page-header-sub">Fee collection, ledger &amp; financial overview</p>
        </div>
        <div className="page-actions">
          <Dropdown prefix="Term"   options={TERMS}    value={term}   onChange={setTerm}   />
          <Dropdown prefix="Status" options={STATUSES} value={status} onChange={setStatus} />
          <button className="btn-secondary" onClick={exportLedger}><Download size={15} /> Export Ledger</button>
          <motion.button whileHover={{ scale: 1.02 }} className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Record Payment
          </motion.button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {kpis.map((kpi, i) => {
          const KpiIcon = kpi.icon
          return (
            <motion.div key={kpi.label}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, ease: 'easeOut' }}
              whileHover={{ y: -4, boxShadow: `0 16px 40px ${kpi.iconColor}14` }}
              style={{ background: '#FFFFFF', border: '1px solid #E8EDF5', borderRadius: 16, padding: '20px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>

              {/* Left accent stripe */}
              <div style={{ position: 'absolute', top: 16, left: 0, width: 3, height: 32, borderRadius: '0 4px 4px 0', background: kpi.iconColor }} />

              {/* Icon + badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: kpi.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <KpiIcon size={18} style={{ color: kpi.iconColor }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: kpi.positive ? '#16A34A' : '#EF4444', background: kpi.positive ? '#F0FDF4' : '#FEF2F2', padding: '3px 9px', borderRadius: 99, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {kpi.change}
                </span>
              </div>

              {/* Value + label + sub */}
              <div>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>{kpi.value}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 2 }}>{kpi.label}</p>
                <p style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }}>{kpi.sub}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Collection Progress Summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
        style={{ background: '#FFFFFF', border: '1px solid #E8EDF5', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Collection Rate</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: rateColor, letterSpacing: '-0.02em' }}>{collRate}%</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: rateColor, background: rateBg, padding: '2px 8px', borderRadius: 6 }}>
              {collRate >= 75 ? 'On Track' : collRate >= 50 ? 'Moderate' : 'Needs Attention'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, background: '#16A34A', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#64748B' }}>Collected: <strong style={{ color: '#0F172A' }}>{collectedAmt > 0 ? fmtL(collectedAmt) : '₹0'}</strong></span>
            </div>
            {pendingAmt > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: '#EF4444', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#64748B' }}>Pending: <strong style={{ color: '#EF4444' }}>{fmtL(pendingAmt)}</strong></span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, background: '#94A3B8', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#64748B' }}>{transactions.length} transactions</span>
            </div>
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${collRate}%` }} transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 99, background: `linear-gradient(to right, ${rateColor}, ${rateColor}cc)` }} />
        </div>
      </motion.div>

      {/* Section divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>Charts</span>
        <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
      </div>

      {/* Chart + Overdue Breakdown */}
      <div className="rg-32">
        <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF5', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Collection vs Target</h3>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>Monthly in Lakhs (₹)</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#16A34A', background: '#F0FDF4', padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>{term}</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16A34A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="collected" name="collected" stroke="#16A34A" strokeWidth={2.5} fill="url(#collGrad)"
                dot={{ fill: '#16A34A', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#16A34A', strokeWidth: 0 }} />
              <Area type="monotone" dataKey="target" name="target" stroke="#CBD5E1" strokeWidth={1.5} fill="none"
                strokeDasharray="5 4" dot={false} activeDot={{ r: 3, fill: '#CBD5E1', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 20, marginTop: 14 }}>
            {[{ color: '#16A34A', label: 'Collected', dashed: false }, { color: '#CBD5E1', label: 'Target', dashed: true }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 18, height: 2, background: l.dashed ? 'transparent' : l.color, borderRadius: 1, borderTop: l.dashed ? '2px dashed #CBD5E1' : undefined, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{l.label}</span>
              </div>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8' }}>₹{(9000000/100000).toFixed(0)}L / month target</span>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF5', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Overdue Breakdown</h3>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>Classes with highest dues</p>
            </div>
            {overdueBreakdown.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', background: '#FEF2F2', padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {overdueBreakdown.reduce((s, d) => s + d.students, 0)} students
              </span>
            )}
          </div>
          {overdueBreakdown.length === 0 ? (
            <div style={{ padding: '28px 0', textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <AlertCircle size={20} style={{ color: '#CBD5E1' }} />
              </div>
              <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>No pending dues</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {overdueBreakdown.map((item, i) => {
                const barColor = item.pct >= 60 ? '#EF4444' : item.pct >= 30 ? '#D97706' : '#F59E0B'
                return (
                  <motion.div key={item.grade}
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 99, background: barColor, flexShrink: 0 }} />
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Class {item.grade}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>{item.students} student{item.students !== 1 ? 's' : ''}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{item.outstanding}</span>
                      </div>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: '#F1F5F9' }}>
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${item.pct}%` }} transition={{ delay: i * 0.1 + 0.2, duration: 0.6, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 99, background: barColor }} />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Section divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>Ledger</span>
        <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
      </div>

      {/* Recent Transactions */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF5', borderRadius: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Transaction Ledger</h3>
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}{status !== 'All' ? <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 5, background: '#EFF6FF', color: '#2563EB', fontSize: 10, fontWeight: 700 }}>{status}</span> : ''}
            </p>
          </div>
          <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => setShowAll(v => !v)}>
            {showAll ? 'Show Less' : 'View All'}
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Student', 'Class', 'Amount', 'Mode', 'Date', 'Status'].map(col => (
                  <th key={col} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em', borderBottom: '1px solid #F1F5F9' }}>{col.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedTx.length === 0 ? (
                <tr><td colSpan={6}>
                  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                      <BookOpen size={18} style={{ color: '#CBD5E1' }} />
                    </div>
                    <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>No {status !== 'All' ? status.toLowerCase() + ' ' : ''}transactions yet</p>
                  </div>
                </td></tr>
              ) : paginatedTx.map((tx, i) => {
                const s = statusStyle[tx.status] || statusStyle.Pending
                const initials = tx.initials || tx.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
                return (
                  <motion.tr key={i}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    style={{ borderBottom: i < paginatedTx.length - 1 ? '1px solid #F8FAFC' : 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFBFC'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '13px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: tx.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#FFFFFF', flexShrink: 0 }}>{initials}</div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{tx.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      {tx.cls ? <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: '#F1F5F9', color: '#475569' }}>{tx.cls}</span> : <span style={{ color: '#CBD5E1' }}>—</span>}
                    </td>
                    <td style={{ padding: '13px 20px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>{tx.amount}</span></td>
                    <td style={{ padding: '13px 20px' }}><span style={{ fontSize: 12, color: '#64748B' }}>{tx.mode}</span></td>
                    <td style={{ padding: '13px 20px' }}><span style={{ fontSize: 12, color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>{tx.date}</span></td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>{tx.status}</span>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
          {!showAll && (
            <Pagination
              page={txPage} totalPages={txTotalPages}
              totalItems={filtered.length} pageSize={TX_PAGE_SIZE}
              onPageChange={setTxPage} label="transactions"
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <PaymentModal
            students={students}
            onClose={() => setShowModal(false)}
            onAdd={(tx) => { addTransaction(tx); setTxPage(1) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
