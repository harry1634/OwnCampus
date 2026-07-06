'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, ChevronLeft, Check, X, Pause, Play, Trash2,
  CreditCard, LifeBuoy, Clock, Save, Toggle, Zap, User, Mail, Plus,
  Eye, EyeOff, Copy, Send, KeyRound, RefreshCw, InboxIcon,
} from 'lucide-react'
import { toast } from 'sonner'

const STATUS_CONFIG = {
  pending:      { bg: '#FFF7ED', color: '#C2410C', label: 'Pending'      },
  trial:        { bg: '#EFF6FF', color: '#1D4ED8', label: 'Trial'        },
  active:       { bg: '#F0FDF4', color: '#15803D', label: 'Active'       },
  grace_period: { bg: '#FFFBEB', color: '#D97706', label: 'Grace Period' },
  suspended:    { bg: '#FEF2F2', color: '#B91C1C', label: 'Suspended'    },
  expired:      { bg: '#F8FAFC', color: '#64748B', label: 'Expired'      },
  cancelled:    { bg: '#F8FAFC', color: '#475569', label: 'Cancelled'    },
}

const MODULES = [
  { key: 'students',      label: 'Students'        },
  { key: 'faculty',       label: 'Faculty'         },
  { key: 'attendance',    label: 'Attendance'      },
  { key: 'finance',       label: 'Finance & Fees'  },
  { key: 'library',       label: 'Library'         },
  { key: 'hostel',        label: 'Hostel'          },
  { key: 'transport',     label: 'Transport'       },
  { key: 'timetable',     label: 'Timetable'       },
  { key: 'hrms',          label: 'HRMS'            },
  { key: 'lms',           label: 'LMS'             },
  { key: 'analytics',     label: 'Analytics'       },
  { key: 'communication', label: 'Communication'   },
  { key: 'examinations',  label: 'Examinations'    },
  { key: 'admissions',    label: 'Admissions'      },
  { key: 'placement',     label: 'Placement'       },
]

const STATUS_TRANSITIONS = {
  pending:      [{ label: 'Approve (Trial)',   value: 'trial',        color: '#1D4ED8' }, { label: 'Approve (Active)', value: 'active', color: '#15803D' }, { label: 'Cancel', value: 'cancelled', color: '#B91C1C' }],
  trial:        [{ label: 'Activate',          value: 'active',       color: '#15803D' }, { label: 'Grace Period', value: 'grace_period', color: '#D97706' }, { label: 'Suspend', value: 'suspended', color: '#D97706' }, { label: 'Expire', value: 'expired', color: '#64748B' }, { label: 'Cancel', value: 'cancelled', color: '#B91C1C' }],
  active:       [{ label: 'Grace Period',      value: 'grace_period', color: '#D97706' }, { label: 'Suspend', value: 'suspended', color: '#D97706' }, { label: 'Expire', value: 'expired', color: '#64748B' }, { label: 'Cancel', value: 'cancelled', color: '#B91C1C' }],
  grace_period: [{ label: 'Reactivate',        value: 'active',       color: '#15803D' }, { label: 'Suspend', value: 'suspended', color: '#D97706' }, { label: 'Expire', value: 'expired', color: '#64748B' }, { label: 'Cancel', value: 'cancelled', color: '#B91C1C' }],
  suspended:    [{ label: 'Reactivate',        value: 'active',       color: '#15803D' }, { label: 'Cancel', value: 'cancelled', color: '#B91C1C' }],
  expired:      [{ label: 'Reactivate',        value: 'active',       color: '#15803D' }, { label: 'Cancel', value: 'cancelled', color: '#B91C1C' }],
  cancelled:    [{ label: 'Reactivate',        value: 'active',       color: '#15803D' }],
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 18px', borderRadius: 8, border: 'none', fontFamily: 'inherit',
      background: active ? '#EFF6FF' : 'transparent', color: active ? '#1D4ED8' : '#64748B',
      fontSize: 13.5, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s',
    }}>{children}</button>
  )
}

