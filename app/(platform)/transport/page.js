'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, MapPin, Users, AlertCircle, Plus, Eye, X, UserPlus, Trash2, Clock, Check, Pencil, Save, ChevronRight, Phone, Mail, IndianRupee, User } from 'lucide-react'
import Link from 'next/link'
import { computeFeeStatus } from '@/lib/feeUtils'
const statusConfig = {
  active:      { label: 'Active',      color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  maintenance: { label: 'Maintenance', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  inactive:    { label: 'Inactive',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
}
const feeColors = {
  paid:    { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  partial: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  pending: { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
  overdue: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
}

const OVERLAY = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.52)', zIndex: 200,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
}

const feeStatusFromAmounts = (total, paid) => computeFeeStatus(total, paid)

/* ── Student Edit Modal (inside route view) ───────────────────────── */
function StudentEditModal({ student, assignedStop, routeStops, onClose, onSave }) {
  const [form, setForm] = useState({
    name:       student?.name       || '',
    roll:       student?.roll       || '',
    class:      student?.class      || '',
    parent:     student?.parent     || '',
    phone:      student?.phone      || '',
    email:      student?.email      || '',
    stop:       assignedStop        || (routeStops[0] || ''),
    totalFee:   student?.totalFee   != null ? String(student.totalFee)   : '',
    paidAmount: student?.paidAmount != null ? String(student.paidAmount) : '',
    fees:       student?.fees       || 'pending',
  })

  const set = k => e => {
    const val = e.target.value
    setForm(f => {
      const next = { ...f, [k]: val }
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

  const inp = { style: { width: '100%', padding: '8px 11px', borderRadius: 9, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } }

  const sectionLabel = text => (
    <p style={{ gridColumn: '1 / -1', fontSize: 10, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 8, borderBottom: '1px solid #EFF6FF', margin: '4px 0 2px' }}>{text}</p>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ ...OVERLAY, zIndex: 300 }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        style={{ background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,23,42,0.22)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pencil size={15} style={{ color: '#2563EB' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Edit Student Details</p>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{student?.name || 'New student'}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
          {sectionLabel('Personal Details')}

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Full Name</label>
            <input value={form.name} onChange={set('name')} {...inp} />
          </div>
          {[
            { label: 'Roll No.',    key: 'roll'   },
            { label: 'Class',       key: 'class'  },
            { label: 'Parent / Guardian', key: 'parent' },
            { label: 'Phone',       key: 'phone'  },
            { label: 'Email',       key: 'email'  },
          ].map(({ label, key }) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>{label}</label>
              <input value={form[key]} onChange={set(key)} {...inp} />
            </div>
          ))}

          {sectionLabel('Transport')}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Boarding Stop</label>
            <select value={form.stop} onChange={set('stop')} style={{ ...inp.style }}>
              {routeStops.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {sectionLabel('Fee Details')}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Total Fee (₹)</label>
            <input type="number" min="0" value={form.totalFee} onChange={set('totalFee')} placeholder="e.g. 12000" {...inp} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Amount Paid (₹)</label>
            <input type="number" min="0" value={form.paidAmount} onChange={set('paidAmount')} placeholder="e.g. 6000" {...inp} />
          </div>

          {(totalFee > 0 || paidAmount > 0) && (
            <>
              <div style={{ background: balance > 0 ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${balance > 0 ? '#FECACA' : '#BBF7D0'}`, borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>BALANCE DUE</p>
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
                <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 3 }}>Auto-set from amounts above</p>
              </div>
            </>
          )}
          {totalFee <= 0 && paidAmount <= 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Fee Status</label>
              <select value={form.fees} onChange={set('fees')} style={{ ...inp.style }}>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: '#FFFFFF' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>
            Cancel
          </button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => onSave({ ...form, totalFee, paidAmount, balance })}
            style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Save size={13} /> Save Changes
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Route View Modal ─────────────────────────────────────────────── */
function RouteViewModal({ route, allStudents, onClose, onRemoveStudent, onSaveStudent }) {
  const [editTarget, setEditTarget] = useState(null)

  const status    = statusConfig[route.status] || statusConfig.active
  const assigned  = route.assignedStudents || []
  const occupancy = route.capacity > 0 ? Math.round((assigned.length / route.capacity) * 100) : 0
  const occColor  = occupancy > 90 ? '#EF4444' : occupancy > 70 ? '#F59E0B' : '#2563EB'

  // Cross-reference with full student records by name
  const enriched = assigned.map(a => {
    const full = allStudents.find(s => s.name === a.name) || {}
    return { ...full, ...a }
  })

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={OVERLAY} onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
          style={{ background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
          onClick={e => e.stopPropagation()}>

          {/* Blue header */}
          <div style={{ background: 'linear-gradient(135deg,#1E3A8A,#2563EB)', padding: '22px 26px', position: 'sticky', top: 0, zIndex: 10 }}>
            <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, width: 28, height: 28, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
              <X size={14} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bus size={22} style={{ color: '#FFF' }} />
              </div>
              <div>
                <p style={{ fontSize: 17, fontWeight: 800, color: '#FFF', margin: 0, letterSpacing: '-0.01em' }}>{route.name}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>{route.vehicle} &nbsp;·&nbsp; Driver: {route.driver}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
              <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: status.bg, color: status.color, border: `1px solid ${status.border}` }}>{status.label}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={11} /> {route.departure} → {route.arrival}
              </span>
            </div>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Capacity KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { label: 'Bus Capacity', value: route.capacity, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
                { label: 'Assigned',     value: assigned.length, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
                { label: 'Seats Free',   value: Math.max(0, route.capacity - assigned.length), color: Math.max(0, route.capacity - assigned.length) === 0 ? '#DC2626' : '#D97706', bg: Math.max(0, route.capacity - assigned.length) === 0 ? '#FEF2F2' : '#FFFBEB', border: Math.max(0, route.capacity - assigned.length) === 0 ? '#FECACA' : '#FDE68A' },
                { label: 'Occupancy',    value: `${occupancy}%`, color: occColor, bg: '#F8FAFC', border: '#E2E8F0' },
              ].map(k => (
                <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>{k.value}</p>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#64748B', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</p>
                </div>
              ))}
            </div>

            {/* Stops */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>Route Stops</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {route.stops.map((stop, i) => (
                  <span key={stop} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 99, background: i === 0 ? '#EFF6FF' : i === route.stops.length - 1 ? '#F0FDF4' : '#F8FAFC', color: i === 0 ? '#2563EB' : i === route.stops.length - 1 ? '#16A34A' : '#64748B', border: `1px solid ${i === 0 ? '#BFDBFE' : i === route.stops.length - 1 ? '#BBF7D0' : '#E2E8F0'}` }}>
                    <MapPin size={10} />{stop}
                    {i < route.stops.length - 1 && <ChevronRight size={10} style={{ opacity: 0.4 }} />}
                  </span>
                ))}
              </div>
            </div>

            {/* Student List */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                  Students in this Bus
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', padding: '2px 8px', borderRadius: 99 }}>{assigned.length}</span>
                </p>
              </div>

              {enriched.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 13, background: '#F8FAFC', borderRadius: 12, border: '1px dashed #E2E8F0' }}>
                  No students assigned to this bus yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {enriched.map((s, i) => {
                    const feeC  = feeColors[s.fees] || feeColors.pending
                    const bal   = s.balance != null ? s.balance : (s.totalFee > 0 ? Math.max(0, s.totalFee - (s.paidAmount || 0)) : null)
                    const initials = (s.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                    const avatarColors = ['#2563EB','#7C3AED','#0891B2','#16A34A','#D97706','#DB2777']
                    const aColor = avatarColors[i % avatarColors.length]

                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        style={{ border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', background: '#FFFFFF' }}>

                        {/* Student header row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: aColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#FFF', flexShrink: 0 }}>
                              {initials}
                            </div>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>{s.name}</p>
                              <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
                                {s.class ? `Class ${s.class}` : '—'}
                                &nbsp;·&nbsp;Stop: <strong style={{ color: '#2563EB' }}>{s.stop}</strong>
                                {s.roll ? ` · Roll ${s.roll}` : ''}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {s.fees && (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: feeC.bg, color: feeC.color, border: `1px solid ${feeC.border}`, textTransform: 'capitalize' }}>{s.fees}</span>
                            )}
                            <button onClick={() => setEditTarget(s)}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                              <Pencil size={11} /> Edit
                            </button>
                            <button onClick={() => onRemoveStudent(route.id, s.name)}
                              style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #FECACA', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#DC2626' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Detail grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
                          {[
                            { icon: Phone,        label: 'Phone',    value: s.phone   || '—' },
                            { icon: User,         label: 'Parent',   value: s.parent  || '—' },
                            { icon: Mail,         label: 'Email',    value: s.email   || '—' },
                          ].map(({ icon: Icon, label, value }, j) => (
                            <div key={label} style={{ padding: '10px 14px', borderRight: j < 2 ? '1px solid #F1F5F9' : 'none' }}>
                              <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Icon size={9} />{label}
                              </p>
                              <p style={{ fontSize: 12, fontWeight: 500, color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Fee row */}
                        {(s.totalFee > 0 || s.paidAmount > 0 || bal != null) && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px solid #F1F5F9' }}>
                            {[
                              { label: 'Total Fee',    value: s.totalFee   != null ? `₹${Number(s.totalFee).toLocaleString('en-IN')}` : '—', color: '#0F172A' },
                              { label: 'Paid',         value: s.paidAmount != null ? `₹${Number(s.paidAmount).toLocaleString('en-IN')}` : '—', color: '#16A34A' },
                              { label: 'Balance',      value: bal           != null ? `₹${Number(bal).toLocaleString('en-IN')}` : '—', color: bal > 0 ? '#DC2626' : '#16A34A' },
                            ].map(({ label, value, color }, j) => (
                              <div key={label} style={{ padding: '8px 14px', background: '#FAFAFA', borderRight: j < 2 ? '1px solid #F1F5F9' : 'none' }}>
                                <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</p>
                                <p style={{ fontSize: 13, fontWeight: 700, color, margin: 0, fontFamily: 'Inter, sans-serif' }}>{value}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Student Edit Modal stacked on top */}
      <AnimatePresence>
        {editTarget && (
          <StudentEditModal
            key="student-edit"
            student={allStudents.find(s => s.name === editTarget.name) || editTarget}
            assignedStop={editTarget.stop}
            routeStops={route.stops}
            onClose={() => setEditTarget(null)}
            onSave={updates => {
              onSaveStudent(editTarget, updates, route.id)
              setEditTarget(null)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

/* ── Assign Transport Modal ───────────────────────────────────────── */
function AssignTransportModal({ routes, onClose, onAssign }) {
  const [form, setForm] = useState({ studentName: '', studentClass: '', routeId: String(routes[0]?.id || ''), stop: '' })
  const [saved, setSaved] = useState(false)
  const set = k => e => setForm(f => {
    const next = { ...f, [k]: e.target.value }
    if (k === 'routeId') next.stop = ''
    return next
  })

  const selectedRoute = routes.find(r => String(r.id) === String(form.routeId))

  const handleAssign = () => {
    if (!form.studentName.trim() || !form.routeId || !form.stop) return
    onAssign(Number(form.routeId), {
      name:  form.studentName.trim(),
      class: form.studentClass.trim() || '',
      stop:  form.stop,
    })
    setSaved(true)
    setTimeout(onClose, 700)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={OVERLAY} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        style={{ background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={16} style={{ color: '#2563EB' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Assign Transport</p>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>Assign a student to a bus route</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Student Name *</label>
            <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
              value={form.studentName} onChange={set('studentName')} placeholder="e.g. Priya Patel" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Class</label>
              <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
                value={form.studentClass} onChange={set('studentClass')} placeholder="e.g. 11-A" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Bus Route *</label>
              <select className="input-premium" style={{ width: '100%' }} value={form.routeId} onChange={set('routeId')}>
                {routes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({(r.assignedStudents?.length ?? r.enrolled)}/{r.capacity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Boarding Stop *</label>
            <select className="input-premium" style={{ width: '100%' }} value={form.stop} onChange={set('stop')}>
              <option value="">— Select stop —</option>
              {(selectedRoute?.stops || []).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {selectedRoute && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { label: 'Vehicle',    value: selectedRoute.vehicle },
                { label: 'Driver',     value: selectedRoute.driver },
                { label: 'Seats Free', value: Math.max(0, selectedRoute.capacity - (selectedRoute.assignedStudents?.length ?? selectedRoute.enrolled)), color: Math.max(0, selectedRoute.capacity - (selectedRoute.assignedStudents?.length ?? selectedRoute.enrolled)) === 0 ? '#DC2626' : '#16A34A' },
                { label: 'Departs',    value: selectedRoute.departure },
              ].map(k => (
                <div key={k.label}>
                  <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{k.label}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: k.color || '#0F172A' }}>{k.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAssign}
            disabled={!form.studentName.trim() || !form.stop}
            style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: saved ? '#16A34A' : '#2563EB', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: 'background 0.2s', opacity: (!form.studentName.trim() || !form.stop) ? 0.5 : 1 }}>
            {saved ? <><Check size={14} /> Assigned!</> : <><UserPlus size={14} /> Assign Student</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Main Page ────────────────────────────────────────────────────── */
export default function TransportPage() {

  const [routes,     setRoutes   ] = useState([])
  const [vehicles,   setVehicles ] = useState([])
  const [loading,    setLoading  ] = useState(true)
  const [viewRoute,  setViewRoute] = useState(null)
  const [showAssign, setShowAssign] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/transport?type=routes').then(r => r.ok ? r.json() : {}),
      fetch('/api/transport?type=vehicles').then(r => r.ok ? r.json() : {}),
    ]).then(([routeData, vehicleData]) => {
      setRoutes(routeData.routes || [])
      setVehicles(vehicleData.vehicles || [])
    }).catch(() => setRoutes([]))
     .finally(() => setLoading(false))
  }, [])

  const totalEnrolled = routes.reduce((s, r) => s + (r.studentsCount ?? r.assignedStudents?.length ?? r.enrolled ?? 0), 0)
  const activeCount   = routes.filter(r => r.isActive !== false && r.status !== 'inactive' && r.status !== 'maintenance').length
  const maintCount    = routes.filter(r => r.status === 'maintenance').length

  const handleSaveStudent = async (originalEntry, updates, routeId) => {
    // Persist to DB if we have the assignment ID
    if (originalEntry.assignmentId) {
      try {
        await fetch('/api/transport', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id:        originalEntry.assignmentId,
            type:      'assignment',
            stop_name: updates.stop  || originalEntry.stop,
            monthly_fee: Number(updates.totalFee) || originalEntry.monthlyFee || 0,
          }),
        })
      } catch {}
    }
    // Optimistic update in local state
    const mapStudents = list => (list || []).map(a =>
      a.name === originalEntry.name
        ? { ...a, name: updates.name, class: updates.class, stop: updates.stop }
        : a
    )
    setRoutes(prev => prev.map(r =>
      r.id !== routeId ? r : { ...r, assignedStudents: mapStudents(r.assignedStudents) }
    ))
    if (viewRoute?.id === routeId) {
      setViewRoute(prev => ({ ...prev, assignedStudents: mapStudents(prev?.assignedStudents) }))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Transport Management</h1>
          <p className="page-header-sub">Vehicles, routes, drivers &amp; student assignments</p>
        </div>
        <div className="page-actions">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setShowAssign(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <UserPlus size={14} /> Assign Transport
          </motion.button>
          <Link href="/transport/new">
            <motion.button whileHover={{ scale: 1.02 }} className="btn-primary">
              <Plus size={15} /> Add Route
            </motion.button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Vehicles',    value: routes.length,  icon: Bus,         iconColor: '#2563EB', iconBg: '#EFF6FF' },
          { label: 'Active Routes',     value: activeCount,    icon: MapPin,      iconColor: '#10B981', iconBg: '#F0FDF4' },
          { label: 'Students Enrolled', value: totalEnrolled,  icon: Users,       iconColor: '#0891B2', iconBg: '#ECFEFF' },
          { label: 'In Maintenance',    value: maintCount,     icon: AlertCircle, iconColor: '#F59E0B', iconBg: '#FFFBEB' },
        ].map((stat, i) => {
          const StatIcon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.15 }}
              whileHover={{ translateY: -2, boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}
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

      {/* Route Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {routes.map((route, i) => {
          const assigned  = route.assignedStudents?.length ?? route.enrolled ?? 0
          const occupancy = route.capacity > 0 ? Math.round((assigned / route.capacity) * 100) : 0
          const status    = statusConfig[route.status] || statusConfig.active
          const occColor  = occupancy > 90 ? '#EF4444' : occupancy > 70 ? '#F59E0B' : '#2563EB'
          const seatsFree = Math.max(0, route.capacity - assigned)

          return (
            <motion.div key={route.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              whileHover={{ boxShadow: '0 6px 20px rgba(15,23,42,0.09)' }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 6px rgba(15,23,42,0.05)' }}>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bus size={18} style={{ color: '#2563EB' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{route.name}</p>
                    <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{route.vehicle} &nbsp;·&nbsp; Driver: {route.driver}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: status.bg, color: status.color, border: `1px solid ${status.border}` }}>{status.label}</span>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setViewRoute(route)
                      // Load real assigned students for this route
                      fetch(`/api/transport?type=assignments&route_id=${route.id}`)
                        .then(r => r.ok ? r.json() : {})
                        .then(d => {
                          if (Array.isArray(d.assignments) && d.assignments.length > 0) {
                            const enriched = d.assignments.map(a => ({
                              name:         a.student,
                              class:        a.class,
                              stop:         a.stop,
                              phone:        a.phone,
                              monthlyFee:   a.monthlyFee,
                              assignmentId: a.id,
                            }))
                            setViewRoute(prev => prev && prev.id === route.id
                              ? { ...prev, assignedStudents: enriched }
                              : prev
                            )
                          }
                        })
                        .catch(() => {})
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Eye size={13} /> View
                  </motion.button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16, padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #F1F5F9' }}>
                {[
                  { label: 'Departs',    value: route.departure },
                  { label: 'Arrives',    value: route.arrival },
                  { label: 'Students',   value: `${assigned}/${route.capacity}` },
                  { label: 'Seats Free', value: seatsFree, color: seatsFree === 0 ? '#DC2626' : '#16A34A' },
                ].map((item, j) => (
                  <div key={item.label} style={{ display: 'contents' }}>
                    <div style={{ flex: 1, paddingLeft: j > 0 ? 14 : 0 }}>
                      <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginBottom: 2 }}>{item.label}</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: item.color || '#0F172A' }}>{item.value}</p>
                    </div>
                    {j < 3 && <div style={{ width: 1, height: 28, background: '#E2E8F0', flexShrink: 0 }} />}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>Occupancy</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: occColor }}>{occupancy}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${occupancy}%` }} transition={{ delay: 0.2 + i * 0.08, duration: 0.6 }}
                    style={{ height: '100%', borderRadius: 99, background: occColor }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {route.stops.map(stop => (
                    <span key={stop} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}>
                      <MapPin size={9} />{stop}
                    </span>
                  ))}
                </div>
                {assigned > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '3px 10px', borderRadius: 99, whiteSpace: 'nowrap', marginLeft: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={10} />{assigned} students
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {viewRoute && (
          <RouteViewModal key="view"
            route={routes.find(r => r.id === viewRoute.id) || viewRoute}
            allStudents={[]}
            onClose={() => setViewRoute(null)}
            onRemoveStudent={(routeId, name) => removeStudentFromRoute(routeId, name)}
            onSaveStudent={handleSaveStudent} />
        )}
        {showAssign && (
          <AssignTransportModal key="assign"
            routes={routes}
            onClose={() => setShowAssign(false)}
            onAssign={(routeId, student) => assignStudentToRoute(routeId, student)} />
        )}
      </AnimatePresence>
    </div>
  )
}
