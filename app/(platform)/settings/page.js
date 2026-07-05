'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Shield, User, Trash2,
  Save, Check, Upload, ChevronRight, Lock,
  Globe, Phone, Mail, MapPin, Hash, Calendar, Copy, X, Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/useCurrentUser'

const tabs = [
  { key: 'institution', label: 'Institution', icon: Building2, desc: 'Profile & branding'      },
  { key: 'profile',     label: 'My Profile',  icon: User,      desc: 'Personal photo & info'   },
  { key: 'security',    label: 'Security',    icon: Shield,    desc: 'Auth & access'            },
  { key: 'modules',     label: 'Modules',     icon: Layers,    desc: 'Module access & requests' },
]

const ALL_MODULES = [
  { key: 'students',      label: 'Students'        },
  { key: 'faculty',       label: 'Faculty'         },
  { key: 'attendance',    label: 'Attendance'      },
  { key: 'finance',       label: 'Finance & Fees'  },
  { key: 'library',       label: 'Library'         },
  { key: 'hostel',        label: 'Hostel'          },
  { key: 'transport',     label: 'Transport'       },
  { key: 'timetable',     label: 'Timetable'       },
  { key: 'hrms',          label: 'HRMS'            },
  { key: 'lms',           label: 'LMS'             },
  { key: 'analytics',     label: 'Analytics'       },
  { key: 'communication', label: 'Communication'   },
  { key: 'examinations',  label: 'Examinations'    },
  { key: 'admissions',    label: 'Admissions'      },
  { key: 'placement',     label: 'Placement'       },
]

const FIELD_STYLE = {
  width: '100%',
  padding: '10px 14px',
  fontSize: 13,
  color: '#0F172A',
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 10,
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
}

