'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Mail, ArrowLeft, CheckCircle, Send, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email,   setEmail  ] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent   ] = useState(false)
  const [focused, setFocused] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      })
      if (error) throw new Error(error.message)
      setSent(true)
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 440 }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#1E40AF,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
            <GraduationCap size={20} color="white" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>OwnCampus</span>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Email form ── */}
          {!sent && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 6 }}>
                  Forgot password?
                </h1>
                <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.6 }}>
                  Enter the email linked to your OwnCampus account and we'll send you a link to reset your password.
                </p>
              </div>

              <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '26px', border: '1px solid #E2E8F0', boxShadow: '0 8px 40px rgba(15,23,42,0.08)' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      Email Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: focused ? '#2563EB' : '#CBD5E1', pointerEvents: 'none' }} />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="you@institution.edu"
                        required
                        style={{
                          width: '100%', height: 46, paddingLeft: 38, paddingRight: 14,
                          borderRadius: 11, boxSizing: 'border-box',
                          border: `1.5px solid ${focused ? '#2563EB' : '#E2E8F0'}`,
                          background: focused ? '#FAFAFE' : '#F8FAFC',
                          fontSize: 14, color: '#0F172A', outline: 'none',
                          fontFamily: 'inherit',
                          boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
                          transition: 'all 0.15s',
                        }}
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.015 }}
                    whileTap={{ scale: loading ? 1 : 0.985 }}
                    style={{
                      width: '100%', height: 48, borderRadius: 13, border: 'none',
                      background: 'linear-gradient(135deg,#1E40AF,#2563EB)',
                      color: '#FFFFFF', fontSize: 14.5, fontWeight: 700,
                      cursor: loading ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 16px rgba(37,99,235,0.40)',
                      fontFamily: 'inherit',
                    }}
                  >
                    {loading
                      ? <div style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%' }} className="animate-spin" />
                      : <><Send size={15} /> Send Reset Link</>}
                  </motion.button>
                </form>
              </div>

              <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Shield size={12} color="#CBD5E1" />
                <span style={{ fontSize: 12, color: '#94A3B8' }}>Reset link expires in 1 hour</span>
              </div>

              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>
                  <ArrowLeft size={14} /> Back to login
                </Link>
              </div>
            </motion.div>
          )}

          {/* ── Success state ── */}
          {sent && (
            <motion.div key="sent" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
              <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '36px 28px', border: '1px solid #E2E8F0', boxShadow: '0 8px 40px rgba(15,23,42,0.08)', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', border: '2px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle size={30} color="#10B981" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 10 }}>
                  Check your inbox
                </h2>
                <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.65, marginBottom: 6 }}>
                  We've sent a password reset link to:
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 24, wordBreak: 'break-all' }}>
                  {email}
                </p>
                <p style={{ fontSize: 12.5, color: '#94A3B8', lineHeight: 1.65, marginBottom: 28 }}>
                  The link will expire in 1 hour. Check your spam folder if you don't see it.
                </p>
                <motion.button
                  onClick={() => setSent(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ padding: '10px 24px', borderRadius: 11, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 13.5, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}
                >
                  Resend email
                </motion.button>
              </div>
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>
                  <ArrowLeft size={14} /> Back to login
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  )
}
