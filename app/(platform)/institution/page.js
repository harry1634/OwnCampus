'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, MapPin, Phone, Mail, Globe, Users, GraduationCap,
  Edit2, X, Check, Calendar, Award, User, BookOpen, Layers,
  Landmark, FileText, Save,
} from 'lucide-react'

const BOARD_OPTIONS   = ['CBSE','ICSE','IB','State Board','NIOS','Cambridge','Other']
const TYPE_OPTIONS    = ['School','College','University','Institute','Academy','Other']
const ACCRED_OPTIONS  = ['NAAC A++','NAAC A+','NAAC A','NAAC B++','ISO 9001:2015','None']
const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra',
  'Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim',
  'Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
]

const OVERLAY = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 200,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
  overflowY: 'auto', padding: 'calc(var(--header-height) + 24px) 24px 40px',
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const INP = { style: { width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' } }

/* ── Edit Modal ───────────────────────────────────────────────────── */
function EditInstitutionModal({ profile, onClose, onSave }) {
  const [form, setForm] = useState({ ...profile })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const sLabel = text => (
    <p style={{ gridColumn: '1 / -1', fontSize: 10, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #EFF6FF', paddingBottom: 6, margin: '4px 0 2px' }}>{text}</p>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={OVERLAY} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        style={{ background: '#FFF', borderRadius: 20, width: '100%', maxWidth: 580, maxHeight: 'calc(100vh - var(--header-height) - 64px)', overflowY: 'auto', boxShadow: '0 24px 64px rgba(15,23,42,0.22)' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#FFF', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Edit2 size={15} style={{ color: '#2563EB' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Edit Institution Profile</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {sLabel('Basic Information')}
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Institution Name *">
              <input value={form.name} onChange={set('name')} placeholder="Full institution name" {...INP} />
            </Field>
          </div>
          <Field label="Short Name">
            <input value={form.shortName} onChange={set('shortName')} placeholder="Abbreviation" {...INP} />
          </Field>
          <Field label="Tagline">
            <input value={form.tagline} onChange={set('tagline')} placeholder="e.g. Empowering Minds" {...INP} />
          </Field>
          <Field label="Type">
            <select value={form.type} onChange={set('type')} style={{ ...INP.style }}>
              {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Affiliated Board">
            <select value={form.board} onChange={set('board')} style={{ ...INP.style }}>
              {BOARD_OPTIONS.map(b => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Accreditation">
            <select value={form.accreditation} onChange={set('accreditation')} style={{ ...INP.style }}>
              {ACCRED_OPTIONS.map(a => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Established Date">
            <input type="date" value={form.established} onChange={set('established')} {...INP} />
          </Field>

          {sLabel('Leadership')}
          <Field label="Principal / Head">
            <input value={form.principal} onChange={set('principal')} placeholder="Dr. Full Name" {...INP} />
          </Field>
          <Field label="Chairman / Trustee">
            <input value={form.chairman} onChange={set('chairman')} placeholder="Mr. Full Name" {...INP} />
          </Field>

          {sLabel('Contact & Location')}
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Street Address">
              <input value={form.address} onChange={set('address')} placeholder="Building, Street, Area" {...INP} />
            </Field>
          </div>
          <Field label="City">
            <input value={form.city} onChange={set('city')} placeholder="City" {...INP} />
          </Field>
          <Field label="PIN Code">
            <input value={form.pin} onChange={set('pin')} placeholder="110001" {...INP} />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="State">
              <select value={form.state} onChange={set('state')} style={{ ...INP.style }}>
                <option value="">Select state</option>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Phone">
            <input value={form.phone} onChange={set('phone')} placeholder="+91 XXXXX XXXXX" {...INP} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={set('email')} placeholder="admin@school.edu" {...INP} />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Website">
              <input value={form.website} onChange={set('website')} placeholder="www.school.edu" {...INP} />
            </Field>
          </div>

          {sLabel('About')}
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="About the Institution">
              <textarea value={form.about} onChange={set('about')} placeholder="Brief description of the institution…" rows={3}
                style={{ ...INP.style, resize: 'vertical', lineHeight: 1.5 }} />
            </Field>
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: '#FFF' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => { onSave(form); onClose() }}
            style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#2563EB', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Save size={13} /> Save Profile
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Info Row ─────────────────────────────────────────────────────── */
function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: '#F8FAFC', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <Icon size={13} style={{ color: '#64748B' }} />
      </div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>{label}</p>
        <p style={{ fontSize: 13, color: '#0F172A', fontWeight: 500 }}>{value}</p>
      </div>
    </div>
  )
}

/* ── Badge ────────────────────────────────────────────────────────── */
function Badge({ label, value, color = '#2563EB', bg = '#EFF6FF', border = '#BFDBFE' }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: '10px 18px', borderRadius: 12, background: bg, border: `1px solid ${border}`, gap: 2 }}>
      <p style={{ fontSize: 13, fontWeight: 800, color, fontFamily: 'Inter, sans-serif' }}>{value}</p>
      <p style={{ fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    </div>
  )
}

/* ── Main Page ────────────────────────────────────────────────────── */
export default function InstitutionPage() {
  const [profile,  setProfile ] = useState(null)
  const [branches, setBranches] = useState([])
  const [students, setStudents] = useState([])
  const [faculty,  setFaculty ] = useState([])
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    fetch('/api/institutions/my-code')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d || d.error) return
        setProfile({
          name:          d.name          || '',
          type:          d.type          || 'School',
          established:   d.established_year ? String(d.established_year) : '',
          email:         d.email         || '',
          phone:         d.phone         || '',
          website:       d.website       || '',
          address:       d.address       || '',
          city:          d.city          || '',
          state:         d.state         || '',
          pincode:       d.pincode       || '',
          board:         d.affiliation   || '',
          affiliation:   d.affiliation   || '',
          accreditation: d.accreditation || 'None',
          logoUrl:       d.logo_url      || null,
        })
      })
      .catch(() => {})
    fetch('/api/branches').then(r => r.ok ? r.json() : {}).then(d => setBranches(d.branches || [])).catch(() => {})
    fetch('/api/students').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setStudents(d) }).catch(() => {})
    fetch('/api/faculty').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setFaculty(d) }).catch(() => {})
  }, [])

  function updateInstitutionProfile(updates) {
    setProfile(prev => ({ ...(prev || {}), ...updates }))
  }

  const yearsOld      = profile?.established ? new Date().getFullYear() - new Date(profile.established).getFullYear() : null
  const totalStudents = branches.reduce((s, b) => s + (b.students || 0), 0) || students.length
  const totalStaff    = branches.reduce((s, b) => s + (b.staff    || 0), 0) || faculty.length
  const totalCapacity = branches.reduce((s, b) => s + (b.capacity || 0), 0)
  const p = profile || {}

  const initials = (p.shortName || p.name || 'OC').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Institution Profile</h1>
          <p style={{ fontSize: 14, color: '#64748B', marginTop: 5 }}>School-wide identity, contact details and credentials</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setEditOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, border: 'none', background: '#2563EB', color: '#FFF', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(37,99,235,0.30)' }}>
          <Edit2 size={14} /> Edit Profile
        </motion.button>
      </div>

      {/* Profile Hero Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>

        {/* Banner */}
        <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 55%, #4F46E5 100%)', height: 130, position: 'relative' }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -50, right: 120, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', top: 10, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

          {/* Institution name inside banner */}
          <div style={{ position: 'absolute', top: 0, left: 112, right: 20, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {p.name || 'Your Institution'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {p.type && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.12)', padding: '2px 10px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.18)' }}>{p.type}</span>
              )}
              {p.board && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.12)', padding: '2px 10px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.18)' }}>{p.board}</span>
              )}
              {p.accreditation && p.accreditation !== 'None' && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.12)', padding: '2px 10px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Award size={9} />{p.accreditation}
                </span>
              )}
            </div>
          </div>

          {/* Logo / initials */}
          <div style={{ position: 'absolute', bottom: -36, left: 28, width: 72, height: 72, borderRadius: 18, background: '#FFFFFF', border: '4px solid #FFF', boxShadow: '0 4px 16px rgba(15,23,42,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#2563EB', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
            {p.logoUrl
              ? <img src={p.logoUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
        </div>

        <div style={{ padding: '48px 28px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <div>
              {p.tagline && <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, fontStyle: 'italic' }}>"{p.tagline}"</p>}
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
            <Badge label="Students"    value={totalStudents.toLocaleString('en-IN')} color="#2563EB" bg="#EFF6FF" border="#BFDBFE" />
            <Badge label="Staff"       value={totalStaff || '—'}   color="#7C3AED" bg="#F5F3FF" border="#DDD6FE" />
            <Badge label="Branches"    value={branches.length}     color="#0891B2" bg="#ECFEFF" border="#A5F3FC" />
            {totalCapacity > 0 && <Badge label="Capacity"  value={totalCapacity.toLocaleString('en-IN')} color="#D97706" bg="#FFFBEB" border="#FDE68A" />}
            {yearsOld != null && <Badge label="Years Old"  value={yearsOld}     color="#16A34A" bg="#F0FDF4" border="#BBF7D0" />}
          </div>

          {/* About */}
          {p.about && (
            <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>About</p>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 }}>{p.about}</p>
            </div>
          )}

          {/* Two-column info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Contact & Location</p>
              <InfoRow icon={MapPin}    label="Address"    value={[p.address, p.city, p.state, p.pincode].filter(Boolean).join(', ')} />
              <InfoRow icon={Phone}     label="Phone"      value={p.phone} />
              <InfoRow icon={Mail}      label="Email"      value={p.email} />
              <InfoRow icon={Globe}     label="Website"    value={p.website} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Academic Details</p>
              <InfoRow icon={Landmark}     label="Institution Type"  value={p.type} />
              <InfoRow icon={BookOpen}     label="Affiliated Board"  value={p.board} />
              <InfoRow icon={Award}        label="Accreditation"     value={p.accreditation !== 'None' ? p.accreditation : null} />
              <InfoRow icon={Calendar}     label="Established"       value={p.established ? new Date(p.established).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : null} />
              <InfoRow icon={User}         label="Principal"         value={p.principal} />
              <InfoRow icon={Users}        label="Chairman"          value={p.chairman} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editOpen && (
          <EditInstitutionModal
            key="edit-institution"
            profile={p}
            onClose={() => setEditOpen(false)}
            onSave={updates => updateInstitutionProfile(updates)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
