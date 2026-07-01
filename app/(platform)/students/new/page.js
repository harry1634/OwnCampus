'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, User, BookOpen, Phone, Users, Camera,
  Save, CheckCircle, AlertCircle, Bus, Home,
  Calendar, Hash, GraduationCap, Heart,
} from 'lucide-react'

const CLASSES  = ['Nursery','KG-I','KG-II','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12']
const SECTIONS = ['A','B','C','D','E']
const BLOOD    = ['A+','A−','B+','B−','AB+','AB−','O+','O−','Unknown']
const YEARS    = ['2024-25','2025-26','2026-27']
const RELATIONS = ['Father','Mother','Guardian','Grandparent','Sibling','Other']
const FEE_CATS = ['General','SC/ST','OBC','Minority','Staff Ward','Scholarship']

const SECTIONS_CONFIG = [
  { id: 'personal',  label: 'Personal Info',     icon: User,          color: '#2563EB', bg: '#EFF6FF' },
  { id: 'academic',  label: 'Academic Details',   icon: GraduationCap, color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'contact',   label: 'Contact Details',    icon: Phone,         color: '#0891B2', bg: '#ECFEFF' },
  { id: 'parent',    label: 'Parent / Guardian',  icon: Users,         color: '#10B981', bg: '#F0FDF4' },
]

function SectionHeader({ icon: Icon, label, color, bg, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} style={{ color }} />
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{label}</p>
        {sub && <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{sub}</p>}
      </div>
    </div>
  )
}

function Field({ label, required, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: error ? '#DC2626' : '#475569', letterSpacing: '0.01em' }}>
        {label}{required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: 11, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  )
}

function Input({ error, ...props }) {
  return (
    <input
      className="input-premium"
      style={{
        fontSize: 13, padding: '9px 12px',
        borderColor: error ? '#FECACA' : undefined,
        background: error ? '#FFF5F5' : undefined,
      }}
      {...props}
    />
  )
}

function Select({ error, children, ...props }) {
  return (
    <select
      className="input-premium"
      style={{
        fontSize: 13, padding: '9px 12px',
        borderColor: error ? '#FECACA' : undefined,
        background: error ? '#FFF5F5' : undefined,
      }}
      {...props}
    >
      {children}
    </select>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', background: checked ? '#EFF6FF' : '#FAFBFC', transition: 'all 0.18s' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: checked ? '#2563EB' : '#64748B' }}>{label}</span>
      <div
        onClick={onChange}
        style={{
          width: 40, height: 22, borderRadius: 99, position: 'relative',
          background: checked ? '#2563EB' : '#CBD5E1', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%', background: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.20)', transition: 'left 0.2s',
        }} />
      </div>
    </label>
  )
}

function getInitials(first, last) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || '?'
}

