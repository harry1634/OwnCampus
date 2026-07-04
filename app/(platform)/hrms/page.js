'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, Users, Clock, CheckCircle, XCircle, AlertCircle, Plus, Download, Calendar, CreditCard, ChevronDown, CalendarClock, DollarSign, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { downloadCSV, openPrintWindow } from '@/lib/exportUtils'

const leaveStatusConfig = {
  pending:  { label: 'Pending',  color: '#D97706', bg: '#FFFBEB', icon: Clock        },
  approved: { label: 'Approved', color: '#16A34A', bg: '#F0FDF4', icon: CheckCircle  },
  rejected: { label: 'Rejected', color: '#DC2626', bg: '#FEF2F2', icon: XCircle      },
}

const typeColors = {
  'Casual Leave': { color: '#2563EB', bg: '#EFF6FF' },
  'Sick Leave':   { color: '#0891B2', bg: '#ECFEFF' },
  'Earned Leave': { color: '#D97706', bg: '#FFFBEB' },
}

const payrollStatusStyle = {
  Processed: { color: '#16A34A', bg: '#F0FDF4' },
  Pending:   { color: '#D97706', bg: '#FFFBEB' },
}

const AVATAR_COLORS = ['#2563EB','#7C3AED','#0891B2','#16A34A','#D97706','#DB2777']
const getInits = (name) => (name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
const pickClr  = (i) => AVATAR_COLORS[i % AVATAR_COLORS.length]

// ── Apply Leave Modal ─────────────────────────────────────────────────────────
function ApplyLeaveModal({ onClose, onAdd, employees }) {
  const [form, setForm] = useState({ name: '', type: 'Casual Leave', from: '', to: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.name || !form.from || !form.to || submitting) return
    const fromD = new Date(form.from), toD = new Date(form.to)
    const days = Math.max(1, Math.round((toD - fromD) / 86400000) + 1)
    const idx = employees.findIndex(e => e.name === form.name)

    setSubmitting(true)
    try {
      const emp = employees[idx] || {}
      const res = await fetch('/api/hrms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:        'leave',
          leave_type:  form.type,
          start_date:  form.from,
          end_date:    form.to,
          days_count:  days,
          reason:      form.reason,
          user_id:     emp.supabaseId || emp.userId || null,
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        onAdd({
          id:       json.leave?.id || Date.now(),
          initials: getInits(form.name),
          color:    pickClr(idx >= 0 ? idx : Math.random() * 6 | 0),
          name:     form.name,
          type:     form.type,
          from:     fromD.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          to:       toD.toLocaleDateString('en-IN',   { day: 'numeric', month: 'short' }),
          rawFrom:  form.from,
          rawTo:    form.to,
          days,
          reason:   form.reason,
          status:   'pending',
          fromApi:  true,
        })
        onClose()
      }
    } catch {}
    finally { setSubmitting(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: 'calc(var(--header-height) + 24px) 24px 40px' }}
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#FFFFFF', borderRadius: 18, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(100vh - var(--header-height) - 64px)' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Apply Leave</p>
          <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Submit a leave request</p>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>Employee *</label>
            {employees.length > 0 ? (
              <select className="input-premium" style={{ width: '100%' }} value={form.name} onChange={set('name')}>
                <option value="">Select employee…</option>
                {employees.map(e => <option key={e.id || e.name} value={e.name}>{e.name}</option>)}
              </select>
            ) : (
              <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Employee name" value={form.name} onChange={set('name')} />
            )}
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>Leave Type</label>
            <select className="input-premium" style={{ width: '100%' }} value={form.type} onChange={set('type')}>
              {Object.keys(typeColors).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>From *</label>
              <input type="date" className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} value={form.from} onChange={set('from')} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>To *</label>
              <input type="date" className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} value={form.to} onChange={set('to')} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>Reason</label>
            <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="Brief reason…" value={form.reason} onChange={set('reason')} />
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit}
            style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Submit Request
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HRMSPage() {
  const [employees,    setEmployees   ] = useState([])
  const [empKpis,      setEmpKpis     ] = useState({ totalEmployees: 0, departments: 0, totalPayroll: 0, avgSalary: 0 })

  const [activeTab,    setActiveTab   ] = useState('leave')
  const [leaves,       setLeaves      ] = useState([])
  const [mounted,      setMounted     ] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [viewReason,    setViewReason    ] = useState(null)

  const cycle = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const loadAll = () => {
    fetch('/api/hrms?type=employees')
      .then(r => r.ok ? r.json() : {})
      .then(d => {
        if (Array.isArray(d.employees)) setEmployees(d.employees)
        if (d.kpis) setEmpKpis(d.kpis)
      })
      .catch(() => {})

    fetch('/api/hrms?type=leaves')
      .then(r => r.ok ? r.json() : { leaves: [] })
      .then(d => {
        if (Array.isArray(d.leaves)) {
          setLeaves(d.leaves.map((l, i) => ({
            ...l,
            initials: getInits(l.name),
            color:    pickClr(i),
            fromApi:  true,
          })))
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    setMounted(true)
    loadAll()
  }, [])

  const setLeaveStatus = async (id, newStatus) => {
    try {
      const res = await fetch('/api/hrms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (res.ok) setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l))
    } catch {}
  }

  const pendingCount  = leaves.filter(l => l.status === 'pending').length
  const approvedToday = leaves.filter(l => l.status === 'approved').length

  // For leave modal — use employees list directly
  const allPeople = employees.map(e => ({ id: e.id, supabaseId: e.supabaseId, name: e.name }))

  if (!mounted) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">HRMS</h1>
          <p className="page-header-sub">Human Resource Management — Payroll, Leave and Attendance</p>
        </div>
        <div className="page-actions">
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}
            onClick={() => {
              const emps = employees
              if (!emps.length) return
              const rows = emps.map(e => `
                <div class="payslip">
                  <div class="ps-header"><div><div class="ps-school">OwnCampus</div><div class="ps-title">Payslip — ${cycle}</div></div><div class="ps-emp">${e.name}<br/><span>${e.dept}</span></div></div>
                  <div class="ps-body">
                    <div class="ps-row"><span>Gross Salary</span><span>${e.gross}</span></div>
                    <div class="ps-row"><span>Deductions (PF + Tax)</span><span style="color:#dc2626">- ${e.deductions}</span></div>
                    <div class="ps-row net"><span>Net Pay</span><span>${e.net}</span></div>
                  </div>
                  <div class="ps-footer">Status: <strong>${e.status}</strong></div>
                </div>
              `).join('')
              openPrintWindow(`Payslips — ${cycle}`, rows,
                `body{padding:24px;background:#f8fafc}.payslip{background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 20px;overflow:hidden;page-break-inside:avoid}.ps-header{background:#1e40af;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:flex-start}.ps-school{font-size:12px;opacity:.7;margin-bottom:4px}.ps-title{font-size:16px;font-weight:800}.ps-emp{font-size:14px;font-weight:700;text-align:right}.ps-emp span{font-size:11px;opacity:.75;font-weight:400}.ps-body{padding:16px 20px;display:flex;flex-direction:column;gap:8px}.ps-row{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid #f1f5f9}.ps-row.net{font-weight:800;font-size:15px;border-bottom:none;color:#16a34a}.ps-footer{background:#f8fafc;padding:10px 20px;font-size:12px;color:#64748b}`
              )
            }}>
            <Download size={14} /> Payslip
          </button>
          <Link href="/hrms/new">
            <motion.button whileHover={{ scale: 1.02 }} className="btn-primary">
              <Plus size={15} /> Add Employee
            </motion.button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Total Employees',   value: String(empKpis.totalEmployees), icon: Users,       iconColor: '#2563EB', iconBg: '#EFF6FF' },
          { label: 'On Leave (Approved)', value: String(approvedToday),         icon: Calendar,    iconColor: '#D97706', iconBg: '#FFFBEB' },
          { label: 'Monthly Payroll',   value: empKpis.totalPayroll > 0 ? `₹${(empKpis.totalPayroll/100000).toFixed(1)}L` : (empKpis.totalEmployees > 0 ? `${empKpis.totalEmployees} staff` : '—'), icon: CreditCard, iconColor: '#16A34A', iconBg: '#F0FDF4' },
          { label: 'Pending Approvals', value: String(pendingCount),             icon: AlertCircle, iconColor: '#DC2626', iconBg: '#FEF2F2' },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ y: -2 }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.06)', padding: '22px 24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon size={18} style={{ color: stat.iconColor }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#64748B', marginBottom: 6 }}>{stat.label}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 30, fontWeight: 700, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.03em' }}>{stat.value}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 4, padding: 5, borderRadius: 14, background: '#F1F5F9', border: '1px solid #E2E8F0', width: 'fit-content', overflowX: 'auto' }}>
        {[
          { key: 'leave',       label: 'Leave Management', icon: CalendarClock },
          { key: 'payroll',     label: 'Payroll',          icon: DollarSign    },
          { key: 'recruitment', label: 'Recruitment',      icon: UserPlus      },
        ].map(tab => {
          const active = activeTab === tab.key
          const Icon = tab.icon
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', transition: 'color 0.15s', color: active ? '#2563EB' : '#64748B', fontWeight: active ? 600 : 500, fontSize: 13, whiteSpace: 'nowrap', zIndex: 1 }}>
              {active && (
                <motion.div layoutId="hrms-tab-bg"
                  style={{ position: 'absolute', inset: 0, borderRadius: 10, background: '#FFFFFF', boxShadow: '0 1px 6px rgba(15,23,42,0.08), 0 0 0 1px rgba(37,99,235,0.10)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
              )}
              <Icon size={14} style={{ position: 'relative', zIndex: 1, flexShrink: 0 }} />
              <span style={{ position: 'relative', zIndex: 1 }}>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Leave Tab ── */}
      {activeTab === 'leave' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Leave Requests Card */}
          <div className="lg:col-span-2" style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Leave Requests</p>
              <motion.button whileHover={{ scale: 1.02 }} onClick={() => setShowLeaveModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={12} /> Apply Leave
              </motion.button>
            </div>

            {leaves.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#64748B', margin: 0 }}>No leave requests yet</p>
                <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Click "Apply Leave" to submit a leave request.</p>
              </div>
            ) : (
              <div>
                {leaves.map((req, i) => {
                  const status = leaveStatusConfig[req.status]
                  const StatusIcon = status.icon
                  const tc = typeColors[req.type] || { color: '#64748B', bg: '#F8FAFC' }
                  return (
                    <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                      style={{ padding: '14px 20px', borderBottom: i < leaves.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: req.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#FFFFFF', flexShrink: 0 }}>
                        {req.initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>{req.name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: tc.bg, color: tc.color }}>{req.type}</span>
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>{req.from} – {req.to} ({req.days}d)</span>
                          {req.reason && (
                            <>
                              <span style={{ fontSize: 11, color: '#CBD5E1' }}>·</span>
                              <span style={{ fontSize: 11, color: '#94A3B8', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {req.reason.length > 32 ? req.reason.slice(0, 32) + '…' : req.reason}
                              </span>
                              {req.reason.length > 32 && (
                                <button onClick={() => setViewReason(req)}
                                  style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 6, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', cursor: 'pointer', flexShrink: 0 }}>
                                  View
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: status.bg, color: status.color }}>
                          <StatusIcon size={10} /> {status.label}
                        </span>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {req.status !== 'approved' && (
                            <button onClick={() => setLeaveStatus(req.id, 'approved')}
                              style={{ fontSize: 11, padding: '3px 10px', borderRadius: 7, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', cursor: 'pointer', fontWeight: 600 }}>
                              Approve
                            </button>
                          )}
                          {req.status !== 'rejected' && (
                            <button onClick={() => setLeaveStatus(req.id, 'rejected')}
                              style={{ fontSize: 11, padding: '3px 10px', borderRadius: 7, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', cursor: 'pointer', fontWeight: 600 }}>
                              Reject
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Leave summary */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '18px 20px' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Leave Summary</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(leaveStatusConfig).map(([key, cfg]) => {
                  const count = leaves.filter(l => l.status === key).length
                  const Icon  = cfg.icon
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: cfg.bg }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon size={13} style={{ color: cfg.color }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: cfg.color }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Leave type breakdown */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.05)', padding: '18px 20px' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>By Leave Type</p>
              {Object.keys(typeColors).map(type => {
                const count = leaves.filter(l => l.type === type).length
                const total = Math.max(leaves.length, 1)
                const tc = typeColors[type]
                return (
                  <div key={type} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{type}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{count}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(count / total) * 100}%` }} transition={{ duration: 0.7, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 99, background: tc.color }} />
                    </div>
                  </div>
                )
              })}
              {leaves.length === 0 && <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingTop: 8 }}>No data yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Payroll Tab ── */}
      {activeTab === 'payroll' && (
        <div className="space-y-8">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer' }}>
              Cycle: {cycle} <ChevronDown size={12} />
            </button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer' }}
                onClick={() => {
                  const headers = ['Employee Name', 'Department', 'Gross Salary', 'Deductions', 'Net Pay', 'Status']
                  const rows = employees.map(e => [e.name, e.dept, e.gross, e.deductions, e.net, e.status])
                  downloadCSV(`payslips-${cycle.replace(/\s/g,'-')}.csv`, headers, rows)
                }}>
                <Download size={13} /> Export Payslips
              </button>
              <motion.button whileHover={{ scale: 1.02 }} className="btn-primary text-sm py-2 px-4">Run Payroll</motion.button>
            </div>
          </div>

          {/* Payroll Table */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Payroll Run — {cycle}</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['EMPLOYEE', 'DEPARTMENT', 'GROSS', 'DEDUCTIONS', 'NET PAY', 'STATUS', ''].map(col => (
                      <th key={col} style={{ padding: '10px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', borderBottom: '1px solid #E8ECF0' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center' }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>No employees added yet</p>
                        <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Click "Add Employee" to get started.</p>
                      </td>
                    </tr>
                  ) : employees.map((emp, i) => {
                    const s = payrollStatusStyle[emp.status] || payrollStatusStyle.Pending
                    return (
                      <tr key={emp.id || i} style={{ borderBottom: i < employees.length - 1 ? '1px solid #F8FAFC' : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: emp.color || '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#FFF', flexShrink: 0 }}>
                              {emp.initials || getInits(emp.name)}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{emp.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px' }}><span style={{ fontSize: 12, color: '#2563EB', fontWeight: 500 }}>{emp.dept}</span></td>
                        <td style={{ padding: '12px 18px' }}><span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{emp.gross}</span></td>
                        <td style={{ padding: '12px 18px' }}><span style={{ fontSize: 12, color: '#64748B' }}>{emp.deductions}</span></td>
                        <td style={{ padding: '12px 18px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{emp.net}</span></td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color }}>{emp.status}</span>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <button
                            onClick={() => {
                              const html = `<div class="payslip"><div class="ps-header"><div><div class="ps-school">OwnCampus</div><div class="ps-title">Payslip — ${cycle}</div></div><div class="ps-emp">${emp.name}<br/><span>${emp.dept}</span></div></div><div class="ps-body"><div class="ps-row"><span>Employee</span><span>${emp.name}</span></div><div class="ps-row"><span>Department</span><span>${emp.dept}</span></div><div class="ps-row"><span>Designation</span><span>${emp.designation || '—'}</span></div><div class="ps-row"><span>Gross Salary</span><span>${emp.gross}</span></div><div class="ps-row"><span>Deductions (PF + Tax)</span><span style="color:#dc2626">- ${emp.deductions}</span></div><div class="ps-row net"><span>Net Pay</span><span>${emp.net}</span></div></div><div class="ps-footer">Cycle: ${cycle} &nbsp;|&nbsp; Status: <strong>${emp.status}</strong></div></div>`
                              openPrintWindow(`Payslip — ${emp.name} — ${cycle}`, html, `body{padding:24px;background:#f8fafc}.payslip{background:#fff;border:1px solid #e2e8f0;border-radius:10px;max-width:520px;margin:0 auto;overflow:hidden}.ps-header{background:#1e40af;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:flex-start}.ps-school{font-size:12px;opacity:.7;margin-bottom:4px}.ps-title{font-size:16px;font-weight:800}.ps-emp{font-size:14px;font-weight:700;text-align:right}.ps-emp span{font-size:11px;opacity:.75;font-weight:400}.ps-body{padding:16px 20px;display:flex;flex-direction:column;gap:8px}.ps-row{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid #f1f5f9}.ps-row.net{font-weight:800;font-size:15px;border-bottom:none;color:#16a34a}.ps-footer{background:#f8fafc;padding:10px 20px;font-size:12px;color:#64748b}`)
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 12, color: '#475569', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            <Download size={12} /> Payslip
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Recruitment Tab ── */}
      {activeTab === 'recruitment' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 16, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <Briefcase size={40} style={{ color: '#CBD5E1', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Recruitment Pipeline</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Manage job postings, applications and onboarding</p>
            <Link href="/hrms/new">
              <motion.button whileHover={{ scale: 1.02 }} className="btn-primary text-sm py-2 px-4" style={{ marginTop: 16 }}>
                Add Employee
              </motion.button>
            </Link>
          </div>
        </div>
      )}

      {/* Reason detail modal */}
      {viewReason && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: 'calc(var(--header-height) + 24px) 24px 40px' }}
          onClick={() => setViewReason(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()}
            style={{ background: '#FFFFFF', borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(100vh - var(--header-height) - 64px)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Leave Reason</p>
                <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{viewReason.name} · {viewReason.type}</p>
              </div>
              <button onClick={() => setViewReason(null)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ padding: '14px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, margin: 0 }}>{viewReason.reason}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#EFF6FF', color: '#2563EB', fontWeight: 600 }}>{viewReason.type}</span>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#F8FAFC', color: '#64748B' }}>{viewReason.from} – {viewReason.to} ({viewReason.days}d)</span>
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {viewReason.status !== 'approved' && (
                <button onClick={() => { setLeaveStatus(viewReason.id, 'approved'); setViewReason(null) }}
                  style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Approve
                </button>
              )}
              {viewReason.status !== 'rejected' && (
                <button onClick={() => { setLeaveStatus(viewReason.id, 'rejected'); setViewReason(null) }}
                  style={{ padding: '8px 16px', borderRadius: 9, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Reject
                </button>
              )}
              <button onClick={() => setViewReason(null)}
                style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 12, color: '#64748B', cursor: 'pointer', fontWeight: 500 }}>
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showLeaveModal && (
        <ApplyLeaveModal
          onClose={() => setShowLeaveModal(false)}
          onAdd={(req) => setLeaves(prev => [req, ...prev])}
          employees={allPeople}
        />
      )}
    </div>
  )
}
