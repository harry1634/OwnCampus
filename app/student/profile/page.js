'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, Phone, Mail, MapPin, User, Save, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react'
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

// Persist profile edits per-user in localStorage
function saveProfile(email, data) {
  if (typeof window === 'undefined' || !email) return
  localStorage.setItem(`oc_profile_${email}`, JSON.stringify(data))
}
function loadProfile(email) {
  if (typeof window === 'undefined' || !email) return null
  try { return JSON.parse(localStorage.getItem(`oc_profile_${email}`)) } catch { return null }
}

export default function StudentProfile() {
  const cu = useCurrentUser()
  const [profile,  setProfile ] = useState(DEFAULTS)
  const [editing,  setEditing ] = useState(false)
  const [pwdOpen,  setPwdOpen ] = useState(false)
  const [curPwd,   setCurPwd  ] = useState('')
  const [newPwd,   setNewPwd  ] = useState('')
  const [confPwd,  setConfPwd ] = useState('')
  const [showCur,  setShowCur ] = useState(false)
  const [showNew,  setShowNew ] = useState(false)
  const [pwdBusy,  setPwdBusy ] = useState(false)

  async function handleChangePassword(e) {
    e.preventDefault()
    if (newPwd.length < 8)  { toast.error('New password must be at least 8 characters.'); return }
    if (newPwd !== confPwd) { toast.error('Passwords do not match.'); return }
    setPwdBusy(true)
    try {
      const supabase = createClient()
      // Re-authenticate with current password first
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

  // Once the user data is available, seed the profile
  useEffect(() => {
    if (!cu.mounted) return
    const saved = loadProfile(cu.email)
    if (saved) {
      setProfile(saved)
      return
    }
    // First time: build from localStorage keys
    const classParts = cu.classSection ? cu.classSection.split('-') : []
    setProfile(p => ({
      ...p,
      name:    cu.name  || '',
      email:   cu.email || '',
      class:   classParts[0] || '',
      section: classParts[1] || '',
      rollNo:  cu.roll  || '',
    }))
  }, [cu.mounted])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>My Profile</h1>
        {editing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditing(false)} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer' }}>Cancel</button>
            <motion.button whileHover={{ scale: 1.02 }} onClick={() => { saveProfile(cu.email, profile); setEditing(false); toast.success('Profile saved!') }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#4C1D95,#7C3AED)', color: '#FFFFFF', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Save size={14} /> Save
            </motion.button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #DDD6FE', background: '#F5F3FF', fontSize: 13, fontWeight: 600, color: '#7C3AED', cursor: 'pointer' }}>Edit Profile</button>
        )}
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#4C1D95,#7C3AED)', borderRadius: 20, padding: '26px 30px', display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 84, height: 84, borderRadius: 20, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#FFFFFF', border: '3px solid rgba(255,255,255,0.32)', boxShadow: '0 0 0 5px rgba(255,255,255,0.07)' }}>
            {profile.name ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2) : cu.initials || 'S'}
          </div>
          <div style={{ position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 7, background: '#10B981', border: '2px solid #5B21B6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={11} color="white" />
          </div>
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
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 20px', borderRadius: 11, background: 'linear-gradient(135deg,#4C1D95,#7C3AED)', color: '#FFF', border: 'none', fontSize: 13.5, fontWeight: 700, cursor: pwdBusy ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 2 }}>
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
