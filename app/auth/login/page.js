'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, GraduationCap, ArrowRight, ShieldCheck,
  UserCheck, ChevronLeft, ChevronRight, Send, Clock, Lock,
  User, Phone, Building2, Hash, UsersRound, UserPlus, LogIn,
  Users, BarChart3, BookOpen, Shield, CheckCircle, Zap,
  LayoutGrid,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

/* ─── Business logic (untouched) ────────────────────────────────────── */
const ADMIN_ROLES   = ['admin','administrator','super_admin','chairman','director','owner','principal','vice_principal','academic_coordinator']
const FACULTY_ROLES = ['teacher','faculty','trainer','hod','staff','librarian','counsellor','driver','helper']

function resolvePortalRole(r) {
  if (ADMIN_ROLES.includes(r))   return 'admin'
  if (FACULTY_ROLES.includes(r)) return 'faculty'
  if (r === 'student')           return 'student'
  return null
}

const ROLES = [
  {
    key:      'admin',
    label:    'Administrator',
    sublabel: 'Institution Administrator',
    icon:     ShieldCheck,
    color:    '#2563EB',
    lightBg:  '#EFF6FF',
    border:   '#BFDBFE',
    gradient: 'linear-gradient(135deg,#1E40AF 0%,#3B82F6 100%)',
    redirect: '/dashboard',
    desc:     'Full institution management, approvals & analytics',
    badge:    'Full Access',
  },
  {
    key:      'faculty',
    label:    'Faculty',
    sublabel: 'Teacher / Staff',
    icon:     UserCheck,
    color:    '#059669',
    lightBg:  '#ECFDF5',
    border:   '#A7F3D0',
    gradient: 'linear-gradient(135deg,#065F46 0%,#10B981 100%)',
    redirect: '/faculty/dashboard',
    desc:     'Timetable, attendance marking & student records',
    badge:    'Educator',
  },
  {
    key:      'student',
    label:    'Student',
    sublabel: 'Enrolled Student',
    icon:     GraduationCap,
    color:    '#7C3AED',
    lightBg:  '#F5F3FF',
    border:   '#DDD6FE',
    gradient: 'linear-gradient(135deg,#4C1D95 0%,#8B5CF6 100%)',
    redirect: '/student/dashboard',
    desc:     'Attendance, marks, timetable & campus services',
    badge:    'Learner',
  },
]

const FACULTY_DEPTS  = ['Mathematics','Physics','Chemistry','English','Biology','Computer Science','Social Studies','Physical Education','Other']
const FACULTY_DESIGS = ['HOD','Senior Faculty','Faculty','Lab Assistant','Visiting Faculty']
const CLASS_SECTIONS = ['9-A','9-B','10-A','10-B','11-A','11-B','11-Sci','11-Com','12-A','12-B','12-Sci','12-Com']

/* ─── Design tokens ──────────────────────────────────────────────────── */
const T = {
  accent:     '#2563EB',
  accentDark: '#1E40AF',
  text:       '#0F172A',
  muted:      '#64748B',
  subtle:     '#94A3B8',
  border:     '#E2E8F0',
  surface:    '#FFFFFF',
  bg:         '#F8FAFC',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  space: { 1: 8, 2: 16, 3: 24, 4: 32, 5: 48, 6: 64 },
}

const FEATURES = [
  { icon: Users,     title: 'Student Management',    desc: 'Complete lifecycle from admission to alumni'    },
  { icon: BarChart3, title: 'Real-time Analytics',   desc: 'Live dashboards, fee tracking & performance'   },
  { icon: BookOpen,  title: 'Academic Excellence',   desc: 'Exams, marks, library & curriculum delivery'   },
  { icon: Shield,    title: 'Enterprise Security',   desc: 'Role-based access control with audit logging'  },
]

const spring = { type: 'spring', stiffness: 400, damping: 30 }
const fade   = (d = 0) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.28, ease: [0.22,1,0.36,1] } })

