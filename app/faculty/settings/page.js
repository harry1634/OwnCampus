'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Bell, Save, Check, Lock, Eye, EyeOff,
  Globe, Mail, Smartphone, BookOpen, CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const TABS = [
  { key: 'security',     label: 'Security',      icon: Shield, desc: 'Password & access' },
  { key: 'notifications',label: 'Notifications', icon: Bell,   desc: 'Alert preferences'  },
]

const FIELD_STYLE = {
  width: '100%', padding: '10px 14px', fontSize: 13,
  color: '#0F172A', background: '#FFFFFF', border: '1px solid #E2E8F0',
  borderRadius: 10, outline: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
}

export default function FacultySettings() {
  const [activeTab, setActiveTab] = useState('security')
  const [isMobile,  setIsMobile ] = useState(false)

  // Security state
  const [curPwd,   setCurPwd  ] = useState('')
  const [newPwd,   setNewPwd  ] = useState('')
  const [confPwd,  setConfPwd ] = useState('')
  const [showCur,  setShowCur ] = useState(false)
  const [showNew,  setShowNew ] = useState(false)
  const [pwdBusy,  setPwdBusy ] = useState(false)
  const [security, setSecurity] = useState({
    sessionTimeout: true,
    loginNotif:     true,
    twofa:          false,
  })

  // Notifications state
  const [notifs, setNotifs] = useState({
    timetableChanges:   true,
    attendanceReminder: true,
    leaveStatus:        true,
    examSchedule:       true,
    announcements:      true,
    systemUpdates:      false,
  })

  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved,  setNotifSaved ] = useState(false)

  // Load notification preferences from DB on mount
  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(p => {
        const prefs = p?.metadata?.notif_prefs
        if (prefs && typeof prefs === 'object') {
          setNotifs(prev => ({ ...prev, ...prefs }))
        }
      })
      .catch(() => {})
  }, [])

  async function handleSaveNotifs() {
    setNotifSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { notif_prefs: notifs } }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setNotifSaved(true)
      setTimeout(() => setNotifSaved(false), 2000)
    } catch {
      toast.error('Failed to save notification preferences.')
    } finally {
      setNotifSaving(false)
    }
  }

  const [isMobileLayout, setIsMobileLayout] = useState(false)
  useState(() => {
    if (typeof window === 'undefined') return
    const check = () => setIsMobileLayout(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  })

  async function handleChangePassword(e) {
    e.preventDefault()
    if (newPwd.length < 8)  { toast.error('New password must be at least 8 characters.'); return }
    if (newPwd !== confPwd) { toast.error('Passwords do not match.'); return }
    setPwdBusy(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated.')
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: curPwd })
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

  function toggleSecurity(key) { setSecurity(p => ({ ...p, [key]: !p[key] })) }
  function toggleNotif(key)    { setNotifs(p => ({ ...p, [key]: !p[key] })) }

  const Toggle = ({ on, onToggle }) => (
    <button onClick={onToggle}
      style={{ width: 44, height: 24, borderRadius: 99, background: on ? '#059669' : '#E2E8F0', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: 99, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.18)', transition: 'left 0.2s' }} />
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: 28, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 14, color: '#64748B', marginTop: 6 }}>Manage your account preferences</p>
      </div>

      <div style={{ display: 'flex', flexDirection: isMobileLayout ? 'column' : 'row', gap: isMobileLayout ? 12 : 24, alignItems: isMobileLayout ? 'stretch' : 'flex-start' }}>

        {/* Sidebar tabs */}
        <div style={{
          width: isMobileLayout ? '100%' : 200, flexShrink: 0,
          display: 'flex', flexDirection: isMobileLayout ? 'row' : 'column',
          overflowX: isMobileLayout ? 'auto' : 'visible', scrollbarWidth: 'none',
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16,
          padding: isMobileLayout ? 6 : 8, gap: isMobileLayout ? 2 : 0,
          boxShadow: '0 2px 6px rgba(15,23,42,0.05)',
        }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{
                  width: isMobileLayout ? 'auto' : '100%', minWidth: isMobileLayout ? 72 : undefined,
                  flexShrink: isMobileLayout ? 0 : undefined,
                  display: 'flex', flexDirection: isMobileLayout ? 'column' : 'row',
                  alignItems: 'center', justifyContent: isMobileLayout ? 'center' : 'flex-start',
                  gap: isMobileLayout ? 4 : 12,
                  padding: isMobileLayout ? '6px 8px' : '10px 12px',
                  borderRadius: 10, border: 'none',
                  background: active ? '#ECFDF5' : 'transparent',
                  cursor: 'pointer', textAlign: isMobileLayout ? 'center' : 'left',
                  marginBottom: isMobileLayout ? 0 : 2, fontFamily: 'inherit', transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F8FAFC' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ width: isMobileLayout ? 28 : 32, height: isMobileLayout ? 28 : 32, borderRadius: 8, background: active ? '#059669' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }}>
                  <Icon size={isMobileLayout ? 13 : 15} style={{ color: active ? '#FFFFFF' : '#94A3B8' }} />
                </div>
                <div style={{ flex: isMobileLayout ? 'none' : 1 }}>
                  <p style={{ fontSize: isMobileLayout ? 10 : 13, fontWeight: 600, color: active ? '#059669' : '#374151', lineHeight: 1.2, margin: 0 }}>{tab.label}</p>
                  {!isMobileLayout && <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1, marginBottom: 0 }}>{tab.desc}</p>}
                </div>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <AnimatePresence mode="wait">

            {/* ── Security ── */}
            {activeTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Security toggles */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 2px 6px rgba(15,23,42,0.05)', overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Access & Security</h2>
                    <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>Control how you access your account</p>
                  </div>
                  <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { key: 'sessionTimeout', label: 'Session Timeout', desc: 'Auto sign-out after 30 minutes of inactivity', icon: Lock },
                      { key: 'loginNotif',     label: 'Login Alerts',    desc: 'Get notified by email on new device logins',    icon: Mail },
                      { key: 'twofa',          label: 'Two-Factor Auth', desc: 'Extra verification step when signing in',        icon: Smartphone },
                    ].map(s => {
                      const SIcon = s.icon
                      const on = security[s.key]
                      return (
                        <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: on ? '#ECFDF5' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <SIcon size={16} style={{ color: on ? '#059669' : '#94A3B8' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{s.label}</p>
                            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{s.desc}</p>
                          </div>
                          <Toggle on={on} onToggle={() => toggleSecurity(s.key)} />
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Change Password */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 2px 6px rgba(15,23,42,0.05)', overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9' }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Change Password</h2>
                    <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>Update your account password</p>
                  </div>
                  <div style={{ padding: '20px 24px' }}>
                    <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[
                        { label: 'Current Password', val: curPwd, set: setCurPwd, show: showCur, toggle: () => setShowCur(v => !v) },
                        { label: 'New Password',      val: newPwd, set: setNewPwd, show: showNew, toggle: () => setShowNew(v => !v) },
                        { label: 'Confirm Password',  val: confPwd,set: setConfPwd,show: showNew, toggle: () => setShowNew(v => !v) },
                      ].map(({ label, val, set, show, toggle }) => (
                        <div key={label}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
                          <div style={{ position: 'relative' }}>
                            <input type={show ? 'text' : 'password'} value={val} onChange={e => set(e.target.value)} required
                              style={{ ...FIELD_STYLE, paddingRight: 42 }} placeholder="••••••••" />
                            <button type="button" onClick={toggle}
                              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 0 }}>
                              {show ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>
                      ))}
                      <div style={{ paddingTop: 4 }}>
                        <button type="submit" disabled={pwdBusy}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: pwdBusy ? '#94A3B8' : '#059669', color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: pwdBusy ? 'default' : 'pointer', fontFamily: 'inherit' }}>
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

            {/* ── Notifications ── */}
            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
                style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 2px 6px rgba(15,23,42,0.05)', overflow: 'hidden' }}>

                <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9' }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Notification Preferences</h2>
                  <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>Choose which alerts you want to receive</p>
                </div>

                <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { key: 'timetableChanges',   label: 'Timetable Changes',    desc: 'When your class schedule is updated',       icon: BookOpen   },
                    { key: 'attendanceReminder',  label: 'Attendance Reminder',  desc: 'Daily reminder to mark class attendance',    icon: CheckCircle},
                    { key: 'leaveStatus',         label: 'Leave Status Updates', desc: 'When your leave request is approved or denied', icon: Bell    },
                    { key: 'examSchedule',        label: 'Exam Schedule',        desc: 'Upcoming exam and invigilation alerts',      icon: BookOpen   },
                    { key: 'announcements',       label: 'Announcements',        desc: 'School-wide notices and circulars',          icon: Bell       },
                    { key: 'systemUpdates',       label: 'System Updates',       desc: 'Platform maintenance and feature updates',   icon: Globe      },
                  ].map(n => {
                    const NIcon = n.icon
                    const on = notifs[n.key]
                    return (
                      <div key={n.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: on ? '#ECFDF5' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <NIcon size={16} style={{ color: on ? '#059669' : '#94A3B8' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{n.label}</p>
                          <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{n.desc}</p>
                        </div>
                        <Toggle on={on} onToggle={() => toggleNotif(n.key)} />
                      </div>
                    )
                  })}
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleSaveNotifs} disabled={notifSaving}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: notifSaved ? '#059669' : notifSaving ? '#94A3B8' : '#059669', color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: notifSaving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                    {notifSaving ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%' }} className="animate-spin" />
                      : notifSaved ? <><Check size={14} /> Saved!</>
                      : <><Save size={14} /> Save Preferences</>}
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
