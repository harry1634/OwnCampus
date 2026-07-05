'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, Mail, Save, KeyRound, Eye, EyeOff, CheckCircle, Camera, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { createClient } from '@/lib/supabase/client'

const DEFAULTS = {
  name: '', rollNo: '', class: '', section: '',
  dob: '', blood: '', gender: '',
  email: '', phone: '',
  address: '',
  parentName: '', parentPhone: '',
  branch: '', admission: '',
  house: '',
}


export default function StudentProfile() {
  const cu = useCurrentUser()
  const [profile,        setProfile       ] = useState(DEFAULTS)
  const [editing,        setEditing       ] = useState(false)
  const [pwdOpen,        setPwdOpen       ] = useState(false)
  const [curPwd,         setCurPwd        ] = useState('')
  const [newPwd,         setNewPwd        ] = useState('')
  const [confPwd,        setConfPwd       ] = useState('')
  const [showCur,        setShowCur       ] = useState(false)
  const [showNew,        setShowNew       ] = useState(false)
  const [pwdBusy,        setPwdBusy       ] = useState(false)
  const [saving,         setSaving        ] = useState(false)
  const [avatarUrl,      setAvatarUrl     ] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoRef = useRef(null)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name:    profile.name.split(' ')[0] || '',
          last_name:     profile.name.split(' ').slice(1).join(' ') || '',
          phone:         profile.phone    || null,
          // Personal fields — written to user_profiles proper columns
          date_of_birth: profile.dob     || null,
          blood_group:   profile.blood   || null,
          gender:        profile.gender  || null,
          address:       profile.address || null,
          // Parent fields — written to students table
          parent_name:   profile.parentName  || null,
          parent_phone:  profile.parentPhone || null,
          // Only truly orphaned fields (no DB column) go to metadata
          metadata: {
            house: profile.house || null,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Save failed')

      // API returns full confirmed profile — apply it directly
      if (json.profile) applyProfileData(json.profile)

      setEditing(false)
      toast.success('Profile saved!')
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
      const userEmail = cu.email
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: userEmail, password: curPwd })
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

  async function handleDeletePhoto() {
    if (!cu.userId || !avatarUrl) return
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
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5 MB.'); return }
    if (!cu.userId) { toast.error('Not authenticated.'); return }
    setPhotoUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      // API enforces safe path server-side
      const res  = await fetch('/api/upload/photo', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed.')
      // API already saved avatar_url to DB — just update local state
      setAvatarUrl(json.url)
      toast.success('Photo updated!')
    } catch (err) {
      toast.error(err.message || 'Failed to upload photo.')
    } finally {
      setPhotoUploading(false)
      if (photoRef.current) photoRef.current.value = ''
    }
  }

  function applyProfileData(data) {
    const meta = data.metadata || {}
    const stu  = data.student  || {}
    if (data.avatar_url !== undefined) setAvatarUrl(data.avatar_url || null)
    setProfile(p => ({
      ...p,
      name:        data.name  || '',
      email:       data.email || '',
      phone:       data.phone || '',
      // Personal fields — now in user_profiles proper columns; fall back to metadata for existing data
      dob:         data.date_of_birth || meta.dob         || '',
      blood:       data.blood_group   || meta.blood_group  || '',
      gender:      data.gender        || meta.gender       || '',
      address:     data.address       || meta.address      || '',
      // Student fields — from students table; fall back to metadata for existing data
      parentName:  stu.parent_name    || meta.parent_name  || '',
      parentPhone: stu.parent_phone   || meta.parent_phone || '',
      class:       stu.class_name     || meta.class        || '',
      section:     stu.class_name     ? ''  : (meta.section || ''),
      rollNo:      stu.roll_number    || meta.roll_no      || '',
      branch:      stu.branch         || data.branch       || meta.branch || '',
      house:       meta.house         || '',
      admission:   stu.admission_date || meta.admission_date || '',
    }))
  }

  // Load profile via API — uses server auth + admin client, no RLS issues
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>My Profile</h1>
        {editing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditing(false)} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer' }}>Cancel</button>
            <motion.button whileHover={{ scale: saving ? 1 : 1.02 }} onClick={handleSave} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: '#7C3AED', color: '#FFFFFF', border: 'none', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.75 : 1 }}>
              {saving
                ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%' }} className="animate-spin" />
                : <Save size={14} />}
              {saving ? 'Saving…' : 'Save'}
            </motion.button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #DDD6FE', background: '#F5F3FF', fontSize: 13, fontWeight: 600, color: '#7C3AED', cursor: 'pointer' }}>Edit Profile</button>
        )}
      </div>

      {/* Hero */}
      <div style={{ background: '#7C3AED', borderRadius: 20, padding: '26px 30px', display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 84, height: 84, borderRadius: 20, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#FFFFFF', border: '3px solid rgba(255,255,255,0.32)', boxShadow: '0 0 0 5px rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            {(avatarUrl || cu.avatarUrl)
              ? <img src={avatarUrl || cu.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (profile.name ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2) : cu.initials || 'S')
            }
          </div>
          {/* Camera upload button */}
          <button onClick={() => photoRef.current?.click()} disabled={photoUploading}
            style={{ position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, borderRadius: 8, background: photoUploading ? '#94A3B8' : '#7C3AED', border: '2px solid #5B21B6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: photoUploading ? 'default' : 'pointer', padding: 0 }}>
            {photoUploading
              ? <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%' }} className="animate-spin" />
              : <Camera size={12} color="white" />}
          </button>
          {/* Delete — only when a photo exists */}
          {avatarUrl && (
            <button onClick={handleDeletePhoto}
              style={{ position: 'absolute', bottom: -4, left: -4, width: 26, height: 26, borderRadius: 8, background: '#FEF2F2', border: '2px solid #FCA5A5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
              <Trash2 size={11} color="#EF4444" />
            </button>
          )}
          <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', marginBottom: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.78)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Student</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>{profile.name || cu.name}</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', margin: '0 0 10px' }}>
            {profile.class ? `Class ${profile.class}${profile.section ? '-' + profile.section : ''}` : cu.classSection ? `Class ${cu.classSection}` : ''}
            {profile.rollNo ? ` · Roll ${profile.rollNo}` : ''}
            {profile.branch ? ` · ${profile.branch}` : ''}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {profile.blood ? <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(239,68,68,0.22)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.28)' }}>{profile.blood}</span> : null}
            {profile.gender ? <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}>{profile.gender}</span> : null}
            {profile.house ? <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(251,191,36,0.18)', color: '#FDE68A', border: '1px solid rgba(251,191,36,0.22)' }}>{profile.house}</span> : null}
            {(profile.email || cu.email) ? <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={10} />{profile.email || cu.email}</span> : null}
          </div>
        </div>
      </div>

      {/* Details */}
      {[
        {
          title: 'Personal Information',
          fields: [
            ['Full Name', 'name'], ['Date of Birth', 'dob'], ['Gender', 'gender'], ['Blood Group', 'blood'],
            ['Email', 'email'], ['Phone', 'phone'],
          ]
        },
        {
          title: 'Academic Information',
          fields: [
            ['Class', 'class'], ['Section', 'section'], ['Branch', 'branch'], ['Admission Date', 'admission'],
            ['Roll Number', 'rollNo'], ['House', 'house'],
          ]
        },
        {
          title: 'Parent / Guardian',
          fields: [
            ['Parent Name', 'parentName'], ['Parent Phone', 'parentPhone'],
          ]
        },
        {
          title: 'Address',
          fields: [['Address', 'address']],
        },
      ].map(section => (
        <div key={section.title} style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>{section.title}</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 0 }}>
            {section.fields.map(([label, key], i) => (
              <div key={key} style={{ padding: '14px 22px', borderBottom: '1px solid #F8FAFC', borderRight: i % 2 === 0 ? '1px solid #F8FAFC' : 'none' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
                {editing ? (
                  <input value={profile[key]} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 9, border: '1.5px solid #DDD6FE', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', background: '#F5F3FF', boxSizing: 'border-box' }} />
                ) : (
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', margin: 0 }}>{profile[key]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Change Password */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <button onClick={() => setPwdOpen(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', background: '#F8FAFC', border: 'none', cursor: 'pointer', borderBottom: pwdOpen ? '1px solid #E2E8F0' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <KeyRound size={16} color="#7C3AED" />
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
                    style={{ width: '100%', padding: '10px 42px 10px 12px', borderRadius: 10, border: '1.5px solid #DDD6FE', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', background: '#F5F3FF', boxSizing: 'border-box' }} />
                  <button type="button" onClick={toggle}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}
            <motion.button type="submit" disabled={pwdBusy} whileHover={{ scale: pwdBusy ? 1 : 1.015 }} whileTap={{ scale: pwdBusy ? 1 : 0.985 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 20px', borderRadius: 11, background: '#7C3AED', color: '#FFF', border: 'none', fontSize: 13.5, fontWeight: 700, cursor: pwdBusy ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 2 }}>
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
