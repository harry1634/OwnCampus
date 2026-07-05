'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, GraduationCap, ArrowRight, Shield,
  Users, BarChart3, BookOpen, Bell, CheckCircle,
  Building2, ChevronLeft, ChevronRight, User, Mail,
  Phone, Globe, Lock, Sparkles, Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const INSTITUTION_TYPES = ['School', 'College', 'University', 'Coaching Institute', 'Training Centre', 'Other']
const INSTITUTION_SIZES = ['< 100 students', '100 – 500', '500 – 2,000', '2,000 – 10,000', '10,000+']

const features = [
  { icon: Users,     title: 'Student Management',  desc: 'Admissions, attendance & grades — unified' },
  { icon: BarChart3, title: 'Real-time Analytics', desc: 'Live dashboards, fee collection & reports'  },
  { icon: BookOpen,  title: 'LMS & Examinations',  desc: 'Course delivery, scheduling & results'      },
  { icon: Bell,      title: 'Smart Notifications', desc: 'WhatsApp, SMS & email built-in'             },
]

const STEPS = [
  { id: 1, label: 'Institution' },
  { id: 2, label: 'Admin Account' },
  { id: 3, label: 'Done' },
]

const ACCENT = '#4F46E5'
const ACCENT_LIGHT = '#EEF2FF'
const ACCENT_BORDER = '#C7D2FE'

