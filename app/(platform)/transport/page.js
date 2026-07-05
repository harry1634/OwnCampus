'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, MapPin, Users, AlertCircle, Plus, Eye, X, UserPlus, Trash2, Clock, Check, Pencil, Save, ChevronRight, Phone, Mail, User } from 'lucide-react'
import Link from 'next/link'
import { computeFeeStatus } from '@/lib/feeUtils'

const feeColors = {
  paid:    { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  partial: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  pending: { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
  overdue: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
}

const OVERLAY = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.52)', zIndex: 200,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
  overflowY: 'auto', padding: 'calc(var(--header-height) + 24px) 24px 40px',
}

/* ── Student Edit Modal ───────────────────────────────────────────── */
function StudentEditModal({ student, assignedStop, routeStops, onClose, onSave }) {
  const [form, setForm] = useState({
    name:       student?.name       || '',
    roll:       student?.roll       || '',
    class:      student?.class      || '',
    phone:      student?.phone      || '',
    stop:       assignedStop        || (routeStops?.[0] || ''),
    totalFee:   student?.totalFee   != null ? String(student.totalFee)   : '',
    paidAmount: student?.paidAmount != null ? String(student.paidAmount) : '',
    fees:       student?.fees       || 'pending',
  })

  const set = k => e => {
    const val = e.target.value
    setForm(f => {
      const next = { ...f, [k]: val }
      if (k === 'totalFee' || k === 'paidAmount') {
        next.fees = computeFeeStatus(
          k === 'totalFee'   ? val : f.totalFee,
          k === 'paidAmount' ? val : f.paidAmount,
        )
      }
      return next
    })
  }

  const totalFee   = parseFloat(form.totalFee)  || 0
  const paidAmount = parseFloat(form.paidAmount) || 0
  const balance    = Math.max(0, totalFee - paidAmount)

  const inp = { style: { width: '100%', padding: '8px 11px', borderRadius: 9, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } }
  const lbl = { style: { fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 } }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ ...OVERLAY, zIndex: 300 }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        style={{ background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - var(--header-height) - 64px)', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,23,42,0.22)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pencil size={14} style={{ color: '#2563EB' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Edit Student</p>
              <p style={{ fontSize: 11, color: '#64748B' }}>{student?.name || ''}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <X size={13} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label {...lbl}>Full Name</label>
              <input value={form.name} onChange={set('name')} {...inp} />
            </div>
            <div>
              <label {...lbl}>Roll No.</label>
              <input value={form.roll} onChange={set('roll')} {...inp} />
            </div>
            <div>
              <label {...lbl}>Class</label>
              <input value={form.class} onChange={set('class')} {...inp} />
            </div>
            <div>
              <label {...lbl}>Phone</label>
              <input value={form.phone} onChange={set('phone')} {...inp} />
            </div>
            <div>
              <label {...lbl}>Boarding Stop</label>
              <select value={form.stop} onChange={set('stop')} style={{ ...inp.style }}>
                {(routeStops || []).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Fee Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label {...lbl}>Monthly Fee (₹)</label>
                <input type="number" min="0" value={form.totalFee} onChange={set('totalFee')} placeholder="1500" {...inp} />
              </div>
              <div>
                <label {...lbl}>Amount Paid (₹)</label>
                <input type="number" min="0" value={form.paidAmount} onChange={set('paidAmount')} placeholder="1500" {...inp} />
              </div>
              {(totalFee > 0 || paidAmount > 0) && (
                <div style={{ gridColumn: '1 / -1', background: balance > 0 ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${balance > 0 ? '#FECACA' : '#BBF7D0'}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>Balance Due</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: balance > 0 ? '#DC2626' : '#16A34A' }}>₹{balance.toLocaleString('en-IN')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: '#FFFFFF' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => onSave({ ...form, totalFee, paidAmount, balance })}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={13} /> Save
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Bus / Route Edit Modal ───────────────────────────────────────── */
function BusEditModal({ route, onClose, onSave }) {
  const [form, setForm] = useState({
    routeName:   route.name          || '',
    departure:   route.departureTime || '',
    arrival:     route.arrivalTime   || '',
    stops:       (route.stops || []).join(', '),
    makeModel:   route.vehicleModel  || '',
    capacity:    route.capacity ? String(route.capacity) : '',
    vehicleType: route.vehicleType   || 'bus',
    vehicleReg:  route.vehicleReg    || '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError ] = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const stopsList = form.stops ? form.stops.split(',').map(s => s.trim()).filter(Boolean) : []

      const rRes = await fetch('/api/transport', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: route.id, type: 'route',
          name:           form.routeName.trim() || route.name,
          departure_time: form.departure || null,
          arrival_time:   form.arrival   || null,
          stops:          stopsList,
        }),
      })
      const rJson = await rRes.json()
      if (!rRes.ok || rJson.error) { setError(rJson.error || 'Failed to save route'); setSaving(false); return }

      if (route.vehicleId) {
        const parts = form.makeModel.trim().split(' ')
        const vRes  = await fetch('/api/transport', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: route.vehicleId, type: 'vehicle',
            registration_number: form.vehicleReg.trim() || undefined,
            make:     parts[0] || null,
            model:    parts.slice(1).join(' ') || null,
            capacity: parseInt(form.capacity) || null,
          }),
        })
        const vJson = await vRes.json()
        if (!vRes.ok || vJson.error) { setError(vJson.error || 'Failed to save vehicle'); setSaving(false); return }
      }

      onSave({
        name:          form.routeName.trim() || route.name,
        departureTime: form.departure || '',
        arrivalTime:   form.arrival   || '',
        stops:         stopsList,
        vehicleReg:    form.vehicleReg.trim() || route.vehicleReg,
        vehicleModel:  form.makeModel.trim(),
        capacity:      parseInt(form.capacity) || route.capacity || 0,
        vehicleType:   form.vehicleType,
      })
    } catch (err) { setError(err.message); setSaving(false) }
  }

  const inp = { style: { width: '100%', padding: '8px 11px', borderRadius: 9, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } }
  const lbl = { style: { fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 } }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ ...OVERLAY, zIndex: 350 }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        style={{ background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: 'calc(100vh - var(--header-height) - 64px)', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,23,42,0.22)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bus size={14} style={{ color: '#2563EB' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Edit Route &amp; Bus</p>
              <p style={{ fontSize: 11, color: '#64748B' }}>{route.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <X size={13} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Route Details</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label {...lbl}>Route Name</label>
                <input value={form.routeName} onChange={set('routeName')} {...inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label {...lbl}>Departure Time</label>
                  <input type="time" value={form.departure} onChange={set('departure')} {...inp} />
                </div>
                <div>
                  <label {...lbl}>Arrival Time</label>
                  <input type="time" value={form.arrival} onChange={set('arrival')} {...inp} />
                </div>
              </div>
              <div>
                <label {...lbl}>Stops (comma-separated)</label>
                <input value={form.stops} onChange={set('stops')} placeholder="Sector 56, MG Road, IFFCO Chowk" {...inp} />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Bus / Vehicle</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label {...lbl}>Vehicle Number</label>
                <input value={form.vehicleReg} onChange={set('vehicleReg')} placeholder="e.g. DL-2C-5678" {...inp} />
              </div>
              <div>
                <label {...lbl}>Type</label>
                <select value={form.vehicleType} onChange={set('vehicleType')} style={{ ...inp.style }}>
                  <option value="bus">Bus</option>
                  <option value="minibus">Minibus</option>
                  <option value="van">Van</option>
                </select>
              </div>
              <div>
                <label {...lbl}>Make / Model</label>
                <input value={form.makeModel} onChange={set('makeModel')} placeholder="e.g. Tata Starbus" {...inp} />
              </div>
              <div>
                <label {...lbl}>Seating Capacity</label>
                <input type="number" min="1" value={form.capacity} onChange={set('capacity')} placeholder="48" {...inp} />
              </div>
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#DC2626' }}>{error}</div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: '#FFFFFF' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
            <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Route View Modal ─────────────────────────────────────────────── */
function RouteViewModal({ route, onClose, onRemoveStudent, onSaveStudent, onUpdateRoute }) {
  const [editTarget, setEditTarget] = useState(null)
  const [editingBus, setEditingBus] = useState(false)

  const assigned  = route.assignedStudents || []
  const capacity  = route.capacity || 0
  const occupancy = capacity > 0 ? Math.round((assigned.length / capacity) * 100) : 0
  const occColor  = occupancy > 90 ? '#EF4444' : occupancy > 70 ? '#F59E0B' : '#2563EB'

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={OVERLAY} onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
          style={{ background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 720, maxHeight: 'calc(100vh - var(--header-height) - 64px)', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
          onClick={e => e.stopPropagation()}>

          {/* Blue header */}
          <div style={{ background: '#2563EB', padding: '22px 26px', position: 'sticky', top: 0, zIndex: 10 }}>
            <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, width: 28, height: 28, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
              <X size={14} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bus size={22} style={{ color: '#FFF' }} />
              </div>
              <div>
                <p style={{ fontSize: 17, fontWeight: 800, color: '#FFF', margin: 0 }}>{route.name}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>
                  {route.vehicleReg || 'No vehicle assigned'} &nbsp;·&nbsp; Driver: {route.driver || '—'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.2)', color: '#FFF' }}>
                {route.isActive !== false ? 'Active' : 'Inactive'}
              </span>
              {(route.departureTime || route.arrivalTime) && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={11} /> {route.departureTime || '—'} → {route.arrivalTime || '—'}
                </span>
              )}
            </div>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { label: 'Bus Capacity', value: String(capacity),        color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
                { label: 'Assigned',     value: String(assigned.length), color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
                { label: 'Seats Free',   value: String(Math.max(0, capacity - assigned.length)),
                  color:  Math.max(0, capacity - assigned.length) === 0 ? '#DC2626' : '#D97706',
                  bg:     Math.max(0, capacity - assigned.length) === 0 ? '#FEF2F2' : '#FFFBEB',
                  border: Math.max(0, capacity - assigned.length) === 0 ? '#FECACA' : '#FDE68A' },
                { label: 'Occupancy',    value: `${occupancy}%`,         color: occColor,  bg: '#F8FAFC', border: '#E2E8F0' },
              ].map(k => (
                <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</p>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#64748B', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</p>
                </div>
              ))}
            </div>

            {/* Bus details */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Bus Details</p>
                <button onClick={() => setEditingBus(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Pencil size={10} /> Edit
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { label: 'Registration', value: route.vehicleReg   || '—' },
                  { label: 'Type',         value: route.vehicleType  ? route.vehicleType.toUpperCase() : '—' },
                  { label: 'Model',        value: route.vehicleModel || '—' },
                  { label: 'Capacity',     value: route.capacity     ? `${route.capacity} seats` : '—' },
                ].map(item => (
                  <div key={item.label}>
                    <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{item.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stops */}
            {(route.stops?.length > 0) && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Route Stops</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {route.stops.map((stop, i) => (
                    <span key={stop} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, padding: '5px 11px', borderRadius: 99,
                      background: i === 0 ? '#EFF6FF' : i === route.stops.length - 1 ? '#F0FDF4' : '#F8FAFC',
                      color:      i === 0 ? '#2563EB' : i === route.stops.length - 1 ? '#16A34A' : '#64748B',
                      border:     `1px solid ${i === 0 ? '#BFDBFE' : i === route.stops.length - 1 ? '#BBF7D0' : '#E2E8F0'}` }}>
                      <MapPin size={9} />{stop}
                      {i < route.stops.length - 1 && <ChevronRight size={9} style={{ opacity: 0.4 }} />}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Student list */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
                Students in this Bus
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', padding: '2px 8px', borderRadius: 99 }}>{assigned.length}</span>
              </p>

              {assigned.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 13, background: '#F8FAFC', borderRadius: 12, border: '1px dashed #E2E8F0' }}>
                  No students assigned to this bus yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {assigned.map((s, i) => {
                    const feeC     = feeColors[s.fees] || feeColors.pending
                    const initials = (s.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                    const aColors  = ['#2563EB','#7C3AED','#0891B2','#16A34A','#D97706','#DB2777']
                    return (
                      <div key={s.assignmentId || i} style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', background: '#FFFFFF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: aColors[i % aColors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#FFF', flexShrink: 0 }}>
                              {initials}
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>{s.name}</p>
                              <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>
                                {s.class ? `Class ${s.class}` : '—'}&nbsp;·&nbsp;
                                Stop: <strong style={{ color: '#2563EB' }}>{s.stop || '—'}</strong>
                                {s.roll ? ` · Roll ${s.roll}` : ''}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {s.fees && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: feeC.bg, color: feeC.color, border: `1px solid ${feeC.border}`, textTransform: 'capitalize' }}>{s.fees}</span>}
                            <button onClick={() => setEditTarget(s)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                              <Pencil size={10} /> Edit
                            </button>
                            <button onClick={() => onRemoveStudent(route.id, s.name)}
                              style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#DC2626' }}>
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                          {[
                            { icon: Phone, label: 'Phone',      value: s.phone  || '—' },
                            { icon: User,  label: 'Roll No.',   value: s.roll   || '—' },
                            { icon: Mail,  label: 'Monthly Fee',value: s.monthlyFee ? `₹${Number(s.monthlyFee).toLocaleString('en-IN')}` : '—' },
                          ].map(({ icon: Icon, label, value }, j) => (
                            <div key={label} style={{ padding: '8px 12px', borderRight: j < 2 ? '1px solid #F1F5F9' : 'none' }}>
                              <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Icon size={9} />{label}
                              </p>
                              <p style={{ fontSize: 12, fontWeight: 500, color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {editTarget && (
          <StudentEditModal key="edit-student"
            student={editTarget}
            assignedStop={editTarget.stop}
            routeStops={route.stops || []}
            onClose={() => setEditTarget(null)}
            onSave={updates => { onSaveStudent(editTarget, updates, route.id); setEditTarget(null) }}
          />
        )}
        {editingBus && (
          <BusEditModal key="edit-bus"
            route={route}
            onClose={() => setEditingBus(false)}
            onSave={updates => { onUpdateRoute(route.id, updates); setEditingBus(false) }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

/* ── Assign Transport Modal ───────────────────────────────────────── */
function AssignTransportModal({ routes, onClose, onAssign }) {
  const [routeId,     setRouteId    ] = useState(String(routes[0]?.id || ''))
  const [stop,        setStop       ] = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentId,   setStudentId  ] = useState(null)
  const [studentMeta, setStudentMeta] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [searching,   setSearching  ] = useState(false)
  const [saved,       setSaved      ] = useState(false)
  const timerRef = useRef(null)

  const selectedRoute = routes.find(r => String(r.id) === String(routeId))
  const seatsLeft = selectedRoute ? Math.max(0, (selectedRoute.capacity || 0) - (selectedRoute.studentsCount || 0)) : 0

  const handleNameChange = e => {
    const val = e.target.value
    setStudentName(val)
    setStudentId(null)
    setStudentMeta(null)
    setSuggestions([])
    if (timerRef.current) clearTimeout(timerRef.current)
    if (val.trim().length < 2) { setSearching(false); return }
    setSearching(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/hostel/allocations?search=${encodeURIComponent(val.trim())}`)
        const data = await res.json()
        setSuggestions(data.students || [])
      } catch {}
      setSearching(false)
    }, 320)
  }

  const selectStudent = s => {
    setStudentName(s.name)
    setStudentId(s.id)
    setStudentMeta({ class: s.class, roll: s.rollNumber })
    setSuggestions([])
  }

  const handleAssign = () => {
    if (!studentId || !routeId || !stop) return
    onAssign(routeId, { studentId, name: studentName, class: studentMeta?.class || '', stop })
    setSaved(true)
    setTimeout(onClose, 700)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={OVERLAY} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        style={{ background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(100vh - var(--header-height) - 64px)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={15} style={{ color: '#2563EB' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Assign Transport</p>
              <p style={{ fontSize: 11, color: '#64748B' }}>Assign a student to a bus route</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <X size={13} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Student search */}
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Student Name *</label>
            <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box', borderColor: studentId ? '#86EFAC' : undefined }}
              value={studentName} onChange={handleNameChange} placeholder="Type to search…" autoComplete="off" />
            {searching && <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Searching…</p>}
            {studentId && studentMeta && (
              <div style={{ marginTop: 6, padding: '6px 10px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 12, color: '#16A34A', fontWeight: 600 }}>
                ✓ {studentMeta.class ? `Class ${studentMeta.class}` : ''}
                {studentMeta.roll ? ` · Roll ${studentMeta.roll}` : ''} — Student verified
              </div>
            )}
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', zIndex: 50, overflow: 'hidden', marginTop: 2 }}>
                {suggestions.map(s => (
                  <button key={s.id} onClick={() => selectStudent(s)}
                    style={{ width: '100%', padding: '9px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', border: 'none', borderBottom: '1px solid #F8FAFC', background: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{s.name}</span>
                    <span style={{ fontSize: 11, color: '#64748B' }}>
                      {s.class ? `Class ${s.class}` : ''}
                      {s.rollNumber ? ` · Roll ${s.rollNumber}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Bus Route *</label>
              <select className="input-premium" style={{ width: '100%' }} value={routeId}
                onChange={e => { setRouteId(e.target.value); setStop('') }}>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Boarding Stop *</label>
              <select className="input-premium" style={{ width: '100%' }} value={stop}
                onChange={e => setStop(e.target.value)}>
                <option value="">— Select stop —</option>
                {(selectedRoute?.stops || []).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {selectedRoute && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { label: 'Vehicle',    value: selectedRoute.vehicleReg    || '—' },
                { label: 'Driver',     value: selectedRoute.driver        || '—' },
                { label: 'Seats Free', value: String(seatsLeft),           color: seatsLeft === 0 ? '#DC2626' : '#16A34A' },
                { label: 'Departs',    value: selectedRoute.departureTime || '—' },
              ].map(k => (
                <div key={k.label}>
                  <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{k.label}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: k.color || '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAssign}
            disabled={!studentId || !stop}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: saved ? '#16A34A' : '#2563EB', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s', opacity: (!studentId || !stop) ? 0.5 : 1 }}>
            {saved ? <><Check size={13} /> Assigned!</> : <><UserPlus size={13} /> Assign Student</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Main Page ────────────────────────────────────────────────────── */
export default function TransportPage() {
  const [routes,              setRoutes             ] = useState([])
  const [loading,             setLoading            ] = useState(true)
  const [viewRoute,           setViewRoute          ] = useState(null)
  const [showAssign,          setShowAssign         ] = useState(false)
  const [confirmDeleteRoute,  setConfirmDeleteRoute ] = useState(null)

  function loadTransportData() {
    setLoading(true)
    fetch('/api/transport?type=routes', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : {})
      .then(d => setRoutes(Array.isArray(d.routes) ? d.routes : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTransportData() }, [])

  const totalEnrolled = routes.reduce((s, r) => s + (r.studentsCount || 0), 0)
  const activeCount   = routes.filter(r => r.isActive !== false).length

  const openViewRoute = route => {
    setViewRoute({ ...route, assignedStudents: [] })
    fetch(`/api/transport?type=assignments&route_id=${route.id}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : {})
      .then(d => {
        const enriched = (d.assignments || []).map(a => ({
          assignmentId: a.id,
          name:         a.student,
          class:        a.class,
          roll:         a.roll,
          stop:         a.stop,
          phone:        a.phone,
          monthlyFee:   a.monthlyFee,
          fees:         'pending',
        }))
        setViewRoute(prev => prev?.id === route.id ? { ...prev, assignedStudents: enriched } : prev)
      })
      .catch(() => {})
  }

  const assignStudentToRoute = async (routeId, student) => {
    try {
      const res  = await fetch('/api/transport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:       'assign_student',
          student_id:   student.studentId || null,
          student_name: student.name,
          route_id:     routeId,
          stop_name:    student.stop || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { console.error('Assign failed:', json.error); return }
    } catch (err) { console.error(err); return }
    loadTransportData()
  }

  const handleDeleteRoute = async id => {
    try { await fetch(`/api/transport?id=${id}&type=route`, { method: 'DELETE' }) } catch {}
    setRoutes(prev => prev.filter(r => r.id !== id))
    if (viewRoute?.id === id) setViewRoute(null)
    setConfirmDeleteRoute(null)
  }

  const removeStudentFromRoute = async (routeId, name) => {
    const assignment = (viewRoute?.assignedStudents || []).find(s => s.name === name)
    if (assignment?.assignmentId) {
      try {
        await fetch('/api/transport', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: assignment.assignmentId, type: 'assignment', status: 'inactive' }),
        })
      } catch {}
    }
    setRoutes(prev => prev.map(r =>
      r.id !== routeId ? r : { ...r, studentsCount: Math.max(0, (r.studentsCount || 0) - 1) }
    ))
    setViewRoute(prev => prev ? { ...prev, assignedStudents: (prev.assignedStudents || []).filter(s => s.name !== name) } : prev)
  }

  const handleUpdateRoute = (routeId, updates) => {
    setRoutes(prev => prev.map(r => r.id !== routeId ? r : { ...r, ...updates }))
    setViewRoute(prev => prev ? { ...prev, ...updates } : prev)
  }

  const handleSaveStudent = async (original, updates, routeId) => {
    if (original.assignmentId) {
      try {
        await fetch('/api/transport', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id:          original.assignmentId,
            type:        'assignment',
            stop_name:   updates.stop || original.stop,
            monthly_fee: Number(updates.totalFee) || Number(original.monthlyFee) || 0,
          }),
        })
      } catch {}
    }
    const patch = list => (list || []).map(a =>
      a.name === original.name
        ? { ...a, ...updates, monthlyFee: Number(updates.totalFee) || a.monthlyFee }
        : a
    )
    setRoutes(prev => prev.map(r => r.id !== routeId ? r : { ...r, assignedStudents: patch(r.assignedStudents) }))
    setViewRoute(prev => prev ? { ...prev, assignedStudents: patch(prev.assignedStudents) } : prev)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Total Routes',      value: routes.length, icon: Bus,         iconColor: '#2563EB', iconBg: '#EFF6FF' },
          { label: 'Active Routes',     value: activeCount,   icon: MapPin,      iconColor: '#10B981', iconBg: '#F0FDF4' },
          { label: 'Students Enrolled', value: totalEnrolled, icon: Users,       iconColor: '#0891B2', iconBg: '#ECFEFF' },
          { label: 'In Maintenance',    value: routes.filter(r => r.status === 'maintenance').length, icon: AlertCircle, iconColor: '#F59E0B', iconBg: '#FFFBEB' },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ translateY: -2, boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '22px 24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon size={18} style={{ color: stat.iconColor }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#64748B', marginBottom: 6 }}>{stat.label}</p>
              <p style={{ fontSize: 30, fontWeight: 700, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.03em' }}>{stat.value}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Route Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8', fontSize: 14 }}>Loading routes…</div>
      ) : routes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8', fontSize: 14, background: '#F8FAFC', borderRadius: 16, border: '1px dashed #E2E8F0' }}>
          No routes yet. <Link href="/transport/new" style={{ color: '#2563EB', fontWeight: 600 }}>Add the first route →</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {routes.map((route, i) => {
            const assigned  = route.studentsCount || 0
            const capacity  = route.capacity || 0
            const occupancy = capacity > 0 ? Math.round((assigned / capacity) * 100) : 0
            const occColor  = occupancy > 90 ? '#EF4444' : occupancy > 70 ? '#F59E0B' : '#2563EB'
            const seatsFree = Math.max(0, capacity - assigned)
            const isDel     = confirmDeleteRoute === route.id

            return (
              <motion.div key={route.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                whileHover={{ boxShadow: '0 6px 20px rgba(15,23,42,0.09)' }}
                style={{ background: '#FFFFFF', border: `1px solid ${isDel ? '#FECACA' : '#E2E8F0'}`, borderRadius: 16, padding: '18px 22px' }}>

                {/* Row 1: title + buttons */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Bus size={17} style={{ color: '#2563EB' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{route.name}</p>
                      <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                        {route.vehicleReg || 'No vehicle'} &nbsp;·&nbsp; Driver: {route.driver || '—'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {isDel ? (
                      <>
                        <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>Delete route?</span>
                        <button onClick={() => handleDeleteRoute(route.id)}
                          style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#DC2626', color: '#FFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          Yes, delete
                        </button>
                        <button onClick={() => setConfirmDeleteRoute(null)}
                          style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => openViewRoute(route)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 8, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          <Eye size={12} /> View
                        </motion.button>
                        <button onClick={() => setConfirmDeleteRoute(route.id)}
                          style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #FECACA', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#DC2626' }}>
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Row 2: stats bar */}
                <div style={{ display: 'flex', padding: '9px 13px', background: '#F8FAFC', borderRadius: 9, border: '1px solid #F1F5F9', marginBottom: 13 }}>
                  {[
                    { label: 'Departs',    value: route.departureTime || '—' },
                    { label: 'Arrives',    value: route.arrivalTime   || '—' },
                    { label: 'Students',   value: `${assigned}/${capacity || '?'}` },
                    { label: 'Seats Free', value: capacity > 0 ? String(seatsFree) : '—', color: seatsFree === 0 && capacity > 0 ? '#DC2626' : '#16A34A' },
                  ].map((item, j) => (
                    <div key={item.label} style={{ flex: 1, paddingLeft: j > 0 ? 12 : 0, borderLeft: j > 0 ? '1px solid #E2E8F0' : 'none', marginLeft: j > 0 ? 12 : 0 }}>
                      <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500, marginBottom: 2, textTransform: 'uppercase' }}>{item.label}</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: item.color || '#0F172A' }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Occupancy bar */}
                {capacity > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#64748B' }}>Occupancy</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: occColor }}>{occupancy}%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${occupancy}%` }} transition={{ delay: 0.2 + i * 0.06, duration: 0.5 }}
                        style={{ height: '100%', borderRadius: 99, background: occColor }} />
                    </div>
                  </div>
                )}

                {/* Stops row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {(route.stops || []).map(stop => (
                      <span key={stop} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 99, background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}>
                        <MapPin size={8} />{stop}
                      </span>
                    ))}
                  </div>
                  {assigned > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '3px 9px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={9} />{assigned} students
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {viewRoute && (
          <RouteViewModal key="view"
            route={viewRoute}
            onClose={() => setViewRoute(null)}
            onRemoveStudent={removeStudentFromRoute}
            onSaveStudent={handleSaveStudent}
            onUpdateRoute={handleUpdateRoute}
          />
        )}
        {showAssign && (
          <AssignTransportModal key="assign"
            routes={routes}
            onClose={() => setShowAssign(false)}
            onAssign={assignStudentToRoute}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