export default function NewStudentPage() {
  const router       = useRouter()
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [errors, setErrors]   = useState({})

  const [form, setForm] = useState({
    firstName: '', lastName: '', dob: '', gender: '', blood: 'Unknown',
    rollNo: '', admissionNo: '', class: '', section: 'A', admissionDate: '', year: '2026-27',
    email: '', phone: '', address: '', city: '', state: '', pincode: '',
    parentName: '', relation: 'Father', parentPhone: '', parentEmail: '', occupation: '',
    feeCategory: 'General', transport: false, hostel: false,
  })

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target ? e.target.value : e }))

  const validate = () => {
    const e = {}
    if (!form.firstName.trim())  e.firstName   = 'First name is required'
    if (!form.lastName.trim())   e.lastName    = 'Last name is required'
    if (!form.dob)               e.dob         = 'Date of birth is required'
    if (!form.gender)            e.gender      = 'Select a gender'
    if (!form.rollNo.trim())     e.rollNo      = 'Roll number is required'
    if (!form.class)             e.class       = 'Select a class'
    if (!form.admissionDate)     e.admissionDate = 'Admission date is required'
    if (!form.phone.trim())      e.phone       = 'Phone number is required'
    if (!form.parentName.trim()) e.parentName  = 'Parent name is required'
    if (!form.parentPhone.trim()) e.parentPhone = 'Parent phone is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const res = await fetch('/api/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: [{
            name:   `${form.firstName.trim()} ${form.lastName.trim()}`,
            email:  form.email.trim() || null,
            roll:   form.rollNo.trim() || null,
            class:  form.class ? `${form.class}${form.section ? `-${form.section}` : ''}` : null,
            parent: form.parentName.trim() || null,
            phone:  form.phone.trim() || null,
          }],
        }),
      })
      const json = await res.json()
      if (!res.ok || json.errors > 0) {
        const detail = json.details?.errors?.[0]?.error || json.error || 'Failed to save student.'
        setErrors({ submit: detail })
        setSaving(false)
        return
      }
      setSaved(true)
      await new Promise(r => setTimeout(r, 700))
      router.push('/students')
    } catch (err) {
      setErrors({ submit: err.message || 'Network error. Please try again.' })
      setSaving(false)
    }
  }

  const hasName = form.firstName || form.lastName
  const initials = getInitials(form.firstName, form.lastName)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/students">
            <button style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #E2E8F0', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', cursor: 'pointer', flexShrink: 0, transition: 'all 0.14s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#E2E8F0' }}>
              <ArrowLeft size={16} />
            </button>
          </Link>
          <div>
            <h1 className="page-header-title">Add New Student</h1>
            <p className="page-header-sub">Fill in the details below to enrol a new student</p>
          </div>
        </div>
        <div className="page-actions">
          <Link href="/students">
            <button className="btn-secondary">Cancel</button>
          </Link>
        </div>
      </div>

      {/* Section progress indicators */}
      <div style={{ display: 'flex', gap: 12 }}>
        {SECTIONS_CONFIG.map(s => {
          const Icon = s.icon
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: '#FFFFFF', border: '1px solid #E2E8F0', fontSize: 12, fontWeight: 500, color: '#64748B' }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={13} style={{ color: s.color }} />
              </div>
              {s.label}
            </div>
          )
        })}
      </div>

      {/* Main layout */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

          {/* ── Left: Form sections ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── 1. Personal Information ── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.0 }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: '28px 32px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
              <SectionHeader icon={User} label="Personal Information" color="#2563EB" bg="#EFF6FF"
                sub="Basic identity and demographic details" />

              {/* Photo upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 26, paddingBottom: 26, borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 80, height: 80, borderRadius: 20, background: hasName ? '#2563EB' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: hasName ? '#FFFFFF' : '#CBD5E1', fontFamily: 'Inter, sans-serif', border: '3px solid #E2E8F0', boxShadow: '0 4px 12px rgba(37,99,235,0.15)', transition: 'all 0.2s' }}>
                    {hasName ? initials : <User size={28} style={{ color: '#CBD5E1' }} />}
                  </div>
                  <button type="button" style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: '50%', background: '#2563EB', border: '2px solid #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.35)' }}>
                    <Camera size={12} style={{ color: '#FFFFFF' }} />
                  </button>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Student Photo</p>
                  <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>JPG, PNG up to 2MB. Initials auto-generated until uploaded.</p>
                  <button type="button" style={{ marginTop: 8, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', cursor: 'pointer' }}>
                    Upload Photo
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="First Name" required error={errors.firstName}>
                  <Input placeholder="e.g. Rahul" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
                </Field>
                <Field label="Last Name" required error={errors.lastName}>
                  <Input placeholder="e.g. Sharma" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
                </Field>
                <Field label="Date of Birth" required error={errors.dob}>
                  <Input type="date" value={form.dob} onChange={set('dob')} error={errors.dob} />
                </Field>
                <Field label="Gender" required error={errors.gender}>
                  <Select value={form.gender} onChange={set('gender')} error={errors.gender}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not">Prefer not to say</option>
                  </Select>
                </Field>
                <Field label="Blood Group">
                  <Select value={form.blood} onChange={set('blood')}>
                    {BLOOD.map(b => <option key={b} value={b}>{b}</option>)}
                  </Select>
                </Field>
                <Field label="Aadhaar Number (optional)">
                  <Input placeholder="XXXX XXXX XXXX" maxLength={14} value={form.aadhaar || ''} onChange={set('aadhaar')} />
                </Field>
              </div>
            </motion.div>

            {/* ── 2. Academic Details ── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: '28px 32px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
              <SectionHeader icon={GraduationCap} label="Academic Details" color="#7C3AED" bg="#F5F3FF"
                sub="Class, section and enrolment information" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Roll Number" required error={errors.rollNo}>
                  <Input placeholder="e.g. A001" value={form.rollNo} onChange={set('rollNo')} error={errors.rollNo} />
                </Field>
                <Field label="Admission Number">
                  <Input placeholder="Auto-generated if blank" value={form.admissionNo} onChange={set('admissionNo')} />
                </Field>
                <Field label="Class" required error={errors.class}>
                  <Select value={form.class} onChange={set('class')} error={errors.class}>
                    <option value="">Select class</option>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Section">
                  <Select value={form.section} onChange={set('section')}>
                    {SECTIONS.map(s => <option key={s} value={s}>Section {s}</option>)}
                  </Select>
                </Field>
                <Field label="Admission Date" required error={errors.admissionDate}>
                  <Input type="date" value={form.admissionDate} onChange={set('admissionDate')} error={errors.admissionDate} />
                </Field>
                <Field label="Academic Year">
                  <Select value={form.year} onChange={set('year')}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </Select>
                </Field>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Previous School (if any)">
                    <Input placeholder="Name of previous school" value={form.prevSchool || ''} onChange={set('prevSchool')} />
                  </Field>
                </div>
              </div>
            </motion.div>

            {/* ── 3. Contact Details ── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: '28px 32px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
              <SectionHeader icon={Phone} label="Contact Details" color="#0891B2" bg="#ECFEFF"
                sub="Student's email, phone and residential address" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Email Address">
                  <Input type="email" placeholder="student@email.com" value={form.email} onChange={set('email')} />
                </Field>
                <Field label="Phone Number" required error={errors.phone}>
                  <Input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} error={errors.phone} />
                </Field>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Street Address">
                    <Input placeholder="House No., Street, Locality" value={form.address} onChange={set('address')} />
                  </Field>
                </div>
                <Field label="City">
                  <Input placeholder="e.g. Mumbai" value={form.city} onChange={set('city')} />
                </Field>
                <Field label="State">
                  <Input placeholder="e.g. Maharashtra" value={form.state} onChange={set('state')} />
                </Field>
                <Field label="Pincode">
                  <Input placeholder="400001" maxLength={6} value={form.pincode} onChange={set('pincode')} />
                </Field>
              </div>
            </motion.div>

            {/* ── 4. Parent / Guardian ── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: '28px 32px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
              <SectionHeader icon={Users} label="Parent / Guardian" color="#10B981" bg="#F0FDF4"
                sub="Primary contact for the student" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Full Name" required error={errors.parentName}>
                  <Input placeholder="e.g. Suresh Sharma" value={form.parentName} onChange={set('parentName')} error={errors.parentName} />
                </Field>
                <Field label="Relationship">
                  <Select value={form.relation} onChange={set('relation')}>
                    {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </Field>
                <Field label="Phone Number" required error={errors.parentPhone}>
                  <Input type="tel" placeholder="+91 98765 43210" value={form.parentPhone} onChange={set('parentPhone')} error={errors.parentPhone} />
                </Field>
                <Field label="Email Address">
                  <Input type="email" placeholder="parent@email.com" value={form.parentEmail} onChange={set('parentEmail')} />
                </Field>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Occupation">
                    <Input placeholder="e.g. Software Engineer" value={form.occupation} onChange={set('occupation')} />
                  </Field>
                </div>
              </div>
            </motion.div>

          </div>

          {/* ── Right: Sticky panel ── */}
          <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Preview card */}
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: '24px 20px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)', textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 18, background: hasName ? '#2563EB' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: hasName ? '#FFFFFF' : '#CBD5E1', fontFamily: 'Inter, sans-serif', margin: '0 auto 14px', boxShadow: hasName ? '0 6px 16px rgba(37,99,235,0.25)' : 'none', transition: 'all 0.25s' }}>
                {hasName ? initials : <User size={26} style={{ color: '#CBD5E1' }} />}
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                {hasName ? `${form.firstName} ${form.lastName}` : 'Student Name'}
              </p>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                {form.class ? `${form.class}${form.section ? ` · Section ${form.section}` : ''}` : 'Class not selected'}
              </p>
              {form.rollNo && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '4px 12px', borderRadius: 99, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <Hash size={10} style={{ color: '#2563EB' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', fontFamily: 'monospace' }}>{form.rollNo}</span>
                </div>
              )}
            </motion.div>

            {/* Enrollment options */}
            <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.16 }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: '20px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 14 }}>Enrollment Options</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Fee Category">
                  <Select value={form.feeCategory} onChange={set('feeCategory')}>
                    {FEE_CATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </Select>
                </Field>

                <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Toggle
                    checked={form.transport}
                    onChange={() => setForm(f => ({ ...f, transport: !f.transport }))}
                    label="School Transport"
                  />
                  <Toggle
                    checked={form.hostel}
                    onChange={() => setForm(f => ({ ...f, hostel: !f.hostel }))}
                    label="Hostel Accommodation"
                  />
                </div>
              </div>
            </motion.div>

            {/* Validation summary */}
            {Object.keys(errors).length > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <AlertCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>
                    {errors.submit ? 'Save failed' : `${Object.keys(errors).filter(k => k !== 'submit').length} field${Object.keys(errors).filter(k => k !== 'submit').length !== 1 ? 's' : ''} need attention`}
                  </p>
                </div>
                {errors.submit
                  ? <p style={{ fontSize: 11, color: '#DC2626', paddingLeft: 21, lineHeight: 1.8 }}>• {errors.submit}</p>
                  : Object.entries(errors).filter(([k]) => k !== 'submit').slice(0, 4).map(([, v], i) => (
                    <p key={i} style={{ fontSize: 11, color: '#DC2626', paddingLeft: 21, lineHeight: 1.8 }}>• {v}</p>
                  ))
                }
              </motion.div>
            )}

            {/* Submit button */}
            <motion.button
              type="submit"
              whileHover={{ scale: saving || saved ? 1 : 1.01 }}
              whileTap={{ scale: 0.98 }}
              disabled={saving || saved}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 12,
                background: saved ? '#10B981' : '#2563EB',
                border: 'none', color: '#FFFFFF',
                fontSize: 14, fontWeight: 700,
                cursor: saving || saved ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: saved ? '0 4px 14px rgba(16,185,129,0.35)' : '0 4px 14px rgba(37,99,235,0.30)',
                transition: 'background 0.25s, box-shadow 0.25s',
              }}>
              {saved ? (
                <><CheckCircle size={16} /> Saved!</>
              ) : saving ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.7s" repeatCount="indefinite" />
                    </path>
                  </svg>
                  Saving…
                </>
              ) : (
                <><Save size={16} /> Save Student</>
              )}
            </motion.button>

            <Link href="/students" style={{ display: 'block' }}>
              <button type="button" style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Discard &amp; Go Back
              </button>
            </Link>

          </div>
        </div>
      </form>

    </div>
  )
}
