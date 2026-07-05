'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Clock, ShieldCheck, LogOut, Mail, RefreshCw, PartyPopper, ArrowRight } from 'lucide-react'

export default function PendingPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [email,    setEmail   ] = useState('')
  const [roleKey,  setRoleKey ] = useState('')
  const [name,     setName    ] = useState('')
  const [status,   setStatus  ] = useState('pending')
  const [checking, setChecking] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    const paramEmail = searchParams.get('email') || ''
    const paramRole  = searchParams.get('role')  || ''
    const paramName  = searchParams.get('name')  || ''
    setEmail(paramEmail)
    setRoleKey(paramRole)
    setName(paramName)

    if (!paramEmail) { router.push('/auth/login'); return }

    pollStatus(paramEmail)
    intervalRef.current = setInterval(() => pollStatus(paramEmail), 8000)
    return () => clearInterval(intervalRef.current)
  }, [])

  async function pollStatus(emailToCheck) {
    try {
      const res  = await fetch(`/api/access-requests/status?email=${encodeURIComponent(emailToCheck)}`)
      const data = await res.json()
      if (data.status && data.status !== 'pending') {
        setStatus(data.status)
        clearInterval(intervalRef.current)
      }
    } catch {}
  }

  async function checkNow() {
    setChecking(true)
    await pollStatus(email)
    setChecking(false)
  }

  async function handleSetPassword() {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      await createClient().auth.signOut()
    } catch {}
    router.push('/auth/forgot-password')
  }

  async function handleSignOut() {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      await createClient().auth.signOut()
    } catch {}
    router.push('/auth/login')
  }

  const roleColor = roleKey === 'faculty' ? '#059669' : '#7C3AED'

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(155deg,#0F172A 0%,#1E1B4B 55%,#2D2A7A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>

      <div style={{ position: 'absolute', top: -120, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, left: -60, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(79,70,229,0.15) 0%,transparent 70%)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={19} color="white" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>OwnCampus</span>
        </div>

        <AnimatePresence mode="wait">

          {/* ─── APPROVED ─── */}
          {status === 'approved' && (
            <motion.div key="approved"
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div style={{ background: '#FFFFFF', borderRadius: 24, boxShadow: '0 32px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg,#065F46,#059669)', padding: '28px 32px 36px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <PartyPopper size={28} color="white" />
                  </div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
                    You&apos;ve been approved!
                  </h1>
                  <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', margin: 0 }}>
                    Welcome to OwnCampus{name ? `, ${name.split(' ')[0]}` : ''}
                  </p>
                </div>

                <div style={{ padding: '24px 28px 28px' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 16 }}>
                    Next steps to access your portal:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    {[
                      'Check your email inbox for login credentials',
                      'Note down your email (User ID) and temporary password',
                      'Go to login and sign in with those credentials',
                      'Change your password in Profile after first login',
                    ].map((text, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#ECFDF5', border: '2px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#059669' }}>
                          {i + 1}
                        </div>
                        <p style={{ fontSize: 13.5, color: '#374151', margin: 0 }}>{text}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: 11, background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 20 }}>
                    <p style={{ fontSize: 12.5, color: '#92400E', margin: 0, lineHeight: 1.5 }}>
                      Credentials sent to: <strong>{email}</strong>
                    </p>
                  </div>

                  <motion.button
                    onClick={() => router.push('/auth/login')}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    style={{ width: '100%', height: 48, borderRadius: 13, border: 'none', background: 'linear-gradient(135deg,#065F46,#059669)', color: '#FFFFFF', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(5,150,105,0.40)', marginBottom: 10 }}>
                    Go to Login <ArrowRight size={16} />
                  </motion.button>

                  <button onClick={handleSignOut}
                    style={{ width: '100%', height: 42, borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#FFFFFF', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit' }}>
                    <LogOut size={13} /> Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── REJECTED ─── */}
          {status === 'rejected' && (
            <motion.div key="rejected" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
              <div style={{ background: '#FFFFFF', borderRadius: 24, boxShadow: '0 32px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg,#7F1D1D,#DC2626)', padding: '28px 32px 36px', textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <ShieldCheck size={28} color="white" />
                  </div>
                  <h1 style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>Request Not Approved</h1>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', margin: 0 }}>Please contact your institution admin</p>
                </div>
                <div style={{ padding: '24px 28px 28px', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: '#374151', marginBottom: 22, lineHeight: 1.6 }}>
                    Your access request was reviewed but was not approved at this time. Contact your admin for more information.
                  </p>
                  <button onClick={handleSignOut}
                    style={{ width: '100%', height: 44, borderRadius: 12, border: 'none', background: '#EF4444', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Back to Login
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── PENDING ─── */}
          {status === 'pending' && (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ background: '#FFFFFF', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.35)', overflow: 'hidden' }}>

                <div style={{ background: 'linear-gradient(135deg,#1E1B4B,#312E81)', padding: '28px 32px 36px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                    style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', border: '2px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Clock size={28} color="white" />
                  </motion.div>
                  <h1 style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: '0 0 6px' }}>Request Under Review</h1>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.60)', margin: 0 }}>Awaiting admin approval</p>
                </div>

                <div style={{ padding: '24px 28px 28px' }}>
                  {email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: 20 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#4338CA,#6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, fontSize: 15, color: '#FFFFFF' }}>
                        {email[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
                        {roleKey && (
                          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                            <span style={{ fontWeight: 700, color: roleColor, textTransform: 'capitalize' }}>{roleKey}</span>
                            {name && ` · ${name}`}
                          </p>
                        )}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', flexShrink: 0 }}>PENDING</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
                    {[
                      { done: true,  label: 'Details submitted',     sub: 'Profile details received' },
                      { done: true,  label: 'Request sent to admin', sub: 'You are in the approval queue' },
                      { done: false, label: 'Admin review',          sub: 'Auto-checking every 8 seconds' },
                      { done: false, label: 'Portal access granted', sub: "This page updates the moment you're approved" },
                    ].map((step, i, arr) => (
                      <div key={i} style={{ display: 'flex', gap: 14 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: step.done ? '#059669' : i === 2 ? '#FFFBEB' : '#F1F5F9', border: `2px solid ${step.done ? '#059669' : i === 2 ? '#FDE68A' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {step.done
                              ? <ShieldCheck size={13} color="white" />
                              : i === 2
                                ? <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                    <Clock size={12} color="#D97706" />
                                  </motion.div>
                                : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#CBD5E1' }} />}
                          </div>
                          {i < arr.length - 1 && <div style={{ width: 2, height: 24, background: step.done ? '#059669' : '#E2E8F0', marginTop: 2 }} />}
                        </div>
                        <div style={{ paddingBottom: i < arr.length - 1 ? 20 : 0, paddingTop: 2 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: step.done ? '#0F172A' : '#94A3B8', margin: '0 0 2px' }}>{step.label}</p>
                          <p style={{ fontSize: 11.5, color: '#CBD5E1', margin: 0 }}>{step.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '13px 14px', borderRadius: 12, background: '#F0FDF4', border: '1px solid #A7F3D0', marginBottom: 20 }}>
                    <Mail size={15} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12.5, color: '#065F46', margin: 0, lineHeight: 1.55 }}>
                      Auto-checking every 8 seconds. Once approved, you&apos;ll receive login credentials by email.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <motion.button onClick={checkNow} disabled={checking}
                      whileHover={{ scale: checking ? 1 : 1.015 }} whileTap={{ scale: checking ? 1 : 0.985 }}
                      style={{ width: '100%', height: 46, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#4338CA,#6366F1)', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: checking ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
                      {checking
                        ? <><div style={{ width: 17, height: 17, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%' }} className="animate-spin" /> Checking…</>
                        : <><RefreshCw size={14} /> Check Now</>}
                    </motion.button>
                    <button onClick={handleSignOut}
                      style={{ width: '100%', height: 42, borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#FFFFFF', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit' }}>
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          Need help? Contact your institution admin directly.
        </p>
      </motion.div>
    </div>
  )
}
