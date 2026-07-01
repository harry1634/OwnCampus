'use client'

import { useState, useEffect, useCallback } from 'react'
import { Database, Shield, Bell, HardDrive, AlertCircle, Zap, RefreshCw, CheckCircle, AlertTriangle, XCircle, Activity, Users, FileText, Clock } from 'lucide-react'

const STATUS_CONFIG = {
  ok:       { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', icon: CheckCircle,   label: 'Operational' },
  degraded: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: AlertTriangle, label: 'Degraded' },
  down:     { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: XCircle,       label: 'Down' },
}

const CHECK_ICONS = {
  database: Database,
  shield:   Shield,
  queue:    Zap,
  bell:     Bell,
  alert:    AlertCircle,
  storage:  HardDrive,
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ok
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 600, color: cfg.color,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      padding: '4px 10px', borderRadius: 20,
    }}>
      <Icon size={12} />
      {cfg.label}
    </span>
  )
}

function HealthCard({ check }) {
  const cfg  = STATUS_CONFIG[check.status] || STATUS_CONFIG.ok
  const Icon = CHECK_ICONS[check.icon] || Activity

  return (
    <div style={{
      background: '#FFF', border: `1px solid ${check.status !== 'ok' ? cfg.border : '#E2E8F0'}`,
      borderRadius: 14, padding: '18px 20px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} color={cfg.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>{check.name}</p>
          <StatusBadge status={check.status} />
        </div>
        <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0' }}>{check.message}</p>
        {check.latency != null && (
          <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>
            <Clock size={9} style={{ display: 'inline', marginRight: 3 }} />
            {check.latency}ms
          </p>
        )}
      </div>
    </div>
  )
}

function DataCountCard({ label, value, icon: Icon, color }) {
  return (
    <div style={{
      background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 14,
      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={17} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>
          {Number(value || 0).toLocaleString('en-IN')}
        </p>
        <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{label}</p>
      </div>
    </div>
  )
}

export default function SystemHealthPage() {
  const [health,   setHealth  ] = useState(null)
  const [loading,  setLoading ] = useState(true)
  const [lastCheck, setLastCheck] = useState(null)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/system/health')
      const data = await res.json()
      setHealth(data)
      setLastCheck(new Date())
    } catch (err) {
      setHealth({ status: 'down', error: err.message, checks: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHealth() }, [fetchHealth])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const id = setInterval(fetchHealth, 60000)
    return () => clearInterval(id)
  }, [fetchHealth])

  const overall = health?.status || 'ok'
  const cfg     = STATUS_CONFIG[overall] || STATUS_CONFIG.ok
  const OIcon   = cfg.icon

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">System Health</h1>
          <p className="page-header-sub">
            Real-time status of all services
            {lastCheck && <span style={{ color: '#94A3B8' }}> · Last checked {lastCheck.toLocaleTimeString('en-IN')}</span>}
          </p>
        </div>
        <div className="page-actions">
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Checking…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Overall status banner */}
      <div style={{
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        borderRadius: 16, padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: `${cfg.color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <OIcon size={26} color={cfg.color} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
            {overall === 'ok'       ? 'All Systems Operational'
             : overall === 'degraded' ? 'Partial System Degradation'
             : 'System Outage Detected'}
          </p>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
            {health?.response_ms != null
              ? `Health check completed in ${health.response_ms}ms · Auto-refreshes every 60s`
              : 'Loading system status…'}
          </p>
        </div>
        {health?.migration_status && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Migration Status</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', margin: '2px 0 0' }}>
              {health.migration_status}
            </p>
          </div>
        )}
      </div>

      {/* Data Counts */}
      {health?.data_counts && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <DataCountCard label="Active Students"     value={health.data_counts.active_students}  icon={Users}     color="#2563EB" />
          <DataCountCard label="Active Faculty"      value={health.data_counts.active_faculty}   icon={Users}     color="#10B981" />
          <DataCountCard label="Notifications (7d)"  value={health.data_counts.notifications_7d} icon={Bell}      color="#7C3AED" />
          <DataCountCard label="Audit Events (7d)"   value={health.data_counts.audit_events_7d}  icon={FileText}  color="#F59E0B" />
        </div>
      )}

      {/* Service Checks */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Service Status</h2>
        {loading && !health ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: 84, background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {(health?.checks || []).map((check, i) => (
              <HealthCard key={i} check={check} />
            ))}
          </div>
        )}
      </div>

      {/* Error message if down */}
      {health?.error && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '16px 20px',
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', margin: '0 0 4px' }}>Health Check Failed</p>
          <p style={{ fontSize: 12, color: '#B91C1C', margin: 0, fontFamily: 'monospace' }}>{health.error}</p>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
