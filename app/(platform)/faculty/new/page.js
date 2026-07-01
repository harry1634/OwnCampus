'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, GraduationCap, User, BookOpen, Phone, Save, CheckCircle, AlertCircle } from 'lucide-react'

const DEPTS = ['Mathematics','Science','English','Social Science','Commerce','Physical Education','Computer Science','Hindi','Art','Music']
const DESIGS = ['Faculty','Senior Faculty','HOD','Principal','Vice Principal','Lab Assistant']
const PREFIXES = ['Dr.','Prof.','Mr.','Ms.','Mrs.']

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

export default function NewFacultyPage() {
  const router       = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    prefix: 'Mr.', firstName: '', lastName: '', code: '',
    dept: '', designation: 'Faculty', type: 'full_time',
    exp: '', subjects: '', email: '', phone: '',
  })

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'First name is required'
    if (!form.lastName.trim())  e.lastName  = 'Last name is required'
    if (!form.dept)             e.dept      = 'Select a department'
    if (!form.email.trim())     e.email     = 'Email is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setSaving(false); setSaved(true)
    await new Promise(r => setTimeout(r, 700))
    router.push('/faculty')
  }

  const hasName = form.firstName || form.lastName

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Back bar */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/faculty" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>
          <ArrowLeft size={15} /> Back to Faculty
        </Link>
        <span style={{ color: '#CBD5E1' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Add Faculty Member</span>
      </div>

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

        {/* ── Left: form sections ── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Personal Info */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={14} style={{ color: '#2563EB' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Personal Details</p>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 16 }}>
              <Field label="Title">
                <Select value={form.prefix} onChange={set('prefix')}>
                  {PREFIXES.map(p => <option key={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="First Name *" error={errors.firstName}>
                <Input placeholder="e.g. Anita" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
              </Field>
              <Field label="Last Name *" error={errors.lastName}>
                <Input placeholder="e.g. Sharma" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
              </Field>
            </div>
            <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Field label="Faculty Code">
                <Input placeholder="Auto-generated if blank" value={form.code} onChange={set('code')} />
              </Field>
              <Field label="Experience (years)">
                <Input type="number" min="0" placeholder="0" value={form.exp} onChange={set('exp')} />
              </Field>
              <Field label="Employment Type">
                <Select value={form.type} onChange={set('type')}>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                </Select>
              </Field>
            </div>
          </div>

          {/* Academic Details */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={14} style={{ color: '#16A34A' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Academic Details</p>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Department *" error={errors.dept}>
                <Select value={form.dept} onChange={set('dept')} error={errors.dept}>
                  <option value="">Select department…</option>
                  {DEPTS.map(d => <option key={d}>{d}</option>)}
                </Select>
              </Field>
              <Field label="Designation">
                <Select value={form.designation} onChange={set('designation')}>
                  {DESIGS.map(d => <option key={d}>{d}</option>)}
                </Select>
              </Field>
              <Field label="Subjects Taught" style={{ gridColumn: '1 / -1' }}>
                <Input placeholder="e.g. Mathematics, Statistics (comma separated)" value={form.subjects} onChange={set('subjects')} />
              </Field>
            </div>
          </div>

          {/* Contact */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={14} style={{ color: '#EA580C' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Contact Information</p>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Email *" error={errors.email}>
                <Input type="email" placeholder="name@campus.edu" value={form.email} onChange={set('email')} error={errors.email} />
              </Field>
              <Field label="Phone">
                <Input placeholder="+91 98765 00000" value={form.phone} onChange={set('phone')} />
              </Field>
            </div>
          </div>

          <button type="submit" style={{ display: 'none' }} />
        </form>

        {/* ── Right: preview + save ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 24 }}>

          {/* Avatar preview */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}>
              {hasName ? (form.firstName[0]||'') + (form.lastName[0]||'') : <GraduationCap size={26} />}
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{hasName ? `${form.prefix} ${form.firstName} ${form.lastName}`.trim() : 'Faculty Member'}</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{form.dept || 'Department not selected'}</p>
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{form.designation} · {form.type === 'full_time' ? 'Full Time' : 'Part Time'}</p>
          </div>

          {/* Error summary */}
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

          {/* Save button */}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit}
            style={{ width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none', background: saved ? '#16A34A' : '#2563EB', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}>
            <AnimatePresence mode="wait">
              {saved ? (
                <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={16} /> Saved!
                </motion.span>
              ) : saving ? (
                <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Saving…</motion.span>
              ) : (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Save size={15} /> Save Faculty
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
          <Link href="/faculty" style={{ fontSize: 13, color: '#64748B', textAlign: 'center', textDecoration: 'none' }}>Cancel</Link>
        </div>
      </div>
    </div>
  )
}
