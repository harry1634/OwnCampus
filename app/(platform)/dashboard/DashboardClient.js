'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDashboardRealtime } from '@/lib/hooks/useRealtime'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, GraduationCap, ShieldCheck, Check, X, RefreshCw,
  Copy, Eye, EyeOff, Megaphone, Send, Trash2, Pin, ChevronRight,
  AlertCircle, BookOpen, Clock, UserCheck, CreditCard,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const C = {
  primary: '#2563EB', text: '#0F172A', sub: '#64748B',
  muted: '#94A3B8', border: '#E2E8F0', success: '#10B981',
  warning: '#F59E0B', danger: '#EF4444', purple: '#7C3AED',
}
const card = { background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }
const fade = (delay = 0) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay, ease: [0.25, 0.1, 0.25, 1] } })

const TYPE_META = {
  general:  { label: 'General',  bg: '#EFF6FF', color: '#2563EB' },
  exam:     { label: 'Exam',     bg: '#F5F3FF', color: '#7C3AED' },
  event:    { label: 'Event',    bg: '#ECFDF5', color: '#059669' },
  holiday:  { label: 'Holiday',  bg: '#FEF2F2', color: '#DC2626' },
  meeting:  { label: 'Meeting',  bg: '#FFFBEB', color: '#D97706' },
}
const AUDIENCE_OPTIONS = [
  { value: 'all',     label: 'Everyone' },
  { value: 'student', label: 'Students only' },
  { value: 'faculty', label: 'Faculty only' },
]

