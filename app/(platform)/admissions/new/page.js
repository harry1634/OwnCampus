'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, BookOpen, MapPin, Save, CheckCircle, AlertCircle } from 'lucide-react'

const PROGRAMS = ['B.Tech CSE','B.Tech ECE','B.Tech Mechanical','B.Tech Civil','MBA','BBA','B.Com','MCA','M.Tech','B.Sc Physics','B.Sc Chemistry','B.Ed','Other']
const SOURCES  = ['website','google','facebook','instagram','whatsapp','referral','walk_in']
const STATUSES = ['new','contacted','interested','follow_up','converted','not_interested']
const STATUS_LABELS = { new:'New', contacted:'Contacted', interested:'Interested', follow_up:'Follow Up', converted:'Converted', not_interested:'Not Interested' }
const COUNSELLORS = ['Priya M.','Arjun K.','Sneha P.','Rahul V.']

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

export default function NewLeadPage() {
  const router  = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    name: '', phone: '', program: '', source: 'website',
    status: 'new', counsellor: '', score: '', city: '',
  })

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name  = 'Name is required'
    if (!form.phone.trim()) e.phone = 'Phone is required'
    if (!form.program)      e.program = 'Select a program'
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
    router.push('/admissions')
  }

  const sourceLabel = { website:'Website', google:'Google', facebook:'Facebook', instagram:'Instagram', whatsapp:'WhatsApp', referral:'Referral', walk_in:'Walk-in' }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/admissions" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>
          <ArrowLeft size={15} /> Back to Admissions
        </Link>
        <span style={{ color: '#CBD5E1' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Add Admission Lead</span>
      </div>

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Lead Info */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={14} style={{ color: '#2563EB' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Lead Information</p>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Full Name *" error={errors.name}>
                <Input placeholder="e.g. Ananya Singh" value={form.name} onChange={set('name')} error={errors.name} />
              </Field>
              <Field label="Phone *" error={errors.phone}>
                <Input placeholder="+91 98765 00000" value={form.phone} onChange={set('phone')} error={errors.phone} />
              </Field>
              <Field label="City">
                <Input placeholder="e.g. Delhi" value={form.city} onChange={set('city')} />
              </Field>
              <Field label="Lead Score (0–100)">
                <Input type="number" min="0" max="100" placeholder="0" value={form.score} onChange={set('score')} />
              </Field>
            </div>
          </div>

          {/* Academic Interest */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={14} style={{ color: '#16A34A' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Academic Interest</p>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Program *" error={errors.program}>
                <Select value={form.program} onChange={set('program')} error={errors.program}>
                  <option value="">Select program…</option>
                  {PROGRAMS.map(p => <option key={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="Lead Source">
                <Select value={form.source} onChange={set('source')}>
                  {SOURCES.map(s => <option key={s} value={s}>{sourceLabel[s]}</option>)}
                </Select>
              </Field>
            </div>
          </div>

          {/* Pipeline */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={14} style={{ color: '#EA580C' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Pipeline Details</p>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Stage">
                <Select value={form.status} onChange={set('status')}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </Select>
              </Field>
              <Field label="Counsellor">
                <Select value={form.counsellor} onChange={set('counsellor')}>
                  <option value="">Unassigned</option>
                  {COUNSELLORS.map(c => <option key={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
          </div>

          <button type="submit" style={{ display: 'none' }} />
        </form>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 24 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, fontWeight: 800, color: '#FFFFFF' }}>
              {form.name ? form.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) : '?'}
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{form.name || 'Lead Name'}</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{form.program || 'Program not selected'}</p>
            <div style={{ marginTop: 10, padding: '6px 12px', borderRadius: 20, background: '#EFF6FF', display: 'inline-block' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB' }}>{STATUS_LABELS[form.status]}</span>
            </div>
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
                : <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display:'flex',alignItems:'center',gap:8 }}><Save size={15} /> Add Lead</motion.span>}
            </AnimatePresence>
          </motion.button>
          <Link href="/admissions" style={{ fontSize: 13, color: '#64748B', textAlign: 'center', textDecoration: 'none' }}>Cancel</Link>
        </div>
      </div>
    </div>
  )
}
