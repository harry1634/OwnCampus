'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail, LayoutGrid, AlertCircle, Building2, CreditCard, Headphones, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// All colors derived from #B0C4DE (Light Steel Blue)
const C = {
  // Dark side
  navy:      '#1A3A60',   // deep navy — sidebar anchor
  navyD:     '#0F2440',   // darker navy for gradient
  // Light side
  base:      '#B0C4DE',   // brand background
  pale:      '#EEF4FA',   // almost-white steel blue
  white:     '#FFFFFF',
  // Borders & dividers
  border:    '#C0D5E9',
  // Text
  textDark:  '#0F1E33',
  textMid:   '#3D5A78',
  textMuted: '#647D95',
  // Accents on dark panel
  accentOnDark: '#B0C4DE',
  accentLt:     '#D6E5F3',
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
    background: C.white,
    border: `1.5px solid ${focused === name ? C.navy : C.border}`,
    borderRadius: 10, color: C.textDark, fontSize: 14, fontFamily: 'inherit', outline: 'none',
    boxShadow: focused === name ? `0 0 0 4px rgba(26,58,96,0.10)` : `0 1px 3px rgba(26,58,96,0.06)`,
    transition: 'all 0.15s',
  })

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: C.base, fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Left panel — dark navy with steel blue accents ── */}
      <div className="cc-left" style={{
        display: 'none', flex: 1,
        background: `linear-gradient(155deg, ${C.navy} 0%, ${C.navyD} 100%)`,
        flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 44px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Dot-grid texture */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `radial-gradient(rgba(176,196,222,0.10) 1px, transparent 1px)`,
          backgroundSize: '26px 26px',
        }} />

        {/* Steel-blue glow orbs */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.30, 0.18] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: -120, right: -80, width: 420, height: 420,
            borderRadius: '50%', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(176,196,222,0.30) 0%, transparent 65%)',
          }} />
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.12, 0.20, 0.12] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{
            position: 'absolute', bottom: -80, left: -60, width: 320, height: 320,
            borderRadius: '50%', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(147,196,222,0.25) 0%, transparent 65%)',
          }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 13,
              background: 'rgba(176,196,222,0.15)',
              border: '1px solid rgba(176,196,222,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.20)',
            }}>
              <LayoutGrid size={19} color={C.accentOnDark} strokeWidth={1.8} />
            </div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.025em' }}>OwnCampus</p>
              <p style={{ fontSize: 9.5, color: 'rgba(176,196,222,0.50)', margin: 0, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Control Center</p>
            </div>
          </div>

          {/* Eyebrow pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18,
            padding: '5px 14px', borderRadius: 99,
            background: 'rgba(176,196,222,0.12)', border: '1px solid rgba(176,196,222,0.25)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.accentOnDark }} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(176,196,222,0.90)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Internal Staff Access
            </span>
          </div>

          {/* Headline */}
          <h2 style={{
            fontSize: 38, fontWeight: 900, color: '#FFFFFF',
            letterSpacing: '-0.04em', lineHeight: 1.1, margin: '0 0 14px',
          }}>
            Manage the entire<br />
            <span style={{ color: C.accentOnDark }}>platform</span>{' '}from<br />one place.
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(176,196,222,0.55)', margin: '0 0 36px', lineHeight: 1.65, maxWidth: 300 }}>
            Internal access for OwnCampus staff. Institution owners use the standard portal.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {FEATURES.map(({ icon: Icon, label, desc }, i) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '11px 0',
                borderBottom: i < FEATURES.length - 1 ? '1px solid rgba(176,196,222,0.10)' : 'none',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                  background: 'rgba(176,196,222,0.10)',
                  border: '1px solid rgba(176,196,222,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 1,
                }}>
                  <Icon size={15} color={C.accentOnDark} strokeWidth={1.6} />
                </div>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: '0 0 2px', letterSpacing: '-0.01em' }}>{label}</p>
                  <p style={{ fontSize: 12, color: 'rgba(176,196,222,0.45)', margin: 0, lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom trust row */}
        <div style={{
          paddingTop: 20, borderTop: '1px solid rgba(176,196,222,0.12)',
          display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', flexShrink: 0, marginRight: 10, boxShadow: '0 0 6px #4ADE8099' }} className="animate-pulse" />
          {['Encrypted', 'Audit Logged', 'Role-Based', 'Staff Only'].map((l, i) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <span style={{ color: 'rgba(176,196,222,0.25)', margin: '0 9px', fontSize: 12 }}>·</span>}
              <span style={{ fontSize: 10.5, color: 'rgba(176,196,222,0.55)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel: steel blue bg + white card ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px', position: 'relative',
        background: C.base,
      }}>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: '100%', maxWidth: 400, position: 'relative', zIndex: 1,
            background: C.white, borderRadius: 20,
            border: `1px solid ${C.border}`,
            boxShadow: '0 8px 32px rgba(26,58,96,0.14)',
            padding: '36px 32px',
          }}>

          {/* Mobile-only logo */}
          <div className="cc-mobile-logo" style={{ display: 'none', textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: C.navy,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 16px rgba(26,58,96,0.35)`,
              }}>
                <LayoutGrid size={18} color="white" strokeWidth={1.8} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: C.textDark, margin: 0 }}>OwnCampus</p>
                <p style={{ fontSize: 9.5, color: C.textMuted, margin: 0, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Control Center</p>
              </div>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 99,
              background: 'rgba(26,58,96,0.07)', border: `1px solid ${C.border}`,
            }}>
              <Shield size={10} color={C.navy} />
              <span style={{ fontSize: 10, fontWeight: 700, color: C.navy, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Internal Staff Only</span>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: C.textDark, letterSpacing: '-0.035em', margin: '0 0 8px' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 13.5, color: C.textMuted, margin: 0, lineHeight: 1.55 }}>
              Sign in with your OwnCampus staff credentials.
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
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{
                display: 'block', fontSize: 13, fontWeight: 600, color: C.textMid,
                marginBottom: 7, letterSpacing: '-0.005em',
              }}>Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color={focused === 'email' ? C.navy : C.border}
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
                display: 'block', fontSize: 13, fontWeight: 600, color: C.textMid,
                marginBottom: 7, letterSpacing: '-0.005em',
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color={focused === 'pwd' ? C.navy : C.border}
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
                    color: C.textMuted, display: 'flex',
                  }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit" disabled={loading}
              whileHover={loading ? {} : { y: -1, boxShadow: '0 12px 32px rgba(26,58,96,0.40)' }}
              whileTap={loading ? {} : { scale: 0.985 }}
              style={{
                width: '100%', height: 52, marginTop: 6,
                background: loading ? C.border : C.navy,
                border: 'none', borderRadius: 12,
                color: 'white', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 18px rgba(26,58,96,0.35)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '24px 0 18px' }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, whiteSpace: 'nowrap' }}>Not a staff member?</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <a href="/auth/login" style={{
            display: 'block', textAlign: 'center', padding: '12px',
            borderRadius: 10, border: `1.5px solid ${C.border}`,
            color: C.textMid, fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
            background: C.pale, transition: 'border-color 0.15s, color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.color = C.navy }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid }}>
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
