'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Search, Filter, Plus, Download, Upload, UserCheck, AlertCircle, TrendingUp, Eye, EyeOff, Edit, Phone, CheckCircle, X, FileText, ArrowLeftRight, Building2, Trash2, GraduationCap, Mail, Save, Copy } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/SkeletonLoader'
import Pagination from '@/components/ui/Pagination'
import ActionDropdown from '@/components/ui/ActionDropdown'
import Link from 'next/link'
import { downloadCSV } from '@/lib/exportUtils'
import { toast } from 'sonner'
import { computeFeeStatus, computeBalance } from '@/lib/feeUtils'


const feeColors = {
  paid:    { bg: '#F0FDF4', color: '#16A34A', label: 'Paid' },
  partial: { bg: '#FFFBEB', color: '#D97706', label: 'Partial' },
  pending: { bg: '#F8FAFC', color: '#64748B', label: 'Pending' },
  overdue: { bg: '#FEF2F2', color: '#DC2626', label: 'Overdue' },
}

function AttendanceBadge({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-xs" style={{ color: '#CBD5E1' }}>—</span>
  }
  const color = value >= 90 ? '#16A34A' : value >= 75 ? '#D97706' : '#DC2626'
  const bg    = value >= 90 ? '#F0FDF4'  : value >= 75 ? '#FFFBEB'  : '#FEF2F2'
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: bg, color }}>
      {value}%
    </span>
  )
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

const OVERLAY = { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: 'calc(var(--header-height) + 24px) 24px 40px' }
const MODAL   = { background: '#FFFFFF', borderRadius: 20, boxShadow: '0 24px 64px rgba(15,23,42,0.22)', width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - var(--header-height) - 64px)', overflowY: 'auto' }