function FieldGroup({ label, icon: Icon, children }) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {Icon && <Icon size={12} style={{ color: '#94A3B8' }} />}
        {label}
      </label>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const cu = useCurrentUser()
  const [activeTab,  setActiveTab ] = useState('institution')
  const [saved,      setSaved     ] = useState(false)
  const [security,   setSecurity  ] = useState({ twofa: false, timeout: true, loginNotif: true, ipRestrict: false })
  const [curPwd,     setCurPwd    ] = useState('')
  const [newPwd,     setNewPwd    ] = useState('')
  const [confPwd,    setConfPwd   ] = useState('')
  const [pwdBusy,    setPwdBusy   ] = useState(false)
  const [instCode,      setInstCode     ] = useState(null)
  const [instId,        setInstId       ] = useState(null)
  const [instFields,    setInstFields   ] = useState({ name: '', type: 'school', email: '', phone: '', website: '', address: '', affiliation: '', established_year: '' })
  const [instSaving,    setInstSaving   ] = useState(false)
  const [logoUrl,       setLogoUrl      ] = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoRemoving,  setLogoRemoving ] = useState(false)
  const [codeCopied,    setCodeCopied   ] = useState(false)
  const [avatarUrl,     setAvatarUrl    ] = useState(undefined)   // undefined = not yet overridden
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarDeleting,  setAvatarDeleting ] = useState(false)
  // undefined means "use DB value from hook"; null means "user deleted it"; string means "user uploaded"
  const displayAvatarUrl = avatarUrl !== undefined ? avatarUrl : (cu?.avatarUrl ?? null)
  const logoRef   = useRef(null)
  const avatarRef = useRef(null)

  useEffect(() => {
    fetch('/api/institutions/my-code')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        if (d.code)     setInstCode(d.code)
        if (d.id)       setInstId(d.id)
        if (d.logo_url) setLogoUrl(d.logo_url)
        setInstFields({
          name:             d.name             || '',
          type:             d.type             || 'school',
          email:            d.email            || '',
          phone:            d.phone            || '',
          website:          d.website          || '',
          address:          d.address          || '',
          affiliation:      d.affiliation      || '',
          established_year: d.established_year ? String(d.established_year) : '',
        })
      })
      .catch(() => {})
  }, [])

  function copyCode() {
    if (!instCode) return
    navigator.clipboard.writeText(instCode).then(() => {
      setCodeCopied(true)
      toast.success('Institution code copied!')
      setTimeout(() => setCodeCopied(false), 2000)
    })
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (newPwd.length < 8)  { toast.error('New password must be at least 8 characters.'); return }
    if (newPwd !== confPwd) { toast.error('Passwords do not match.'); return }
    setPwdBusy(true)
    try {
      const supabase = createClient()
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: cu.email, password: curPwd })
      if (signInErr) { toast.error('Current password is incorrect.'); return }
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      toast.success('Password changed successfully!')
      setCurPwd(''); setNewPwd(''); setConfPwd('')
    } catch (err) {
      toast.error(err.message || 'Failed to change password.')
    } finally {
      setPwdBusy(false)
    }
  }

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const [modReqs,       setModReqs      ] = useState([])
  const [enabledMods,   setEnabledMods  ] = useState(null)
  const [submittingMod, setSubmittingMod] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/module-requests').then(r => r.ok ? r.json() : { requests: [] }),
      fetch('/api/license').then(r => r.ok ? r.json() : {}),
    ]).then(([reqData, licData]) => {
      setModReqs(reqData.requests || [])
      if (licData.modules) {
        const map = {}
        ;(licData.modules || []).forEach(m => { map[m.module_key] = m.is_enabled })
        setEnabledMods(map)
      }
    }).catch(() => {})
  }, [])

  async function requestModule(moduleKey) {
    setSubmittingMod(moduleKey)
    try {
      const res  = await fetch('/api/module-requests', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module_key: moduleKey }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Request submitted. OwnCampus will review it shortly.')
      setModReqs(prev => [json.request, ...prev])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmittingMod(null)
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB.'); return }
    if (!instId) { toast.error('Institution not loaded yet.'); return }
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const uploadRes = await fetch('/api/upload/photo', { method: 'POST', body: fd })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadJson.error || 'Upload failed')
      // Save via API so it bypasses client-side RLS
      const saveRes = await fetch('/api/institutions/my-code', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: uploadJson.url }),
      })
      if (!saveRes.ok) throw new Error((await saveRes.json()).error || 'Failed to save logo')
      setLogoUrl(uploadJson.url)
      toast.success('Logo updated!')
    } catch (err) {
      toast.error(err.message || 'Upload failed.')
    } finally {
      setLogoUploading(false)
      e.target.value = ''
    }
  }

  async function handleLogoRemove() {
    setLogoRemoving(true)
    try {
      const res = await fetch('/api/institutions/my-code', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: null }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to remove logo')
      setLogoUrl(null)
      toast.success('Logo removed.')
    } catch (err) {
      toast.error(err.message || 'Failed to remove logo.')
    } finally {
      setLogoRemoving(false)
    }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB.'); return }
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/photo', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      setAvatarUrl(json.url)
      cu.updateAvatarUrl?.(json.url)
      toast.success('Profile photo updated!')
    } catch (err) {
      toast.error(err.message || 'Upload failed.')
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  async function handleAvatarDelete() {
    setAvatarDeleting(true)
    try {
      const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar_url: null }) })
      if (!res.ok) throw new Error('Failed to remove photo')
      setAvatarUrl(null)
      cu.updateAvatarUrl?.(null)
      toast.success('Profile photo removed.')
    } catch (err) {
      toast.error(err.message || 'Failed to remove photo.')
    } finally {
      setAvatarDeleting(false)
    }
  }

  const handleSave = async () => {
    setInstSaving(true)
    try {
      const res  = await fetch('/api/institutions/my-code', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(instFields),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSaved(true)
      toast.success('Institution settings saved.')
      setTimeout(() => setSaved(false), 2200)
    } catch (err) {
      toast.error(err.message || 'Failed to save institution settings.')
    } finally {
      setInstSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page Header */}
      <div>
        <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 28, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 14, color: '#64748B', marginTop: 6 }}>Manage institution configuration and preferences</p>
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 24, alignItems: isMobile ? 'stretch' : 'flex-start' }}>

        {/* Left Nav */}
        <div style={{
          width: isMobile ? '100%' : 220,
          flexShrink: 0,
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          overflowX: isMobile ? 'auto' : 'visible',
          scrollbarWidth: 'none',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          padding: isMobile ? 6 : 8,
          gap: isMobile ? 2 : 0,
          boxShadow: '0 2px 6px rgba(15,23,42,0.05)',
        }}>
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{
                  width: isMobile ? 'auto' : '100%',
                  minWidth: isMobile ? 68 : undefined,
                  flexShrink: isMobile ? 0 : undefined,
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: 'center',
                  justifyContent: isMobile ? 'center' : 'flex-start',
                  gap: isMobile ? 4 : 12,
                  padding: isMobile ? '6px 8px' : '10px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: active ? '#EFF6FF' : 'transparent',
                  cursor: 'pointer',
                  textAlign: isMobile ? 'center' : 'left',
                  marginBottom: isMobile ? 0 : 2,
                  transition: 'background 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F8FAFC' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: 8, background: active ? '#2563EB' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
                  <Icon size={isMobile ? 13 : 15} style={{ color: active ? '#FFFFFF' : '#94A3B8' }} />
                </div>
                <div style={{ flex: isMobile ? 'none' : 1, minWidth: 0 }}>
                  <p style={{ fontSize: isMobile ? 10 : 13, fontWeight: 600, color: active ? '#2563EB' : '#374151', lineHeight: 1.2, margin: 0 }}>{tab.label}</p>
                  {!isMobile && <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1, marginBottom: 0 }}>{tab.desc}</p>}
                </div>
                {active && !isMobile && <ChevronRight size={13} style={{ color: '#2563EB', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>

        {/* Right Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <AnimatePresence mode="wait">

            {/* ── Institution ── */}
            {activeTab === 'institution' && (
              <motion.div key="institution" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 2px 6px rgba(15,23,42,0.05)', overflow: 'hidden' }}>

                {/* Panel header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid #F1F5F9' }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Institution Profile</h2>
                    <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>Update your school's information and branding</p>
                  </div>
                  <motion.button onClick={handleSave} disabled={instSaving} whileHover={{ scale: 1.02 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, color: '#FFFFFF', background: saved ? '#10B981' : '#2563EB', cursor: instSaving ? 'default' : 'pointer', opacity: instSaving ? 0.7 : 1, transition: 'background 0.2s', boxShadow: saved ? '0 2px 8px rgba(16,185,129,0.30)' : '0 2px 8px rgba(37,99,235,0.28)' }}>
                    {saved ? <><Check size={14} /> Saved!</> : instSaving ? <>Saving…</> : <><Save size={14} /> Save Changes</>}
                  </motion.button>
                </div>

                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>

                  {/* Logo section */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 24px', background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 14 }}>
                    <div style={{ width: 72, height: 72, borderRadius: 18, overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 16px rgba(37,99,235,0.20)', border: '2px solid #E2E8F0' }}>
                      {logoUrl
                        ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 22, color: '#FFFFFF' }}>OC</div>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Institution Logo</p>
                      <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>PNG or JPG. Recommended 256×256px. Max 2MB.</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => logoRef.current?.click()} disabled={logoUploading || logoRemoving}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#374151', cursor: (logoUploading || logoRemoving) ? 'default' : 'pointer', opacity: (logoUploading || logoRemoving) ? 0.7 : 1 }}>
                          {logoUploading
                            ? <><div style={{ width: 12, height: 12, border: '2px solid #E2E8F0', borderTop: '2px solid #2563EB', borderRadius: '50%' }} className="animate-spin" /> Uploading…</>
                            : <><Upload size={13} /> {logoUrl ? 'Change Logo' : 'Upload Logo'}</>
                          }
                        </button>
                        {logoUrl && (
                          <button onClick={handleLogoRemove} disabled={logoRemoving || logoUploading}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: (logoRemoving || logoUploading) ? 'default' : 'pointer', opacity: (logoRemoving || logoUploading) ? 0.7 : 1 }}>
                            {logoRemoving
                              ? <><div style={{ width: 12, height: 12, border: '2px solid #FECACA', borderTop: '2px solid #DC2626', borderRadius: '50%' }} className="animate-spin" /> Removing…</>
                              : <><X size={13} /> Remove</>
                            }
                          </button>
                        )}
                      </div>
                      <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleLogoUpload} />
                    </div>
                  </div>

                  {/* Institution Code — share with students/faculty */}
                  {instCode && (
                    <div style={{ padding: '18px 20px', borderRadius: 14, background: '#EFF6FF', border: '1.5px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1E40AF', margin: '0 0 4px' }}>Institution Code</p>
                        <p style={{ fontSize: 22, fontWeight: 800, color: '#1E3A8A', letterSpacing: '0.12em', fontFamily: 'monospace', margin: 0 }}>{instCode}</p>
                        <p style={{ fontSize: 11.5, color: '#3B82F6', margin: '4px 0 0', lineHeight: 1.5 }}>Share this code with students and faculty so they can join during signup.</p>
                      </div>
                      <button onClick={copyCode}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: 'none',
                          background: codeCopied ? '#10B981' : '#2563EB', color: '#FFFFFF',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                        {codeCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                      </button>
                    </div>
                  )}

                  {/* Basic Info */}
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: 16 }}>Basic Information</p>
                    <div className="rg-2">
                      <FieldGroup label="Institution Name" icon={Building2}>
                        <input type="text" value={instFields.name} onChange={e => setInstFields(f => ({...f, name: e.target.value}))} style={FIELD_STYLE} />
                      </FieldGroup>
                      <FieldGroup label="Institution Type">
                        <select value={instFields.type} onChange={e => setInstFields(f => ({...f, type: e.target.value}))} style={FIELD_STYLE}>
                          <option value="school">School</option><option value="college">College</option><option value="university">University</option><option value="coaching">Coaching Center</option>
                        </select>
                      </FieldGroup>
                      <FieldGroup label="Affiliation Board" icon={Hash}>
                        <input type="text" value={instFields.affiliation} onChange={e => setInstFields(f => ({...f, affiliation: e.target.value}))} style={FIELD_STYLE} />
                      </FieldGroup>
                      <FieldGroup label="Established Year" icon={Calendar}>
                        <input type="text" value={instFields.established_year} maxLength={4}
                          onChange={e => setInstFields(f => ({...f, established_year: e.target.value.replace(/\D/g, '').slice(0, 4)}))}
                          style={FIELD_STYLE} />
                      </FieldGroup>
                      <FieldGroup label="Website" icon={Globe}>
                        <input type="text" value={instFields.website} onChange={e => setInstFields(f => ({...f, website: e.target.value}))} style={FIELD_STYLE} />
                      </FieldGroup>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: 16 }}>Contact Details</p>
                    <div className="rg-2">
                      <FieldGroup label="Email Address" icon={Mail}>
                        <input type="email" value={instFields.email} onChange={e => setInstFields(f => ({...f, email: e.target.value}))} style={FIELD_STYLE} />
                      </FieldGroup>
                      <FieldGroup label="Phone Number" icon={Phone}>
                        <input type="text" value={instFields.phone} onChange={e => setInstFields(f => ({...f, phone: e.target.value}))} style={FIELD_STYLE} />
                      </FieldGroup>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <FieldGroup label="Address" icon={MapPin}>
                        <textarea rows={3} value={instFields.address} onChange={e => setInstFields(f => ({...f, address: e.target.value}))}
                          style={{ ...FIELD_STYLE, resize: 'none' }} />
                      </FieldGroup>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── My Profile ── */}
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 2px 6px rgba(15,23,42,0.05)', overflow: 'hidden' }}>

                <div style={{ padding: '20px 28px', borderBottom: '1px solid #F1F5F9' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>My Profile</h2>
                  <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>Manage your personal photo and account details</p>
                </div>

                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

                  {/* Avatar section */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 24px', background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 14 }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 16px rgba(37,99,235,0.20)', border: '2px solid #E2E8F0' }}>
                      {displayAvatarUrl
                        ? <img src={displayAvatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 22, color: '#FFFFFF' }}>
                            {cu?.email ? cu.email[0].toUpperCase() : 'A'}
                          </div>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Profile Photo</p>
                      <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>PNG or JPG. Max 2MB. Shown in the header dropdown and admin views.</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => avatarRef.current?.click()} disabled={avatarUploading}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#374151', cursor: avatarUploading ? 'default' : 'pointer', opacity: avatarUploading ? 0.7 : 1 }}>
                          {avatarUploading
                            ? <><div style={{ width: 12, height: 12, border: '2px solid #E2E8F0', borderTop: '2px solid #2563EB', borderRadius: '50%' }} className="animate-spin" /> Uploading…</>
                            : <><Upload size={13} /> {displayAvatarUrl ? 'Change Photo' : 'Upload Photo'}</>
                          }
                        </button>
                        {displayAvatarUrl && (
                          <button onClick={handleAvatarDelete} disabled={avatarDeleting}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: avatarDeleting ? 'default' : 'pointer', opacity: avatarDeleting ? 0.7 : 1 }}>
                            {avatarDeleting
                              ? <><div style={{ width: 12, height: 12, border: '2px solid #FECACA', borderTop: '2px solid #DC2626', borderRadius: '50%' }} className="animate-spin" /> Removing…</>
                              : <><Trash2 size={13} /> Remove Photo</>
                            }
                          </button>
                        )}
                      </div>
                      <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                    </div>
                  </div>

                  {/* Account info */}
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8', marginBottom: 16 }}>Account Details</p>
                    <div className="rg-2">
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                          <User size={12} style={{ color: '#94A3B8' }} /> Role
                        </label>
                        <div style={{ ...FIELD_STYLE, background: '#F8FAFC', color: '#64748B' }}>Administrator</div>
                      </div>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                          <Mail size={12} style={{ color: '#94A3B8' }} /> Email
                        </label>
                        <div style={{ ...FIELD_STYLE, background: '#F8FAFC', color: '#64748B' }}>{cu?.email || '—'}</div>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* ── Security ── */}
            {activeTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 2px 6px rgba(15,23,42,0.05)', overflow: 'hidden' }}>

                <div style={{ padding: '20px 28px', borderBottom: '1px solid #F1F5F9' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Security Settings</h2>
                  <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>Control authentication and access policies</p>
                </div>

                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { key: 'twofa',       label: 'Two-Factor Authentication', desc: 'Require OTP on every login for all admin accounts', icon: Shield },
                    { key: 'timeout',     label: 'Session Timeout',           desc: 'Automatically sign out after 30 minutes of inactivity', icon: Lock },
                    { key: 'loginNotif',  label: 'Login Notifications',       desc: 'Receive an email alert on new device logins', icon: Bell },
                    { key: 'ipRestrict', label: 'IP Restriction',            desc: 'Only allow access from whitelisted IP addresses', icon: Globe },
                  ].map(s => {
                    const SIcon = s.icon
                    const on = security[s.key]
                    return (
                      <div key={s.key}
                        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: on ? '#EFF6FF' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <SIcon size={17} style={{ color: on ? '#2563EB' : '#94A3B8' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>{s.label}</p>
                          <p style={{ fontSize: 12, color: '#64748B' }}>{s.desc}</p>
                        </div>
                        {/* Toggle */}
                        <button onClick={() => setSecurity(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                          style={{ width: 44, height: 24, borderRadius: 99, background: on ? '#2563EB' : '#E2E8F0', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                          <div style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: 99, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.18)', transition: 'left 0.2s' }} />
                        </button>
                      </div>
                    )
                  })}

                  {/* Change Password */}
                  <div style={{ marginTop: 8, padding: '20px', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Change Password</p>
                    <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <FieldGroup label="Current Password" icon={Lock}>
                        <input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} placeholder="••••••••" required style={FIELD_STYLE} />
                      </FieldGroup>
                      <div className="rg-2">
                        <FieldGroup label="New Password" icon={Lock}>
                          <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="••••••••" required style={FIELD_STYLE} />
                        </FieldGroup>
                        <FieldGroup label="Confirm Password" icon={Lock}>
                          <input type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)} placeholder="••••••••" required style={FIELD_STYLE} />
                        </FieldGroup>
                      </div>
                      <div>
                        <button type="submit" disabled={pwdBusy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 10, border: 'none', background: '#2563EB', color: '#FFFFFF', cursor: pwdBusy ? 'default' : 'pointer', opacity: pwdBusy ? 0.7 : 1 }}>
                          {pwdBusy
                            ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%' }} className="animate-spin" />
                            : <><Save size={14} /> Update Password</>}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Modules ── */}
            {activeTab === 'modules' && (
              <motion.div key="modules" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 2px 6px rgba(15,23,42,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '20px 28px', borderBottom: '1px solid #F1F5F9' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Module Access</h2>
                  <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>Request access to additional modules for your institution.</p>
                </div>
                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ALL_MODULES.map(m => {
                    const isEnabled = enabledMods === null ? true : enabledMods[m.key] !== false
                    const pendingReq = modReqs.find(r => r.module_key === m.key && r.status === 'pending')
                    const approvedReq = modReqs.find(r => r.module_key === m.key && r.status === 'approved')
                    const rejectedReq = modReqs.find(r => r.module_key === m.key && r.status === 'rejected')
                    const isSubmitting = submittingMod === m.key

                    return (
                      <div key={m.key} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 18px', borderRadius: 12,
                        background: isEnabled ? '#F0FDF4' : '#F8FAFC',
                        border: `1.5px solid ${isEnabled ? '#A7F3D0' : '#E2E8F0'}`,
                      }}>
                        <div>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: isEnabled ? '#065F46' : '#374151' }}>{m.label}</span>
                          {pendingReq && (
                            <p style={{ fontSize: 11.5, color: '#D97706', margin: '3px 0 0', fontWeight: 600 }}>
                              Request pending review
                            </p>
                          )}
                          {rejectedReq && !pendingReq && (
                            <p style={{ fontSize: 11.5, color: '#DC2626', margin: '3px 0 0' }}>
                              Rejected{rejectedReq.rejection_reason ? ` · ${rejectedReq.rejection_reason}` : ''}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {isEnabled ? (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#D1FAE5', color: '#065F46' }}>Enabled</span>
                          ) : pendingReq ? (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#FFFBEB', color: '#D97706' }}>Pending</span>
                          ) : (
                            <button
                              onClick={() => requestModule(m.key)}
                              disabled={isSubmitting}
                              style={{
                                padding: '6px 14px', borderRadius: 8, border: '1.5px solid #2563EB25',
                                background: '#2563EB0f', color: '#2563EB', fontSize: 12, fontWeight: 700,
                                cursor: isSubmitting ? 'default' : 'pointer', fontFamily: 'inherit',
                                opacity: isSubmitting ? 0.7 : 1,
                              }}>
                              {isSubmitting ? 'Requesting…' : 'Request Access'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
