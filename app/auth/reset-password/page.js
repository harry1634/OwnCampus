'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Eye, EyeOff, Lock, CheckCircle, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

function StrengthBar({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const color  = score <= 1 ? '#EF4444' : score === 2 ? '#F59E0B' : score === 3 ? '#3B82F6' : '#10B981'
  const label  = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong'

  if (!password) return null
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= score ? color : '#E2E8F0', transition: 'background 0.2s' }} />
        ))}
      </div>
      <p style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</p>
    </div>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password,  setPassword ] = useState('')
  const [confirm,   setConfirm  ] = useState('')
  const [showPwd,   setShowPwd  ] = useState(false)
  const [showConf,  setShowConf ] = useState(false)
  const [loading,   setLoading  ] = useState(false)
  const [done,      setDone     ] = useState(false)
  const [ready,     setReady    ] = useState(false)
  const [focused,   setFocused  ] = useState(null)

  // The auth/callback route already exchanged the PKCE code and set the session.
  // getSession() picks it up immediately. onAuthStateChange covers the implicit-hash flow.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return }
    if (password !== confirm) { toast.error('Passwords do not match.'); return }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new Error(error.message)
      setDone(true)
      setTimeout(() => router.push('/auth/login'), 3000)
    } catch (err) {
      toast.error(err.message || 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (field) => ({
    width: '100%', height: 46, paddingLeft: 40, paddingRight: 48,
    borderRadius: 11, boxSizing: 'border-box',
    border: `1.5px solid ${focused === field ? '#2563EB' : '#E2E8F0'}`,
    background: focused === field ? '#FAFAFE' : '#F8FAFC',
    fontSize: 14, color: '#0F172A', outline: 'none', fontFamily: 'inherit',
    boxShadow: focused === field ? '0 0 0 3px rgba(37,99,235,0.10)' : 'none',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 420 }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
            <GraduationCap size={20} color="white" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>OwnCampus</span>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Success ── */}
          {done && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
              <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '36px 28px', border: '1px solid #E2E8F0', boxShadow: '0 8px 40px rgba(15,23,42,0.08)', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', border: '2px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle size={30} color="#10B981" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 10 }}>Password updated!</h2>
                <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.65 }}>
                  Your password has been changed successfully. Redirecting you to login…
                </p>
                <div style={{ marginTop: 20, height: 3, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: '100%' }}
                    transition={{ duration: 3, ease: 'linear' }}
                    style={{ height: '100%', background: '#10B981', borderRadius: 99 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Form ── */}
          {!done && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 6 }}>
                  {ready ? 'Set new password' : 'Verifying link…'}
                </h1>
                <p style={{ fontSize: 13.5, color: '#64748B' }}>
                  {ready ? 'Choose a strong password for your account.' : 'Please wait while we verify your reset link.'}
                </p>
              </div>

              {!ready && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTop: '3px solid #2563EB', borderRadius: '50%' }} className="animate-spin" />
                </div>
              )}

              {ready && (
                <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '26px', border: '1px solid #E2E8F0', boxShadow: '0 8px 40px rgba(15,23,42,0.08)' }}>
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* New password */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 7 }}>New Password</label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: focused === 'pwd' ? '#2563EB' : '#CBD5E1', pointerEvents: 'none' }} />
                        <input
                          type={showPwd ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          onFocus={() => setFocused('pwd')}
                          onBlur={() => setFocused(null)}
                          placeholder="At least 6 characters"
                          required
                          style={inputStyle('pwd')}
                        />
                        <button type="button" onClick={() => setShowPwd(!showPwd)}
                          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 2 }}>
                          {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <StrengthBar password={password} />
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 7 }}>Confirm Password</label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: focused === 'conf' ? '#2563EB' : '#CBD5E1', pointerEvents: 'none' }} />
                        <input
                          type={showConf ? 'text' : 'password'}
                          value={confirm}
                          onChange={e => setConfirm(e.target.value)}
                          onFocus={() => setFocused('conf')}
                          onBlur={() => setFocused(null)}
                          placeholder="Re-enter new password"
                          required
                          style={inputStyle('conf')}
                        />
                        <button type="button" onClick={() => setShowConf(!showConf)}
                          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', padding: 2 }}>
                          {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {confirm && password !== confirm && (
                        <p style={{ fontSize: 11.5, color: '#EF4444', marginTop: 5 }}>Passwords do not match</p>
                      )}
                      {confirm && password === confirm && confirm.length >= 6 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                          <CheckCircle size={12} color="#10B981" />
                          <p style={{ fontSize: 11.5, color: '#10B981' }}>Passwords match</p>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '12px 14px', borderRadius: 11, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShieldCheck size={14} color="#2563EB" style={{ flexShrink: 0 }} />
                      <p style={{ fontSize: 12, color: '#1E40AF', margin: 0, lineHeight: 1.5 }}>
                        Use at least 8 characters with uppercase letters, numbers, and symbols.
                      </p>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: loading ? 1 : 1.015 }}
                      whileTap={{ scale: loading ? 1 : 0.985 }}
                      style={{
                        width: '100%', height: 48, borderRadius: 13, border: 'none',
                        background: '#2563EB',
                        color: '#FFFFFF', fontSize: 14.5, fontWeight: 700,
                        cursor: loading ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 4px 16px rgba(37,99,235,0.40)',
                        fontFamily: 'inherit',
                      }}
                    >
                      {loading
                        ? <div style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%' }} className="animate-spin" />
                        : <><ShieldCheck size={15} /> Update Password</>}
                    </motion.button>
                  </form>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  )
}
