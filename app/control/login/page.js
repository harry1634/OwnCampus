'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Shield, Lock, Mail, LayoutGrid, AlertCircle, CheckCircle2, Building2, CreditCard, Headphones, BarChart3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const C = {
  bg:      '#080C15',
  card:    '#0E1626',
  border:  '#18243A',
  input:   '#060A12',
  accent:  '#3B82F6',
  accentL: '#60A5FA',
  accentD: '#1D4ED8',
  text:    '#F1F5F9',
  muted:   '#94A3B8',
  subtle:  '#475569',
}

const FEATURES = [
  { icon: Building2,  label: 'Institution Management', desc: 'Full lifecycle: onboard, suspend, offboard' },
  { icon: CreditCard, label: 'License & Billing',      desc: 'Custom plans, MRR tracking, invoices'     },
  { icon: LayoutGrid, label: 'Module Access Control',  desc: '15 ERP modules toggled per institution'   },
  { icon: Headphones, label: 'Support Center',         desc: 'Tickets, SLA tracking, audit trail'       },
]

export default function ControlLoginPage() {
  const router = useRouter()
  const [email,   setEmail  ] = useState('')
  const [pwd,     setPwd    ] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError  ] = useState('')
  const [focused, setFocused] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/control/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), password: pwd }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Login failed.'); return }
      router.push('/control/dashboard')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (name) => ({
    width: '100%', height: 52, boxSizing: 'border-box',
    padding: name === 'pwd' ? '0 46px 0 44px' : '0 16px 0 44px',
    background: focused === name ? '#FAFCFF' : '#FFFFFF',
    border: `1.5px solid ${focused === name ? '#2563EB' : '#E2E8F0'}`,
    borderRadius: 10, color: '#0F172A', fontSize: 14, fontFamily: 'inherit', outline: 'none',
    boxShadow: focused === name ? '0 0 0 4px rgba(37,99,235,0.10)' : '0 1px 3px rgba(15,23,42,0.04)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: C.bg, fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Left panel — same gradient treatment as institution login ── */}
      <div className="cc-left" style={{
        display: 'none', flex: 1,
        background: '#0A1628',
        flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 44px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Dot-grid texture — matches institution login */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }} />

        {/* Animated glow orbs — matches institution login */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.28, 0.18] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: -120, right: -80, width: 420, height: 420,
            borderRadius: '50%', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 65%)',
          }} />
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.15, 0.22, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{
            position: 'absolute', bottom: -80, left: -60, width: 320, height: 320,
            borderRadius: '50%', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(59,130,246,0.28) 0%, transparent 65%)',
          }} />

        {/* Shimmer line */}
        <div style={{
          position: 'absolute', top: '38%', left: 0, right: 0, height: 1, pointerEvents: 'none',
          opacity: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo — glassmorphism style matching institution login */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 13,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}>
              <LayoutGrid size={19} color="white" strokeWidth={1.8} />
            </div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.025em' }}>OwnCampus</p>
              <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.38)', margin: 0, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Control Center</p>
            </div>
          </div>

          {/* Eyebrow pill — matching institution login style */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18,
            padding: '5px 14px', borderRadius: 99,
            background: 'rgba(165,180,252,0.12)', border: '1px solid rgba(165,180,252,0.22)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#A5B4FC' }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(165,180,252,0.9)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Internal Staff Access
            </span>
          </div>

          {/* Headline */}
          <h2 style={{
            fontSize: 38, fontWeight: 900, color: '#FFFFFF',
            letterSpacing: '-0.04em', lineHeight: 1.1, margin: '0 0 14px',
          }}>
            Manage the entire<br />
            <span style={{ color: '#93C5FD' }}>platform</span>{' '}from<br />one place.
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.42)', margin: '0 0 36px', lineHeight: 1.65, maxWidth: 300 }}>
            Internal access for OwnCampus staff. Institution owners use the standard portal.
          </p>

          {/* Feature list — matching institution login icon style */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {FEATURES.map(({ icon: Icon, label, desc }, i) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '11px 0',
                borderBottom: i < FEATURES.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                  background: 'rgba(255,255,255,0.09)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 1,
                }}>
                  <Icon size={15} color="rgba(165,180,252,1)" strokeWidth={1.6} />
                </div>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: '0 0 2px', letterSpacing: '-0.01em' }}>{label}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom trust row — matching institution login */}
        <div style={{
          paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', flexShrink: 0, marginRight: 10, boxShadow: '0 0 6px #4ADE8099' }} className="animate-pulse" />
          {['Encrypted', 'Audit Logged', 'Role-Based', 'Staff Only'].map((l, i) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <span style={{ color: 'rgba(255,255,255,0.18)', margin: '0 9px', fontSize: 12 }}>·</span>}
              <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.48)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel: Form ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px', position: 'relative',
        background: '#FFFFFF',
      }}>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: '100%', maxWidth: 390, position: 'relative', zIndex: 1 }}>

          {/* Mobile-only logo */}
          <div className="cc-mobile-logo" style={{ display: 'none', textAlign: 'center', marginBottom: 36 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: '#2563EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
              }}>
                <LayoutGrid size={18} color="white" strokeWidth={1.8} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0 }}>OwnCampus</p>
                <p style={{ fontSize: 9.5, color: '#94A3B8', margin: 0, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Control Center</p>
              </div>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 99,
              background: '#EFF6FF', border: '1px solid #BFDBFE',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563EB' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Internal Staff Only</span>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.035em', margin: '0 0 8px' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 14, color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              Sign in with your OwnCampus staff credentials to continue.
            </p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                style={{
                  display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 10,
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  marginBottom: 22,
                }}>
                <AlertCircle size={15} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: '#B91C1C', margin: 0, lineHeight: 1.5 }}>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600, color: '#374151',
                marginBottom: 8, letterSpacing: '-0.005em',
              }}>Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color={focused === 'email' ? '#2563EB' : '#CBD5E1'}
                  style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.15s' }} />
                <input
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                  placeholder="you@owncampus.com"
                  required autoComplete="email"
                  style={inputStyle('email')}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600, color: '#374151',
                marginBottom: 8, letterSpacing: '-0.005em',
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color={focused === 'pwd' ? '#2563EB' : '#CBD5E1'}
                  style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', transition: 'color 0.15s' }} />
                <input
                  type={showPwd ? 'text' : 'password'} value={pwd}
                  onChange={e => setPwd(e.target.value)}
                  onFocus={() => setFocused('pwd')} onBlur={() => setFocused(null)}
                  placeholder="••••••••••••"
                  required autoComplete="current-password"
                  style={inputStyle('pwd')}
                />
                <button
                  type="button" onClick={() => setShowPwd(v => !v)}
                  style={{
                    position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    color: '#94A3B8', display: 'flex',
                  }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit" disabled={loading}
              whileHover={loading ? {} : { y: -1, boxShadow: '0 12px 32px rgba(37,99,235,0.45)' }}
              whileTap={loading ? {} : { scale: 0.985 }}
              style={{
                width: '100%', height: 54, marginTop: 4,
                background: loading ? '#94A3B8' : '#2563EB',
                border: 'none', borderRadius: 14,
                color: 'white', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 18px rgba(37,99,235,0.38)',
                transition: 'background 0.2s, box-shadow 0.2s',
                letterSpacing: '-0.01em',
              }}>
              {loading
                ? <>
                    <div style={{ width: 17, height: 17, border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%' }} className="animate-spin" />
                    Signing in…
                  </>
                : 'Sign in to Control Center'
              }
            </motion.button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '28px 0 20px' }}>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, whiteSpace: 'nowrap' }}>Not a staff member?</span>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          </div>

          <a href="/auth/login" style={{
            display: 'block', textAlign: 'center', padding: '13px',
            borderRadius: 10, border: '1.5px solid #E2E8F0',
            color: '#64748B', fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
            background: '#FFFFFF', transition: 'border-color 0.15s, color 0.15s',
            boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#2563EB' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B' }}>
            Go to Institution Portal
          </a>
        </motion.div>
      </div>

      <style>{`
        @media (min-width: 800px) {
          .cc-left        { display: flex !important; }
          .cc-mobile-logo { display: none  !important; }
        }
      `}</style>
    </div>
  )
}
