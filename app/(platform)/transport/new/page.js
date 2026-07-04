'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bus, MapPin, Save, CheckCircle, AlertCircle } from 'lucide-react'

function Field({ label, error, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{error}</p>}
    </div>
  )
}
function Input({ error, ...props }) {
  return <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box', borderColor: error ? '#FCA5A5' : undefined }} {...props} />
}

export default function NewRoutePage() {
  const router     = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    name: '', vehicle: '', capacity: '', driver: '',
    departure: '', arrival: '', stops: '',
  })

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.name.trim())    e.name    = 'Route name is required'
    if (!form.vehicle.trim()) e.vehicle = 'Vehicle number is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true)
    setErrors({})
    try {
      // Step 1: create (or find existing) vehicle record
      const vRes  = await fetch('/api/transport', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:              'add_vehicle',
          registration_number: form.vehicle.trim(),
          type:                'bus',
          capacity:            parseInt(form.capacity) || 40,
        }),
      })
      const vJson = await vRes.json()
      if (!vRes.ok || vJson.error) {
        setErrors({ vehicle: vJson.error || 'Failed to save vehicle. Please try again.' })
        setSaving(false)
        return
      }
      const vehicleId = vJson.vehicle?.id || null

      // Step 2: create route
      const rRes = await fetch('/api/transport', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:         'add_route',
          name:           form.name.trim(),
          vehicle_id:     vehicleId || null,
          stops:          form.stops ? form.stops.split(',').map(s => s.trim()).filter(Boolean) : [],
          departure_time: form.departure || null,
          arrival_time:   form.arrival   || null,
        }),
      })
      const rJson = await rRes.json()
      if (!rRes.ok || rJson.error) {
        setErrors({ name: rJson.error || 'Failed to save route. Please try again.' })
        setSaving(false)
        return
      }
      setSaved(true)
      await new Promise(r => setTimeout(r, 600))
      router.push('/transport')
    } catch {
      setErrors({ name: 'Network error. Please try again.' })
      setSaving(false)
    }
  }

  const stopsList = form.stops ? form.stops.split(',').map(s=>s.trim()).filter(Boolean) : []

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/transport" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>
          <ArrowLeft size={15} /> Back to Transport
        </Link>
        <span style={{ color: '#CBD5E1' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Add Transport Route</span>
      </div>

      <div className="form-layout" style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px' }}>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Route Info */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bus size={14} style={{ color: '#2563EB' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Vehicle & Route</p>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Route Name *" error={errors.name} style={{ gridColumn: '1 / -1' }}>
                <Input placeholder="e.g. Route E — Gurgaon Sector 56" value={form.name} onChange={set('name')} error={errors.name} />
              </Field>
              <Field label="Vehicle Number *" error={errors.vehicle}>
                <Input placeholder="e.g. DL-2C-5678" value={form.vehicle} onChange={set('vehicle')} error={errors.vehicle} />
              </Field>
              <Field label="Seating Capacity">
                <Input type="number" min="1" placeholder="e.g. 48" value={form.capacity} onChange={set('capacity')} />
              </Field>
            </div>
          </div>

          {/* Driver & Timing */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={14} style={{ color: '#16A34A' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Driver & Timing</p>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Field label="Driver Name" error={errors.driver}>
                <Input placeholder="e.g. Ram Kumar" value={form.driver} onChange={set('driver')} error={errors.driver} />
              </Field>
              <Field label="Departure Time">
                <Input type="time" value={form.departure} onChange={set('departure')} />
              </Field>
              <Field label="Arrival Time">
                <Input type="time" value={form.arrival} onChange={set('arrival')} />
              </Field>
              <Field label="Stops (comma-separated)" style={{ gridColumn: '1 / -1' }}>
                <Input placeholder="e.g. Gurgaon Sec 56, MG Road, IFFCO Chowk" value={form.stops} onChange={set('stops')} />
              </Field>
            </div>
          </div>

          <button type="submit" style={{ display: 'none' }} />
        </form>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 24 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Bus size={20} style={{ color: '#2563EB' }} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', textAlign: 'center' }}>{form.name || 'Route Name'}</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' }}>{form.vehicle || 'Vehicle No.'}</p>
            {stopsList.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Stops ({stopsList.length})</p>
                {stopsList.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <div style={{ width: 6, height: 6, borderRadius: 99, background: '#2563EB', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#475569' }}>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <AnimatePresence>
            {Object.keys(errors).length > 0 && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <AlertCircle size={14} style={{ color: '#DC2626' }} />
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#DC2626' }}>Fix the following</p>
                </div>
                {Object.values(errors).map((e, i) => <p key={i} style={{ fontSize: 11, color: '#991B1B', marginTop: 3 }}>• {e}</p>)}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit}
            style={{ width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none', background: saved ? '#16A34A' : '#2563EB', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}>
            <AnimatePresence mode="wait">
              {saved ? <motion.span key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display:'flex',alignItems:'center',gap:8 }}><CheckCircle size={16} /> Saved!</motion.span>
                : saving ? <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Saving…</motion.span>
                : <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display:'flex',alignItems:'center',gap:8 }}><Save size={15} /> Add Route</motion.span>}
            </AnimatePresence>
          </motion.button>
          <Link href="/transport" style={{ fontSize: 13, color: '#64748B', textAlign: 'center', textDecoration: 'none' }}>Cancel</Link>
        </div>
      </div>
    </div>
  )
}
