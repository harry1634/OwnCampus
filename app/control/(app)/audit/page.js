'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Activity } from 'lucide-react'

const ACTION_COLOR = {
  'institution.active':    '#15803D',
  'institution.suspended': '#DC2626',
  'institution.cancelled': '#6B7280',
  'institution.trial':     '#1D4ED8',
  'payment.paid':          '#059669',
  'license.updated':       '#7C3AED',
  'modules.updated':       '#0369A1',
  'settings.updated':      '#B45309',
  'ticket.created':        '#0369A1',
  'ticket.updated':        '#475569',
}

function ActionBadge({ action }) {
  const color = ACTION_COLOR[action] || '#475569'
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: color + '14', color }}>
      {action}
    </span>
  )
}

export default function AuditPage() {
  const [logs,    setLogs   ] = useState([])
  const [total,   setTotal  ] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter ] = useState({ action: '', user_id: '' })
  const [page,    setPage   ] = useState(1)

  async function load(f = filter, pg = page) {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (f.action)  p.set('action',  f.action)
      if (f.user_id) p.set('user_id', f.user_id)
      p.set('page', pg)
      const res  = await fetch('/api/control/audit?' + p)
      const json = await res.json()
      setLogs(json.logs || [])
      setTotal(json.total || 0)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function applyFilter(k, v) {
    const f = { ...filter, [k]: v }
    setFilter(f); setPage(1); load(f, 1)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 4px' }}>Audit Logs</h1>
        <p style={{ fontSize: 13.5, color: '#64748B', margin: 0 }}>Complete trail of all company staff actions</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          value={filter.action}
          onChange={e => applyFilter('action', e.target.value)}
          placeholder="Filter by action…"
          style={{
            height: 38, padding: '0 12px', borderRadius: 9, border: '1px solid #E2E8F0',
            background: 'white', fontSize: 13.5, color: '#0F172A', fontFamily: 'inherit', outline: 'none', width: 240,
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF4', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, padding: '12px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          {['Time', 'User', 'Action', 'Target'].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: 24, height: 24, border: '2.5px solid #E2E8F0', borderTop: '2.5px solid #3B82F6', borderRadius: '50%', margin: '0 auto' }} className="animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>
            <ClipboardList size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No audit logs yet</p>
          </div>
        ) : logs.map(log => (
          <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, padding: '12px 20px', borderBottom: '1px solid #F8FAFC', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#64748B' }}>
              {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{log.company_user_name}</span>
            <ActionBadge action={log.action} />
            <span style={{ fontSize: 13, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {log.target_name || log.target_id || '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {total > 30 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <span style={{ fontSize: 12.5, color: '#94A3B8' }}>
            Showing {(page - 1) * 30 + 1}–{Math.min(page * 30, total)} of {total}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled={page === 1} onClick={() => { setPage(p => p - 1); load(filter, page - 1) }} className="btn-secondary" style={{ height: 34, fontSize: 12.5 }}>Previous</button>
            <button disabled={page * 30 >= total} onClick={() => { setPage(p => p + 1); load(filter, page + 1) }} className="btn-secondary" style={{ height: 34, fontSize: 12.5 }}>Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
