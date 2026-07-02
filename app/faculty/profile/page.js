'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, BookOpen, Award, Save, Camera, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react'
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
  const [editing,       setEditing      ] = useState(false)
  const [saving,        setSaving       ] = useState(false)
  const [avatarUrl,     setAvatarUrl    ] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoRef = useRef(null)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [curPwd,  setCurPwd ] = useState('')
  const [newPwd,  setNewPwd ] = useState('')
  const [confPwd, setConfPwd] = useState('')
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwdBusy, setPwdBusy] = useState(false)

  useEffect(() => {
    if (!cu.mounted || !cu.userId) return
    const supabase = createClient()

    supabase
      .from('user_profiles')
      .select('first_name, last_name, email, phone, avatar_url, metadata')
      .eq('id', cu.userId)
      .single()
      .then(({ data: up }) => {
        if (!up) return
        const meta = up.metadata || {}
        setAvatarUrl(up.avatar_url || null)
        setProfile(p => ({
          ...p,
          name:  [up.first_name, up.last_name].filter(Boolean).join(' '),
          email: up.email || cu.email || '',
          phone: up.phone || '',
          empId: meta.employee_id || '',
          dept:  meta.department || cu.dept || '',
        }))
      })

    supabase
      .from('faculty')
      .select('designation, joining_date, qualification, experience_years, subjects_teaching')
      .eq('user_id', cu.userId)
      .single()
      .then(({ data: f }) => {
        if (!f) return
        setProfile(p => ({
          ...p,
          designation:   f.designation    || cu.designation || '',
          doj:           f.joining_date   || '',
          qualification: f.qualification  || '',
          exp:           f.experience_years != null ? String(f.experience_years) : '',
          subjects:      Array.isArray(f.subjects_teaching) ? f.subjects_teaching.join(', ') : (f.subjects_teaching || ''),
        }))
      })
  }, [cu.mounted, cu.userId])

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB.'); return }
    setPhotoUploading(true)
    try {
      const ext  = file.name.split('.').pop().toLowerCase()
      const path = `avatars/${cu.userId}/${Date.now()}.${ext}`
      const fd = new FormData()
      fd.append('file', file)
      fd.append('path', path)
      const res = await fetch('/api/upload/photo', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      const supabase = createClient()
      await supabase.from('user_profiles').update({ avatar_url: json.url }).eq('id', cu.userId)
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
    if (!cu.userId) return
    setSaving(true)
    try {
      const supabase = createClient()
      const parts     = profile.name.trim().split(' ')
      const firstName = parts[0] || ''
      const lastName  = parts.slice(1).join(' ') || ''

      const { error: upErr } = await supabase
        .from('user_profiles')
        .update({
          first_name:  firstName,
          last_name:   lastName,
          phone:       profile.phone  || null,
          metadata:    { employee_id: profile.empId || null, department: profile.dept, designation: profile.designation, classes_assigned: profile.classes },
        })
        .eq('id', cu.userId)
      if (upErr) throw upErr

      const subjects = profile.subjects
        ? profile.subjects.split(',').map(s => s.trim()).filter(Boolean)
        : []

      const { error: fErr } = await supabase
        .from('faculty')
        .update({
          designation:      profile.designation  || null,
          joining_date:     profile.doj          || null,
          qualification:    profile.qualification || null,
          experience_years: parseInt(profile.exp) || 0,
          subjects_teaching: subjects,
        })
        .eq('user_id', cu.userId)
      if (fErr) throw fErr

      // Keep localStorage in sync so sidebar & useCurrentUser see updated values immediately
      if (profile.name)        localStorage.setItem('oc_user_name',  profile.name)
      if (profile.dept)        localStorage.setItem('oc_user_dept',  profile.dept)
      if (profile.designation) localStorage.setItem('oc_user_desig', profile.designation)

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
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: cu.email, password: curPwd })
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
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#065F46,#059669)', color: '#FFFFFF', border: 'none', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.75 : 1 }}>
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
      <div style={{ background: 'linear-gradient(135deg,#065F46,#059669)', borderRadius: 20, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#FFFFFF', border: '3px solid rgba(255,255,255,0.3)' }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (profile.name ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'FA')
            }
          </div>
          {editing && (
            <button onClick={() => photoRef.current?.click()} disabled={photoUploading}
              style={{ position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, borderRadius: 8, background: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: photoUploading ? 'default' : 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', opacity: photoUploading ? 0.6 : 1 }}>
              <Camera size={12} color="#059669" />
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
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 20px', borderRadius: 11, background: 'linear-gradient(135deg,#065F46,#059669)', color: '#FFF', border: 'none', fontSize: 13.5, fontWeight: 700, cursor: pwdBusy ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 2 }}>
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
