'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, DollarSign, BookOpen, Home, Bus, ClipboardList, Calendar, Trash2, Plus, Edit3, RefreshCw } from 'lucide-react'

const ICON_MAP = {
  payment:    DollarSign,
  leave:      Calendar,
  book:       BookOpen,
  hostel:     Home,
  transport:  Bus,
  exam:       ClipboardList,
  attendance: CheckCircle,
  delete:     Trash2,
  create:     Plus,
  update:     Edit3,
}

function TimelineIcon({ icon, color }) {
  const Icon = ICON_MAP[icon] || Edit3
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: color ? `${color}15` : '#F1F5F9',
      border: `1.5px solid ${color || '#E2E8F0'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={13} color={color || '#64748B'} />
    </div>
  )
}

function TimelineEntry({ event, isLast }) {
  const ts = new Date(event.timestamp)
  const timeLabel = ts.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div style={{ display: 'flex', gap: 12, position: 'relative' }}>
      {/* Vertical connector line */}
      {!isLast && (
        <div style={{
          position: 'absolute', left: 15, top: 36, bottom: 0,
          width: 1.5, background: '#E2E8F0',
        }} />
      )}

      <TimelineIcon icon={event.icon} color={event.color} />

      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>
          {event.description}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {event.actor && (
            <span style={{ fontSize: 11, color: '#64748B' }}>{event.actor}</span>
          )}
          {event.role && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: '#94A3B8',
              background: '#F8FAFC', border: '1px solid #E2E8F0',
              padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.02em',
            }}>{event.role.replace(/_/g, ' ')}</span>
          )}
          <span style={{ fontSize: 11, color: '#94A3B8' }}>{timeLabel}</span>
        </div>

        {/* Expandable metadata */}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <MetadataChips data={event.metadata} />
        )}
      </div>
    </div>
  )
}

function MetadataChips({ data }) {
  const chips = []
  if (data.amount)   chips.push({ label: 'Amount', value: `₹${Number(data.amount).toLocaleString('en-IN')}` })
  if (data.receipt)  chips.push({ label: 'Receipt', value: data.receipt })
  if (data.due_date) chips.push({ label: 'Due', value: data.due_date })
  if (data.fine)     chips.push({ label: 'Fine', value: `₹${data.fine}` })
  if (!chips.length) return null

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
      {chips.map(c => (
        <span key={c.label} style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 5,
          background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#475569',
        }}>
          {c.label}: {c.value}
        </span>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ActivityTimeline({ entityType, entityId, title = 'Activity Timeline', limit = 30 }) {
  const [events,  setEvents ] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError  ] = useState(null)

  const loadTimeline = useCallback(async () => {
    if (!entityId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ entity_id: entityId, limit: String(limit) })
      if (entityType) params.set('entity_type', entityType)
      const res = await fetch(`/api/timeline?${params}`)
      if (!res.ok) throw new Error('Failed to load timeline')
      const data = await res.json()
      setEvents(data.timeline || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [entityId, entityType, limit])

  useEffect(() => { loadTimeline() }, [loadTimeline])

  return (
    <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>{title}</h3>
        <button
          onClick={loadTimeline}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500,
            padding: '5px 10px', borderRadius: 8, border: '1px solid #E2E8F0',
            background: '#FFF', color: '#64748B', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F1F5F9', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, background: '#F1F5F9', borderRadius: 4, marginBottom: 6, width: '60%' }} />
                <div style={{ height: 10, background: '#F8FAFC', borderRadius: 4, width: '35%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <p style={{ fontSize: 13, color: '#EF4444', textAlign: 'center', padding: '24px 0' }}>
          Failed to load timeline. <button onClick={loadTimeline} style={{ color: '#2563EB', cursor: 'pointer', background: 'none', border: 'none' }}>Retry</button>
        </p>
      )}

      {!loading && !error && events.length === 0 && (
        <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '32px 0' }}>
          No activity recorded yet.
        </p>
      )}

      {!loading && !error && events.length > 0 && (
        <div>
          {events.map((event, i) => (
            <TimelineEntry key={event.id || i} event={event} isLast={i === events.length - 1} />
          ))}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