function StudentViewModal({ student, onEdit, onClose }) {
  const fee   = feeColors[student.fees] || feeColors.pending
  const color = avatarColors[(student.id || 0) % avatarColors.length]
  const balance = Math.max(0, (student.totalFee || 0) - (student.paidAmount || 0))
  const [showPwd, setShowPwd] = useState(false)

  const rows = [
    { label: 'Roll No.',   value: student.roll       || '—' },
    { label: 'Class',      value: student.class      || '—' },
    { label: 'Branch',     value: student.branch     || '—' },
    { label: 'Email',      value: student.email      || '—' },
    { label: 'Phone',      value: student.phone      || '—' },
    { label: 'Parent',     value: student.parent     || '—' },
    { label: 'Attendance', value: student.attendance != null ? student.attendance + '%' : '—' },
  ]
  return (
    <div style={OVERLAY} onClick={onClose}>
      <motion.div style={MODAL} initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }} onClick={e => e.stopPropagation()}>
        <div style={{ background: '#2563EB', borderRadius: '20px 20px 0 0', padding: '24px 24px 20px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}><X size={14} /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#FFF', border: '3px solid rgba(255,255,255,0.25)' }}>{getInitials(student.name)}</div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em' }}>{student.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)' }}>Student</p>
                <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: fee.bg, color: fee.color }}>{(student.fees || 'pending').charAt(0).toUpperCase() + (student.fees || 'pending').slice(1)}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Fee summary cards — always shown for consistency */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Total Fee', value: `₹${(student.totalFee || 0).toLocaleString('en-IN')}`,   color: '#0F172A', bg: '#F8FAFC', border: '#E2E8F0' },
              { label: 'Paid',      value: `₹${(student.paidAmount || 0).toLocaleString('en-IN')}`, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
              { label: 'Balance',   value: `₹${balance.toLocaleString('en-IN')}`,                   color: balance > 0 ? '#DC2626' : '#16A34A', bg: balance > 0 ? '#FEF2F2' : '#F0FDF4', border: balance > 0 ? '#FECACA' : '#BBF7D0' },
            ].map(c => (
              <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{c.label}</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: c.color, fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em' }}>{c.value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {rows.map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{r.label}</span>
                <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 500 }}>{r.value}</span>
              </div>
            ))}
            {student.tempPassword && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <span style={{ fontSize: 12, color: '#92400E', fontWeight: 600 }}>Temp Password</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#C2410C', fontWeight: 700, fontFamily: 'monospace', letterSpacing: showPwd ? '0.05em' : '0.15em' }}>
                    {showPwd ? student.tempPassword : '•'.repeat(student.tempPassword.length)}
                  </span>
                  <button onClick={() => setShowPwd(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400E', display: 'flex', padding: 2 }}>
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(student.tempPassword); toast.success('Password copied') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400E', display: 'flex', padding: 2 }}>
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onEdit}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Edit size={13} /> Edit Details
            </button>
            <button onClick={onClose}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const feeStatusFromAmounts = (total, paid) => computeFeeStatus(total, paid)

function StudentEditModal({ student, onSave, onClose }) {
  const [form, setForm] = useState({
    name:       student.name       || '',
    roll:       student.roll       || '',
    class:      student.class      || '',
    parent:     student.parent     || '',
    phone:      student.phone      || '',
    email:      student.email      || '',
    fees:       student.fees       || 'pending',
    totalFee:   student.totalFee   != null ? String(student.totalFee)   : '',
    paidAmount: student.paidAmount != null ? String(student.paidAmount) : '',
  })
  const [saving, setSaving] = useState(false)
  const [tempPwd, setTempPwd]     = useState(student.tempPassword || null)
  const [showPwd, setShowPwd]     = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleResetPassword = async () => {
    if (!student.supabaseId) { toast.error('No user ID — cannot reset password.'); return }
    setResetting(true)
    try {
      const res  = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: student.supabaseId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Reset failed'); return }
      setTempPwd(data.password)
      setShowPwd(true)
      toast.success('Password reset — copy it now!')
    } catch (e) { toast.error(e.message) }
    finally { setResetting(false) }
  }
  const set = k => e => {
    const val = e.target.value
    setForm(f => {
      const next = { ...f, [k]: val }
      // Auto-derive fee status when amounts change
      if (k === 'totalFee' || k === 'paidAmount') {
        const t = k === 'totalFee'   ? val : f.totalFee
        const p = k === 'paidAmount' ? val : f.paidAmount
        next.fees = feeStatusFromAmounts(t, p)
      }
      return next
    })
  }

  const totalFee   = parseFloat(form.totalFee)   || 0
  const paidAmount = parseFloat(form.paidAmount)  || 0
  const balance    = Math.max(0, totalFee - paidAmount)

  const handleSave = async () => {
    setSaving(true)
    try {
      if (student.supabaseId) {
        const nameParts = form.name.trim().split(' ')
        const r = await fetch(`/api/admin/users/${student.supabaseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name:  nameParts[0] || '',
            last_name:   nameParts.slice(1).join(' ') || '',
            phone:       form.phone,
            total_fee:   totalFee,
            paid_amount: paidAmount,
            fee_status:  form.fees  || null,
            roll_number: form.roll  || null,
            parent_name: form.parent || null,
            metadata: {
              ...student.metadata,
              class_section: form.class,
              roll_number:   form.roll,
              parent_name:   form.parent,
              total_fee:     totalFee   || null,
              paid_amount:   paidAmount || null,
              fee_status:    form.fees  || null,
            },
          }),
        })
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          throw new Error(d.error || 'Update failed')
        }
      }

      // Always write fee/roll data to students table by students.id so student-side
      // fee page reflects the correct values even when supabaseId was null.
      if (student.id) {
        const stuBody = {
          total_fee:   totalFee,
          paid_amount: paidAmount,
          fee_status:  form.fees || null,
          roll_number: form.roll || null,
        }
        // Link auth user → students row so student queries (eq user_id) work going forward
        if (student.supabaseId) stuBody.user_id = student.supabaseId
        await fetch(`/api/students?id=${student.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stuBody),
        }).catch(() => {})
      }

      onSave({
        ...student,
        ...form,
        totalFee:   totalFee   || undefined,
        paidAmount: paidAmount || undefined,
        balance:    balance    || undefined,
      })
    } catch (err) {
      alert(err.message)
    } finally { setSaving(false) }
  }

  const inp = { style: { width: '100%', padding: '8px 11px', borderRadius: 9, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } }
  const sectionLabel = (text) => (
    <p style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.07em', paddingBottom: 8, borderBottom: '1px solid #EFF6FF', marginBottom: 2 }}>{text}</p>
  )

  return (
    <div style={OVERLAY} onClick={onClose}>
      <motion.div style={{ ...MODAL, maxWidth: 520 }} initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Edit Student</p>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}><X size={16} /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ── Personal Details ── */}
          {sectionLabel('Personal Details')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Full Name',         key: 'name',   colSpan: true },
              { label: 'Roll No.',          key: 'roll' },
              { label: 'Class / Section',   key: 'class' },
              { label: 'Parent / Guardian', key: 'parent', colSpan: true },
              { label: 'Phone',             key: 'phone' },
              { label: 'Email',             key: 'email' },
            ].map(({ label, key, colSpan }) => (
              <div key={key} style={colSpan ? { gridColumn: '1 / -1' } : {}}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>{label}</label>
                <input value={form[key]} onChange={set(key)} {...inp} />
              </div>
            ))}
          </div>

          {/* ── Fee Details ── */}
          {sectionLabel('Fee Details')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Total Fee (₹)</label>
              <input type="number" min="0" value={form.totalFee} onChange={set('totalFee')} placeholder="e.g. 50000" {...inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Amount Paid (₹)</label>
              <input type="number" min="0" value={form.paidAmount} onChange={set('paidAmount')} placeholder="e.g. 25000" {...inp} />
            </div>
          </div>

          {/* Balance + auto status */}
          {(totalFee > 0 || paidAmount > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: balance > 0 ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${balance > 0 ? '#FECACA' : '#BBF7D0'}`, borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>BALANCE DUE</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: balance > 0 ? '#DC2626' : '#16A34A', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>
                  ₹{balance.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Fee Status</label>
                <select value={form.fees} onChange={set('fees')} style={{ ...inp.style }}>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
                <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>Auto-set from amounts above</p>
              </div>
            </div>
          )}

          {/* Fee status only (when no amounts entered) */}
          {totalFee <= 0 && paidAmount <= 0 && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Fee Status</label>
              <select value={form.fees} onChange={set('fees')} style={{ ...inp.style }}>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          )}

          {/* ── Login Credentials ── */}
          {sectionLabel('Login Credentials')}
          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tempPwd ? 10 : 0 }}>
              <span style={{ fontSize: 12, color: '#92400E', fontWeight: 600 }}>Temporary Password</span>
              <button onClick={handleResetPassword} disabled={resetting}
                style={{ fontSize: 11, fontWeight: 700, color: '#FFF', background: '#EA580C', border: 'none', borderRadius: 7, padding: '4px 10px', cursor: resetting ? 'default' : 'pointer', opacity: resetting ? 0.7 : 1 }}>
                {resetting ? 'Resetting…' : tempPwd ? 'Reset Password' : '+ Generate Password'}
              </button>
            </div>
            {tempPwd ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: '#C2410C', letterSpacing: showPwd ? '0.08em' : '0.2em', background: '#FFF', border: '1.5px dashed #FDBA74', borderRadius: 8, padding: '6px 12px' }}>
                  {showPwd ? tempPwd : '•'.repeat(tempPwd.length)}
                </span>
                <button onClick={() => setShowPwd(v => !v)} title={showPwd ? 'Hide' : 'Show'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400E', display: 'flex', padding: 4 }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button onClick={() => { navigator.clipboard.writeText(tempPwd); toast.success('Password copied') }} title="Copy" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400E', display: 'flex', padding: 4 }}>
                  <Copy size={15} />
                </button>
              </div>
            ) : (
              <p style={{ fontSize: 11, color: '#B45309', marginTop: 6 }}>No password on file — click "Generate Password" to create one.</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, border: 'none', background: '#2563EB', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Saving…' : <><Save size={13} /> Save Changes</>}
            </button>
            <button onClick={onClose}
              style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const avatarColors = ['#2563EB', '#7C3AED', '#0891B2', '#16A34A', '#D97706', '#DB2777', '#7C3AED']

const PAGE_SIZE = 8

function normaliseHeader(h) {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const HEADER_MAP = {
  name:       ['name','studentname','fullname','student','sname'],
  roll:       ['roll','rollno','rollnumber','admissionno','admno','regno','registrationno','srno'],
  class:      ['class','grade','classname','std','standard','classsection'],
  parent:     ['parent','parentname','fathername','guardianname','guardian','father','mother'],
  phone:      ['phone','mobile','contact','phoneno','mobileno','contactno','mobilenumber','phonenumber'],
  email:      ['email','emailid','emailaddress','mail'],
  attendance: ['attendance','attendancepct','attendancepercentage','attendancepercent'],
  fees:       ['fees','feestatus','paymentstatus','feesstatus','payment'],
  status:     ['status','studentstatus','active'],
}

// Positional fallback order when no header row detected or no name column found
const POSITIONAL_FIELDS = ['name','roll','class','parent','phone','email']

function detectField(header) {
  const key = normaliseHeader(header)
  for (const [field, aliases] of Object.entries(HEADER_MAP)) {
    if (aliases.includes(key)) return field
  }
  return null
}

function splitCSVLine(line) {
  const result = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQ = false
      else cur += ch
    } else {
      if (ch === '"') inQ = true
      else if (ch === ',') { result.push(cur.trim()); cur = '' }
      else cur += ch
    }
  }
  result.push(cur.trim())
  return result
}

function parseCSV(text) {
  // Strip UTF-8 BOM if present
  const clean = text.replace(/^﻿/, '').trim()
  const lines = clean.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 1) return { rows: [], detected: 'empty' }

  const firstCells = splitCSVLine(lines[0])
  const hasHeaders = firstCells.some(c => isNaN(c) && detectField(c) !== null)

  let fieldMap, dataLines
  if (hasHeaders) {
    fieldMap   = firstCells.map(detectField)
    dataLines  = lines.slice(1)
    // If no name column matched, assume first column is name
    if (!fieldMap.includes('name') && fieldMap.length > 0) fieldMap[0] = 'name'
  } else {
    // No header row — use positional mapping
    fieldMap  = firstCells.map((_, i) => POSITIONAL_FIELDS[i] ?? null)
    dataLines = lines
  }

  const rows = dataLines.map(line => {
    const cells = splitCSVLine(line)
    const obj = {}
    cells.forEach((val, i) => { if (fieldMap[i] && val) obj[fieldMap[i]] = val })
    return obj
  }).filter(r => r.name && r.name.trim())

  return { rows }
}

export default function StudentsClient() {
  const [students, setStudents] = useState([])
  const studentsRef = useRef([])
  // Keep ref in sync for async access inside handlers
  useEffect(() => { studentsRef.current = students }, [students])

  const [loading,          setLoading         ] = useState(true)
  const [search,           setSearch          ] = useState('')
  const [selectedClass,    setSelectedClass   ] = useState('all')
  const [selectedFee,      setSelectedFee     ] = useState('all')
  const [selectedBranch,   setSelectedBranch  ] = useState('all')
  const [page,             setPage            ] = useState(1)
  const [importResult,     setImportResult    ] = useState(null)
  const [branches,         setBranches        ] = useState([])
  const [classList,        setClassList       ] = useState([])
  const [transferStudent,  setTransferStudent ] = useState(null)
  const [transferBranchId, setTransferBranchId] = useState('')
  const [transferring,     setTransferring    ] = useState(false)
  const [viewStudent,      setViewStudent     ] = useState(null)
  const [editStudent,      setEditStudent     ] = useState(null)
  const [deleteConfirm,    setDeleteConfirm   ] = useState(null)
  const [deleting,         setDeleting        ] = useState(false)
  const [selectedIds,      setSelectedIds     ] = useState(new Set())
  const [bulkDeleteConfirm,setBulkDeleteConfirm] = useState(false)
  const [bulkDeleting,     setBulkDeleting    ] = useState(false)
  const importRef       = useRef(null)
  const headerCheckRef  = useRef(null)

  const getRowKey = (s) => s.supabaseId || s.email || `local-${s.id}`

  useEffect(() => {
    fetch('/api/students')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setStudents(data) })
      .catch(() => {})
      .finally(() => setLoading(false))

    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || [])).catch(() => {})
    fetch('/api/classes').then(r => r.json()).then(d => setClassList((d.classes || []).map(c => c.name))).catch(() => {})
  }, [])

  async function handleTransfer(e) {
    e.preventDefault()
    if (!transferStudent?.supabaseId) return
    setTransferring(true)
    try {
      const r = await fetch(`/api/admin/users/${transferStudent.supabaseId}/branch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: transferBranchId || null }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      const newBranchName = branches.find(b => b.id === transferBranchId)?.name || ''
      setStudents(prev => prev.map(s => s.supabaseId === transferStudent.supabaseId
          ? { ...s, branchId: transferBranchId || null, branch: newBranchName }
          : s
      ))
      setTransferStudent(null)
    } catch (err) {
      alert(err.message)
    } finally { setTransferring(false) }
  }

  const handleSaveEdit = (updated) => {
    setStudents(prev => prev.map(s => (s.supabaseId ? s.supabaseId === updated.supabaseId : s.id === updated.id) ? updated : s))
    toast.success('Student updated')
    setEditStudent(null)
    setViewStudent(null)
  }

  const handleDelete = async (student) => {
    setDeleting(true)
    try {
      if (student.studentRowId) {
        const r = await fetch(`/api/students?id=${student.studentRowId}`, { method: 'DELETE' })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
      } else if (student.supabaseId) {
        const r = await fetch(`/api/admin/users/${student.supabaseId}`, { method: 'DELETE' })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
      }
      setStudents(prev => prev.filter(s => s.supabaseId ? s.supabaseId !== student.supabaseId : s.id !== student.id))
      toast.success(`${student.name} removed`)
      setDeleteConfirm(null)
    } catch (err) { toast.error(err.message) }
    finally { setDeleting(false) }
  }

  const handleExport = () => {
    const headers = ['Roll No', 'Name', 'Class', 'Parent', 'Phone', 'Email', 'Attendance %', 'Fee Status', 'Status']
    const rows = students.map(s => [s.roll, s.name, s.class, s.parent, s.phone, s.email, s.attendance, s.fees, s.status])
    downloadCSV('students.csv', headers, rows)
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''   // allow re-selecting same file

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const { rows } = parseCSV(ev.target.result)
      if (rows.length === 0) return

      // Optimistic preview in local state (rows with email will be persisted via API)
      const nextIdBase = studentsRef.current.length
        ? Math.max(...studentsRef.current.map(s => s.id || 0))
        : 0
      const preview = rows.map((row, idx) => {
        const cls = row.class ? row.class.replace(/grade\s*/gi, '').trim() : ''
        return {
          id:         nextIdBase + idx + 1,
          name:       row.name   || '',
          roll:       row.roll   || '',
          class:      cls,
          parent:     row.parent || '',
          phone:      row.phone  || '',
          email:      row.email  || '',
          attendance: null,
          fees:       'pending',
          status:     'active',
          branch:     row.branch || '',
        }
      })
      // Optimistic preview — add rows immediately so the user sees feedback
      setStudents(prev => [...preview, ...prev])

      // Persist to Supabase — only rows with email can be created
      try {
        const res  = await fetch('/api/students/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ students: rows }),
        })
        const json = await res.json()
        if (json.created > 0) {
          toast.success(`${json.created} student(s) saved to database.${json.skipped > 0 ? ` ${json.skipped} skipped (no email).` : ''}`)
          // Reload fresh list from API so new rows have real supabaseIds
          fetch('/api/students').then(r => r.ok ? r.json() : null).then(d => {
            if (Array.isArray(d)) setStudents(d)
          }).catch(() => {})
        } else if (json.skipped > 0 && json.created === 0) {
          // No rows were saved — remove the ghost preview rows
          setStudents(prev => prev.filter(s => !preview.some(p => p.id === s.id)))
          toast.error(`No students saved — email address is required for all rows (${json.skipped} skipped).`)
        }
        if (json.errors > 0) {
          toast.error(`${json.errors} row(s) failed. Check console for details.`)
        }
        setImportResult({ added: json.created || 0, importedIds: [] })
      } catch {
        // API failure — roll back the optimistic preview rows
        setStudents(prev => prev.filter(s => !preview.some(p => p.id === s.id)))
        toast.error('Could not save to database. Please try again.')
        setImportResult({ added: 0, importedIds: [] })
      }
    }
    reader.readAsText(file)
  }

  const stats = useMemo(() => [
    { label: 'Total Students', value: students.length.toLocaleString(),                                          icon: Users,       iconColor: '#2563EB', iconBg: '#EFF6FF' },
    { label: 'Active',         value: students.filter(s => s.status === 'active').length.toLocaleString(),       icon: UserCheck,   iconColor: '#10B981', iconBg: '#F0FDF4' },
    { label: 'Low Attendance', value: students.filter(s => s.attendance !== null && s.attendance !== undefined && s.attendance < 75).length.toLocaleString(), icon: AlertCircle, iconColor: '#F59E0B', iconBg: '#FFFBEB' },
    { label: 'Fee Defaulters', value: students.filter(s => s.fees === 'overdue').length.toLocaleString(),        icon: TrendingUp,  iconColor: '#EF4444', iconBg: '#FEF2F2' },
  ], [students])

  const filtered = useMemo(() => students.filter(s => {
    const matchSearch  = s.name.toLowerCase().includes(search.toLowerCase()) || s.roll.toLowerCase().includes(search.toLowerCase())
    const matchClass   = selectedClass  === 'all' || s.class  === selectedClass
    const matchFee     = selectedFee    === 'all' || s.fees   === selectedFee
    const matchBranch  = selectedBranch === 'all' || s.branch === selectedBranch || (!s.branch && selectedBranch === '__none__')
    return matchSearch && matchClass && matchFee && matchBranch
  }), [students, search, selectedClass, selectedFee, selectedBranch])

  useEffect(() => { setPage(1); setSelectedIds(new Set()) }, [search, selectedClass, selectedFee, selectedBranch])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered.length])
  const paginated  = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])

  // Sync header checkbox indeterminate state
  useEffect(() => {
    if (!headerCheckRef.current) return
    const pageKeys = paginated.map(getRowKey)
    const allSel  = pageKeys.length > 0 && pageKeys.every(k => selectedIds.has(k))
    const someSel = pageKeys.some(k => selectedIds.has(k))
    headerCheckRef.current.checked       = allSel
    headerCheckRef.current.indeterminate = someSel && !allSel
  }, [selectedIds, paginated])

  function toggleStudent(key) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function handleSelectAll(e) {
    setSelectedIds(e.target.checked ? new Set(paginated.map(getRowKey)) : new Set())
  }

  function handleBulkExport() {
    const sel = students.filter(s => selectedIds.has(getRowKey(s)))
    const headers = ['Roll No', 'Name', 'Class', 'Branch', 'Parent', 'Phone', 'Email', 'Attendance %', 'Fee Status']
    downloadCSV(`students-${sel.length}.csv`, headers, sel.map(s => [s.roll, s.name, s.class, s.branch, s.parent, s.phone, s.email, s.attendance, s.fees]))
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    const sel = students.filter(s => selectedIds.has(getRowKey(s)))
    let count = 0
    for (const student of sel) {
      try {
        if (student.studentRowId) {
          const r = await fetch(`/api/students?id=${student.studentRowId}`, { method: 'DELETE' })
          if (r.ok) count++
        } else if (student.supabaseId) {
          const r = await fetch(`/api/admin/users/${student.supabaseId}`, { method: 'DELETE' })
          if (r.ok) count++
        }
      } catch {}
    }
    const removedKeys = new Set(sel.map(getRowKey))
    setStudents(prev => prev.filter(s => !removedKeys.has(getRowKey(s))))
    setSelectedIds(new Set())
    setBulkDeleteConfirm(false)
    setBulkDeleting(false)
    if (count > 0) toast.success(`${count} student${count > 1 ? 's' : ''} removed`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Import result toast */}
      <AnimatePresence>
        {importResult && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 12, scale: 0.97  }}
            style={{
              position: 'fixed', bottom: 28, right: 24, zIndex: 9999,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 16, padding: '16px 18px',
              boxShadow: '0 12px 40px rgba(15,23,42,0.16)',
              display: 'flex', flexDirection: 'column', gap: 12,
              minWidth: 300, maxWidth: 380,
            }}
          >
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: importResult.added > 0 ? '#DCFCE7' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {importResult.added > 0
                  ? <CheckCircle size={17} style={{ color: '#16A34A' }} />
                  : <AlertCircle size={17} style={{ color: '#DC2626' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
                  {importResult.added > 0 ? 'Import Successful' : 'Nothing Imported'}
                </p>
                <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
                  {importResult.added > 0
                    ? `${importResult.added} student${importResult.added !== 1 ? 's' : ''} added to the list`
                    : 'No valid rows found — check that your CSV has a Name column'}
                </p>
              </div>
              <button onClick={() => setImportResult(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 2, flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>

            {/* Undo row — only shown when something was actually added */}
            {importResult.added > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
                <p style={{ fontSize: 11.5, color: '#94A3B8' }}>Wrong data? You can undo this import.</p>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setStudents(prev => prev.filter(s => !importResult.importedIds.includes(s.id)))
                    setImportResult(null)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 14px', borderRadius: 8,
                    border: '1px solid #FECACA', background: '#FEF2F2',
                    color: '#DC2626', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  ↩ Undo Import
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Students</h1>
          <p className="page-header-sub">Manage all student records, profiles and academic history</p>
        </div>
        <div className="page-actions">
          <input ref={importRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />

          {/* Import ▼ — merged dropdown (Part 6 of DS sprint) */}
          <ActionDropdown
            label="Import"
            icon={Upload}
            align="right"
            items={[
              {
                label: 'Import CSV',
                desc:  'Upload a .csv file with student data',
                icon:  Upload,
                iconColor: '#2563EB', iconBg: '#EFF6FF',
                onClick: () => importRef.current?.click(),
              },
              {
                label: 'Import Excel',
                desc:  'Coming soon',
                icon:  FileText,
                iconColor: '#10B981', iconBg: '#F0FDF4',
                disabled: true,
              },
              { divider: true },
              {
                label: 'Download Template',
                desc:  'Sample CSV with all columns',
                icon:  Download,
                iconColor: '#64748B', iconBg: '#F1F5F9',
                onClick: () => downloadCSV(
                  'students-template.csv',
                  ['Name','Roll No','Class','Parent','Phone','Email'],
                  [['Rahul Sharma','A001','10-A','Suresh Sharma','+91 98765 43210','rahul@email.com']]
                ),
              },
            ]}
          />

          <button className="btn-secondary" onClick={handleExport}>
            <Download size={15} /> Export
          </button>
          <Link href="/students/new">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-primary">
              <Plus size={15} /> Add Student
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => {
          const StatIcon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ translateY: -2, boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}
              transition={{ duration: 0.15 }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <StatIcon size={18} style={{ color: stat.iconColor }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#64748B', marginBottom: 6 }}>{stat.label}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 30, fontWeight: 700, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.03em' }}>{stat.value}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Table Card */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {/* Toolbar */}
        <div style={{ padding: '16px 20px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Row 1: Search + count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
              <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1', pointerEvents: 'none' }} />
              <input type="text" placeholder="Search by name or roll number…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="input-premium" style={{ paddingLeft: 36, paddingTop: 8, paddingBottom: 8, fontSize: 12, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 500, color: '#94A3B8', flexShrink: 0 }}>
              {filtered.length} / {students.length} students
            </span>
          </div>
          {/* Row 2: Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="input-premium" style={{ width: 'auto', minWidth: 120, fontSize: 12, padding: '6px 10px' }}>
              <option value="all">All Classes</option>
              {[...new Set([...classList, ...students.map(s => s.class).filter(Boolean)])].sort().map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={selectedFee} onChange={e => setSelectedFee(e.target.value)}
              className="input-premium" style={{ width: 'auto', minWidth: 140, fontSize: 12, padding: '6px 10px' }}>
              <option value="all">All Fee Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
            {branches.length > 0 && (
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
                className="input-premium" style={{ width: 'auto', minWidth: 140, fontSize: 12, padding: '6px 10px' }}>
                <option value="all">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                <option value="__none__">No Branch</option>
              </select>
            )}
          </div>
          {/* Row 3: Bulk action bar — only when students are selected */}
          {selectedIds.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={12} color="#FFF" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8' }}>
                {selectedIds.size} student{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button onClick={handleBulkExport}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #BFDBFE', background: '#FFFFFF', color: '#2563EB', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <Download size={12} /> Export CSV
                </button>
                <button onClick={() => setBulkDeleteConfirm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <Trash2 size={12} /> Delete
                </button>
                <button onClick={() => setSelectedIds(new Set())}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                  <X size={11} /> Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table-premium">
            <thead>
              <tr>
                <th className="w-10"><input ref={headerCheckRef} type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-600" onChange={handleSelectAll} /></th>
                <th>Student</th>
                <th>Roll No.</th>
                <th>Class</th>
                <th>Branch</th>
                <th>Attendance</th>
                <th>Fee Status</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ padding: 0 }}><TableSkeleton rows={8} cols={8} /></td></tr>
              )}
              {!loading && students.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 32px', textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                      <GraduationCap size={22} color="#94A3B8" />
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>No students registered yet</p>
                    <p style={{ fontSize: 13, color: '#64748B', margin: 0, maxWidth: 300 }}>Approve access requests from the dashboard to add students to the system.</p>
                  </div>
                </td></tr>
              )}
              {!loading && paginated.map((student, i) => {
                const fee = feeColors[student.fees]
                const color = avatarColors[i % avatarColors.length]
                const rowKey = student.supabaseId || student.email || `local-${student.id}`
                return (
                  <motion.tr key={rowKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                    <td><input type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-600" checked={selectedIds.has(rowKey)} onChange={() => toggleStudent(rowKey)} /></td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: color }}>
                          {student.name ? getInitials(student.name) : (student.roll ? student.roll.slice(0,2).toUpperCase() : '?')}
                        </div>
                        <div>
                          <p className="font-semibold text-xs" style={{ color: student.name ? '#0F172A' : '#94A3B8', fontStyle: student.name ? 'normal' : 'italic' }}>
                            {student.name || student.email || (student.roll ? `Roll ${student.roll}` : 'Unknown Student')}
                          </p>
                          {student.name && <p className="text-xs" style={{ color: '#94A3B8' }}>{student.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td><span className="font-mono text-xs" style={{ color: '#94A3B8' }}>{student.roll}</span></td>
                    <td>
                      <span className="px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: '#EFF6FF', color: '#2563EB' }}>{student.class}</span>
                    </td>
                    <td>
                      {student.branch
                        ? <span className="px-2 py-1 rounded-lg text-xs font-semibold" style={{ background: '#F0FDF4', color: '#16A34A' }}>{student.branch}</span>
                        : <span className="text-xs" style={{ color: '#CBD5E1' }}>—</span>}
                    </td>
                    <td><AttendanceBadge value={student.attendance} /></td>
                    <td>
                      <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ background: fee.bg, color: fee.color }}>{fee.label}</span>
                    </td>
                    <td><span className="badge badge-success text-xs">Active</span></td>
                    <td>
                      <div className="action-group">
                        <button title="View"   onClick={() => setViewStudent(student)}   className="action-btn action-btn-view"><Eye size={13} /></button>
                        <button title="Edit"   onClick={() => setEditStudent(student)}   className="action-btn action-btn-edit"><Edit size={13} /></button>
                        {student.supabaseId && branches.length > 0 && (
                          <button title="Transfer Branch"
                            onClick={() => { setTransferStudent(student); setTransferBranchId(student.branchId || '') }}
                            className="action-btn action-btn-green"><ArrowLeftRight size={13} /></button>
                        )}
                        <button title="Delete" onClick={() => setDeleteConfirm(student)} className="action-btn action-btn-delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page} totalPages={totalPages}
          totalItems={filtered.length} pageSize={PAGE_SIZE}
          onPageChange={setPage} label="students"
        />
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {viewStudent && !editStudent && (
          <StudentViewModal
            student={viewStudent}
            onEdit={() => setEditStudent(viewStudent)}
            onClose={() => setViewStudent(null)}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editStudent && (
          <StudentEditModal
            student={editStudent}
            onSave={handleSaveEdit}
            onClose={() => setEditStudent(null)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={OVERLAY} onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFF', borderRadius: 18, padding: 28, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Trash2 size={22} color="#DC2626" />
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Remove Student?</p>
                <p style={{ fontSize: 13, color: '#64748B', marginTop: 8, lineHeight: 1.5 }}>
                  <strong>{deleteConfirm.name}</strong> will be deactivated and removed from this list.
                  {deleteConfirm.supabaseId ? ' This also deactivates their login.' : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteConfirm(null)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#DC2626', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: deleting ? 'default' : 'pointer' }}>
                  {deleting ? 'Removing…' : 'Yes, Remove'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirm Modal */}
      <AnimatePresence>
        {bulkDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={OVERLAY} onClick={() => !bulkDeleting && setBulkDeleteConfirm(false)}>
            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFF', borderRadius: 18, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Trash2 size={22} color="#DC2626" />
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Remove {selectedIds.size} Student{selectedIds.size > 1 ? 's' : ''}?</p>
                <p style={{ fontSize: 13, color: '#64748B', marginTop: 8, lineHeight: 1.5 }}>
                  All selected students will be deactivated and removed from this list. This also deactivates their logins.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setBulkDeleteConfirm(false)} disabled={bulkDeleting}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleBulkDelete} disabled={bulkDeleting}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#DC2626', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: bulkDeleting ? 'default' : 'pointer' }}>
                  {bulkDeleting ? 'Removing…' : `Yes, Remove All`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Branch Modal */}
      <AnimatePresence>
        {transferStudent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: 'calc(var(--header-height) + 24px) 24px 40px' }}
            onClick={() => setTransferStudent(null)}>
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFF', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowLeftRight size={18} color="#2563EB" />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Transfer Branch</p>
                  <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{transferStudent.name}</p>
                </div>
                <button onClick={() => setTransferStudent(null)} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={16} /></button>
              </div>
              <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Select Branch</label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1', pointerEvents: 'none' }} />
                    <select value={transferBranchId} onChange={e => setTransferBranchId(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box', appearance: 'none' }}>
                      <option value="">— No Branch —</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  {transferStudent.branch && <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>Current: {transferStudent.branch}</p>}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setTransferStudent(null)}
                    style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={transferring}
                    style={{ padding: '9px 20px', borderRadius: 10, background: '#2563EB', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 700, cursor: transferring ? 'default' : 'pointer' }}>
                    {transferring ? 'Transferring…' : 'Transfer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

