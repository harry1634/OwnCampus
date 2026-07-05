'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, CheckCircle, Clock, AlertTriangle, Download, Printer } from 'lucide-react'
import { useCurrentUser } from '@/lib/useCurrentUser'

function fmtDate(str) {
  if (!str) return '—'
  const m = typeof str === 'string' && str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${m[3]} ${months[parseInt(m[2],10)-1]} ${m[1]}`
  }
  const d = new Date(str)
  if (isNaN(d.getTime())) return '—'
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`
}

const STATUS_CONF = {
  paid:    { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Paid',    icon: CheckCircle  },
  pending: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Pending', icon: Clock        },
  partial: { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'Partial', icon: Clock        },
  overdue: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Overdue', icon: AlertTriangle },
}

export default function StudentFees() {
  const cu = useCurrentUser()

  const [txns,           setTxns        ] = useState([])
  const [feeData,        setFeeData     ] = useState({ totalFee: 0, paidAmount: 0, feeStatus: 'pending' })
  const [loading,        setLoading     ] = useState(true)
  const [myTransport,    setMyTransport ] = useState(null)
  const [hostelAlloc,    setHostelAlloc ] = useState(null)

  // ── Load fee data and payment history from Supabase ──────────────────────────
  useEffect(() => {
    if (!cu.mounted || !cu.userId) return

    // Load totalFee and paid_amount via API (uses admin client, bypasses RLS)
    fetch('/api/student/fee-summary')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || data.error) return
        setFeeData({ totalFee: data.totalFee, paidAmount: data.paidAmount, feeStatus: data.feeStatus })
      }).catch(() => {})

    // Fetch transport assignment
    fetch('/api/transport?type=assignments&my=true')
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        const list = data.assignments || []
        if (list[0]) setMyTransport(list[0])
      }).catch(() => {})

    // Fetch hostel allocation
    fetch('/api/hostel/allocations?my=true')
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        const alloc = data.allocation || data[0] || null
        if (alloc) {
          setHostelAlloc({
            building:   alloc.hostel_rooms?.hostel_blocks?.name || alloc.building || 'Hostel',
            room:       alloc.hostel_rooms?.room_number || alloc.room_number || '—',
            bed:        alloc.bed_number ? `Bed ${alloc.bed_number}` : '',
            monthlyFee: Number(alloc.monthly_fee || alloc.hostel_rooms?.monthly_fee || 0),
          })
        }
      }).catch(() => {})

    // Payment history — for transaction display only; authoritative balance comes from students table
    fetch(`/api/fee-payments?user_id=${cu.userId}`)
      .then(r => r.ok ? r.json() : [])
      .then(rows => {
        if (!Array.isArray(rows)) return
        const normalized = rows.map(p => ({
          id:      p.id,
          amount:  Number(p.amount || 0),
          date:    fmtDate(p.payment_date || p.created_at),
          mode:    p.payment_mode  || p.payment_method || 'cash',
          receipt: p.receipt_number || null,
          status:  p.status === 'paid' ? 'paid' : p.status || 'pending',
        }))
        setTxns(normalized)
        // Do NOT overwrite paidAmount here — students.paid_amount is authoritative.
        // feeData.paidAmount is already set from the students table query above.
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [cu.mounted, cu.userId])

  if (!cu.mounted) return null

  const totalFee       = feeData.totalFee
  const paidAmount     = feeData.paidAmount
  const balance        = Math.max(0, totalFee - paidAmount)
  const feeStatus      = feeData.feeStatus
  const hostelMonthlyFee = hostelAlloc?.monthlyFee || 0

  // Build fee heads from all available sources
  const feeHeads = []
  if (totalFee > 0) {
    feeHeads.push({ head: 'Academic Fee', total: totalFee, paid: paidAmount, dueDate: 'Ongoing', status: feeStatus })
  }
  if (hostelAlloc && hostelMonthlyFee > 0) {
    feeHeads.push({
      head: `Hostel Fee — ${hostelAlloc.building} · Room ${hostelAlloc.room}${hostelAlloc.bed ? ' · ' + hostelAlloc.bed : ''}`,
      total: hostelMonthlyFee,
      paid: 0,
      dueDate: 'Monthly',
      status: 'pending',
    })
  }
  if (myTransport) {
    feeHeads.push({
      head: `Transport — ${myTransport.route || myTransport.route_name || 'Route'}`,
      total: myTransport.monthlyFee || 0,
      paid: 0,
      dueDate: 'Monthly',
      status: 'pending',
    })
  }

  const hasFeeData = totalFee > 0 || hostelAlloc || myTransport

  const summaryTotal   = feeHeads.reduce((s, f) => s + f.total, 0)
  const summaryPaid    = feeHeads.reduce((s, f) => s + f.paid, 0)
  const summaryBalance = Math.max(0, summaryTotal - summaryPaid)
  const paidPct        = summaryTotal > 0 ? Math.round((summaryPaid / summaryTotal) * 100) : 0

  const myRoute = myTransport ? {
    name:   myTransport.route || myTransport.route_name || 'Route',
    vehicle: myTransport.vehicle_number || myTransport.vehicle || '',
    driver:  myTransport.driver_name || myTransport.driver || '—',
  } : null

  const classLabel = cu.classSection ? `Class ${cu.classSection}` : ''

  function downloadReceipt() {
    const receiptWin = window.open('', '_blank', 'width=700,height=900')
    const rows = feeHeads.length > 0 ? feeHeads : []
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Fee Receipt - ${cu.name || 'Student'}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 32px; color: #0F172A; background: #fff; }
    .header { text-align: center; margin-bottom: 28px; border-bottom: 2px solid #4C1D95; padding-bottom: 18px; }
    .logo { font-size: 22px; font-weight: 800; color: #4C1D95; letter-spacing: -0.02em; }
    .subtitle { font-size: 12px; color: #64748B; margin-top: 4px; }
    h2 { font-size: 17px; font-weight: 700; margin: 0 0 4px; }
    .meta { display: flex; gap: 40px; margin: 20px 0; background: #F8FAFC; border-radius: 10px; padding: 14px 18px; }
    .meta-item label { font-size: 10px; color: #94A3B8; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 3px; }
    .meta-item span { font-size: 13px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 18px 0; }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; padding: 10px 14px; text-align: left; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
    td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #F1F5F9; }
    .total-row { background: #4C1D95; color: white; font-weight: 700; }
    .total-row td { padding: 13px 14px; border: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }
    .footer { margin-top: 36px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #F1F5F9; padding-top: 16px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">OwnCampus</div>
    <div class="subtitle">School of Excellence · Fee Receipt</div>
  </div>
  <div class="meta">
    <div class="meta-item"><label>Student Name</label><span>${cu.name || '—'}</span></div>
    <div class="meta-item"><label>Class</label><span>${cu.classSection || '—'}</span></div>
    <div class="meta-item"><label>Roll No.</label><span>${cu.roll || '—'}</span></div>
    <div class="meta-item"><label>Generated</label><span>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
  </div>
  <table>
    <thead><tr><th>Fee Head</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
    <tbody>
      ${rows.map(f => `<tr><td>${f.head}</td><td>₹${f.total.toLocaleString('en-IN')}</td><td style="color:#059669;font-weight:600">₹${f.paid.toLocaleString('en-IN')}</td><td style="color:${f.total-f.paid>0?'#DC2626':'#059669'};font-weight:600">₹${(f.total-f.paid).toLocaleString('en-IN')}</td><td><span class="badge" style="background:${f.status==='paid'?'#ECFDF5':f.status==='overdue'?'#FEF2F2':'#FFFBEB'};color:${f.status==='paid'?'#059669':f.status==='overdue'?'#DC2626':'#D97706'}">${f.status.charAt(0).toUpperCase()+f.status.slice(1)}</span></td></tr>`).join('')}
      <tr class="total-row"><td colspan="2">Grand Total</td><td>₹${summaryPaid.toLocaleString('en-IN')}</td><td>₹${summaryBalance.toLocaleString('en-IN')}</td><td>${paidPct}% Paid</td></tr>
    </tbody>
  </table>
  ${txns.length > 0 ? `
  <h3 style="font-size:14px;font-weight:700;margin:20px 0 8px">Payment History</h3>
  <table>
    <thead><tr><th>Ref ID</th><th>Date</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead>
    <tbody>${txns.map(t => `<tr><td>${t.receipt||t.id||'—'}</td><td>${t.date||'—'}</td><td>${t.mode||'—'}</td><td style="color:#059669;font-weight:600">₹${(t.amount||0).toLocaleString('en-IN')}</td><td>Success</td></tr>`).join('')}</tbody>
  </table>` : ''}
  <div class="footer">This is a computer-generated receipt. For queries contact admin@owncampus.edu</div>
</body>
</html>`
    receiptWin.document.write(html)
    receiptWin.document.close()
    receiptWin.onload = () => receiptWin.print()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Fee Details</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{classLabel} · Academic Year 2025-26</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={downloadReceipt}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Printer size={14} /> Download Receipt
        </motion.button>
      </div>

      {/* Summary banner */}
      <div style={{ background: '#7C3AED', borderRadius: 20, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: '0 0 4px' }}>Total Fees</p>
            <p style={{ fontSize: 36, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.03em', margin: 0 }}>
              {summaryTotal > 0 ? `₹${summaryTotal.toLocaleString('en-IN')}` : '—'}
            </p>
            {cu.name && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{cu.name}</p>}
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.60)', margin: '0 0 2px' }}>Paid</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#4ADE80', margin: 0 }}>₹{summaryPaid.toLocaleString('en-IN')}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.60)', margin: '0 0 2px' }}>Balance</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: summaryBalance > 0 ? '#FCA5A5' : '#4ADE80', margin: 0 }}>₹{summaryBalance.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
        {summaryTotal > 0 && (
          <>
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${paidPct}%` }} transition={{ duration: 0.8 }}
                style={{ height: '100%', borderRadius: 4, background: '#4ADE80' }} />
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 6 }}>{paidPct}% paid</p>
          </>
        )}
      </div>

      {/* Hostel info */}
      {hostelAlloc && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 18 }}>🏠</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>Hostel Allocated</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              {hostelAlloc.building} · Room {hostelAlloc.room} · {hostelAlloc.bed}
              {hostelMonthlyFee > 0 && ` · ₹${hostelMonthlyFee.toLocaleString('en-IN')}/month`}
            </p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
            Allocated
          </span>
        </div>
      )}

      {/* Transport info */}
      {myRoute && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 18 }}>🚌</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>Transport Assigned</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              {myRoute.name} · {myRoute.vehicle} · Driver: {myRoute.driver}
            </p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
            Active
          </span>
        </div>
      )}

      {/* Fee heads table */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Fee Breakup</h2>
        </div>
        {feeHeads.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center' }}>
            <CreditCard size={28} color="#E2E8F0" style={{ marginBottom: 10 }} />
            <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Fee structure not yet assigned</p>
            <p style={{ fontSize: 12, color: '#CBD5E1', marginTop: 4 }}>Contact your admin to have your fee details updated</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Fee Head', 'Total', 'Paid', 'Balance', 'Due Date', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feeHeads.map((f, i) => {
                  const s   = STATUS_CONF[f.status] || STATUS_CONF.pending
                  const bal = f.total - f.paid
                  const Icon = s.icon
                  return (
                    <tr key={f.head} style={{ borderBottom: '1px solid #F8FAFC' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{f.head}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#475569' }}>₹{f.total.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#059669', fontWeight: 600 }}>₹{f.paid.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: bal > 0 ? '#DC2626' : '#94A3B8', fontWeight: bal > 0 ? 700 : 400 }}>₹{bal.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748B' }}>{f.dueDate}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                          <Icon size={11} /> {s.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Payment History</h2>
        </div>
        {txns.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>No payment transactions recorded yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {txns.map((t, i) => (
              <div key={t.id || i} style={{ padding: '14px 20px', borderBottom: i < txns.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CreditCard size={15} color="#059669" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', margin: 0 }}>{t.method || 'Online Payment'} {t.ref ? `· ${t.ref}` : ''}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{t.date || '—'} {t.id ? `· ${t.id}` : ''}</p>
                </div>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#059669' }}>₹{(t.amount || 0).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
