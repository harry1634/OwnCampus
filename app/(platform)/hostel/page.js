'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Users, BedDouble, AlertCircle, Plus, MapPin, X, Check, Pencil, Building2, Bell, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { computeFeeStatus } from '@/lib/feeUtils'
const HOSTEL_TYPES = ['Boys', 'Girls', 'Mixed']

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: d, duration: 0.32 },
})

const OVERLAY = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.48)', zIndex: 200,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
}
const MODAL = {
  background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 520,
  boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
}

function LabeledField({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

/* ── Add Building Modal ──────────────────────────────────────────── */
function AddBuildingModal({ onClose, onSave }) {
  const [form,   setForm  ] = useState({ name: '', type: 'Boys', warden: '', floors: '1', totalRooms: '', totalBeds: '', monthlyFee: '' })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved ] = useState(false)
  const [error,  setError ] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim())    { setError('Hostel name is required'); return }
    if (!form.totalRooms || parseInt(form.totalRooms) < 1) { setError('Total rooms must be ≥ 1'); return }
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/hostel/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:    form.name.trim(),
          type:    form.type.toLowerCase(),
          address: form.warden.trim() || null,
        }),
      })
      const json = await res.json()
      if (json.error) { setError(json.error); setSaving(false); return }
      setSaved(true)
      // Pass back a UI-shaped object optimistically
      onSave({
        id:           json.building?.id || Date.now(),
        name:         form.name.trim(),
        type:         form.type,
        warden:       form.warden.trim(),
        floors:       parseInt(form.floors)     || 1,
        totalRooms:   parseInt(form.totalRooms) || 0,
        totalBeds:    parseInt(form.totalBeds)  || 0,
        occupiedBeds: 0,
        occupiedRooms:0,
        monthlyFee:   parseInt(form.monthlyFee) || 0,
      })
      setTimeout(onClose, 600)
    } catch (e) {
      setError('Failed to save. Try again.')
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={OVERLAY} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        style={MODAL} onClick={e => e.stopPropagation()}>

        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={16} style={{ color: '#2563EB' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Add Hostel Building</p>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>Create a new hostel building</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <LabeledField label="Hostel Name *">
              <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
                value={form.name} onChange={set('name')} placeholder="e.g. Shivalaya Boys Hostel" autoFocus />
            </LabeledField>
          </div>

          <LabeledField label="Type">
            <select className="input-premium" style={{ width: '100%' }} value={form.type} onChange={set('type')}>
              {HOSTEL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </LabeledField>

          <LabeledField label="Warden Name">
            <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
              value={form.warden} onChange={set('warden')} placeholder="e.g. Mr. Rajesh Kumar" />
          </LabeledField>

          <LabeledField label="Number of Floors">
            <input type="number" min="1" className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
              value={form.floors} onChange={set('floors')} />
          </LabeledField>

          <LabeledField label="Monthly Fee (₹)">
            <input type="number" min="0" className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
              value={form.monthlyFee} onChange={set('monthlyFee')} placeholder="e.g. 8000" />
          </LabeledField>

          <LabeledField label="Total Rooms *">
            <input type="number" min="1" className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
              value={form.totalRooms} onChange={set('totalRooms')} placeholder="e.g. 60" />
          </LabeledField>

          <LabeledField label="Total Beds">
            <input type="number" min="1" className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
              value={form.totalBeds} onChange={set('totalBeds')} placeholder="e.g. 180" />
          </LabeledField>

          {error && (
            <div style={{ gridColumn: '1 / -1', padding: '10px 14px', borderRadius: 9, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 13, color: '#DC2626' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>
            Cancel
          </button>
          <motion.button whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving}
            style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: saved ? '#16A34A' : '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: 'background 0.2s' }}>
            {saved ? <><Check size={14} /> Added!</> : saving ? 'Saving…' : <><Plus size={14} /> Add Building</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Edit Hostel Modal ────────────────────────────────────────────── */
function EditHostelModal({ building, onClose, onSave }) {
  const [form, setForm] = useState({
    name:       building.name,
    type:       building.type,
    warden:     building.warden,
    floors:     String(building.floors),
    totalRooms: String(building.totalRooms),
    totalBeds:  String(building.totalBeds),
    monthlyFee: String(building.monthlyFee),
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved ] = useState(false)
  const [errors, setErrors] = useState({})

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.name.trim())           e.name       = 'Name is required'
    if (parseInt(form.totalRooms) < 1) e.totalRooms = 'Must be ≥ 1'
    if (parseInt(form.totalBeds)  < 1) e.totalBeds  = 'Must be ≥ 1'
    if (parseInt(form.floors)     < 1) e.floors     = 'Must be ≥ 1'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    onSave({
      ...building,
      name:       form.name.trim(),
      type:       form.type,
      warden:     form.warden.trim(),
      floors:     parseInt(form.floors)     || building.floors,
      totalRooms: parseInt(form.totalRooms) || building.totalRooms,
      totalBeds:  parseInt(form.totalBeds)  || building.totalBeds,
      monthlyFee: parseInt(form.monthlyFee) || building.monthlyFee,
      // Clamp occupied values if total was reduced
      occupiedRooms: Math.min(building.occupiedRooms, parseInt(form.totalRooms) || building.totalRooms),
      occupiedBeds:  Math.min(building.occupiedBeds,  parseInt(form.totalBeds)  || building.totalBeds),
    })
    setSaved(true)
    await new Promise(r => setTimeout(r, 500))
    onClose()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={OVERLAY} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        style={MODAL} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={16} style={{ color: '#2563EB' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Edit Hostel</p>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{building.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* Name — full width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <LabeledField label="Hostel Name *">
              <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box', borderColor: errors.name ? '#FCA5A5' : undefined }}
                value={form.name} onChange={set('name')} placeholder="e.g. Shivalaya Boys Hostel" />
              {errors.name && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{errors.name}</p>}
            </LabeledField>
          </div>

          <LabeledField label="Type">
            <select className="input-premium" style={{ width: '100%' }} value={form.type} onChange={set('type')}>
              {HOSTEL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </LabeledField>

          <LabeledField label="Warden Name">
            <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
              value={form.warden} onChange={set('warden')} placeholder="e.g. Mr. Rajesh Kumar" />
          </LabeledField>

          <LabeledField label="Number of Floors *">
            <input type="number" min="1" className="input-premium" style={{ width: '100%', boxSizing: 'border-box', borderColor: errors.floors ? '#FCA5A5' : undefined }}
              value={form.floors} onChange={set('floors')} />
            {errors.floors && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{errors.floors}</p>}
          </LabeledField>

          <LabeledField label="Monthly Fee (₹)">
            <input type="number" min="0" className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
              value={form.monthlyFee} onChange={set('monthlyFee')} placeholder="8000" />
          </LabeledField>

          <LabeledField label="Total Rooms *">
            <input type="number" min="1" className="input-premium" style={{ width: '100%', boxSizing: 'border-box', borderColor: errors.totalRooms ? '#FCA5A5' : undefined }}
              value={form.totalRooms} onChange={set('totalRooms')} />
            {errors.totalRooms && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{errors.totalRooms}</p>}
          </LabeledField>

          <LabeledField label="Total Beds *">
            <input type="number" min="1" className="input-premium" style={{ width: '100%', boxSizing: 'border-box', borderColor: errors.totalBeds ? '#FCA5A5' : undefined }}
              value={form.totalBeds} onChange={set('totalBeds')} />
            {errors.totalBeds && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{errors.totalBeds}</p>}
          </LabeledField>

        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>
            Cancel
          </button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving}
            style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: saved ? '#16A34A' : '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: 'background 0.2s' }}>
            {saved ? <><Check size={14} /> Saved!</> : saving ? 'Saving…' : <><Check size={14} /> Save Changes</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Edit Allocation Modal ───────────────────────────────────────── */
function EditAllocationModal({ allocation, buildings, onClose, onSave }) {
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved ] = useState(false)
  const initBuilding = buildings.find(b => b.name === allocation.building) || buildings[0]

  const [form, setForm] = useState({
    student:    allocation.student    || '',
    class:      allocation.class      || '',
    building:   allocation.building   || initBuilding?.name || '',
    room:       allocation.room       || '',
    bed:        allocation.bed        || 'Bed 1',
    monthlyFee: allocation.monthlyFee != null ? String(allocation.monthlyFee) : String(initBuilding?.monthlyFee || ''),
    paidAmount: allocation.paidAmount != null ? String(allocation.paidAmount) : '',
    feeStatus:  allocation.feeStatus  || 'pending',
  })

  const set = k => e => {
    const val = e.target.value
    setForm(f => {
      const next = { ...f, [k]: val }
      // When building changes, auto-fill monthly fee
      if (k === 'building') {
        const b = buildings.find(b => b.name === val)
        if (b) next.monthlyFee = String(b.monthlyFee)
      }
      // Auto-derive fee status from amounts
      if (k === 'monthlyFee' || k === 'paidAmount') {
        const fee  = parseFloat(k === 'monthlyFee' ? val : f.monthlyFee) || 0
        const paid = parseFloat(k === 'paidAmount'  ? val : f.paidAmount) || 0
        if (fee > 0) {
          next.feeStatus = computeFeeStatus(fee, paid)
        }
      }
      return next
    })
  }

  const monthlyFee = parseFloat(form.monthlyFee) || 0
  const paidAmount = parseFloat(form.paidAmount)  || 0
  const balance    = Math.max(0, monthlyFee - paidAmount)

  const handleSave = async () => {
    if (!form.student.trim() || !form.room.trim()) return
    setSaving(true)
    try {
      if (allocation.id) {
        const res = await fetch(`/api/hostel/allocations?id=${allocation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monthly_fee:  monthlyFee || null,
            bed_number:   parseInt((form.bed || '').replace(/\D/g, '')) || 1,
            paid_amount:  paidAmount,
            fee_status:   form.feeStatus,
          }),
        })
        const json = await res.json()
        if (!res.ok || json.error) {
          toast.error(json.error || 'Failed to save allocation.')
          setSaving(false)
          return
        }
      }
      setSaved(true)
      onSave({
        student: form.student, class: form.class, building: form.building,
        room: form.room, bed: form.bed,
        monthlyFee, paidAmount, balance, feeStatus: form.feeStatus,
      })
      setTimeout(onClose, 600)
    } catch {
      toast.error('Network error. Please try again.')
      setSaving(false)
    }
  }

  const sectionLabel = text => (
    <p style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.07em', paddingBottom: 8, borderBottom: '1px solid #EFF6FF', margin: '4px 0 0' }}>{text}</p>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={OVERLAY} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        style={{ ...MODAL, maxWidth: 540 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pencil size={15} style={{ color: '#2563EB' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Edit Allocation</p>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{allocation.student} · {allocation.room}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Room Details */}
          {sectionLabel('Room Details')}

          <div style={{ gridColumn: '1 / -1' }}>
            <LabeledField label="Student Name *">
              <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
                value={form.student} onChange={set('student')} placeholder="e.g. Riya Sharma" />
            </LabeledField>
          </div>

          <LabeledField label="Class">
            <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
              value={form.class} onChange={set('class')} placeholder="e.g. 11-A" />
          </LabeledField>

          <LabeledField label="Building">
            <select className="input-premium" style={{ width: '100%' }} value={form.building} onChange={set('building')}>
              {buildings.map(b => <option key={b.id}>{b.name}</option>)}
            </select>
          </LabeledField>

          <LabeledField label="Room Number *">
            <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
              value={form.room} onChange={set('room')} placeholder="e.g. B-301" />
          </LabeledField>

          <LabeledField label="Bed">
            <select className="input-premium" style={{ width: '100%' }} value={form.bed} onChange={set('bed')}>
              {['Bed 1','Bed 2','Bed 3','Bed 4'].map(b => <option key={b}>{b}</option>)}
            </select>
          </LabeledField>

          {/* Fee Details */}
          {sectionLabel('Fee Details')}

          <LabeledField label="Monthly Fee (₹)">
            <input type="number" min="0" className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
              value={form.monthlyFee} onChange={set('monthlyFee')} placeholder="e.g. 8000" />
          </LabeledField>

          <LabeledField label="Amount Paid (₹)">
            <input type="number" min="0" className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
              value={form.paidAmount} onChange={set('paidAmount')} placeholder="e.g. 5000" />
          </LabeledField>

          {/* Balance card + Fee status */}
          <div style={{ background: balance > 0 ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${balance > 0 ? '#FECACA' : '#BBF7D0'}`, borderRadius: 10, padding: '12px 14px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>BALANCE DUE</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: balance > 0 ? '#DC2626' : '#16A34A', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>
              ₹{balance.toLocaleString('en-IN')}
            </p>
          </div>

          <LabeledField label="Fee Status">
            <select className="input-premium" style={{ width: '100%' }} value={form.feeStatus} onChange={set('feeStatus')}>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
            <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 3 }}>Auto-set from amounts above</p>
          </LabeledField>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>
            Cancel
          </button>
          <motion.button whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSave} disabled={saving}
            style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: saved ? '#16A34A' : '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: 'background 0.2s' }}>
            {saved ? <><Check size={14} /> Saved!</> : saving ? 'Saving…' : <><Check size={14} /> Save Changes</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Allocate Room Modal ─────────────────────────────────────────── */
function AllocateModal({ buildings, onClose, onSave }) {
  const [form, setForm] = useState({ student: '', class: '', building: buildings[0]?.name || '', room: '', bed: 'Bed 1' })
  const [saved, setSaved] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.student.trim() || !form.room.trim()) return
    setSaved(true)
    await new Promise(r => setTimeout(r, 700))
    onSave({ ...form, date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) })
    onClose()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={OVERLAY} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        style={MODAL} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Allocate Room</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Assign a student to a hostel room</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <LabeledField label="Student Name *">
              <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="e.g. Riya Sharma" value={form.student} onChange={set('student')} />
            </LabeledField>
          </div>
          <LabeledField label="Class">
            <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="e.g. 11-A" value={form.class} onChange={set('class')} />
          </LabeledField>
          <LabeledField label="Building">
            <select className="input-premium" style={{ width: '100%' }} value={form.building} onChange={set('building')}>
              {buildings.map(b => <option key={b.id}>{b.name}</option>)}
            </select>
          </LabeledField>
          <LabeledField label="Room Number *">
            <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="e.g. B-301" value={form.room} onChange={set('room')} />
          </LabeledField>
          <LabeledField label="Bed">
            <select className="input-premium" style={{ width: '100%' }} value={form.bed} onChange={set('bed')}>
              {['Bed 1','Bed 2','Bed 3','Bed 4'].map(b => <option key={b}>{b}</option>)}
            </select>
          </LabeledField>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave}
            style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: saved ? '#16A34A' : '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: 'background 0.2s' }}>
            {saved ? <><Check size={14} /> Allocated!</> : <><Plus size={14} /> Allocate Room</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────── */
const MAIN_TABS = ['Overview', 'Requests']

export default function HostelPage() {
  const [activeTab,      setActiveTab     ] = useState('Overview')
  const [buildings,      setBuildings     ] = useState([])
  const [allocations,    setAllocations   ] = useState([])
  const [pendingTotal,   setPendingTotal  ] = useState(0)
  const [loading,        setLoading       ] = useState(true)
  const [showAllocate,   setShowAllocate  ] = useState(false)
  const [editBuilding,   setEditBuilding  ] = useState(null)
  const [editAllocation, setEditAllocation] = useState(null)
  const [showAll,        setShowAll       ] = useState(false)
  const [showAddBuilding, setShowAddBuilding] = useState(false)

  // Requests tab state
  const [hostelRequests,    setHostelRequests   ] = useState([])
  const [requestsLoading,   setRequestsLoading  ] = useState(false)
  const [requestStatusTab,  setRequestStatusTab ] = useState('pending')
  const [actionLoading,     setActionLoading    ] = useState(null) // id of request being actioned

  const fetchRequests = async () => {
    setRequestsLoading(true)
    try {
      const res = await fetch('/api/hostel/requests')
      const json = await res.json()
      setHostelRequests(json.requests || [])
    } catch (_) {}
    setRequestsLoading(false)
  }

  // Load real data
  useEffect(() => {
    Promise.all([
      fetch('/api/hostel/buildings').then(r => r.ok ? r.json() : []),
      fetch('/api/hostel/allocations').then(r => r.ok ? r.json() : {}),
    ]).then(([bldgs, allocData]) => {
      setBuildings(Array.isArray(bldgs) ? bldgs : [])
      setAllocations(allocData.allocations || [])
      setPendingTotal(allocData.pendingTotal || 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab === 'Requests') fetchRequests()
  }, [activeTab])

  const displayedAllocations = showAll ? allocations : allocations.slice(0, 5)

  const totalResidents = buildings.reduce((s, b) => s + (b.occupiedBeds || 0), 0)
  const totalRooms     = buildings.reduce((s, b) => s + (b.totalRooms   || 0), 0)
  const totalBeds      = buildings.reduce((s, b) => s + (b.totalBeds    || 0), 0)
  const occupiedBeds   = buildings.reduce((s, b) => s + (b.occupiedBeds || 0), 0)

  function fmtAmount(n) {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
    if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`
    return `₹${n}`
  }

  const kpis = [
    { label: 'Total Residents', value: loading ? '—' : totalResidents,                   icon: Users,       iconColor: '#2563EB', iconBg: '#EFF6FF' },
    { label: 'Total Rooms',     value: loading ? '—' : totalRooms,                       icon: Home,        iconColor: '#10B981', iconBg: '#F0FDF4' },
    { label: 'Occupied Beds',   value: loading ? '—' : `${occupiedBeds}/${totalBeds}`,   icon: BedDouble,   iconColor: '#0891B2', iconBg: '#ECFEFF' },
    { label: 'Pending Fees',    value: loading ? '—' : (pendingTotal > 0 ? fmtAmount(pendingTotal) : '₹0'), icon: AlertCircle, iconColor: '#EF4444', iconBg: '#FEF2F2' },
  ]

  const handleSaveBuilding = async updated => {
    try {
      const res = await fetch('/api/hostel/buildings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:      updated.id,
          name:    updated.name,
          type:    updated.type,
          address: updated.warden,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { toast.error(json.error || 'Failed to save building.'); return }
    } catch { toast.error('Network error. Please try again.'); return }
    setBuildings(prev => prev.map(b => b.id === updated.id ? updated : b))
    setEditBuilding(null)
  }

  const handleSaveAllocation = newData => {
    setAllocations(prev =>
      prev.map(a => a === editAllocation ? { ...a, ...newData } : a)
    )
  }

  const handleAllocate = async alloc => {
    try {
      const building = buildings.find(b => b.name === alloc.building)
      const res = await fetch('/api/hostel/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: alloc.student,
          className:   alloc.class,
          buildingId:  building?.id || null,
          roomNumber:  alloc.room,
          bedNumber:   parseInt((alloc.bed || '').replace(/\D/g, '')) || 1,
        }),
      })
      const json = await res.json()
      if (!json.error) {
        // Refresh allocations after save
        const fresh = await fetch('/api/hostel/allocations').then(r => r.ok ? r.json() : {})
        setAllocations(fresh.allocations || [])
        setPendingTotal(fresh.pendingTotal || 0)
        return
      }
    } catch {}
    // Optimistic fallback if API save failed
    setAllocations(prev => [{
      id: Date.now(), ...alloc,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    }, ...prev])
  }

  const handleRequestAction = async (id, status) => {
    setActionLoading(id + status)
    try {
      const res = await fetch('/api/hostel/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        setHostelRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
        toast.success(status === 'approved' ? 'Request approved.' : 'Request rejected.')
      } else {
        const json = await res.json()
        toast.error(json.error || 'Failed to update request.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    }
    setActionLoading(null)
  }

  const filteredRequests = hostelRequests.filter(r => r.status === requestStatusTab)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Header */}
      <motion.div {...fade(0)} className="page-header">
        <div>
          <h1 className="page-header-title">Hostel Management</h1>
          <p className="page-header-sub">Buildings, rooms, bed allocation &amp; resident management</p>
        </div>
        <div className="page-actions">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddBuilding(true)}
            style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Building2 size={15} /> Add Building
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-primary" onClick={() => setShowAllocate(true)}>
            <Plus size={15} /> Allocate Room
          </motion.button>
        </div>
      </motion.div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {MAIN_TABS.map(tab => {
          const isActive = activeTab === tab
          const pendingCount = tab === 'Requests' ? hostelRequests.filter(r => r.status === 'pending').length : 0
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '7px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
                background: isActive ? '#FFFFFF' : 'transparent',
                color:      isActive ? '#0F172A' : '#64748B',
                boxShadow:  isActive ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
              }}>
              {tab}
              {pendingCount > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>{pendingCount}</span>
              )}
            </button>
          )
        })}
      </div>

      {activeTab === 'Overview' && <>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => {
          const KpiIcon = kpi.icon
          return (
            <motion.div key={kpi.label} {...fade(0.06 + i * 0.07)}
              whileHover={{ translateY: -2, boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}
              transition={{ duration: 0.15 }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: kpi.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <KpiIcon size={18} style={{ color: kpi.iconColor }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#64748B', marginBottom: 6 }}>{kpi.label}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 30, fontWeight: 700, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.03em' }}>{kpi.value}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Building Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading && [0,1].map(i => (
          <div key={i} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 28, height: 260 }} className="shimmer" />
        ))}
        {!loading && buildings.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center', background: '#F8FAFC', borderRadius: 20, border: '1px dashed #CBD5E1' }}>
            <Building2 size={36} color="#CBD5E1" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#64748B', margin: 0 }}>No hostel buildings yet</p>
            <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 6 }}>Click the button below to add your first hostel building.</p>
            <button onClick={() => setShowAddBuilding(true)}
              style={{ marginTop: 16, padding: '9px 20px', borderRadius: 10, border: 'none', background: '#2563EB', color: '#FFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Plus size={14} /> Add Building
            </button>
          </div>
        )}
        {buildings.map((building, i) => {
          const occupancyPct = building.totalBeds > 0 ? Math.round((building.occupiedBeds / building.totalBeds) * 100) : 0
          const isBoys      = building.type === 'Boys'
          const isMixed     = building.type === 'Mixed'
          const typeColor   = isBoys ? '#2563EB' : isMixed ? '#7C3AED' : '#DB2777'
          const typeBg      = isBoys ? '#EFF6FF' : isMixed ? '#F5F3FF' : '#FDF2F8'
          const typeBorder  = isBoys ? '#BFDBFE' : isMixed ? '#DDD6FE' : '#FBCFE8'

          return (
            <motion.div key={building.id} {...fade(0.14 + i * 0.08)}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, padding: 28, boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: typeBg, color: typeColor, border: `1px solid ${typeBorder}` }}>
                      {building.type} Hostel
                    </span>
                  </div>
                  <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{building.name}</h3>
                  <p style={{ fontSize: 13, color: '#64748B', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={12} style={{ color: '#94A3B8' }} />
                    {building.warden || 'No warden assigned'}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 36, fontWeight: 700, color: typeColor, lineHeight: 1, letterSpacing: '-0.03em' }}>{occupancyPct}%</p>
                    <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Occupancy</p>
                  </div>
                  {/* Edit button */}
                  <button onClick={() => setEditBuilding(building)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#BFDBFE' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#E2E8F0' }}>
                    <Pencil size={12} /> Edit
                  </button>
                </div>
              </div>

              {/* Occupancy bar */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>Bed Occupancy</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{building.occupiedBeds} / {building.totalBeds} beds</span>
                </div>
                <div style={{ height: 7, borderRadius: 999, background: '#F1F5F9', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${occupancyPct}%` }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                    style={{ height: '100%', borderRadius: 999, background: typeColor }}
                  />
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Floors',      value: building.floors },
                  { label: 'Total Rooms', value: building.totalRooms },
                  { label: 'Monthly Fee', value: `₹${(building.monthlyFee / 1000).toFixed(1)}K` },
                ].map(info => (
                  <div key={info.label} style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 16px', textAlign: 'center', border: '1px solid #F1F5F9' }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 700, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.02em' }}>{info.value}</p>
                    <p style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{info.label}</p>
                  </div>
                ))}
              </div>

              <button onClick={() => setShowAllocate(true)}
                style={{ width: '100%', padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, color: typeColor, background: typeBg, border: `1px solid ${typeBorder}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'opacity 0.15s', fontFamily: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <Plus size={14} /> Allocate Room
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* Recent Allocations */}
      <motion.div {...fade(0.3)} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>Recent Allocations</h3>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>{allocations.length} total assignments</p>
          </div>
          <button onClick={() => setShowAll(v => !v)}
            style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {showAll ? 'Show Less' : 'View All'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['STUDENT', 'CLASS', 'BUILDING', 'ROOM', 'BED', 'FEE STATUS', 'BALANCE', 'DATE', 'ACTIONS'].map(col => (
                  <th key={col} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', letterSpacing: '0.07em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && allocations.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>No allocations yet</p>
                    <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Use "Allocate Room" to assign students to hostel rooms.</p>
                  </td>
                </tr>
              )}
              {displayedAllocations.map((alloc, i) => (
                <motion.tr key={i}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32 + i * 0.06 }}
                  style={{ borderBottom: i < displayedAllocations.length - 1 ? '1px solid #F8FAFC' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '16px 20px' }}><p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{alloc.student}</p></td>
                  <td style={{ padding: '16px 20px' }}><span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: '#EFF6FF', color: '#2563EB' }}>{alloc.class}</span></td>
                  <td style={{ padding: '16px 20px' }}><span style={{ fontSize: 13, color: '#475569' }}>{alloc.building}</span></td>
                  <td style={{ padding: '16px 20px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', fontFamily: 'JetBrains Mono, monospace' }}>{alloc.room}</span></td>
                  <td style={{ padding: '16px 20px' }}><span style={{ fontSize: 13, color: '#64748B' }}>{alloc.bed}</span></td>
                  <td style={{ padding: '16px 20px' }}>
                    {alloc.feeStatus ? (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                        background: alloc.feeStatus === 'paid' ? '#F0FDF4' : alloc.feeStatus === 'partial' ? '#FFFBEB' : alloc.feeStatus === 'overdue' ? '#FEF2F2' : '#F8FAFC',
                        color:      alloc.feeStatus === 'paid' ? '#16A34A' : alloc.feeStatus === 'partial' ? '#D97706' : alloc.feeStatus === 'overdue' ? '#DC2626' : '#64748B',
                        border:     `1px solid ${alloc.feeStatus === 'paid' ? '#BBF7D0' : alloc.feeStatus === 'partial' ? '#FDE68A' : alloc.feeStatus === 'overdue' ? '#FECACA' : '#E2E8F0'}`,
                        textTransform: 'capitalize',
                      }}>{alloc.feeStatus}</span>
                    ) : <span style={{ fontSize: 12, color: '#CBD5E1' }}>—</span>}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {alloc.balance != null
                      ? <span style={{ fontSize: 13, fontWeight: 700, color: alloc.balance > 0 ? '#DC2626' : '#16A34A' }}>₹{alloc.balance.toLocaleString('en-IN')}</span>
                      : <span style={{ fontSize: 12, color: '#CBD5E1' }}>—</span>}
                  </td>
                  <td style={{ padding: '16px 20px' }}><span style={{ fontSize: 12, color: '#94A3B8' }}>{alloc.date}</span></td>
                  <td style={{ padding: '16px 20px' }}>
                    <button onClick={() => setEditAllocation(alloc)}
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.borderColor = '#BFDBFE' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = '#E2E8F0' }}>
                      <Pencil size={13} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      </>}

      {activeTab === 'Requests' && (
        <motion.div {...fade(0)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Status sub-tabs */}
          <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
            {['pending', 'approved', 'rejected'].map(s => {
              const count = hostelRequests.filter(r => r.status === s).length
              return (
                <button key={s} onClick={() => setRequestStatusTab(s)}
                  style={{ padding: '6px 16px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5, textTransform: 'capitalize',
                    background: requestStatusTab === s ? '#FFFFFF' : 'transparent',
                    color:      requestStatusTab === s ? '#0F172A'  : '#64748B',
                    boxShadow:  requestStatusTab === s ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                  }}>
                  {s}
                  {count > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                      background: s === 'pending' ? '#FEF2F2' : s === 'approved' ? '#ECFDF5' : '#F8FAFC',
                      color:      s === 'pending' ? '#DC2626' : s === 'approved' ? '#059669' : '#64748B',
                    }}>{count}</span>
                  )}
                </button>
              )
            })}
            <button onClick={fetchRequests} style={{ padding: '6px 12px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'transparent', color: '#64748B' }}>
              ↺ Refresh
            </button>
          </div>

          {/* Requests list */}
          <div style={{ background: '#FFFFFF', borderRadius: 20, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
            {requestsLoading ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <Loader2 size={24} style={{ color: '#94A3B8', margin: '0 auto 10px', display: 'block', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Loading requests…</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                <Bell size={32} color="#CBD5E1" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>No {requestStatusTab} requests</p>
                <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Student hostel requests will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredRequests.map((req, i) => {
                  const isPending  = req.status === 'pending'
                  const isApproved = req.status === 'approved'
                  const isActioning = actionLoading === req.id + 'approved' || actionLoading === req.id + 'rejected'
                  return (
                    <div key={req.id} style={{ padding: '18px 24px', borderBottom: i < filteredRequests.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 11, background: isPending ? '#FFFBEB' : isApproved ? '#ECFDF5' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Home size={18} style={{ color: isPending ? '#D97706' : isApproved ? '#059669' : '#DC2626' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>{req.studentName}</p>
                          {req.rollNumber && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 99, background: '#F1F5F9', color: '#475569', fontFamily: 'monospace' }}>{req.rollNumber}</span>
                          )}
                          {req.preferredType && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 99, background: '#EFF6FF', color: '#2563EB' }}>{req.preferredType}</span>
                          )}
                        </div>
                        {req.message && (
                          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 4px', fontStyle: 'italic' }}>"{req.message}"</p>
                        )}
                        {req.email && (
                          <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 2px' }}>{req.email}</p>
                        )}
                        <p style={{ fontSize: 10, color: '#CBD5E1', margin: 0 }}>
                          {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      {isPending ? (
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <motion.button whileHover={{ scale: isActioning ? 1 : 1.04 }} whileTap={{ scale: 0.96 }}
                            disabled={isActioning}
                            onClick={() => handleRequestAction(req.id, 'approved')}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: '1px solid #A7F3D0', background: '#ECFDF5', color: '#059669', fontSize: 12, fontWeight: 700, cursor: isActioning ? 'default' : 'pointer', opacity: isActioning ? 0.6 : 1 }}>
                            <CheckCircle size={12} /> Approve
                          </motion.button>
                          <motion.button whileHover={{ scale: isActioning ? 1 : 1.04 }} whileTap={{ scale: 0.96 }}
                            disabled={isActioning}
                            onClick={() => handleRequestAction(req.id, 'rejected')}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: isActioning ? 'default' : 'pointer', opacity: isActioning ? 0.6 : 1 }}>
                            <XCircle size={12} /> Reject
                          </motion.button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, flexShrink: 0,
                          background: isApproved ? '#ECFDF5' : '#FEF2F2',
                          color:      isApproved ? '#059669'  : '#DC2626',
                          border:     `1px solid ${isApproved ? '#A7F3D0' : '#FECACA'}`,
                        }}>
                          {isApproved ? 'Approved' : 'Rejected'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showAddBuilding && (
          <AddBuildingModal key="add-building"
            onClose={() => setShowAddBuilding(false)}
            onSave={b => {
              setBuildings(prev => [...prev, b])
              setShowAddBuilding(false)
            }} />
        )}
        {showAllocate && (
          <AllocateModal key="allocate" buildings={buildings}
            onClose={() => setShowAllocate(false)}
            onSave={handleAllocate} />
        )}
        {editBuilding && (
          <EditHostelModal key="edit-building" building={editBuilding}
            onClose={() => setEditBuilding(null)}
            onSave={handleSaveBuilding} />
        )}
        {editAllocation && (
          <EditAllocationModal key="edit-alloc" allocation={editAllocation} buildings={buildings}
            onClose={() => setEditAllocation(null)}
            onSave={handleSaveAllocation} />
        )}
      </AnimatePresence>
    </div>
  )
}
