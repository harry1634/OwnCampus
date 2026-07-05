'use client'

import { useEffect, useState } from 'react'
import { LifeBuoy, MessageCircle, ChevronRight, X, Send } from 'lucide-react'
import { toast } from 'sonner'

const PRIORITY_CFG = {
  low:      { bg: '#F8FAFC', color: '#64748B' },
  medium:   { bg: '#FFF7ED', color: '#C2410C' },
  high:     { bg: '#FEF2F2', color: '#B91C1C' },
  critical: { bg: '#4C0519', color: '#FCA5A5' },
}
const STATUS_CFG = {
  open:        { bg: '#EFF6FF', color: '#1D4ED8' },
  in_progress: { bg: '#FFF7ED', color: '#C2410C' },
  waiting:     { bg: '#FDF4FF', color: '#7E22CE' },
  resolved:    { bg: '#F0FDF4', color: '#15803D' },
  closed:      { bg: '#F8FAFC', color: '#475569' },
}

function Pill({ map, value, style }) {
  const cfg = map[value] || { bg: '#F8FAFC', color: '#475569' }
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: cfg.bg, color: cfg.color, ...style }}>{(value || '').replace(/_/g, ' ')}</span>
}

export default function SupportPage() {
  const [tickets,  setTickets ] = useState([])
  const [total,    setTotal   ] = useState(0)
  const [loading,  setLoading ] = useState(true)
  const [filter,   setFilter  ] = useState({ status: '', priority: '' })
  const [selected, setSelected] = useState(null)
  const [thread,   setThread  ] = useState(null)
  const [reply,    setReply   ] = useState('')
  const [sending,  setSending ] = useState(false)

  async function loadList(f = filter) {
    setLoading(true)
    try {
      const p = new URLSearchParams()
      if (f.status)   p.set('status',   f.status)
      if (f.priority) p.set('priority', f.priority)
      const res  = await fetch('/api/control/support?' + p)
      const json = await res.json()
      setTickets(json.tickets || [])
      setTotal(json.total || 0)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadList() }, [])

  async function openTicket(t) {
    setSelected(t)
    const res  = await fetch(`/api/control/support/${t.id}`)
    const json = await res.json()
    setThread(json)
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return
    setSending(true)
    try {
      const res = await fetch(`/api/control/support/${selected.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', message: reply.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Reply sent.')
      setReply('')
      // Reload thread
      const r2  = await fetch(`/api/control/support/${selected.id}`)
      const j2  = await r2.json()
      setThread(j2)
    } catch (err) {
      toast.error(err.message)
    } finally { setSending(false) }
  }

  async function updateStatus(status) {
    if (!selected) return
    try {
      const res = await fetch(`/api/control/support/${selected.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(`Status → ${status}`)
      setSelected(s => ({ ...s, status }))
      loadList()
    } catch (err) {
      toast.error(err.message)
    }
  }

  function changeFilter(k, v) {
    const f = { ...filter, [k]: v }
    setFilter(f)
    loadList(f)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 4px' }}>Support Center</h1>
        <p style={{ fontSize: 13.5, color: '#64748B', margin: 0 }}>Manage institution support tickets</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'status',   options: ['', 'open', 'in_progress', 'waiting', 'resolved', 'closed'], label: 'All Statuses' },
          { key: 'priority', options: ['', 'low', 'medium', 'high', 'critical'],                   label: 'All Priorities' },
        ].map(f => (
          <select key={f.key} value={filter[f.key]} onChange={e => changeFilter(f.key, e.target.value)}
            style={{ height: 38, padding: '0 12px', borderRadius: 9, border: '1px solid #E2E8F0', background: 'white', fontSize: 13.5, color: '#0F172A', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
            <option value="">{f.label}</option>
            {f.options.slice(1).map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
          </select>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* Ticket list */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF4', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ width: 24, height: 24, border: '2.5px solid #E2E8F0', borderTop: '2.5px solid #3B82F6', borderRadius: '50%', margin: '0 auto' }} className="animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>
              <LifeBuoy size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ fontSize: 14, margin: 0 }}>No tickets</p>
            </div>
          ) : tickets.map(t => (
            <div
              key={t.id}
              onClick={() => openTicket(t)}
              style={{
                padding: '14px 18px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
                background: selected?.id === t.id ? '#F0F7FF' : 'white',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (selected?.id !== t.id) e.currentTarget.style.background = '#F8FAFC' }}
              onMouseLeave={e => { if (selected?.id !== t.id) e.currentTarget.style.background = 'white' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</p>
                  <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 6px' }}>
                    {t.raised_by_name} · {t.institutions?.name || 'Unknown'} · {t.ticket_number}
                  </p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Pill map={STATUS_CFG}   value={t.status}   />
                    <Pill map={PRIORITY_CFG} value={t.priority} />
                  </div>
                </div>
                <span style={{ fontSize: 11.5, color: '#CBD5E1', flexShrink: 0 }}>
                  {new Date(t.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Thread panel */}
        {selected && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF4', borderRadius: 16, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 180px)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
            {/* Thread header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>{selected.subject}</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Pill map={STATUS_CFG}   value={selected.status}   />
                    <Pill map={PRIORITY_CFG} value={selected.priority} />
                  </div>
                </div>
                <button onClick={() => { setSelected(null); setThread(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={16} /></button>
              </div>

              {/* Status actions */}
              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                {['open','in_progress','waiting','resolved','closed'].map(st => (
                  <button key={st} onClick={() => updateStatus(st)}
                    style={{
                      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, border: '1px solid #E2E8F0',
                      background: selected.status === st ? '#EFF6FF' : 'white', color: selected.status === st ? '#1D4ED8' : '#64748B',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>{st.replace(/_/g, ' ')}</button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {thread ? (
                (thread.messages || []).map(m => {
                  const isCompany = m.sender_type === 'company_user'
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: isCompany ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '75%', padding: '10px 14px', borderRadius: isCompany ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: isCompany ? '#EFF6FF' : '#F8FAFC',
                        border: `1px solid ${isCompany ? '#BFDBFE' : '#E8EDF4'}`,
                      }}>
                        <p style={{ fontSize: 11.5, fontWeight: 700, color: isCompany ? '#1D4ED8' : '#64748B', margin: '0 0 4px' }}>{m.sender_name}</p>
                        <p style={{ fontSize: 13, color: '#0F172A', margin: '0 0 4px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.message}</p>
                        <p style={{ fontSize: 10.5, color: '#94A3B8', margin: 0 }}>{new Date(m.created_at).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: 20, height: 20, border: '2px solid #E2E8F0', borderTop: '2px solid #3B82F6', borderRadius: '50%' }} className="animate-spin" />
                </div>
              )}
            </div>

            {/* Reply */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 8 }}>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply() }}
                placeholder="Type a reply… (Ctrl+Enter to send)"
                rows={2}
                style={{
                  flex: 1, padding: '10px 12px', border: '1px solid #E2E8F0', borderRadius: 10,
                  fontSize: 13.5, fontFamily: 'inherit', color: '#0F172A', resize: 'none', outline: 'none',
                }}
              />
              <button onClick={sendReply} disabled={sending || !reply.trim()} className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-end', height: 40 }}>
                <Send size={13} /> {sending ? '…' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