/* ─── Premium Role Card ──────────────────────────────────────────────── */
function RoleCard({ role, index, onClick }) {
  const [hovered, setHovered] = useState(false)
  const Icon = role.icon
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.07, duration: 0.32, ease: [0.22,1,0.36,1] }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 20px', borderRadius: 16,
        background: hovered ? role.lightBg : '#FFFFFF',
        border: `1.5px solid ${hovered ? role.color + '35' : '#E8EDF4'}`,
        cursor: 'pointer', textAlign: 'left', width: '100%',
        boxShadow: hovered
          ? `inset 3px 0 0 ${role.color}, 0 12px 36px ${role.color}18, 0 2px 8px rgba(15,23,42,0.06)`
          : '0 1px 4px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.03)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
        outline: 'none',
      }}>

      {/* Icon */}
      <motion.div
        animate={{ scale: hovered ? 1.07 : 1 }}
        transition={spring}
        style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: hovered ? role.gradient : `linear-gradient(135deg, ${role.color}18 0%, ${role.color}08 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: hovered ? `0 8px 24px ${role.color}40` : `0 2px 8px ${role.color}12`,
          transition: 'all 0.22s ease',
        }}>
        <Icon size={22} color={hovered ? 'white' : role.color} strokeWidth={1.9} />
      </motion.div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.015em' }}>{role.label}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
            color: role.color, background: role.color + '14', padding: '2px 8px', borderRadius: 99,
            border: `1px solid ${role.color}22`, flexShrink: 0,
          }}>{role.badge}</span>
        </div>
        <span style={{ fontSize: 12.5, color: hovered ? role.color + 'bb' : '#64748B', lineHeight: 1.5, transition: 'color 0.2s', display: 'block' }}>
          {role.desc}
        </span>
      </div>

      {/* Arrow */}
      <motion.div
        animate={{ x: hovered ? 3 : 0 }}
        transition={spring}
        style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: hovered ? role.color : 'transparent',
          border: `1.5px solid ${hovered ? role.color : '#E2E8F0'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          boxShadow: hovered ? `0 4px 12px ${role.color}35` : 'none',
        }}>
        <ChevronRight size={14} color={hovered ? '#fff' : '#94A3B8'} strokeWidth={2.5} />
      </motion.div>
    </motion.button>
  )
}

/* ─── Premium Input ──────────────────────────────────────────────────── */
function PInput({ icon: Icon, accent = T.accent, focused, name, onFocus, onBlur, style: extraStyle, ...rest }) {
  const isFocused = focused === name
  return (
    <div style={{ position: 'relative' }}>
      {Icon && (
        <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <Icon size={15} color={isFocused ? accent : '#CBD5E1'} strokeWidth={2} />
        </div>
      )}
      <input
        onFocus={() => onFocus(name)}
        onBlur={() => onBlur(null)}
        style={{
          width: '100%', height: 52, boxSizing: 'border-box',
          padding: Icon ? '0 48px 0 44px' : '0 48px 0 16px',
          borderRadius: T.radius.md,
          border: `1.5px solid ${isFocused ? accent : T.border}`,
          background: isFocused ? '#FAFCFF' : T.surface,
          fontSize: 14, fontWeight: 400, color: T.text, fontFamily: 'inherit',
          outline: 'none',
          boxShadow: isFocused ? `0 0 0 4px ${accent}12` : 'none',
          transition: 'all 0.15s ease',
          ...extraStyle,
        }}
        {...rest}
      />
    </div>
  )
}

