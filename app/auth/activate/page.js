'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Building2, Lock, Eye, EyeOff, CheckCircle, ArrowRight, Shield, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const T = {
  accent:  '#2563EB',
  text:    '#0F172A',
  muted:   '#64748B',
  border:  '#E2E8F0',
  surface: '#FFFFFF',
}

function ActivateForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const tokenFromUrl = searchParams.get('token') || ''
  const emailFromUrl = searchParams.get('email') || ''

  const [step,         setStep        ] = useState('form')  // 'form' | 'signing-in' | 'success'
  const [instCode,     setInstCode    ] = useState('')
  const [email,        setEmail       ] = useState(emailFromUrl)
  const [tempPassword, setTempPassword] = useState('')
  const [newPassword,  setNewPassword ] = useState('')
  const [confirm,      setConfirm     ] = useState('')
  const [showTemp,     setShowTemp    ] = useState(false)
  const [showNew,      setShowNew     ] = useState(false)
  const [loading,      setLoading     ] = useState(false)
  const [tokenInfo,    setTokenInfo   ] = useState(null)

  // If we have a token in the URL, validate it and pre-fill fields
  useEffect(() => {
    if (!tokenFromUrl) return
    fetch(`/api/institution/activate?token=${encodeURIComponent(tokenFromUrl)}&email=${encodeURIComponent(emailFromUrl)}`)
      .then(r => r.json())
      .then(d => {
        if (d.institution_code) {
          setInstCode(d.institution_code)
          setEmail(d.admin_email || emailFromUrl)
          setTokenInfo(d)
        }
      })
      .catch(() => {})
  }, [tokenFromUrl, emailFromUrl])

  async function handleActivate(e) {
    e.preventDefault()
    if (!instCode.trim())     { toast.error('Enter your institution code.'); return }
    if (!email.trim())        { toast.error('Enter your email address.'); return }
    if (!tempPassword)        { toast.error('Enter your temporary password.'); return }
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters.'); return }
    if (newPassword !== confirm)  { toast.error('Passwords do not match.'); return }

    setLoading(true)
    setStep('signing-in')

    try {
      const supabase = createClient()

      // Step 1: Sign in with the temporary password
      const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password: tempPassword,
      })
      if (signInErr) {
        throw new Error('Incorrect temporary password. Check the welcome email and try again.')
      }

      // Step 2: Call server API to validate institution code + update password
      const res  = await fetch('/api/institution/activate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          institution_code: instCode.trim().toUpperCase(),
          new_password:     newPassword,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Activation failed.')

      // Step 3: Sign out and sign back in with the new password
      await supabase.auth.signOut()
      await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password: newPassword,
      })

      setStep('success')
      toast.success('Institution activated! Redirecting to dashboard…')
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err) {
      toast.error(err.message || 'Activation failed.')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle size={32} color="#16A34A" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: '0 0 8px', letterSpacing: '-0.025em' }}>
          Activated!
        </h2>
        <p style={{ fontSize: 14, color: T.muted, margin: 0 }}>Redirecting you to your dashboard…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleActivate} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {tokenInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: '#F0FDF4', border: '1px solid #A7F3D0' }}>
          <CheckCircle size={15} color="#059669" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#065F46', margin: 0 }}>{tokenInfo.institution_name}</p>
            <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>Institution verified from your activation link</p>
          </div>
        </div>
      )}

      {/* Institution Code */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>
          Institution Code
        </label>
        <div style={{ position: 'relative' }}>
          <Building2 size={15} color="#94A3B8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={instCode}
            onChange={e => setInstCode(e.target.value.toUpperCase())}
            placeholder="e.g. GRFLD7X2"
            autoCapitalize="characters"
            spellCheck={false}
            required
            style={{ width: '100%', height: 48, boxSizing: 'border-box', paddingLeft: 40, paddingRight: 14, border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 14, fontWeight: 600, color: T.text, fontFamily: 'inherit', outline: 'none', letterSpacing: '0.06em', background: '#FAFCFF' }}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>Admin Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="admin@yourinstitution.edu"
          required
          style={{ width: '100%', height: 48, boxSizing: 'border-box', padding: '0 14px', border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 14, color: T.text, fontFamily: 'inherit', outline: 'none', background: '#FAFCFF' }}
        />
      </div>

      {/* Temp Password */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>
          Temporary Password <span style={{ fontSize: 11, fontWeight: 400, color: T.muted }}>(from welcome email)</span>
        </label>
        <div style={{ position: 'relative' }}>
          <Lock size={15} color="#94A3B8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type={showTemp ? 'text' : 'password'}
            value={tempPassword}
            onChange={e => setTempPassword(e.target.value)}
            placeholder="••••••••••••••••"
            required
            autoComplete="current-password"
            style={{ width: '100%', height: 48, boxSizing: 'border-box', paddingLeft: 40, paddingRight: 46, border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 14, color: T.text, fontFamily: 'inherit', outline: 'none', background: '#FAFCFF' }}
          />
          <button type="button" onClick={() => setShowTemp(v => !v)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.muted, display: 'flex', padding: 4 }}>
            {showTemp ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {/* New Password */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>New Password</label>
        <div style={{ position: 'relative' }}>
          <Lock size={15} color="#94A3B8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
            autoComplete="new-password"
            style={{ width: '100%', height: 48, boxSizing: 'border-box', paddingLeft: 40, paddingRight: 46, border: `1.5px solid ${T.border}`, borderRadius: 10, fontSize: 14, color: T.text, fontFamily: 'inherit', outline: 'none', background: '#FAFCFF' }}
          />
          <button type="button" onClick={() => setShowNew(v => !v)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.muted, display: 'flex', padding: 4 }}>
            {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>Confirm Password</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••••••••••"
          required
          autoComplete="new-password"
          style={{ width: '100%', height: 48, boxSizing: 'border-box', padding: '0 14px', border: `1.5px solid ${confirm && confirm !== newPassword ? '#EF4444' : T.border}`, borderRadius: 10, fontSize: 14, color: T.text, fontFamily: 'inherit', outline: 'none', background: '#FAFCFF' }}
        />
        {confirm && confirm !== newPassword && (
          <p style={{ fontSize: 12, color: '#EF4444', marginTop: 5, fontWeight: 500 }}>Passwords do not match.</p>
        )}
      </div>

      <motion.button
        type="submit"
        disabled={loading}
        whileHover={loading ? {} : { y: -1 }}
        whileTap={loading ? {} : { scale: 0.99 }}
        style={{ width: '100%', height: 50, borderRadius: 12, border: 'none', background: loading ? '#94A3B8' : '#2563EB', color: '#FFFFFF', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
        {loading
          ? <><Loader2 size={18} className="animate-spin" /> Activating…</>
          : <><CheckCircle size={16} /> Activate Institution <ArrowRight size={14} /></>}
      </motion.button>
    </form>
  )
}

export default function ActivatePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}>
            <Building2 size={24} color="white" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, margin: '0 0 8px', letterSpacing: '-0.03em' }}>
            Activate Your Institution
          </h1>
          <p style={{ fontSize: 14, color: T.muted, margin: 0, lineHeight: 1.6 }}>
            Use the credentials from your OwnCampus welcome email to activate and set a permanent password.
          </p>
        </div>

        {/* Card */}
        <div style={{ background: T.surface, borderRadius: 18, padding: 32, border: `1px solid ${T.border}`, boxShadow: '0 4px 24px rgba(15,23,42,0.07)' }}>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px 0', color: T.muted }}>Loading…</div>}>
            <ActivateForm />
          </Suspense>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <a href="/auth/login" style={{ fontSize: 13, fontWeight: 600, color: T.accent, textDecoration: 'none' }}>← Back to Login</a>
          <span style={{ color: T.border }}>·</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Shield size={11} color="#94A3B8" />
            <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>Encrypted activation</span>
          </div>
        </div>
      </div>
    </div>
  )
}