/* ────────────────────────────────── CredentialsModal ──── */
function CredentialsModal({ creds, onClose }) {
  const [showPwd, setShowPwd] = useState(false)
  if (!creds) return null
  const copy = (text, label) => navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`))
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: 'calc(var(--header-height) + 24px) 24px 40px' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.22 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#FFFFFF', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(15,23,42,0.20)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={20} color="#059669" />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Access Approved</p>
            <p style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>Share credentials with <strong>{creds.name}</strong></p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, display: 'flex' }}><X size={18} /></button>
        </div>
        {creds.emailSent ? (
          <div style={{ padding: '11px 14px', borderRadius: 11, background: '#F0FDF4', border: '1px solid #A7F3D0', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={14} color="#059669" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 12.5, color: '#166534', margin: 0, lineHeight: 1.5 }}>
              Credentials emailed to <strong>{creds.email}</strong>
            </p>
          </div>
        ) : (
          <div style={{ padding: '11px 14px', borderRadius: 11, background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: 18 }}>
            <p style={{ fontSize: 12.5, color: '#991B1B', margin: 0, lineHeight: 1.5 }}>
              <strong>Email delivery failed.</strong> Share these credentials with the user manually.
              {creds.emailError ? <span style={{ display: 'block', marginTop: 4, fontSize: 11.5, color: '#B91C1C' }}>Reason: {creds.emailError}</span> : null}
            </p>
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11.5, fontWeight: 600, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email / User ID</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 11, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <span style={{ flex: 1, fontSize: 14, color: C.text, fontWeight: 600 }}>{creds.email || '—'}</span>
            {creds.email && <button onClick={() => copy(creds.email, 'Email')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', padding: 2 }}><Copy size={14} /></button>}
          </div>
        </div>
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 11.5, fontWeight: 600, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Temporary Password</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 11, background: '#EFF6FF', border: '2px dashed #BFDBFE' }}>
            <span style={{ flex: 1, fontSize: 18, fontWeight: 800, color: C.primary, fontFamily: 'monospace', letterSpacing: showPwd ? 3 : 2 }}>
              {showPwd ? creds.password : '•'.repeat(creds.password?.length || 10)}
            </span>
            <button onClick={() => setShowPwd(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', padding: 2 }}>
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button onClick={() => copy(creds.password, 'Password')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.primary, display: 'flex', padding: 2 }}><Copy size={15} /></button>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }} onClick={onClose}
          style={{ width: '100%', height: 44, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1E40AF,#2563EB)', color: '#FFF', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Done — I've noted the credentials
        </motion.button>
      </motion.div>
    </div>
  )
}

/* ────────────────────────────────── AccessQueue ──── */
function PendingBadge({ count }) {
  if (!count) return null
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>{count} pending</span>
}

function AccessQueue({ pending, loading, onApprove, onReject, actionId }) {
  if (loading) return <div style={{ textAlign: 'center', padding: '28px 0', color: C.muted, fontSize: 13 }}>Loading…</div>
  if (!pending.length) return (
    <div style={{ textAlign: 'center', padding: '28px 0' }}>
      <ShieldCheck size={30} color="#D1FAE5" style={{ marginBottom: 8 }} />
      <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>No pending requests</p>
    </div>
  )
  return (
    <div>
      {pending.map((req, i) => {
        const isFaculty = req.role !== 'student'
        const extra = isFaculty
          ? [req.department, req.designation].filter(Boolean).join(' · ')
          : req.class_section ? `Class ${req.class_section}${req.roll_number ? ' · Roll ' + req.roll_number : ''}` : null
        const date = new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        const approving = actionId === req.id + '-approve'
        const rejecting = actionId === req.id + '-reject'
        return (
          <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: i < pending.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: isFaculty ? '#ECFDF5' : '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isFaculty ? <ShieldCheck size={17} color="#059669" /> : <GraduationCap size={17} color="#7C3AED" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{req.name}</p>
              <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                <span style={{ fontWeight: 700, color: isFaculty ? '#059669' : '#7C3AED', textTransform: 'capitalize' }}>{req.role}</span>
                {extra ? ` · ${extra}` : ''}{' · '}{date}
              </p>
              <p style={{ fontSize: 10, color: '#CBD5E1', marginTop: 1, fontFamily: 'monospace' }}>{req.email}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <motion.button whileHover={{ scale: 1.05 }} disabled={!!actionId} onClick={() => onApprove(req.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 7, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#059669', fontSize: 12, fontWeight: 700, cursor: actionId ? 'default' : 'pointer' }}>
                {approving ? <div style={{ width: 11, height: 11, border: '1.5px solid #059669', borderTop: '1.5px solid transparent', borderRadius: '50%' }} className="animate-spin" /> : <Check size={11} />}
                Approve
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} disabled={!!actionId} onClick={() => onReject(req.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: actionId ? 'default' : 'pointer' }}>
                {rejecting ? <div style={{ width: 11, height: 11, border: '1.5px solid #DC2626', borderTop: '1.5px solid transparent', borderRadius: '50%' }} className="animate-spin" /> : <X size={11} />}
              </motion.button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ────────────────────────────────── Main ──── */
export default function DashboardClient({ user, profile, initialStats, initialRequests, initialAnnouncements }) {
  const [greeting,        setGreeting        ] = useState('Welcome back')
  const [pendingRequests, setPendingRequests  ] = useState(initialRequests || [])
  const [loadingRequests, setLoadingRequests  ] = useState(false)
  const [approvedCreds,   setApprovedCreds   ] = useState(null)
  const [actionId,        setActionId        ] = useState(null)
  const [stats,           setStats           ] = useState(initialStats || { students: 0, faculty: 0, pending: 0 })
  const [announcements,   setAnnouncements   ] = useState(initialAnnouncements || [])
  const [newTitle,        setNewTitle        ] = useState('')
  const [newContent,      setNewContent      ] = useState('')
  const [newType,         setNewType         ] = useState('general')
  const [newAudience,     setNewAudience     ] = useState('all')
  const [posting,         setPosting         ] = useState(false)
  const [deletingId,      setDeletingId      ] = useState(null)
  const [codeCopied,      setCodeCopied      ] = useState(false)
  const [codeDismissed,   setCodeDismissed   ] = useState(
    typeof window !== 'undefined' && !!sessionStorage.getItem('oc_code_banner_dismissed')
  )

  // Derive institution code directly from already-loaded profile props — no extra fetch needed
  const instCode = (() => {
    const inst = profile?.institutions
    if (!inst) return null
    if (inst.code) return inst.code
    const nameChars = (inst.name || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X')
    const slugTail  = (inst.slug || inst.id || '').replace(/-/g, '').toUpperCase().slice(-4)
    return nameChars + slugTail
  })()

  const institutionId = profile?.institution_id || null

  // Re-fetch counts + fee stats — called on mount and by realtime
  // Uses /api/dashboard/stats only — avoids fetching full student/faculty lists just for counts
  const refreshStats = useCallback(() => {
    fetch('/api/dashboard/stats').then(r => r.ok ? r.json() : null).then(dashStats => {
      if (!dashStats) return
      setStats(s => ({
        ...s,
        students:       dashStats.students       ?? s.students,
        faculty:        dashStats.faculty        ?? s.faculty,
        pending:        dashStats.pending        ?? s.pending,
        feeCollected:   dashStats.feeCollected   ?? s.feeCollected   ?? 0,
        feeOutstanding: dashStats.feeOutstanding ?? s.feeOutstanding ?? 0,
        totalFee:       dashStats.totalFee       ?? s.totalFee       ?? 0,
      }))
    }).catch(() => {})
  }, [])

  useEffect(() => { refreshStats() }, [])

  // Realtime: auto-refresh KPIs when students, fees, or access-requests change
  useDashboardRealtime(institutionId, refreshStats)

  // Only used by the Refresh button — initial data came from the server
  const fetchRequests = async () => {
    setLoadingRequests(true)
    try {
      const res  = await fetch('/api/access-requests')
      const data = await res.json()
      setPendingRequests(Array.isArray(data) ? data.filter(r => r.status === 'pending') : [])
    } catch {}
    setLoadingRequests(false)
  }

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')

  }, [])

  async function handleApprove(id) {
    setActionId(id + '-approve')
    const res  = await fetch(`/api/access-requests/${id}/approve`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setPendingRequests(prev => prev.filter(r => r.id !== id))
      setApprovedCreds({ email: data.email, password: data.password, name: data.name, phone: data.phone, emailSent: data.emailSent, emailError: data.emailError })
      setStats(s => ({ ...s, pending: Math.max(0, s.pending - 1) }))
      if (data.emailSent) {
        toast.success(`Approved! Credentials emailed to ${data.email}`)
      } else {
        toast.success('Approved! Share credentials manually from the modal.')
      }
    } else {
      toast.error(data.error || 'Failed to approve request.')
    }
    setActionId(null)
  }

  async function handleReject(id) {
    setActionId(id + '-reject')
    const res  = await fetch(`/api/access-requests/${id}/reject`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      toast.success('Request rejected.')
      setPendingRequests(prev => prev.filter(r => r.id !== id))
      setStats(s => ({ ...s, pending: Math.max(0, s.pending - 1) }))
    } else {
      toast.error(data.error || 'Failed to reject request.')
    }
    setActionId(null)
  }

  async function handlePost(e) {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) { toast.error('Title and content are required.'); return }
    setPosting(true)
    try {
      const res  = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: newContent, type: newType, target_audience: newAudience }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAnnouncements(prev => [data.announcement, ...prev])
      setNewTitle(''); setNewContent('')
      toast.success('Announcement posted!')
    } catch (err) {
      toast.error(err.message || 'Failed to post.')
    }
    setPosting(false)
  }

  async function handleDeleteAnn(id) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json().catch(() => {}); toast.error(d?.error || 'Failed to delete.'); return }
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      toast.success('Announcement deleted.')
    } catch { toast.error('Network error.') }
    finally { setDeletingId(null) }
  }

  function copyInstCode() {
    if (!instCode) return
    navigator.clipboard.writeText(instCode).then(() => {
      setCodeCopied(true)
      toast.success('Institution code copied to clipboard!')
      setTimeout(() => setCodeCopied(false), 2500)
    })
  }

  function dismissCodeBanner() {
    setCodeDismissed(true)
    sessionStorage.setItem('oc_code_banner_dismissed', '1')
  }

  const firstName   = profile?.first_name || user?.email?.split('@')[0] || 'Admin'
  const institution = profile?.institutions?.name || 'OwnCampus'

  // Use server counts only — local Zustand entries are seeds/demo data, not real DB records.
  const totalStudents = stats.students || 0
  const totalFaculty  = stats.faculty  || 0

  const fmtFee = (n) => {
    if (!n || n === 0) return '₹0'
    if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`
    if (n >= 100000)   return `₹${(n/100000).toFixed(1)}L`
    if (n >= 1000)     return `₹${(n/1000).toFixed(0)}K`
    return `₹${n}`
  }

  const KPIS = [
    { label: 'Total Students',   value: totalStudents,                            sub: 'Enrolled in campus',     icon: GraduationCap, iconBg: '#F5F3FF', iconColor: '#7C3AED', href: null },
    { label: 'Total Faculty',    value: totalFaculty,                             sub: 'Active staff members',   icon: Users,         iconBg: '#ECFDF5', iconColor: '#059669', href: null },
    { label: 'Fee Collected',    value: fmtFee(stats.feeCollected || 0),          sub: 'Paid this term',         icon: CreditCard,    iconBg: '#EFF6FF', iconColor: '#2563EB', href: '/finance' },
    { label: 'Pending Requests', value: stats.pending,                            sub: 'Awaiting your approval', icon: AlertCircle,   iconBg: '#FEF2F2', iconColor: '#DC2626', href: null },
  ]

  const QUICK_LINKS = [
    { label: 'Manage Timetable', href: '/timetable',    icon: Clock,     color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Examinations',     href: '/examinations', icon: BookOpen,  color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Students List',    href: '/students',     icon: GraduationCap, color: '#059669', bg: '#ECFDF5' },
    { label: 'Faculty List',     href: '/faculty',      icon: Users,     color: '#D97706', bg: '#FFFBEB' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <CredentialsModal creds={approvedCreds} onClose={() => setApprovedCreds(null)} />

      {/* Greeting */}
      <motion.div {...fade(0)}>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>{institution}</p>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.02em' }} suppressHydrationWarning>
          {greeting}, {firstName} 👋
        </h1>
      </motion.div>

      {/* Institution Code banner — share with staff & students */}
      <AnimatePresence>
        {instCode && !codeDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.22 }}
            style={{ background: 'linear-gradient(135deg,#EFF6FF,#F5F3FF)', border: '1.5px solid #BFDBFE', borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={18} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 2px' }}>Your Institution Code</p>
              <p style={{ fontSize: 11.5, color: '#3B82F6', margin: '0 0 6px', lineHeight: 1.5 }}>Share this code with students and faculty — they need it to sign up.</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#FFFFFF', border: '1.5px solid #BFDBFE', borderRadius: 10, padding: '6px 14px' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#1E3A8A', letterSpacing: '0.12em', fontFamily: 'monospace' }}>{instCode}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={copyInstCode}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, border: 'none',
                  background: codeCopied ? '#10B981' : '#2563EB', color: '#FFFFFF',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
                {codeCopied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy Code</>}
              </motion.button>
              <button onClick={dismissCodeBanner}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #BFDBFE', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {KPIS.map((k, i) => (
          <motion.div key={k.label} {...fade(0.05 + i * 0.06)}
            style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: k.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <k.icon size={18} style={{ color: k.iconColor }} />
            </div>
            <div>
              <p style={{ fontSize: 30, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.03em', fontFamily: 'Inter, sans-serif' }}>{k.value}</p>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: C.text, margin: '2px 0 2px' }}>{k.label}</p>
              <p style={{ fontSize: 11.5, color: C.muted, margin: 0 }}>{k.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: Announcements + Access Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Announcements */}
        <motion.div className="lg:col-span-2" {...fade(0.14)} style={{ ...card }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Announcements</h2>
              <p style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>Post updates that all students and faculty can see</p>
            </div>
            <Megaphone size={18} color={C.primary} />
          </div>

          {/* Post form */}
          <form onSubmit={handlePost} style={{ marginBottom: 22, padding: 16, borderRadius: 13, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <input
              value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="Announcement title…"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13.5, fontWeight: 600, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 8 }}
            />
            <textarea
              value={newContent} onChange={e => setNewContent(e.target.value)}
              placeholder="Write the announcement details…"
              rows={3}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: C.sub, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={newType} onChange={e => setNewType(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 12, color: C.text, fontFamily: 'inherit', cursor: 'pointer' }}>
                {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={newAudience} onChange={e => setNewAudience(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 12, color: C.text, fontFamily: 'inherit', cursor: 'pointer' }}>
                {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <motion.button type="submit" disabled={posting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 9, background: 'linear-gradient(135deg,#1E40AF,#2563EB)', color: '#FFFFFF', border: 'none', fontSize: 12.5, fontWeight: 700, cursor: posting ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                {posting ? <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%' }} className="animate-spin" /> : <Send size={12} />}
                Post
              </motion.button>
            </div>
          </form>

          {/* Announcements list */}
          {!announcements.length && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: C.muted, fontSize: 13 }}>
              No announcements yet. Post your first one above.
            </div>
          )}
          <AnimatePresence>
            {announcements.map(ann => {
              const meta = TYPE_META[ann.type] || TYPE_META.general
              const ts   = new Date(ann.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              return (
                <motion.div key={ann.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                  style={{ padding: '14px 0', borderBottom: '1px solid #F8FAFC', display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                      {ann.is_pinned && <Pin size={11} color="#D97706" />}
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: meta.bg, color: meta.color }}>{meta.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#F8FAFC', color: C.muted, border: '1px solid #E2E8F0' }}>
                        {ann.target_audience === 'all' ? 'Everyone' : ann.target_audience === 'student' ? 'Students' : 'Faculty'}
                      </span>
                    </div>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: C.text, margin: '0 0 3px' }}>{ann.title}</p>
                    <p style={{ fontSize: 12.5, color: C.sub, margin: '0 0 4px', lineHeight: 1.5 }}>{ann.content}</p>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>By {ann.created_by_name || 'Admin'} · {ts}</p>
                  </div>
                  <button onClick={() => handleDeleteAnn(ann.id)} disabled={deletingId === ann.id}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FECACA', padding: 4, display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>

        {/* Access Queue */}
        <motion.div {...fade(0.18)} style={{ ...card }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>Access Requests</h2>
              <p style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>Approve new registrations</p>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <motion.button whileHover={{ scale: 1.05 }} onClick={fetchRequests}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 11, fontWeight: 600, color: C.sub, cursor: 'pointer' }}>
                <RefreshCw size={10} /> Refresh
              </motion.button>
              <PendingBadge count={pendingRequests.length} />
            </div>
          </div>
          <AccessQueue
            pending={pendingRequests}
            loading={loadingRequests}
            onApprove={handleApprove}
            onReject={handleReject}
            actionId={actionId}
          />
        </motion.div>
      </div>

      {/* Quick Links */}
      <motion.div {...fade(0.22)} style={card}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 16px' }}>Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_LINKS.map(l => (
            <Link key={l.label} href={l.href}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 11, background: l.bg, textDecoration: 'none', border: '1px solid transparent' }}>
              <l.icon size={16} color={l.color} />
              <span style={{ fontSize: 13, fontWeight: 600, color: l.color }}>{l.label}</span>
              <ChevronRight size={13} color={l.color} style={{ marginLeft: 'auto' }} />
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