export default function SignupPage() {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(null)
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [inst, setInst] = useState({
    name: '', type: '', size: '', phone: '', website: '',
  })
  const [admin, setAdmin] = useState({
    firstName: '', lastName: '', email: '', password: '', confirm: '',
  })

  const setI = (k) => (e) => setInst(p => ({ ...p, [k]: e.target.value }))
  const setA = (k) => (e) => setAdmin(p => ({ ...p, [k]: e.target.value }))

  const inputStyle = (field) => ({
    width: '100%', height: 46, padding: '0 14px',
    borderRadius: 11, boxSizing: 'border-box',
    border: `1.5px solid ${focused === field ? ACCENT : '#E2E8F0'}`,
    background: focused === field ? '#FAFAFF' : '#F8FAFC',
    fontSize: 14, color: '#0F172A', outline: 'none',
    transition: 'all 0.15s', fontFamily: 'inherit',
    boxShadow: focused === field ? `0 0 0 3px ${ACCENT}18` : 'none',
  })

  const pwdStrength = (pwd) => {
    let score = 0
    if (pwd.length >= 8)           score++
    if (/[A-Z]/.test(pwd))         score++
    if (/[0-9]/.test(pwd))         score++
    if (/[^A-Za-z0-9]/.test(pwd))  score++
    return score
  }

  const strength      = pwdStrength(admin.password)
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const strengthColor = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'][strength]

  const step1Valid = inst.name.trim() && inst.type && inst.size
  const step2Valid =
    admin.firstName.trim() &&
    admin.email.trim() &&
    admin.password.length >= 8 &&
    admin.password === admin.confirm

  async function handleSignup() {
    if (!step2Valid) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email: admin.email,
        password: admin.password,
        options: {
          data: {
            first_name:       admin.firstName,
            last_name:        admin.lastName,
            institution_name: inst.name,
            institution_type: inst.type,
            role:             'admin',
          },
        },
      })
      if (error) throw error
      setStep(3)
    } catch (err) {
      toast.error(err.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F1F5F9' }}>

      {/* ── Left panel ── */}
      <div style={{
        width: '50%', flexShrink: 0, minHeight: '100vh',
        background: '#1E3A8A',
        position: 'relative', overflow: 'hidden',
      }} className="hidden lg:flex flex-col">
        {/* Glow orbs */}
        {/* Grid */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.035, backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '32px 48px', overflowY: 'auto' }} className="no-scrollbar">
          {/* Logo */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
              <GraduationCap size={20} color="white" strokeWidth={1.9} />
            </div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1 }}>OwnCampus</p>
              <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: 3, letterSpacing: '0.13em', textTransform: 'uppercase' }}>School ERP Platform</p>
            </div>
          </motion.div>

          {/* Hero text */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(165,180,252,0.9)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>
              Education Operating System
            </p>
            <h1 style={{ fontSize: 42, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, letterSpacing: '-0.035em', marginBottom: 14 }}>
              Set Up Your<br />
              <span style={{ color: '#93C5FD' }}>Campus</span><br />
              in Minutes
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 360 }}>
              Join 100+ institutions already running smarter with OwnCampus. Get started in under 2 minutes.
            </p>
          </motion.div>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 'auto' }}>
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div key={f.title} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '8px 0', borderBottom: i < features.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.11)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <Icon size={15} color="rgba(165,180,252,0.92)" strokeWidth={1.7} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.90)', margin: '0 0 2px', letterSpacing: '-0.01em' }}>{f.title}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            {[{ v: '2,800+', l: 'Students' }, { v: '100+', l: 'Institutions' }, { v: '99.9%', l: 'Uptime' }].map((s, i) => (
              <div key={s.l} style={{ padding: '14px 0', textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>{s.v}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', marginTop: 3, fontWeight: 500 }}>{s.l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', boxSizing: 'border-box' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '100%', maxWidth: 460 }}>

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div style={{ width: 38, height: 38, borderRadius: 11, background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={18} color="white" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>OwnCampus</span>
          </div>

          {/* Step indicator */}
          {step < 3 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
              {STEPS.filter(s => s.id < 3).map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < 1 ? 1 : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: step > s.id ? '#10B981' : step === s.id ? ACCENT : '#E2E8F0',
                      transition: 'all 0.25s',
                    }}>
                      {step > s.id
                        ? <Check size={13} color="white" />
                        : <span style={{ fontSize: 12, fontWeight: 700, color: step === s.id ? 'white' : '#94A3B8' }}>{s.id}</span>}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: step === s.id ? 700 : 500, color: step === s.id ? '#0F172A' : '#94A3B8' }}>{s.label}</span>
                  </div>
                  {i < 1 && (
                    <div style={{ flex: 1, height: 2, background: step > s.id ? '#10B981' : '#E2E8F0', margin: '0 12px', borderRadius: 1, transition: 'background 0.25s' }} />
                  )}
                </div>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ── STEP 1: Institution Info ── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
                <div style={{ marginBottom: 22 }}>
                  <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 4 }}>Your Institution</h2>
                  <p style={{ fontSize: 13.5, color: '#64748B' }}>Tell us about your school or college</p>
                </div>

                <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '26px', border: '1px solid #E2E8F0', boxShadow: '0 8px 40px rgba(15,23,42,0.07)', display: 'flex', flexDirection: 'column', gap: 16 }}>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Institution Name *</label>
                    <div style={{ position: 'relative' }}>
                      <Building2 size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: focused === 'name' ? ACCENT : '#CBD5E1' }} />
                      <input value={inst.name} onChange={setI('name')} placeholder="Greenfield International School"
                        onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                        style={{ ...inputStyle('name'), paddingLeft: 38 }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Type *</label>
                      <select value={inst.type} onChange={setI('type')} onFocus={() => setFocused('type')} onBlur={() => setFocused(null)}
                        style={{ ...inputStyle('type'), cursor: 'pointer' }}>
                        <option value="">Select…</option>
                        {INSTITUTION_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Size *</label>
                      <select value={inst.size} onChange={setI('size')} onFocus={() => setFocused('size')} onBlur={() => setFocused(null)}
                        style={{ ...inputStyle('size'), cursor: 'pointer' }}>
                        <option value="">Select…</option>
                        {INSTITUTION_SIZES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Phone Number</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: focused === 'phone' ? ACCENT : '#CBD5E1' }} />
                      <input value={inst.phone} onChange={setI('phone')} placeholder="+91 98765 43210" type="tel"
                        onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)}
                        style={{ ...inputStyle('phone'), paddingLeft: 38 }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Website</label>
                    <div style={{ position: 'relative' }}>
                      <Globe size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: focused === 'web' ? ACCENT : '#CBD5E1' }} />
                      <input value={inst.website} onChange={setI('website')} placeholder="https://yourschool.edu"
                        onFocus={() => setFocused('web')} onBlur={() => setFocused(null)}
                        style={{ ...inputStyle('web'), paddingLeft: 38 }} />
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: step1Valid ? 1.015 : 1 }} whileTap={{ scale: step1Valid ? 0.985 : 1 }}
                    onClick={() => step1Valid && setStep(2)}
                    style={{
                      width: '100%', height: 48, borderRadius: 13, border: 'none',
                      background: step1Valid ? '#2563EB' : '#E2E8F0',
                      color: step1Valid ? '#FFFFFF' : '#94A3B8',
                      fontSize: 14.5, fontWeight: 700, cursor: step1Valid ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: step1Valid ? '0 4px 16px rgba(37,99,235,0.30)' : 'none',
                      transition: 'all 0.2s', fontFamily: 'inherit',
                    }}>
                    Continue <ChevronRight size={16} />
                  </motion.button>
                </div>

                <p style={{ marginTop: 20, fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
                  Already have an account?{' '}
                  <Link href="/auth/login" style={{ fontWeight: 700, color: ACCENT, textDecoration: 'none' }}>Sign in</Link>
                </p>
              </motion.div>
            )}

            {/* ── STEP 2: Admin Account ── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                  <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }} onClick={() => setStep(1)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                    <ChevronLeft size={13} /> Back
                  </motion.button>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: 0 }}>Admin Account</h2>
                    <p style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>Create your administrator login</p>
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '26px', border: '1px solid #E2E8F0', boxShadow: '0 8px 40px rgba(15,23,42,0.07)', display: 'flex', flexDirection: 'column', gap: 16 }}>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>First Name *</label>
                      <div style={{ position: 'relative' }}>
                        <User size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: focused === 'fn' ? ACCENT : '#CBD5E1' }} />
                        <input value={admin.firstName} onChange={setA('firstName')} placeholder="Rajesh"
                          onFocus={() => setFocused('fn')} onBlur={() => setFocused(null)}
                          style={{ ...inputStyle('fn'), paddingLeft: 38 }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Last Name</label>
                      <input value={admin.lastName} onChange={setA('lastName')} placeholder="Kumar"
                        onFocus={() => setFocused('ln')} onBlur={() => setFocused(null)}
                        style={inputStyle('ln')} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Work Email *</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: focused === 'em' ? ACCENT : '#CBD5E1' }} />
                      <input type="email" value={admin.email} onChange={setA('email')} placeholder="admin@yourschool.edu"
                        onFocus={() => setFocused('em')} onBlur={() => setFocused(null)}
                        style={{ ...inputStyle('em'), paddingLeft: 38 }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password *</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: focused === 'pw' ? ACCENT : '#CBD5E1' }} />
                      <input type={showPwd ? 'text' : 'password'} value={admin.password} onChange={setA('password')} placeholder="Min 8 characters"
                        onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)}
                        style={{ ...inputStyle('pw'), paddingLeft: 38, paddingRight: 44 }} />
                      <button type="button" onClick={() => setShowPwd(s => !s)}
                        style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 2 }}>
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {/* Strength bar */}
                    {admin.password.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: strength >= i ? strengthColor : '#E2E8F0', transition: 'background 0.2s' }} />
                          ))}
                        </div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: strengthColor }}>{strengthLabel}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Confirm Password *</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: focused === 'cp' ? ACCENT : '#CBD5E1' }} />
                      <input type={showConfirm ? 'text' : 'password'} value={admin.confirm} onChange={setA('confirm')} placeholder="Re-enter password"
                        onFocus={() => setFocused('cp')} onBlur={() => setFocused(null)}
                        style={{ ...inputStyle('cp'), paddingLeft: 38, paddingRight: 44, borderColor: admin.confirm && admin.confirm !== admin.password ? '#EF4444' : focused === 'cp' ? ACCENT : '#E2E8F0' }} />
                      <button type="button" onClick={() => setShowConfirm(s => !s)}
                        style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 2 }}>
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {admin.confirm && admin.confirm !== admin.password && (
                      <p style={{ fontSize: 11, color: '#EF4444', marginTop: 5, fontWeight: 500 }}>Passwords do not match</p>
                    )}
                  </div>

                  {/* Terms */}
                  <p style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.6 }}>
                    By creating an account you agree to our{' '}
                    <a href="#" style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>Terms of Service</a>{' '}
                    and{' '}
                    <a href="#" style={{ color: ACCENT, fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</a>.
                  </p>

                  <motion.button
                    whileHover={{ scale: step2Valid && !loading ? 1.015 : 1 }}
                    whileTap={{ scale: step2Valid && !loading ? 0.985 : 1 }}
                    onClick={handleSignup}
                    disabled={!step2Valid || loading}
                    style={{
                      width: '100%', height: 48, borderRadius: 13, border: 'none',
                      background: step2Valid ? '#2563EB' : '#E2E8F0',
                      color: step2Valid ? '#FFFFFF' : '#94A3B8',
                      fontSize: 14.5, fontWeight: 700,
                      cursor: step2Valid && !loading ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: step2Valid ? '0 4px 16px rgba(79,70,229,0.35)' : 'none',
                      transition: 'all 0.2s', fontFamily: 'inherit',
                    }}>
                    {loading ? (
                      <div style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%' }} className="animate-spin" />
                    ) : (
                      <>Create Account <ArrowRight size={16} /></>
                    )}
                  </motion.button>
                </div>

                {/* Trust */}
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  {['Encrypted', 'Role-Based Access', 'Audit Logged'].map((l, i) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {i > 0 && <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#CBD5E1', marginRight: 10 }} />}
                      {i === 0 && <Shield size={10} style={{ color: '#CBD5E1' }} />}
                      <span style={{ fontSize: 11, color: '#CBD5E1', fontWeight: 500 }}>{l}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: Success ── */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}
                style={{ textAlign: 'center', padding: '20px 0' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                  style={{ width: 80, height: 80, borderRadius: '50%', background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(22,163,74,0.30)' }}>
                  <Check size={36} color="white" strokeWidth={3} />
                </motion.div>

                <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 10 }}>Account Created!</h2>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, maxWidth: 340, margin: '0 auto 28px' }}>
                  Welcome to OwnCampus, <strong>{admin.firstName}</strong>! We've sent a verification email to <strong style={{ color: '#0F172A' }}>{admin.email}</strong>. Please verify your email to activate your account.
                </p>

                {/* Summary card */}
                <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px 24px', marginBottom: 24, textAlign: 'left', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Account Summary</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Institution', value: inst.name || 'Your Institution' },
                      { label: 'Type',        value: inst.type },
                      { label: 'Admin',       value: `${admin.firstName} ${admin.lastName}`.trim() },
                      { label: 'Email',       value: admin.email },
                    ].map(r => (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, color: '#94A3B8', width: 80, flexShrink: 0 }}>{r.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                    onClick={() => router.push('/auth/login')}
                    style={{ width: '100%', height: 48, borderRadius: 13, border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(37,99,235,0.30)', fontFamily: 'inherit' }}>
                    Go to Sign In <ArrowRight size={16} />
                  </motion.button>
                  <p style={{ fontSize: 12, color: '#94A3B8' }}>Didn't receive the email? Check spam or <button onClick={() => toast.info('Verification email resent!')} style={{ background: 'none', border: 'none', color: ACCENT, fontWeight: 700, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', padding: 0 }}>resend</button></p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
