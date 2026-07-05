'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2, Users, CreditCard, LifeBuoy,
  TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle,
  ArrowRight, Activity,
} from 'lucide-react'

function StatCard({ label, value, sub, icon: Icon, color, bg }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #E8EDF4', borderRadius: 16,
      padding: '20px 22px',
      boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={color} strokeWidth={1.8} />
      </div>
      <div>
        <p style={{ fontSize: 11.5, fontWeight: 600, color: '#64748B', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 2px', letterSpacing: '-0.03em' }}>{value}</p>
        {sub && <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>{sub}</p>}
      </div>
    </div>
  )
}

const STATUS_BADGE = {
  pending:   { bg: '#FFF7ED', color: '#C2410C', label: 'Pending' },
  trial:     { bg: '#EFF6FF', color: '#1D4ED8', label: 'Trial'   },
  active:    { bg: '#F0FDF4', color: '#15803D', label: 'Active'  },
  suspended: { bg: '#FEF2F2', color: '#B91C1C', label: 'Suspended' },
  cancelled: { bg: '#F8FAFC', color: '#475569', label: 'Cancelled' },
}

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.pending
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: s.bg, color: s.color,
    }}>{s.label}</span>
  )
}

function fmt(n) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L'
  if (n >= 1000)   return '₹' + (n / 1000).toFixed(1)   + 'K'
  return '₹' + n.toFixed(0)
}

export default function ControlDashboard() {
  const [data,    setData   ] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/control/dashboard')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTop: '3px solid #3B82F6', borderRadius: '50%' }} className="animate-spin" />
    </div>
  )

  const s = data?.stats || {}

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 4px' }}>Dashboard</h1>
        <p style={{ fontSize: 13.5, color: '#64748B', margin: 0 }}>OwnCampus SaaS overview — {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Institutions" value={s.totalInst ?? '—'}   icon={Building2}   color="#1D4ED8" bg="#EFF6FF" sub={`${s.activeInst ?? 0} active`} />
        <StatCard label="Pending Approval"   value={s.pendingInst ?? '—'}  icon={Clock}       color="#C2410C" bg="#FFF7ED" sub="awaiting action" />
        <StatCard label="Trial"              value={s.trialInst ?? '—'}    icon={Activity}    color="#7C3AED" bg="#F5F3FF" sub="in trial period" />
        <StatCard label="Suspended"          value={s.suspendedInst ?? '—'} icon={XCircle}    color="#B91C1C" bg="#FEF2F2" sub="access blocked" />
        <StatCard label="Monthly Revenue"    value={fmt(s.mrr ?? 0)}       icon={TrendingUp}  color="#059669" bg="#F0FDF4" sub="current month" />
        <StatCard label="Outstanding"        value={fmt(s.outstanding ?? 0)} icon={CreditCard} color="#D97706" bg="#FFFBEB" sub="pending payments" />
        <StatCard label="Open Tickets"       value={s.openTickets ?? '—'}  icon={LifeBuoy}    color="#0369A1" bg="#F0F9FF" sub={s.criticalTickets ? `${s.criticalTickets} critical` : 'no critical'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Pending institutions */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF4', borderRadius: 16, padding: 22, boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Pending Approvals</h2>
            <Link href="/control/institutions?status=pending" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {(data?.pendingInstitutions || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8' }}>
              <CheckCircle size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
              <p style={{ fontSize: 13, margin: 0 }}>No pending approvals</p>
            </div>
          ) : (data?.pendingInstitutions || []).map(inst => (
            <Link
              key={inst.id}
              href={`/control/institutions/${inst.id}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
                background: '#F8FAFC', marginBottom: 6,
                border: '1px solid #E8EDF4', transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#3B82F6'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#E8EDF4'}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{inst.name}</p>
                <p style={{ fontSize: 11.5, color: '#94A3B8', margin: 0, textTransform: 'capitalize' }}>
                  {(inst.type || '').replace(/_/g, ' ')} · {new Date(inst.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              <StatusBadge status="pending" />
            </Link>
          ))}
        </div>

        {/* Recent audit log */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF4', borderRadius: 16, padding: 22, boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Recent Activity</h2>
            <Link href="/control/audit" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {(data?.recentAudit || []).length === 0 ? (
            <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '24px 0', margin: 0 }}>No activity yet</p>
          ) : (data?.recentAudit || []).map(log => (
            <div key={log.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '9px 0', borderBottom: '1px solid #F1F5F9',
            }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Activity size={12} color="#3B82F6" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.company_user_name} · <span style={{ fontFamily: 'monospace', fontWeight: 500, color: '#3B82F6' }}>{log.action}</span>
                </p>
                {log.target_name && <p style={{ fontSize: 11.5, color: '#94A3B8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.target_name}</p>}
              </div>
              <span style={{ fontSize: 11, color: '#CBD5E1', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