export default function InstitutionDetail({ params }) {
  const { id } = use(params)
  const router  = useRouter()

  const [data,          setData         ] = useState(null)
  const [loading,       setLoading      ] = useState(true)
  const [tab,           setTab          ] = useState('overview')
  const [saving,        setSaving       ] = useState(false)
  const [statusModal,   setStatusModal  ] = useState({ open: false, status: null, reason: '' })
  const [provisionModal, setProvisionModal] = useState({ open: false, adminEmail: '', adminName: '', loading: false })
  const [paymentModal,   setPaymentModal ] = useState({ open: false, billing_month: '', amount: '', note: '' })
  const [rejectModal,    setRejectModal  ] = useState({ open: false, requestId: null, reason: '' })
  const [credentials,    setCredentials  ] = useState(null)
  const [credLoading,    setCredLoading  ] = useState(false)
  const [showPassword,   setShowPassword ] = useState(false)
  const [resendModal,    setResendModal  ] = useState({ open: false, toEmail: '', sending: false })
  const [resetPwdLoading, setResetPwdLoading] = useState(false)
  const [emails,          setEmails      ] = useState(null)
  const [emailsLoading,   setEmailsLoading] = useState(false)
  const [viewEmail,       setViewEmail   ] = useState(null)

  // License form state
  const [lic, setLic] = useState({
    billing_cycle: 'monthly', monthly_fee: 0, valid_from: '', valid_until: '',
    grace_period_days: 7,
    max_students: 500, max_faculty: 50, max_admins: 5, max_branches: 1, max_storage_gb: 5,
    max_departments: 20, max_courses: 50, max_classes: 100,
    max_library_books: 5000, max_hostel_rooms: 100, max_vehicles: 20,
    max_transport_routes: 10, max_api_requests: 100000, max_realtime_connections: 50,
    discount_percent: 0, discount_reason: '', notes: '',
  })

  // Modules state
  const [moduleState, setModuleState] = useState({})

  useEffect(() => {
    fetch(`/api/control/institutions/${id}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        if (d.license) {
          const lc = d.license
          setLic({
            billing_cycle:            lc.billing_cycle            || 'monthly',
            monthly_fee:              lc.monthly_fee              || 0,
            valid_from:               lc.valid_from               || '',
            valid_until:              lc.valid_until              || '',
            grace_period_days:        lc.grace_period_days        ?? 7,
            max_students:             lc.max_students             ?? 500,
            max_faculty:              lc.max_faculty              ?? 50,
            max_admins:               lc.max_admins               ?? 5,
            max_branches:             lc.max_branches             ?? 1,
            max_storage_gb:           lc.max_storage_gb           ?? 5,
            max_departments:          lc.max_departments          ?? 20,
            max_courses:              lc.max_courses              ?? 50,
            max_classes:              lc.max_classes              ?? 100,
            max_library_books:        lc.max_library_books        ?? 5000,
            max_hostel_rooms:         lc.max_hostel_rooms         ?? 100,
            max_vehicles:             lc.max_vehicles             ?? 20,
            max_transport_routes:     lc.max_transport_routes     ?? 10,
            max_api_requests:         lc.max_api_requests         ?? 100000,
            max_realtime_connections: lc.max_realtime_connections ?? 50,
            discount_percent:         lc.discount_percent         ?? 0,
            discount_reason:          lc.discount_reason          || '',
            notes:                    lc.notes                    || '',
          })
        }
        // Build module map — default all enabled
        const mMap = {}
        MODULES.forEach(m => { mMap[m.key] = true })
        ;(d.modules || []).forEach(m => { mMap[m.module_key] = m.is_enabled })
        setModuleState(mMap)
      })
      .finally(() => setLoading(false))
  }, [id])

  // Load credentials once the institution data confirms provisioning
  useEffect(() => {
    if (!data?.institution?.provisioned_at) return
    setCredLoading(true)
    fetch(`/api/control/institutions/${id}/credentials`)
      .then(r => r.json())
      .then(d => setCredentials(d))
      .catch(() => {})
      .finally(() => setCredLoading(false))
  }, [id, data?.institution?.provisioned_at])

  // Load emails list when that tab is first opened
  useEffect(() => {
    if (tab !== 'emails') return
    if (emails !== null)  return
    setEmailsLoading(true)
    fetch(`/api/control/institutions/${id}/emails`)
      .then(r => r.json())
      .then(d => setEmails(d.emails || []))
      .catch(() => setEmails([]))
      .finally(() => setEmailsLoading(false))
  }, [tab, id, emails])

  async function refreshEmails() {
    setEmailsLoading(true)
    setEmails(null)
    fetch(`/api/control/institutions/${id}/emails`)
      .then(r => r.json())
      .then(d => setEmails(d.emails || []))
      .catch(() => setEmails([]))
      .finally(() => setEmailsLoading(false))
  }

  async function handleResetPassword() {
    if (!window.confirm('Generate a NEW temporary password?\n\nThe current password will be invalidated immediately. Make sure to send the new credentials to the admin.')) return
    setResetPwdLoading(true)
    try {
      const res  = await fetch(`/api/control/institutions/${id}/reset-password`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setCredentials(c => ({ ...c, temp_password: json.temp_password }))
      setShowPassword(true)
      toast.success('New password generated. The old password is now invalid.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setResetPwdLoading(false)
    }
  }

  async function handleResendEmail() {
    const toEmail = resendModal.toEmail.trim() || credentials?.admin_email || ''
    if (!toEmail) { toast.error('Enter an email address.'); return }
    setResendModal(m => ({ ...m, sending: true }))
    try {
      const res  = await fetch(`/api/control/institutions/${id}/credentials`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_email: toEmail }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(`Credentials sent to ${json.sent_to}`)
      setResendModal({ open: false, toEmail: '', sending: false })
    } catch (err) {
      toast.error(err.message)
      setResendModal(m => ({ ...m, sending: false }))
    }
  }

  function changeStatus(newStatus) {
    setStatusModal({ open: true, status: newStatus, reason: '' })
  }

  async function confirmStatusChange() {
    const { status, reason } = statusModal
    setStatusModal(m => ({ ...m, open: false }))
    setSaving(true)
    try {
      const res = await fetch(`/api/control/institutions/${id}/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(`Status updated to ${status}`)
      setData(d => ({ ...d, institution: { ...d.institution, control_status: status } }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveLicense() {
    setSaving(true)
    try {
      const res = await fetch(`/api/control/institutions/${id}/license`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lic),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('License configuration saved.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function confirmProvision() {
    const { adminEmail, adminName } = provisionModal
    if (!adminEmail.trim()) { toast.error('Admin email is required.'); return }
    if (!adminName.trim())  { toast.error('Admin name is required.');  return }
    setProvisionModal(m => ({ ...m, loading: true }))
    try {
      const res  = await fetch(`/api/control/institutions/${id}/provision`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_email: adminEmail.trim(), admin_name: adminName.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Institution provisioned! Welcome email sent.')
      setProvisionModal({ open: false, adminEmail: '', adminName: '', loading: false })
      setData(d => ({ ...d, institution: { ...d.institution, provisioned_at: new Date().toISOString() } }))
    } catch (err) {
      toast.error(err.message)
      setProvisionModal(m => ({ ...m, loading: false }))
    }
  }

  async function addPaymentEntry() {
    const { billing_month, amount, note } = paymentModal
    if (!billing_month) { toast.error('Billing month is required.'); return }
    if (!amount || isNaN(Number(amount))) { toast.error('Enter a valid amount.'); return }
    setSaving(true)
    try {
      const res  = await fetch(`/api/control/institutions/${id}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing_month, total_amount: Number(amount), payment_status: 'paid', notes: note }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Payment entry added.')
      setPaymentModal({ open: false, billing_month: '', amount: '', note: '' })
      setData(d => ({ ...d, payments: [json.payment, ...(d.payments || [])] }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveModules() {
    setSaving(true)
    try {
      const res = await fetch(`/api/control/institutions/${id}/modules`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: moduleState }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Module access saved.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleModuleRequest(requestId, action, rejectionReason) {
    setSaving(true)
    try {
      const res = await fetch(`/api/control/institutions/${id}/module-requests`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, action, rejection_reason: rejectionReason || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(action === 'approve' ? 'Module request approved. Module is now enabled.' : 'Module request rejected.')
      setData(d => ({
        ...d,
        moduleRequests: (d.moduleRequests || []).map(r =>
          r.id === requestId ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r
        ),
      }))
      if (action === 'approve') {
        const req = data?.moduleRequests?.find(r => r.id === requestId)
        if (req) setModuleState(s => ({ ...s, [req.module_key]: true }))
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
      <div style={{ width: 26, height: 26, border: '2.5px solid #E2E8F0', borderTop: '2.5px solid #3B82F6', borderRadius: '50%' }} className="animate-spin" />
    </div>
  )

  const inst       = data?.institution || {}
  const statusCfg  = STATUS_CONFIG[inst.control_status] || STATUS_CONFIG.pending
  const transitions = STATUS_TRANSITIONS[inst.control_status] || []

  const inputStyle = {
    width: '100%', height: 42, boxSizing: 'border-box', padding: '0 12px',
    border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13.5,
    color: '#0F172A', fontFamily: 'inherit', outline: 'none', background: '#FAFCFF',
  }
  const L = (label) => <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>{label}</label>

  return (
    <div>
      {/* Back */}
      <button onClick={() => router.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 20, background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 13, fontFamily: 'inherit' }}>
        <ChevronLeft size={14} /> Back to Institutions
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={22} color="#1D4ED8" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.025em' }}>{inst.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12.5, color: '#94A3B8' }}>{inst.code}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#CBD5E1', display: 'inline-block' }} />
              <span style={{ fontSize: 12.5, color: '#94A3B8', textTransform: 'capitalize' }}>{(inst.type || '').replace(/_/g, ' ')}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
            </div>
          </div>
        </div>

        {/* Status actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {!inst.provisioned_at && (inst.control_status === 'trial' || inst.control_status === 'active') && (
            <button
              onClick={() => setProvisionModal({ open: true, adminEmail: inst.temp_admin_email || '', adminName: '', loading: false })}
              style={{
                padding: '8px 16px', borderRadius: 9, border: '1.5px solid #16A34A25',
                background: '#16A34A0f', color: '#16A34A', fontSize: 12.5, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <Zap size={12} /> Provision
            </button>
          )}
          {transitions.map(t => (
            <button
              key={t.value}
              onClick={() => changeStatus(t.value)}
              disabled={saving}
              style={{
                padding: '8px 16px', borderRadius: 9, border: `1.5px solid ${t.color}25`,
                background: t.color + '0f', color: t.color, fontSize: 12.5, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F8FAFC', padding: 4, borderRadius: 10, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {['overview', 'license', 'modules', 'payments', 'emails', 'support'].map(t => (
          <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</TabBtn>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top row: Info + Credentials side by side on wide screens */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {/* Institution Info */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF4', borderRadius: 16, padding: 22 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Institution Info</h3>
              {[
                ['Name',        inst.name],
                ['Email',       inst.email],
                ['Code',        inst.code],
                ['Type',        (inst.type || '').replace(/_/g, ' ')],
                ['Status',      inst.control_status],
                ['Approved At', inst.approved_at ? new Date(inst.approved_at).toLocaleDateString('en-IN') : '—'],
                ['Created',     inst.created_at ? new Date(inst.created_at).toLocaleDateString('en-IN') : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F8FAFC', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500, flexShrink: 0 }}>{k}</span>
                  <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 600, textTransform: 'capitalize', textAlign: 'right', wordBreak: 'break-all' }}>{v || '—'}</span>
                </div>
              ))}
            </div>

            {/* Admin Credentials — always shown; state changes based on provisioning */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF4', borderRadius: 16, padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <KeyRound size={14} color="#1D4ED8" />
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Admin Credentials</h3>
                </div>
                {inst.provisioned_at && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={handleResetPassword}
                      disabled={resetPwdLoading}
                      title="Generate a new temporary password"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1.5px solid #D9770625', background: '#FFFBEB', color: '#B45309', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: resetPwdLoading ? 0.6 : 1 }}>
                      <RefreshCw size={11} className={resetPwdLoading ? 'animate-spin' : ''} />
                      {resetPwdLoading ? 'Resetting…' : 'Reset Pwd'}
                    </button>
                    <button
                      onClick={() => setResendModal({ open: true, toEmail: '', sending: false })}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1.5px solid #2563EB25', background: '#EFF6FF', color: '#1D4ED8', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <Send size={11} /> Send Email
                    </button>
                  </div>
                )}
              </div>

              {!inst.provisioned_at ? (
                /* Not yet provisioned — show CTA */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 20px', textAlign: 'center', background: '#F8FAFC', borderRadius: 12, border: '1.5px dashed #CBD5E1' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Zap size={18} color="#1D4ED8" />
                  </div>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>Not Provisioned Yet</p>
                  <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 16px', lineHeight: 1.5 }}>
                    This institution has no admin account. Click Provision to create one and send credentials.
                  </p>
                  {(inst.control_status === 'trial' || inst.control_status === 'active') ? (
                    <button
                      onClick={() => setProvisionModal({ open: true, adminEmail: inst.temp_admin_email || '', adminName: '', loading: false })}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 9, border: '1.5px solid #16A34A25', background: '#F0FDF4', color: '#15803D', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <Zap size={13} /> Provision Institution
                    </button>
                  ) : (
                    <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                      Set status to <strong>Trial</strong> or <strong>Active</strong> before provisioning.
                    </p>
                  )}
                </div>
              ) : credLoading ? (
                <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Loading credentials…</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Admin Email */}
                  <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Admin Email</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A', wordBreak: 'break-all' }}>
                        {credentials?.admin_email || inst.temp_admin_email || '—'}
                      </span>
                      {(credentials?.admin_email || inst.temp_admin_email) && (
                        <button
                          onClick={() => { navigator.clipboard.writeText(credentials?.admin_email || inst.temp_admin_email); toast.success('Email copied') }}
                          style={{ flexShrink: 0, padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#FFF', color: '#64748B', cursor: 'pointer' }}>
                          <Copy size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Temp Password */}
                  <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Temporary Password</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#9A3412', fontFamily: 'monospace', letterSpacing: '0.06em', wordBreak: 'break-all' }}>
                        {credentials?.temp_password
                          ? (showPassword ? credentials.temp_password : '•'.repeat(credentials.temp_password.length))
                          : '— not available —'}
                      </span>
                      {credentials?.temp_password && (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => setShowPassword(v => !v)}
                            title={showPassword ? 'Hide password' : 'Show password'}
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #FED7AA', background: '#FFF', color: '#C2410C', cursor: 'pointer' }}>
                            {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button
                            onClick={() => { navigator.clipboard.writeText(credentials.temp_password); toast.success('Password copied') }}
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #FED7AA', background: '#FFF', color: '#C2410C', cursor: 'pointer' }}>
                            <Copy size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    {!credentials?.temp_password && (
                      <p style={{ fontSize: 11, color: '#C2410C', margin: '6px 0 0', lineHeight: 1.5 }}>
                        Password not stored. Use "Send Email" to resend credentials to the admin's inbox.
                      </p>
                    )}
                  </div>

                  {/* Login URL */}
                  <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Login URL</p>
                      <span style={{ fontSize: 12.5, color: '#2563EB', fontWeight: 600, wordBreak: 'break-all' }}>
                        {(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + '/auth/login'}
                      </span>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText((process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + '/auth/login'); toast.success('URL copied') }}
                      style={{ flexShrink: 0, padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#FFF', color: '#64748B', cursor: 'pointer' }}>
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Usage — full-width row below */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF4', borderRadius: 16, padding: 22 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Usage</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '4px 32px' }}>
              {[
                ['Students',         data?.usage?.students        ?? 0, lic.max_students],
                ['Faculty & Staff',  data?.usage?.faculty         ?? 0, lic.max_faculty],
                ['Admins',           data?.usage?.admins          ?? 0, lic.max_admins],
                ['Branches',         data?.usage?.branches        ?? 0, lic.max_branches],
                ['Library Books',    data?.usage?.libraryBooks    ?? 0, lic.max_library_books],
                ['Hostel Rooms',     data?.usage?.hostelRooms     ?? 0, lic.max_hostel_rooms],
                ['Transport Routes', data?.usage?.transportRoutes ?? 0, lic.max_transport_routes],
                ['Vehicles',         data?.usage?.vehicles        ?? 0, lic.max_vehicles],
              ].map(([label, used, max]) => {
                const pct    = max && max !== Infinity ? Math.min(100, Math.round((used / max) * 100)) : 0
                const barClr = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#3B82F6'
                return (
                  <div key={label} style={{ paddingBottom: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12.5, color: '#64748B' }}>{label}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: pct >= 90 ? '#EF4444' : '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                        {used.toLocaleString('en-IN')} / {max && max !== Infinity ? max.toLocaleString('en-IN') : '∞'}
                      </span>
                    </div>
                    {max && max !== Infinity && (
                      <div style={{ height: 5, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barClr, borderRadius: 99, transition: 'width 0.3s' }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── License ── */}
      {tab === 'license' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF4', borderRadius: 16, padding: 28 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 24px' }}>License Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
            <div>
              {L('Billing Cycle')}
              <select value={lic.billing_cycle} onChange={e => setLic(p => ({ ...p, billing_cycle: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              {L('Monthly Fee (₹)')}
              <input type="number" min="0" value={lic.monthly_fee} onChange={e => setLic(p => ({ ...p, monthly_fee: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Grace Period (days)')}
              <input type="number" min="0" value={lic.grace_period_days} onChange={e => setLic(p => ({ ...p, grace_period_days: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Valid From')}
              <input type="date" value={lic.valid_from} onChange={e => setLic(p => ({ ...p, valid_from: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Valid Until')}
              <input type="date" value={lic.valid_until} onChange={e => setLic(p => ({ ...p, valid_until: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Discount (%)')}
              <input type="number" min="0" max="100" value={lic.discount_percent} onChange={e => setLic(p => ({ ...p, discount_percent: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Max Students')}
              <input type="number" min="1" value={lic.max_students} onChange={e => setLic(p => ({ ...p, max_students: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Max Faculty')}
              <input type="number" min="1" value={lic.max_faculty} onChange={e => setLic(p => ({ ...p, max_faculty: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Max Admins')}
              <input type="number" min="1" value={lic.max_admins} onChange={e => setLic(p => ({ ...p, max_admins: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Max Branches')}
              <input type="number" min="1" value={lic.max_branches} onChange={e => setLic(p => ({ ...p, max_branches: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Max Departments')}
              <input type="number" min="1" value={lic.max_departments} onChange={e => setLic(p => ({ ...p, max_departments: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Max Courses')}
              <input type="number" min="1" value={lic.max_courses} onChange={e => setLic(p => ({ ...p, max_courses: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Max Classes')}
              <input type="number" min="1" value={lic.max_classes} onChange={e => setLic(p => ({ ...p, max_classes: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Max Library Books')}
              <input type="number" min="1" value={lic.max_library_books} onChange={e => setLic(p => ({ ...p, max_library_books: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Max Hostel Rooms')}
              <input type="number" min="1" value={lic.max_hostel_rooms} onChange={e => setLic(p => ({ ...p, max_hostel_rooms: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Max Vehicles')}
              <input type="number" min="1" value={lic.max_vehicles} onChange={e => setLic(p => ({ ...p, max_vehicles: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Max Transport Routes')}
              <input type="number" min="1" value={lic.max_transport_routes} onChange={e => setLic(p => ({ ...p, max_transport_routes: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Max API Requests/mo')}
              <input type="number" min="1" value={lic.max_api_requests} onChange={e => setLic(p => ({ ...p, max_api_requests: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Max Realtime Conns')}
              <input type="number" min="1" value={lic.max_realtime_connections} onChange={e => setLic(p => ({ ...p, max_realtime_connections: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              {L('Storage (GB)')}
              <input type="number" min="1" value={lic.max_storage_gb} onChange={e => setLic(p => ({ ...p, max_storage_gb: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              {L('Discount Reason')}
              <input value={lic.discount_reason} onChange={e => setLic(p => ({ ...p, discount_reason: e.target.value }))} placeholder="e.g. Educational institution discount" style={inputStyle} />
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              {L('Internal Notes')}
              <textarea value={lic.notes} onChange={e => setLic(p => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' }} />
            </div>
          </div>
          <button onClick={saveLicense} disabled={saving} className="btn-primary" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save License'}
          </button>
        </div>
      )}

      {/* ── Modules ── */}
      {tab === 'modules' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF4', borderRadius: 16, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Module Access</h3>
            <button onClick={saveModules} disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Modules'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {MODULES.map(m => {
              const enabled = moduleState[m.key] !== false
              return (
                <div key={m.key} onClick={() => setModuleState(s => ({ ...s, [m.key]: !s[m.key] }))}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                    background: enabled ? '#F0FDF4' : '#F8FAFC',
                    border: `1.5px solid ${enabled ? '#A7F3D0' : '#E2E8F0'}`,
                    transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: enabled ? '#065F46' : '#94A3B8' }}>{m.label}</span>
                  <div style={{
                    width: 36, height: 20, borderRadius: 99, position: 'relative', transition: 'all 0.2s',
                    background: enabled ? '#10B981' : '#D1D5DB',
                  }}>
                    <div style={{
                      position: 'absolute', top: 2, left: enabled ? 18 : 2, width: 16, height: 16,
                      borderRadius: '50%', background: 'white', transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Module Requests ── */}
          {(data?.moduleRequests || []).length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 12px' }}>Module Requests</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(data?.moduleRequests || []).map(r => {
                  const moduleLabel = MODULES.find(m => m.key === r.module_key)?.label || r.module_key
                  const statusColor = r.status === 'pending' ? '#D97706' : r.status === 'approved' ? '#059669' : '#DC2626'
                  const statusBg    = r.status === 'pending' ? '#FFFBEB' : r.status === 'approved' ? '#F0FDF4' : '#FEF2F2'
                  return (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: 10, background: '#F8FAFC',
                      border: '1.5px solid #E2E8F0',
                    }}>
                      <div>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>{moduleLabel}</span>
                        {r.note && <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>{r.note}</p>}
                        <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>
                          {new Date(r.requested_at).toLocaleDateString('en-IN')}
                          {r.rejection_reason && ` · ${r.rejection_reason}`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: statusBg, color: statusColor }}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                        {r.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleModuleRequest(r.id, 'approve')}
                              disabled={saving}
                              style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #16A34A25', background: '#16A34A0f', color: '#16A34A', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectModal({ open: true, requestId: r.id, reason: '' })}
                              disabled={saving}
                              style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #DC262625', background: '#DC26260f', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Payments ── */}
      {tab === 'payments' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF4', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Payment History</h3>
            <button onClick={() => setPaymentModal({ open: true, billing_month: '', amount: '', note: '' })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1.5px solid #2563EB25', background: '#2563EB0f', color: '#2563EB', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={12} /> Add Entry
            </button>
          </div>
          {(data?.payments || []).length === 0 ? (
            <p style={{ fontSize: 13.5, color: '#94A3B8', padding: '32px 24px', margin: 0 }}>No payment records yet.</p>
          ) : (
            (data?.payments || []).map(p => {
              const sColor = { paid: '#059669', pending: '#D97706', overdue: '#DC2626', waived: '#6B7280' }[p.payment_status] || '#6B7280'
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid #F8FAFC' }}>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>
                      {new Date(p.billing_month).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}
                    </p>
                    <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>{p.invoice_number || 'No invoice'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>₹{(p.total_amount || 0).toLocaleString('en-IN')}</p>
                    <span style={{ fontSize: 11, fontWeight: 700, color: sColor }}>{p.payment_status.toUpperCase()}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Status change modal ── */}
      {statusModal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }} onClick={() => setStatusModal(m => ({ ...m, open: false }))}>
          <div style={{
            background: '#FFFFFF', borderRadius: 18, padding: 28, width: '100%', maxWidth: 420,
            boxShadow: '0 24px 64px rgba(15,23,42,0.2)', position: 'relative',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Change Status
            </h3>
            <p style={{ fontSize: 13.5, color: '#64748B', margin: '0 0 20px' }}>
              Changing to <strong style={{ color: STATUS_CONFIG[statusModal.status]?.color || '#0F172A', textTransform: 'capitalize' }}>{statusModal.status}</strong>
              {' '}for <strong style={{ color: '#0F172A' }}>{inst.name}</strong>
            </p>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Reason <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              value={statusModal.reason}
              onChange={e => setStatusModal(m => ({ ...m, reason: e.target.value }))}
              placeholder="e.g. Payment overdue, trial period ended…"
              rows={3}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 13.5,
                fontFamily: 'inherit', color: '#0F172A', outline: 'none',
                resize: 'vertical', background: '#FAFCFF',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStatusModal(m => ({ ...m, open: false }))}
                style={{
                  padding: '9px 18px', borderRadius: 9, border: '1.5px solid #E2E8F0',
                  background: '#FFFFFF', color: '#64748B', fontSize: 13.5, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>Cancel</button>
              <button
                onClick={confirmStatusChange}
                style={{
                  padding: '9px 20px', borderRadius: 9, border: 'none',
                  background: STATUS_CONFIG[statusModal.status]?.color || '#2563EB',
                  color: '#FFFFFF', fontSize: 13.5, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Provision modal ── */}
      {provisionModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => !provisionModal.loading && setProvisionModal(m => ({ ...m, open: false }))}>
          <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 24px 64px rgba(15,23,42,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>Provision Institution</h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>Creates the admin Supabase user, license, modules, and sends a welcome email with credentials.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Admin Email *</label>
                <input type="email" value={provisionModal.adminEmail} onChange={e => setProvisionModal(m => ({ ...m, adminEmail: e.target.value }))}
                  placeholder="admin@institution.edu" style={{ width: '100%', height: 40, boxSizing: 'border-box', padding: '0 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Admin Full Name *</label>
                <input type="text" value={provisionModal.adminName} onChange={e => setProvisionModal(m => ({ ...m, adminName: e.target.value }))}
                  placeholder="e.g. Dr. Sanjay Kumar" style={{ width: '100%', height: 40, boxSizing: 'border-box', padding: '0 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setProvisionModal(m => ({ ...m, open: false }))} disabled={provisionModal.loading}
                style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#FFF', color: '#64748B', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={confirmProvision} disabled={provisionModal.loading}
                style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#16A34A', color: '#FFF', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={13} /> {provisionModal.loading ? 'Provisioning…' : 'Provision Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add payment modal ── */}
      {paymentModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setPaymentModal(m => ({ ...m, open: false }))}>
          <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(15,23,42,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 20px' }}>Add Payment Entry</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Billing Month *</label>
                <input type="month" value={paymentModal.billing_month} onChange={e => setPaymentModal(m => ({ ...m, billing_month: e.target.value }))}
                  style={{ width: '100%', height: 40, boxSizing: 'border-box', padding: '0 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Amount (₹) *</label>
                <input type="number" min="0" value={paymentModal.amount} onChange={e => setPaymentModal(m => ({ ...m, amount: e.target.value }))}
                  placeholder="e.g. 4999" style={{ width: '100%', height: 40, boxSizing: 'border-box', padding: '0 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Note</label>
                <input type="text" value={paymentModal.note} onChange={e => setPaymentModal(m => ({ ...m, note: e.target.value }))}
                  placeholder="e.g. Manual bank transfer" style={{ width: '100%', height: 40, boxSizing: 'border-box', padding: '0 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setPaymentModal(m => ({ ...m, open: false }))}
                style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#FFF', color: '#64748B', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={addPaymentEntry} disabled={saving}
                style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#2563EB', color: '#FFF', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Saving…' : 'Add Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject module request modal ── */}
      {rejectModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setRejectModal(m => ({ ...m, open: false }))}>
          <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(15,23,42,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>Reject Module Request</h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px' }}>Optionally provide a reason that will be shown to the institution.</p>
            <textarea
              value={rejectModal.reason}
              onChange={e => setRejectModal(m => ({ ...m, reason: e.target.value }))}
              placeholder="e.g. Module not included in your current plan."
              rows={3}
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 13.5, fontFamily: 'inherit', color: '#0F172A', outline: 'none', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectModal(m => ({ ...m, open: false }))}
                style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#FFF', color: '#64748B', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={async () => {
                const { requestId, reason } = rejectModal
                setRejectModal(m => ({ ...m, open: false }))
                await handleModuleRequest(requestId, 'reject', reason)
              }} disabled={saving}
                style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: '#DC2626', color: '#FFF', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resend credentials modal ── */}
      {resendModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => !resendModal.sending && setResendModal(m => ({ ...m, open: false }))}>
          <div style={{ background: '#FFFFFF', borderRadius: 18, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(15,23,42,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>Send Credentials Email</h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px', lineHeight: 1.6 }}>
              Send the institution login credentials to an email address. Leave blank to resend to the original admin email
              {credentials?.admin_email && <strong> ({credentials.admin_email})</strong>}.
            </p>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Recipient Email</label>
              <input
                type="email"
                value={resendModal.toEmail}
                onChange={e => setResendModal(m => ({ ...m, toEmail: e.target.value }))}
                placeholder={credentials?.admin_email || 'admin@institution.edu'}
                autoFocus
                style={{ width: '100%', height: 40, boxSizing: 'border-box', padding: '0 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13.5, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setResendModal(m => ({ ...m, open: false }))} disabled={resendModal.sending}
                style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#FFF', color: '#64748B', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleResendEmail} disabled={resendModal.sending}
                style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#2563EB', color: '#FFF', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Send size={13} /> {resendModal.sending ? 'Sending…' : 'Send Credentials'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Emails ── */}
      {tab === 'emails' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF4', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Email Queue</h3>
            <button onClick={refreshEmails} disabled={emailsLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1.5px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <RefreshCw size={12} className={emailsLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {emailsLoading ? (
            <div style={{ padding: '32px 24px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 22, height: 22, border: '2.5px solid #E2E8F0', borderTop: '2.5px solid #3B82F6', borderRadius: '50%' }} className="animate-spin" />
            </div>
          ) : !emails || emails.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <InboxIcon size={32} color="#CBD5E1" style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 13.5, color: '#94A3B8', margin: 0 }}>No emails in the queue for this institution.</p>
            </div>
          ) : (
            <>
              {emails.map(em => {
                const statusCfg = {
                  pending: { bg: '#FFFBEB', color: '#B45309', label: 'Pending' },
                  sent:    { bg: '#F0FDF4', color: '#15803D', label: 'Sent'    },
                  failed:  { bg: '#FEF2F2', color: '#B91C1C', label: 'Failed'  },
                }[em.status] || { bg: '#F8FAFC', color: '#64748B', label: em.status }

                return (
                  <div key={em.id}>
                    <div
                      onClick={() => setViewEmail(v => v?.id === em.id ? null : em)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 24px', borderBottom: '1px solid #F8FAFC', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFCFF'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{em.subject}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: statusCfg.bg, color: statusCfg.color, flexShrink: 0 }}>{statusCfg.label}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: '#64748B' }}>To: <strong style={{ color: '#374151' }}>{em.to_email}</strong></span>
                          {em.template_key && <span style={{ fontSize: 12, color: '#94A3B8' }}>{em.template_key}</span>}
                          <span style={{ fontSize: 12, color: '#94A3B8' }}>{new Date(em.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          {em.sent_at && <span style={{ fontSize: 12, color: '#94A3B8' }}>Sent {new Date(em.sent_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>}
                        </div>
                        {em.error_message && (
                          <p style={{ fontSize: 11.5, color: '#B91C1C', margin: '4px 0 0' }}>{em.error_message}</p>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 16, flexShrink: 0 }}>
                        {viewEmail?.id === em.id ? '▲ hide' : '▼ view'}
                      </span>
                    </div>

                    {/* Expanded email body */}
                    {viewEmail?.id === em.id && (
                      <div style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFCFF', padding: '0 24px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, marginBottom: 10 }}>
                          <button
                            onClick={() => { navigator.clipboard.writeText(em.body_html || ''); toast.success('HTML copied') }}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: '#FFF', color: '#64748B', fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                            <Copy size={11} /> Copy HTML
                          </button>
                        </div>
                        {em.body_html ? (
                          <iframe
                            srcDoc={em.body_html}
                            style={{ width: '100%', minHeight: 420, border: '1px solid #E2E8F0', borderRadius: 10, background: '#FFF' }}
                            sandbox="allow-same-origin"
                            title={`Email: ${em.subject}`}
                          />
                        ) : (
                          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>No email body stored.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ── Support ── */}
      {tab === 'support' && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF4', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Support Tickets</h3>
          </div>
          {(data?.tickets || []).length === 0 ? (
            <p style={{ fontSize: 13.5, color: '#94A3B8', padding: '32px 24px', margin: 0 }}>No tickets from this institution.</p>
          ) : (data?.tickets || []).map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid #F8FAFC' }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{t.subject}</p>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>{t.ticket_number} · {new Date(t.created_at).toLocaleDateString('en-IN')}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#FFF7ED', color: '#C2410C' }}>{t.priority}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#F0F9FF', color: '#0369A1' }}>{t.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