function Label({ children }) {
  return <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, letterSpacing: '-0.005em' }}>{children}</label>
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter()

  const [step,     setStep    ] = useState('role')
  const [role,     setRole    ] = useState(null)
  const [mode,     setMode    ] = useState('signin')
  const [email,    setEmail   ] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd ] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading,  setLoading ] = useState(false)
  const [focused,  setFocused ] = useState(null)
  const [details,  setDetails ] = useState({ name: '', dept: '', designation: '', phone: '', classSection: '', roll: '', branch: '' })
  const [branches,      setBranches     ] = useState([])
  const [loadingBranch, setLoadingBranch] = useState(false)

  const [instCode,    setInstCode   ] = useState('')
  const [instInfo,    setInstInfo   ] = useState(null)
  const [instError,   setInstError  ] = useState('')
  const [instLoading, setInstLoading] = useState(false)

  const setD = k => e => setDetails(p => ({ ...p, [k]: e.target.value }))
  const sel  = ROLES.find(r => r.key === role)
  const C    = sel?.color    || T.accent
  const G    = sel?.gradient || `linear-gradient(135deg,${T.accentDark},${T.accent})`

  /* ── Auth handlers ── */
  async function handleLogin(e) {
    e.preventDefault(); setLoading(true)
    try {
      const supabase = createClient()
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message.toLowerCase().includes('invalid') ? 'Incorrect email or password.' : error.message)

      let profile = null
      for (let a = 0; a < 5; a++) {
        if (a > 0) await new Promise(r => setTimeout(r, 300 * a))
        const { data } = await supabase
          .from('user_profiles')
          .select('role,first_name,last_name,metadata,institution_id,branch_id,is_active')
          .eq('id', authData.user.id)
          .single()
        if (data?.role && data.role !== 'guest') { profile = data; break }
        if (data) profile = data
      }

      if (profile?.is_active === false) {
        await supabase.auth.signOut()
        throw new Error('Your account has been deactivated. Contact your institution admin.')
      }

      const metaRole      = authData.user.user_metadata?.role
      const effectiveRole = (profile?.role && profile.role !== 'guest') ? profile.role : metaRole
      const portalRole    = resolvePortalRole(effectiveRole || '')
      if (!portalRole) throw new Error('Account role not configured. Contact admin.')

      let institutionId = profile?.institution_id || null
      if ((!profile?.role || profile.role === 'guest') && portalRole === 'admin') {
        const uMeta     = authData.user.user_metadata || {}
        const firstName = uMeta.first_name || authData.user.email.split('@')[0]
        const lastName  = uMeta.last_name  || ''

        if (!institutionId) {
          const instName = uMeta.institution_name || 'My Institution'
          const slug = instName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          const namePrefix  = instName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6).padEnd(4, 'X')
          const codeSuffix  = Date.now().toString(36).toUpperCase().slice(-4)
          const generatedCode = namePrefix + codeSuffix
          const { data: instRow } = await supabase
            .from('institutions')
            .insert({
              name: instName, type: (uMeta.institution_type || 'school').toLowerCase().replace(/\s+/g, '_'),
              slug: slug + '-' + Date.now().toString(36), code: generatedCode,
              email: authData.user.email, is_active: true, setup_done: false,
            })
            .select('id, code').single()
          institutionId = instRow?.id || null
        }

        await supabase.from('user_profiles').update({
          role: 'owner', first_name: firstName, last_name: lastName, institution_id: institutionId,
        }).eq('id', authData.user.id)
      }

      const KEYS = ['oc_role','oc_user_id','oc_user_name','oc_user_email',
                    'oc_user_class','oc_user_roll','oc_user_dept','oc_user_desig',
                    'oc_institution_id','oc_branch_id']
      KEYS.forEach(k => localStorage.removeItem(k))

      const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
        || authData.user.user_metadata?.full_name
        || authData.user.email.split('@')[0]

      localStorage.setItem('oc_role',       portalRole)
      localStorage.setItem('oc_user_id',    authData.user.id)
      localStorage.setItem('oc_user_name',  displayName)
      localStorage.setItem('oc_user_email', authData.user.email)
      if (institutionId)      localStorage.setItem('oc_institution_id', institutionId)
      if (profile?.branch_id) localStorage.setItem('oc_branch_id',     profile.branch_id)
      if (profile?.metadata) {
        const m = profile.metadata
        if (m.class_section) localStorage.setItem('oc_user_class', m.class_section)
        if (m.roll_number)   localStorage.setItem('oc_user_roll',  m.roll_number)
        if (m.department)    localStorage.setItem('oc_user_dept',  m.department)
        if (m.designation)   localStorage.setItem('oc_user_desig', m.designation)
      }

      router.push(portalRole === 'admin' ? '/dashboard' : portalRole === 'student' ? '/student/dashboard' : '/faculty/dashboard')
      router.refresh()
    } catch (err) { toast.error(err.message || 'Login failed.')
    } finally { setLoading(false) }
  }

  async function lookupInstitution(code) {
    const trimmed = (code || '').trim().toUpperCase()
    if (!trimmed || trimmed.length < 3) { setInstInfo(null); setInstError(''); return null }
    setInstLoading(true); setInstError(''); setInstInfo(null)
    try {
      const res  = await fetch(`/api/institutions/lookup?code=${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      if (!res.ok) { setInstError(data.error || 'Invalid institution code.'); return null }
      setInstInfo(data); setInstError('')
      return data
    } catch { setInstError('Could not verify institution code.'); return null }
    finally { setInstLoading(false) }
  }

  async function handleSignUpNext(e) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Please enter a valid email.'); return }
    let resolvedInst = instInfo
    if (!resolvedInst) {
      if (!instCode.trim()) { toast.error('Enter your institution code. Get it from your school admin.'); return }
      resolvedInst = await lookupInstitution(instCode)
    }
    if (!resolvedInst) { toast.error(instError || 'Invalid institution code. Check with your admin.'); return }
    setLoadingBranch(true)
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || [])).catch(() => {}).finally(() => setLoadingBranch(false))
    setStep('details')
  }

  async function handleDetailsSubmit(e) {
    e.preventDefault()
    if (!details.name.trim())  { toast.error('Please enter your full name.'); return }
    if (!details.phone.trim()) { toast.error('Please enter your phone number.'); return }
    const cleanPhone = details.phone.replace(/[\s\-().+]/g, '')
    if (!/^\d{10,15}$/.test(cleanPhone)) { toast.error('Enter a valid phone number (10–15 digits).'); return }
    if (role === 'faculty' && !details.dept)         { toast.error('Please select your department.'); return }
    if (role === 'student' && !details.classSection) { toast.error('Please select your class.'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/access-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: details.name.trim(), email: email.toLowerCase().trim(), role,
          classSection: details.classSection || null, rollNumber: details.roll || null,
          department: details.dept || null, designation: details.designation || null,
          phone: cleanPhone, branch: details.branch || null,
          institutionId: instInfo?.id || null, institutionCode: instCode || null }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit.')
      localStorage.setItem('oc_pending_email', email); localStorage.setItem('oc_pending_role', role)
      localStorage.setItem('oc_pending_name', details.name.trim()); localStorage.setItem('oc_user_name', details.name.trim())
      localStorage.setItem('oc_user_email', email)
      toast.success('Request submitted! Admin will email your credentials.')
      router.push('/auth/pending')
    } catch (err) { toast.error(err.message || 'Failed to submit.')
    } finally { setLoading(false) }
  }

  const selectStyle = (name) => ({
    width: '100%', height: 52, boxSizing: 'border-box',
    padding: '0 14px 0 44px',
    borderRadius: T.radius.md, border: `1.5px solid ${focused === name ? C : T.border}`,
    background: focused === name ? '#FAFCFF' : T.surface,
    fontSize: 14, color: T.text, fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
    boxShadow: focused === name ? `0 0 0 4px ${C}12` : 'none',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', system-ui, sans-serif", background: T.surface }}>

      {/* ════════════════ LEFT PANEL — 50% ════════════════ */}
      <div className="hidden lg:flex" style={{
        width: '50%', minWidth: 0, flexShrink: 0,
        flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: '100vh',
        background: 'linear-gradient(160deg, #080E2E 0%, #0F1F6B 30%, #1740B8 60%, #1D4ED8 80%, #2563EB 100%)',
      }}>
        {/* Dot-grid texture */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '26px 26px' }} />

        {/* Glow orbs */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.28, 0.18] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: -120, right: -80, width: 420, height: 420, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.15, 0.22, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{ position: 'absolute', bottom: -80, left: -60, width: 320, height: 320, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.28) 0%, transparent 65%)', pointerEvents: 'none' }} />
        {/* Subtle shimmer line */}
        <div style={{ position: 'absolute', top: '38%', left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)', pointerEvents: 'none' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '36px 52px' }}>

          {/* Logo */}
          <motion.div {...fade(0)} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 13,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}>
              <LayoutGrid size={19} color="white" strokeWidth={1.8} />
            </div>
            <div>
              <p style={{ fontSize: 17, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.025em', lineHeight: 1 }}>OwnCampus</p>
              <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.38)', fontWeight: 600, marginTop: 3, letterSpacing: '0.14em', textTransform: 'uppercase' }}>School ERP Platform</p>
            </div>
          </motion.div>

          {/* Headline block */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <motion.div {...fade(0.05)}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18,
                padding: '5px 14px', borderRadius: 99,
                background: 'rgba(165,180,252,0.12)', border: '1px solid rgba(165,180,252,0.22)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#A5B4FC' }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(165,180,252,0.9)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                  Education Operating System
                </span>
              </div>

              <h1 style={{ fontSize: 44, fontWeight: 900, color: '#FFFFFF', lineHeight: 1.08, letterSpacing: '-0.04em', marginBottom: 16 }}>
                The platform every<br />
                <span style={{ background: 'linear-gradient(90deg,#93C5FD,#C4B5FD,#86EFAC)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent', display: 'inline-block' }}>
                  institution
                </span>{' '}trusts.
              </h1>
              <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, maxWidth: 360, marginBottom: 28 }}>
                Modern enterprise software for schools, colleges, and universities. Built for scale.
              </p>
            </motion.div>

            {/* Stats strip */}
            <motion.div {...fade(0.10)} style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32,
              padding: '16px 20px', borderRadius: 14,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
              {[
                { value: '5,000+', label: 'Institutions' },
                { value: '2M+',    label: 'Students'     },
                { value: '99.9%',  label: 'Uptime'       },
              ].map((stat, i) => (
                <div key={stat.label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  {i > 0 && <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.10)', marginRight: 20, flexShrink: 0 }} />}
                  <div>
                    <p style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', margin: 0, lineHeight: 1, letterSpacing: '-0.025em' }}>{stat.value}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: '4px 0 0', fontWeight: 500, letterSpacing: '0.04em' }}>{stat.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Separator */}
            <motion.div {...fade(0.12)} style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 28 }} />

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {FEATURES.map((f, i) => {
                const Icon = f.icon
                return (
                  <motion.div key={f.title} {...fade(0.15 + i * 0.05)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '11px 0',
                      borderBottom: i < FEATURES.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.09)',
                      border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <Icon size={16} color="rgba(165,180,252,1)" strokeWidth={1.6} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: '0 0 2px', letterSpacing: '-0.01em' }}>{f.title}</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Bottom trust row */}
          <motion.div {...fade(0.42)} style={{ marginTop: 'auto', paddingTop: 20,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', flexShrink: 0, marginRight: 10, boxShadow: '0 0 6px #4ADE8099' }} className="animate-pulse" />
            {['Secure Login', 'Multi-Tenant', 'Role-Based Access', 'Powered by OwnCampus'].map((l, i) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && <span style={{ color: 'rgba(255,255,255,0.18)', margin: '0 9px', fontSize: 12 }}>·</span>}
                <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.48)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{l}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ════════════════ RIGHT PANEL ════════════════ */}
      <div className="lp-right" style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #FFFFFF 0%, #F8FAFF 55%, #F3F7FF 100%)',
        padding: '40px 24px', boxSizing: 'border-box',
      }}>

        {/* ── Mobile / tablet hero (hidden on desktop) ── */}
        <div className="lg:hidden" style={{
          padding: '48px 24px 44px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0,
        }}>
          {/* Dot-grid texture */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.055) 1px, transparent 1px)',
            backgroundSize: '22px 22px' }} />
          {/* Glow orbs */}
          <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(99,102,241,0.38) 0%, transparent 65%)' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -30, width: 160, height: 160, borderRadius: '50%', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 65%)' }} />

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 20, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 48, height: 48, borderRadius: 15,
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(0,0,0,0.22)' }}>
              <LayoutGrid size={21} color="white" strokeWidth={1.8} />
            </div>
            <div>
              <p style={{ fontSize: 21, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.028em', lineHeight: 1, margin: 0 }}>OwnCampus</p>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: 3, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '3px 0 0' }}>School ERP Platform</p>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            {[['5,000+', 'Institutions'], ['2M+', 'Students'], ['99.9%', 'Uptime']].map(([val, lbl], i) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,0.15)', margin: '0 16px', flexShrink: 0 }} />}
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>{val}</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', margin: '2px 0 0', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{lbl}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom shimmer line */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, pointerEvents: 'none',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)' }} />
        </div>

        {/* ── Content sheet ── */}
        <div className="lp-sheet" style={{ width: '100%', maxWidth: 448, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', minHeight: 'min-content' }}>

          {/* Signup stepper */}
          <AnimatePresence>
            {mode === 'signup' && step !== 'role' && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
                {['Role', 'Account', 'Profile'].map((label, i) => {
                  const current = step === 'form' ? 1 : 2
                  const done    = i < current
                  const active  = i === current
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <motion.div layout
                          style={{ width: 28, height: 28, borderRadius: '50%',
                            background: done ? C : active ? C : '#E2E8F0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: active ? `0 0 0 4px ${C}18` : 'none', transition: 'all 0.25s' }}>
                          {done ? <CheckCircle size={13} color="white" /> : <span style={{ fontSize: 11, fontWeight: 700, color: active ? 'white' : '#94A3B8' }}>{i + 1}</span>}
                        </motion.div>
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: (active || done) ? C : '#94A3B8', whiteSpace: 'nowrap', transition: 'color 0.25s' }}>{label}</span>
                      </div>
                      {i < 2 && (
                        <div style={{ flex: 1, height: 1.5, background: done ? C : T.border, margin: '0 8px', marginBottom: 22, borderRadius: 1, transition: 'background 0.3s' }} />
                      )}
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">

            {/* ══ STEP 1: Role Selection ══ */}
            {step === 'role' && (
              <motion.div key="role" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.26, ease: [0.22,1,0.36,1] }}>

                <div style={{ marginBottom: 36, textAlign: 'center' }}>
                  <motion.h2 {...fade(0)} style={{ fontSize: 30, fontWeight: 800, color: T.text, letterSpacing: '-0.035em', lineHeight: 1.15, margin: '0 0 10px' }}>
                    Welcome back <span style={{ display: 'inline-block', fontSize: 28 }}>👋</span>
                  </motion.h2>
                  <motion.p {...fade(0.04)} style={{ fontSize: 14, color: T.muted, margin: 0 }}>
                    Select your portal to continue
                  </motion.p>
                </div>

                {/* Role cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                  {ROLES.map((r, i) => (
                    <RoleCard key={r.key} role={r} index={i} onClick={() => { setRole(r.key); setStep('form') }} />
                  ))}
                </div>

                {/* Divider */}
                <motion.div {...fade(0.28)} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                  <div style={{ flex: 1, height: 1, background: T.border }} />
                  <span style={{ fontSize: 12, color: T.subtle, fontWeight: 500, whiteSpace: 'nowrap' }}>New to OwnCampus?</span>
                  <div style={{ flex: 1, height: 1, background: T.border }} />
                </motion.div>

                {/* Sign-up pill buttons */}
                <motion.div {...fade(0.32)} className="lp-pill-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
                  <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setRole('faculty'); setMode('signup'); setStep('form') }}
                    style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: 99, padding: '8px 18px',
                      fontSize: 13, fontWeight: 700, color: ROLES[1].color, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 1px 4px #05966914' }}>
                    <UserPlus size={13} /> Faculty sign-up
                  </motion.button>
                  <span style={{ color: T.border, fontSize: 14 }}>·</span>
                  <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setRole('student'); setMode('signup'); setStep('form') }}
                    style={{ background: '#F5F3FF', border: '1.5px solid #DDD6FE', borderRadius: 99, padding: '8px 18px',
                      fontSize: 13, fontWeight: 700, color: ROLES[2].color, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 1px 4px #7C3AED14' }}>
                    <GraduationCap size={13} /> Student sign-up
                  </motion.button>
                </motion.div>

                <motion.div {...fade(0.36)} style={{ display: 'flex', justifyContent: 'center' }}>
                  <Link href="/auth/signup" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '10px 22px', borderRadius: 99,
                    border: '1.5px solid #E2E8F0', background: 'white',
                    fontSize: 13, fontWeight: 600, color: T.text, textDecoration: 'none',
                    boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
                    transition: 'all 0.15s',
                  }}>
                    New institution?{' '}
                    <span style={{ color: T.accent }}>Register here</span>
                    <ArrowRight size={13} color={T.accent} />
                  </Link>
                </motion.div>
              </motion.div>
            )}

            {/* ══ STEP 2: Sign-in / Sign-up Form ══ */}
            {step === 'form' && sel && (
              <motion.div key="form" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.24, ease: [0.22,1,0.36,1] }}>

                {/* Nav row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                  <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}
                    onClick={() => { setStep('role'); setMode('signin'); setEmail(''); setPassword('') }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: T.radius.sm,
                      background: T.surface, border: `1px solid ${T.border}`, fontSize: 12.5, fontWeight: 600, color: T.muted, cursor: 'pointer' }}>
                    <ChevronLeft size={14} /> Back
                  </motion.button>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: T.radius.full,
                    background: sel.lightBg, border: `1.5px solid ${sel.border}` }}>
                    <div style={{ width: 18, height: 18, borderRadius: 6, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <sel.icon size={10} color="white" />
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: C }}>{sel.label} Portal</span>
                  </div>
                </div>

                {/* Mode toggle — not for admin */}
                {role !== 'admin' && (
                  <div style={{ display: 'flex', gap: 4, padding: 4, background: T.border + '55', borderRadius: 14, marginBottom: 28,
                    border: `1px solid ${T.border}` }}>
                    {[{ key: 'signin', label: 'Sign In', icon: LogIn }, { key: 'signup', label: 'Create Account', icon: UserPlus }].map(m => {
                      const Ic = m.icon
                      const active = mode === m.key
                      return (
                        <button key={m.key} onClick={() => { setMode(m.key); setPassword('') }}
                          style={{ flex: 1, height: 40, borderRadius: 11, border: 'none',
                            background: active ? T.surface : 'transparent',
                            color: active ? C : T.subtle, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit',
                            boxShadow: active ? '0 1px 6px rgba(15,23,42,0.08)' : 'none', transition: 'all 0.15s' }}>
                          <Ic size={13} /> {m.label}
                        </button>
                      )
                    })}
                  </div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 28, fontWeight: 800, color: T.text, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
                    {role === 'admin' ? 'Admin Sign In' : mode === 'signup' ? 'Create Account' : `Sign in as ${sel.label}`}
                  </h2>
                  <p style={{ fontSize: 14, color: T.muted, margin: 0 }}>
                    {mode === 'signup' ? 'Enter your email to begin registration' : sel.desc}
                  </p>
                </div>

                {/* Form card */}
                <div className="lp-card" style={{ background: T.surface, borderRadius: T.radius.xl, padding: 32, border: `1px solid ${T.border}`,
                  boxShadow: '0 4px 24px rgba(15,23,42,0.07), 0 1px 4px rgba(15,23,42,0.04)' }}>
                  <form onSubmit={mode === 'signup' ? handleSignUpNext : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    <div>
                      <Label>Email address</Label>
                      <PInput icon={User} name="email" focused={focused} onFocus={setFocused} onBlur={setFocused}
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="you@institution.edu" required autoComplete="email" accent={C} />
                    </div>

                    {mode === 'signup' && (
                      <div>
                        <Label>Institution Code *</Label>
                        <div style={{ position: 'relative' }}>
                          <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                            <Building2 size={15} color={focused === 'instCode' ? C : '#CBD5E1'} strokeWidth={2} />
                          </div>
                          <input
                            value={instCode}
                            onChange={e => { setInstCode(e.target.value.toUpperCase()); setInstInfo(null); setInstError('') }}
                            onBlur={() => { setFocused(null); if (instCode.trim().length >= 3) lookupInstitution(instCode) }}
                            onFocus={() => setFocused('instCode')}
                            placeholder="e.g. GRFLD001"
                            autoComplete="off" spellCheck={false}
                            style={{
                              width: '100%', height: 52, boxSizing: 'border-box',
                              padding: '0 48px 0 44px', borderRadius: T.radius.md,
                              border: `1.5px solid ${instError ? '#EF4444' : instInfo ? '#10B981' : focused === 'instCode' ? C : T.border}`,
                              background: instInfo ? '#F0FDF4' : focused === 'instCode' ? '#FAFCFF' : T.surface,
                              fontSize: 14, fontWeight: 600, color: T.text, fontFamily: 'inherit',
                              outline: 'none', letterSpacing: '0.08em', transition: 'all 0.15s',
                            }}
                          />
                          <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                            {instLoading && <div style={{ width: 16, height: 16, border: '2px solid #CBD5E1', borderTop: `2px solid ${C}`, borderRadius: '50%' }} className="animate-spin" />}
                            {!instLoading && instInfo && <CheckCircle size={16} color="#10B981" />}
                          </div>
                        </div>
                        {instInfo && (
                          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>{instInfo.name}</span>
                            <span style={{ fontSize: 11, color: '#94A3B8', textTransform: 'capitalize' }}>· {(instInfo.type || '').replace(/_/g, ' ')}</span>
                          </div>
                        )}
                        {instError && !instInfo && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 5, fontWeight: 500 }}>{instError}</p>}
                        {!instInfo && !instError && <p style={{ fontSize: 11.5, color: T.subtle, marginTop: 5 }}>Ask your institution admin for the code.</p>}
                      </div>
                    )}

                    {mode === 'signin' && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Label>Password</Label>
                          <Link href="/auth/forgot-password" style={{ fontSize: 12.5, fontWeight: 600, color: C, textDecoration: 'none' }}>Forgot?</Link>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <PInput icon={Lock} name="pwd" focused={focused} onFocus={setFocused} onBlur={setFocused}
                            type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••••••" required autoComplete="current-password" accent={C} />
                          <button type="button" onClick={() => setShowPwd(v => !v)}
                            style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                              background: 'none', border: 'none', cursor: 'pointer', color: T.subtle, display: 'flex', padding: 2 }}>
                            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    )}

                    {mode === 'signin' && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                        <div onClick={() => setRemember(v => !v)}
                          style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${remember ? C : '#CBD5E1'}`,
                            background: remember ? C : T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'all 0.15s', cursor: 'pointer' }}>
                          <AnimatePresence>
                            {remember && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.12 }}>
                              <CheckCircle size={12} color="white" strokeWidth={3} style={{ display: 'block' }} />
                            </motion.div>}
                          </AnimatePresence>
                        </div>
                        <span style={{ fontSize: 13.5, color: T.muted, fontWeight: 500 }}>Keep me signed in for 30 days</span>
                      </label>
                    )}

                    {/* Submit */}
                    <motion.button type="submit" disabled={loading}
                      whileHover={loading ? {} : { y: -1, boxShadow: `0 12px 32px ${C}50` }}
                      whileTap={loading ? {} : { scale: 0.99 }}
                      style={{ width: '100%', height: 54, borderRadius: 14, border: 'none',
                        background: loading ? '#94A3B8' : G, color: '#FFFFFF', fontSize: 15, fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: loading ? 'none' : `0 4px 18px ${C}40`, fontFamily: 'inherit',
                        transition: 'background 0.2s, box-shadow 0.2s' }}>
                      {loading
                        ? <><div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%', flexShrink: 0 }} className="animate-spin" />{mode === 'signin' ? 'Signing in…' : 'Please wait…'}</>
                        : mode === 'signup'
                          ? <><UserPlus size={16} /> Continue <ArrowRight size={14} /></>
                          : <><LogIn size={16} /> Sign in <ArrowRight size={14} /></>}
                    </motion.button>
                  </form>

                  {role === 'admin' && mode === 'signin' && (
                    <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: T.radius.md, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', gap: 10 }}>
                      <Zap size={14} color="#2563EB" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 12.5, color: '#1E40AF', margin: 0, lineHeight: 1.6 }}>Use the admin credentials configured in your Supabase project.</p>
                    </div>
                  )}
                  {mode === 'signup' && (
                    <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: T.radius.md, background: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', gap: 10 }}>
                      <Clock size={14} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 12.5, color: '#92400E', margin: 0, lineHeight: 1.6 }}>After submitting your profile, the admin reviews your request and emails credentials.</p>
                    </div>
                  )}
                </div>

                {/* Trust row */}
                <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {['Encrypted', 'Role-Based', 'Audit Logged'].map((l, i) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {i > 0 && <span style={{ color: T.border, marginRight: 2 }}>·</span>}
                      <Shield size={10} color={T.border} strokeWidth={2} />
                      <span style={{ fontSize: 11, color: T.subtle, fontWeight: 500 }}>{l}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ══ STEP 3: Profile Details ══ */}
            {step === 'details' && sel && (
              <motion.div key="details" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.24, ease: [0.22,1,0.36,1] }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                  <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }} onClick={() => setStep('form')}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: T.radius.sm,
                      background: T.surface, border: `1px solid ${T.border}`, fontSize: 12.5, fontWeight: 600, color: T.muted, cursor: 'pointer' }}>
                    <ChevronLeft size={14} /> Back
                  </motion.button>
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: T.text, letterSpacing: '-0.025em', margin: 0 }}>
                      {role === 'faculty' ? 'Your Details' : 'Student Profile'}
                    </h2>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, padding: '14px 16px', borderRadius: T.radius.md, marginBottom: 16,
                  background: sel.lightBg, border: `1px solid ${sel.border}` }}>
                  <Clock size={15} style={{ color: C, flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C, margin: '0 0 2px' }}>Pending admin approval</p>
                    <p style={{ fontSize: 12.5, color: T.muted, margin: 0, lineHeight: 1.55 }}>Once approved, you'll receive an email with your login credentials.</p>
                  </div>
                </div>

                {instInfo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: T.radius.md, marginBottom: 16,
                    background: '#F0FDF4', border: '1px solid #A7F3D0' }}>
                    <CheckCircle size={15} color="#059669" style={{ flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#059669', margin: 0 }}>{instInfo.name}</p>
                      <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>Institution code: {instInfo.code}</p>
                    </div>
                  </div>
                )}

                <div className="lp-card" style={{ background: T.surface, borderRadius: T.radius.xl, padding: 32, border: `1px solid ${T.border}`,
                  boxShadow: '0 4px 24px rgba(15,23,42,0.07), 0 1px 4px rgba(15,23,42,0.04)' }}>
                  <form onSubmit={handleDetailsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                    <div>
                      <Label>Full Name *</Label>
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                          <User size={15} color={focused === 'name' ? C : '#CBD5E1'} />
                        </div>
                        <input value={details.name} onChange={setD('name')} placeholder={role === 'faculty' ? 'Dr. Priya Sharma' : 'Rahul Sharma'}
                          onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} required
                          style={{ ...selectStyle('name'), padding: '0 16px 0 44px' }} />
                      </div>
                    </div>

                    {role === 'faculty' && (
                      <div className="lp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <Label>Department *</Label>
                          <div style={{ position: 'relative' }}>
                            <Building2 size={15} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: focused === 'dept' ? C : '#CBD5E1', pointerEvents: 'none' }} />
                            <select value={details.dept} onChange={setD('dept')} onFocus={() => setFocused('dept')} onBlur={() => setFocused(null)} style={selectStyle('dept')}>
                              <option value="">Select…</option>
                              {FACULTY_DEPTS.map(d => <option key={d}>{d}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <Label>Designation</Label>
                          <div style={{ position: 'relative' }}>
                            <Users size={15} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: focused === 'desig' ? C : '#CBD5E1', pointerEvents: 'none' }} />
                            <select value={details.designation} onChange={setD('designation')} onFocus={() => setFocused('desig')} onBlur={() => setFocused(null)} style={{ ...selectStyle('desig') }}>
                              <option value="">Select…</option>
                              {FACULTY_DESIGS.map(d => <option key={d}>{d}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {role === 'student' && (
                      <div className="lp-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <Label>Class & Section *</Label>
                          <div style={{ position: 'relative' }}>
                            <UsersRound size={15} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: focused === 'cls' ? C : '#CBD5E1', pointerEvents: 'none' }} />
                            <select value={details.classSection} onChange={setD('classSection')} onFocus={() => setFocused('cls')} onBlur={() => setFocused(null)} style={selectStyle('cls')}>
                              <option value="">Select…</option>
                              {CLASS_SECTIONS.map(c => <option key={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <Label>Roll Number</Label>
                          <div style={{ position: 'relative' }}>
                            <Hash size={15} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: focused === 'roll' ? C : '#CBD5E1', pointerEvents: 'none' }} />
                            <input value={details.roll} onChange={setD('roll')} placeholder="A001"
                              onFocus={() => setFocused('roll')} onBlur={() => setFocused(null)}
                              style={{ ...selectStyle('roll') }} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label>Branch</Label>
                      <div style={{ position: 'relative' }}>
                        <Building2 size={15} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: focused === 'branch' ? C : '#CBD5E1', pointerEvents: 'none' }} />
                        <select value={details.branch} onChange={setD('branch')} onFocus={() => setFocused('branch')} onBlur={() => setFocused(null)} style={selectStyle('branch')}>
                          <option value="">{loadingBranch ? 'Loading…' : branches.length === 0 ? 'No branches configured' : 'Select branch…'}</option>
                          {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label>Phone Number *</Label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={15} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: focused === 'phone' ? C : '#CBD5E1', pointerEvents: 'none' }} />
                        <input type="tel" value={details.phone} onChange={setD('phone')} placeholder="+91 98765 43210"
                          onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)}
                          style={{ ...selectStyle('phone') }} />
                      </div>
                    </div>

                    <motion.button type="submit" disabled={loading}
                      whileHover={loading ? {} : { y: -1, boxShadow: `0 12px 32px ${C}50` }}
                      whileTap={loading ? {} : { scale: 0.99 }}
                      style={{ width: '100%', height: 54, borderRadius: 14, border: 'none',
                        background: loading ? '#94A3B8' : G, color: '#FFFFFF', fontSize: 15, fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: loading ? 'none' : `0 4px 18px ${C}40`, fontFamily: 'inherit', marginTop: 4, transition: 'background 0.2s' }}>
                      {loading
                        ? <><div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%' }} className="animate-spin" /> Submitting…</>
                        : <><Send size={15} /> Send Access Request</>}
                    </motion.button>
                  </form>
                </div>

                <p style={{ marginTop: 16, fontSize: 12.5, color: T.subtle, textAlign: 'center' }}>
                  Registering as <strong style={{ color: '#374151', fontWeight: 600 }}>{email}</strong>
                  {' · '}
                  <button onClick={() => { setStep('form'); setMode('signup') }}
                    style={{ background: 'none', border: 'none', color: T.accent, fontWeight: 600, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit', padding: 0 }}>
                    Change email
                  </button>
                  {' · '}
                  <button onClick={() => { setStep('role'); setMode('signin'); setEmail('') }}
                    style={{ background: 'none', border: 'none', color: T.subtle, fontWeight: 600, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit', padding: 0 }}>
                    Cancel
                  </button>
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
