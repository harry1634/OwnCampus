'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, BookOpen, Award, Save, Camera, Trash2, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { createClient } from '@/lib/supabase/client'

export default function FacultyProfile() {
  const cu = useCurrentUser()
  const [profile, setProfile] = useState({
    name: '', empId: '', dept: '', designation: '',
    email: '', phone: '',
    doj: '', exp: '', qualification: '',
    subjects: '', classes: '',
  })
  const [editing,        setEditing       ] = useState(false)
  const [saving,         setSaving        ] = useState(false)
  const [avatarUrl,      setAvatarUrl     ] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoRef = useRef(null)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [curPwd,  setCurPwd ] = useState('')
  const [newPwd,  setNewPwd ] = useState('')
  const [confPwd, setConfPwd] = useState('')
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwdBusy, setPwdBusy] = useState(false)

  // Load profile via API — uses server auth + admin client, no RLS issues
  function applyProfileData(data) {
    const meta = data.metadata || {}
    const fac  = data.faculty  || {}
    setAvatarUrl(data.avatar_url || null)
    setProfile(p => ({
      ...p,
      name:          data.name  || '',
      email:         data.email || '',
      phone:         data.phone || '',
      empId:         fac.employee_code  || meta.employee_id  || '',
      dept:          fac.department     || meta.department    || '',
      designation:   fac.designation    || meta.designation   || '',
      doj:           fac.joining_date   || '',
      qualification: fac.qualification  || '',
      exp:           fac.experience_years != null ? String(fac.experience_years) : '',
      subjects:      Array.isArray(fac.subjects_teaching) ? fac.subjects_teaching.join(', ') : (fac.subjects_teaching || ''),
      classes:       meta.classes_assigned || '',
    }))
  }

  function loadProfile() {
    fetch('/api/profile', { cache: 'no-store' })
      .then(r => {
        if (!r.ok) {
          r.json().then(j => toast.error(`Load failed (${r.status}): ${j?.error || 'Unknown error'}`)).catch(() => toast.error(`Failed to load profile (${r.status})`))
          return null
        }
        return r.json()
      })
      .then(data => { if (data) applyProfileData(data) })
      .catch(err => toast.error(`Network error: ${err.message}`))
  }

  useEffect(() => { loadProfile() }, [])

  async function handleDeletePhoto() {
    if (!cu.userId || (!avatarUrl && !cu.avatarUrl)) return
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: null }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setAvatarUrl(null)
      toast.success('Photo removed.')
    } catch (err) {
      toast.error(err.message || 'Failed to remove photo.')
    }
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB.'); return }
    if (!cu.userId) { toast.error('Not authenticated.'); return }
    setPhotoUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      // API enforces safe path server-side — no need to send path
      const res = await fetch('/api/upload/photo', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      // API already saved avatar_url to DB via admin client — just update local state
      setAvatarUrl(json.url)
      toast.success('Photo updated!')
    } catch (err) {
      toast.error(err.message || 'Upload failed.')
    } finally {
      setPhotoUploading(false)
      e.target.value = ''
    }
  }

  const handleSave = async () => {
    if (!cu.userId) {
      toast.error('Session not ready — please refresh the page.')
      return
    }
    setSaving(true)
    try {
      const parts     = profile.name.trim().split(' ')
      const firstName = parts[0] || ''
      const lastName  = parts.slice(1).join(' ') || ''
      const subjects  = profile.subjects
        ? profile.subjects.split(',').map(s => s.trim()).filter(Boolean)
        : []

      const body = {
        first_name: firstName,
        last_name:  lastName,
        faculty_data: {
          employee_code:     profile.empId        || null,
          department:        profile.dept         || null,
          designation:       profile.designation  || null,
          joining_date:      profile.doj          || null,
          qualification:     profile.qualification || null,
          experience_years:  parseInt(profile.exp) || 0,
          subjects_teaching: subjects,
        },
        // classes_assigned has no DB column — persist in metadata
        metadata: {
          classes_assigned: profile.classes || null,
        },
      }
      // Only include phone if user actually filled it in — avoid nulling it out
      if (profile.phone !== undefined) body.phone = profile.phone || null

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Save failed')

      // API returns full confirmed profile — apply it directly
      if (json.profile) applyProfileData(json.profile)

      setEditing(false)
      toast.success('Profile updated successfully!')
    } catch (err) {
      toast.error(err.message || 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (newPwd.length < 8)  { toast.error('New password must be at least 8 characters.'); return }
    if (newPwd !== confPwd) { toast.error('Passwords do not match.'); return }
    setPwdBusy(true)
    try {
      const supabase = createClient()
      const email = cu.email || profile.email
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: curPwd })
      if (signInErr) { toast.error('Current password is incorrect.'); return }
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      toast.success('Password changed successfully!')
      setCurPwd(''); setNewPwd(''); setConfPwd(''); setPwdOpen(false)
    } catch (err) {
      toast.error(err.message || 'Failed to change password.')
    } finally {
      setPwdBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>My Profile</h1>
        {editing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditing(false)} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer' }}>Cancel</button>
            <motion.button whileHover={{ scale: saving ? 1 : 1.02 }} onClick={handleSave} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: '#16A34A', color: '#FFFFFF', border: 'none', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.75 : 1 }}>
              {saving
                ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%' }} className="animate-spin" />
                : <Save size={14} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </motion.button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #A7F3D0', background: '#ECFDF5', fontSize: 13, fontWeight: 600, color: '#059669', cursor: 'pointer' }}>Edit Profile</button>
        )}
      </div>

      {/* Avatar + basic info */}
      <div style={{ background: '#16A34A', borderRadius: 20, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#FFFFFF', border: '3px solid rgba(255,255,255,0.3)' }}>
            {(avatarUrl || cu.avatarUrl)
              ? <img src={avatarUrl || cu.avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (profile.name ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'FA')
            }
          </div>
          {/* Camera upload — always visible */}
          <button onClick={() => photoRef.current?.click()} disabled={photoUploading}
            style={{ position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, borderRadius: 8, background: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: photoUploading ? 'default' : 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', opacity: photoUploading ? 0.6 : 1 }}>
            {photoUploading
              ? <div style={{ width: 12, height: 12, border: '2px solid rgba(5,150,105,0.3)', borderTop: '2px solid #059669', borderRadius: '50%' }} className="animate-spin" />
              : <Camera size={12} color="#059669" />}
          </button>
          {/* Delete — when any photo is visible */}
          {(avatarUrl || cu.avatarUrl) && (
            <button onClick={handleDeletePhoto}
              style={{ position: 'absolute', bottom: -4, left: -4, width: 26, height: 26, borderRadius: 8, background: '#FEF2F2', border: '1.5px solid #FCA5A5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
              <Trash2 size={11} color="#EF4444" />
            </button>
          )}
          <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoChange} />
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>{profile.name || 'Faculty'}</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '0 0 8px' }}>
            {[profile.designation, profile.dept].filter(Boolean).join(' · ') || 'Faculty Member'}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {profile.empId && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.15)', color: '#FFFFFF' }}>ID: {profile.empId}</span>}
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(74,222,128,0.25)', color: '#FFFFFF' }}>Active</span>
          </div>
        </div>
      </div>

      {/* Details card */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>Contact & Professional Information</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {[
            { label: 'Full Name',        key: 'name',          icon: User    },
            { label: 'Email Address',    key: 'email',         icon: Mail    },
            { label: 'Phone Number',     key: 'phone',         icon: Phone   },
            { label: 'Department',       key: 'dept',          icon: BookOpen},
            { label: 'Designation',      key: 'designation',   icon: Award   },
            { label: 'Qualification',    key: 'qualification', icon: Award   },
            { label: 'Date of Joining',  key: 'doj',           icon: null    },
            { label: 'Experience',       key: 'exp',           icon: null    },
            { label: 'Subjects',         key: 'subjects',      icon: BookOpen},
            { label: 'Classes Assigned', key: 'classes',       icon: null    },
          ].map(({ label, key }, i) => (
            <div key={key} style={{ padding: '16px 24px', borderBottom: '1px solid #F8FAFC', borderRight: i % 2 === 0 ? '1px solid #F8FAFC' : 'none' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
              {editing ? (
                <input value={profile[key]} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 9, border: '1.5px solid #A7F3D0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', background: '#F0FDF4', boxSizing: 'border-box' }} />
              ) : (
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', margin: 0 }}>{profile[key] || '—'}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Change Password */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <button onClick={() => setPwdOpen(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', background: '#F8FAFC', border: 'none', cursor: 'pointer', borderBottom: pwdOpen ? '1px solid #E2E8F0' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <KeyRound size={16} color="#059669" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Change Password</span>
          </div>
          <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{pwdOpen ? 'Close ▲' : 'Open ▼'}</span>
        </button>
        {pwdOpen && (
          <form onSubmit={handleChangePassword} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Current Password',     val: curPwd,  set: setCurPwd,  show: showCur, toggle: () => setShowCur(v => !v) },
              { label: 'New Password',          val: newPwd,  set: setNewPwd,  show: showNew, toggle: () => setShowNew(v => !v) },
              { label: 'Confirm New Password',  val: confPwd, set: setConfPwd, show: showNew, toggle: () => setShowNew(v => !v) },
            ].map(({ label, val, set, show, toggle }) => (
              <div key={label}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
                <div style={{ position: 'relative' }}>
                  <input type={show ? 'text' : 'password'} value={val} onChange={e => set(e.target.value)} required
                    style={{ width: '100%', padding: '10px 42px 10px 12px', borderRadius: 10, border: '1.5px solid #A7F3D0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', background: '#F0FDF4', boxSizing: 'border-box' }} />
                  <button type="button" onClick={toggle}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
            <motion.button type="submit" disabled={pwdBusy} whileHover={{ scale: pwdBusy ? 1 : 1.015 }} whileTap={{ scale: pwdBusy ? 1 : 0.985 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 20px', borderRadius: 11, background: '#16A34A', color: '#FFF', border: 'none', fontSize: 13.5, fontWeight: 700, cursor: pwdBusy ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 2 }}>
              {pwdBusy
                ? <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%' }} className="animate-spin" />
                : <><CheckCircle size={15} /> Update Password</>}
            </motion.button>
          </form>
        )}
      </div>
    </div>
  )
}
