'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Briefcase, Phone, Save, CheckCircle, AlertCircle } from 'lucide-react'

const DEPTS = ['Mathematics','Science','English','Social Science','Commerce','Computer Science','Physical Education','Hindi','Administration','Accounts','HR','Other']
const ROLES = ['Teacher','Senior Teacher','HOD','Principal','Vice Principal','Clerk','Accountant','Librarian','Lab Assistant','Peon','Security','Other']

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

export default function NewEmployeePage() {
  const router       = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    name: '', dept: '', role: '', type: 'full_time',
    gross: '', email: '', phone: '', joiningDate: '',
  })

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.dept)        e.dept = 'Select a department'
    if (!form.gross.trim()) e.gross = 'Gross salary is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const res  = await fetch('/api/faculty', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:        form.name.trim(),
          email:       form.email.trim(),
          phone:       form.phone.trim() || null,
          dept:        form.dept,
          designation: form.role,
          type:        form.type,
          salary:      form.gross,
          joiningDate: form.joiningDate || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSaved(true)
      setTimeout(() => router.push('/hrms'), 700)
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
        <Link href="/hrms" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>
          <ArrowLeft size={15} /> Back to HRMS
        </Link>
        <span style={{ color: '#CBD5E1' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Add Employee</span>
      </div>

      <div className="form-layout" style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 32px' }}>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Personal */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={14} style={{ color: '#2563EB' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Personal Details</p>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Full Name *" error={errors.name}>
                <Input placeholder="e.g. Meera Fernandes" value={form.name} onChange={set('name')} error={errors.name} />
              </Field>
              <Field label="Joining Date">
                <Input type="date" value={form.joiningDate} onChange={set('joiningDate')} />
              </Field>
              <Field label="Email">
                <Input type="email" placeholder="name@campus.edu" value={form.email} onChange={set('email')} />
              </Field>
              <Field label="Phone">
                <Input placeholder="+91 98765 00000" value={form.phone} onChange={set('phone')} />
              </Field>
            </div>
          </div>

          {/* Role */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Briefcase size={14} style={{ color: '#16A34A' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Role & Payroll</p>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Field label="Department *" error={errors.dept}>
                <Select value={form.dept} onChange={set('dept')} error={errors.dept}>
                  <option value="">Select dept…</option>
                  {DEPTS.map(d => <option key={d}>{d}</option>)}
                </Select>
              </Field>
              <Field label="Role / Designation">
                <Select value={form.role} onChange={set('role')}>
                  <option value="">Select role…</option>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Employment Type">
                <Select value={form.type} onChange={set('type')}>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                </Select>
              </Field>
              <Field label="Gross Salary (₹/month) *" error={errors.gross} style={{ gridColumn: '1 / -1' }}>
                <Input placeholder="e.g. 80000" value={form.gross} onChange={set('gross')} error={errors.gross} />
              </Field>
            </div>
          </div>

          <button type="submit" style={{ display: 'none' }} />
        </form>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 24 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, fontWeight: 800, color: '#FFFFFF' }}>
              {initials || <User size={22} />}
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{form.name || 'Employee Name'}</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{form.dept || 'Dept not selected'}</p>
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{form.role || 'Role not set'}</p>
            {form.gross && (
              <div style={{ marginTop: 10, background: '#F8FAFC', borderRadius: 10, padding: '8px 12px' }}>
                <p style={{ fontSize: 11, color: '#94A3B8' }}>Gross Salary</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>₹{parseInt(form.gross.replace(/[^0-9]/g,'')||0).toLocaleString('en-IN')}</p>
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
                : <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display:'flex',alignItems:'center',gap:8 }}><Save size={15} /> Add Employee</motion.span>}
            </AnimatePresence>
          </motion.button>
          <Link href="/hrms" style={{ fontSize: 13, color: '#64748B', textAlign: 'center', textDecoration: 'none' }}>Cancel</Link>
        </div>
      </div>
    </div>
  )
}
