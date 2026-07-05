'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Briefcase, MapPin, Save, CheckCircle, AlertCircle } from 'lucide-react'

const PROGRAMS = ['B.Tech CSE','B.Tech ECE','B.Tech Mechanical','B.Tech Civil','MBA','BBA','B.Com','MCA','M.Tech','B.Sc Physics','B.Sc Chemistry','B.Sc Maths','B.Ed','Diploma','Other']
const YEARS = Array.from({ length: 15 }, (_, i) => String(new Date().getFullYear() - i))

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
function Select({ error, children, ...props }) {
  return (
    <select className="input-premium" style={{ width: '100%', boxSizing: 'border-box', borderColor: error ? '#FCA5A5' : undefined }} {...props}>
      {children}
    </select>
  )
}

export default function NewAlumniPage() {
  const router     = useRouter()
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [errors, setErrors]   = useState({})
  const [isMentor, setIsMentor] = useState(false)

  const [form, setForm] = useState({
    name: '', batch: '', program: '',
    company: '', role: '', location: '',
  })

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.name.trim())    e.name    = 'Name is required'
    if (!form.batch)          e.batch   = 'Graduation year is required'
    if (!form.program)        e.program = 'Select a program'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const res  = await fetch('/api/alumni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, is_mentor: isMentor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSaved(true)
      setTimeout(() => router.push('/alumni'), 700)
    } catch (err) {
      setErrors({ _global: err.message })
    } finally {
      setSaving(false)
    }
  }

  const initials = form.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/alumni" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>
          <ArrowLeft size={15} /> Back to Alumni
        </Link>
        <span style={{ color: '#CBD5E1' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Add Alumni</span>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Personal */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={14} style={{ color: '#2563EB' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Personal & Academic</p>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Full Name *" error={errors.name}>
                <Input placeholder="e.g. Vikram Nair" value={form.name} onChange={set('name')} error={errors.name} />
              </Field>
              <Field label="Graduation Year *" error={errors.batch}>
                <Select value={form.batch} onChange={set('batch')} error={errors.batch}>
                  <option value="">Select year…</option>
                  {YEARS.map(y => <option key={y}>{y}</option>)}
                </Select>
              </Field>
              <Field label="Program *" error={errors.program}>
                <Select value={form.program} onChange={set('program')} error={errors.program}>
                  <option value="">Select program…</option>
                  {PROGRAMS.map(p => <option key={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="Current Location">
                <Input placeholder="e.g. Bangalore" value={form.location} onChange={set('location')} />
              </Field>
            </div>
          </div>

          {/* Career */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase size={14} style={{ color: '#16A34A' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Career Details</p>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Current Company">
                <Input placeholder="e.g. Google" value={form.company} onChange={set('company')} />
              </Field>
              <Field label="Role / Designation">
                <Input placeholder="e.g. Software Engineer" value={form.role} onChange={set('role')} />
              </Field>
            </div>

            {/* Mentor toggle */}
            <div style={{ padding: '0 20px 20px' }}>
              <button type="button" onClick={() => setIsMentor(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, border: `1px solid ${isMentor?'#BFDBFE':'#E2E8F0'}`, background: isMentor?'#EFF6FF':'#F8FAFC', cursor: 'pointer', width: '100%' }}>
                <div style={{ width: 36, height: 20, borderRadius: 99, background: isMentor?'#2563EB':'#CBD5E1', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: isMentor?18:2, width: 16, height: 16, borderRadius: 99, background: '#FFFFFF', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Available as Mentor</p>
                  <p style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>Will be listed for student mentorship sessions</p>
                </div>
              </button>
            </div>
          </div>

          <button type="submit" style={{ display: 'none' }} />
        </form>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 24 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, fontWeight: 800, color: '#FFFFFF' }}>
              {initials || <Users size={22} />}
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{form.name || 'Alumni Name'}</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{form.program || 'Program'} {form.batch ? `· Batch ${form.batch}` : ''}</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{form.company || ''} {form.role ? `· ${form.role}` : ''}</p>
            {isMentor && (
              <div style={{ marginTop: 10, padding: '4px 10px', borderRadius: 20, background: '#EFF6FF', display: 'inline-block' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB' }}>⭐ Mentor</span>
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
                : <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display:'flex',alignItems:'center',gap:8 }}><Save size={15} /> Add Alumni</motion.span>}
            </AnimatePresence>
          </motion.button>
          <Link href="/alumni" style={{ fontSize: 13, color: '#64748B', textAlign: 'center', textDecoration: 'none' }}>Cancel</Link>
        </div>
      </div>
    </div>
  )
}
