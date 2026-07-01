'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ClipboardList, MapPin, Clock, Calendar, RefreshCw } from 'lucide-react'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { createClient } from '@/lib/supabase/client'

const statusConf = {
  Draft:               { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', label: 'Draft'           },
  Scheduled:           { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'Upcoming'        },
  'Hall Tickets Sent': { color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', label: 'Hall Tickets Out' },
  Completed:           { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', label: 'Completed'        },
}

function computeStatus(exam) {
  if (!exam.is_published) return 'Draft'
  const today = new Date().toISOString().slice(0, 10)
  if (exam.exam_date && exam.exam_date <= today) return 'Completed'
  return 'Hall Tickets Sent'
}

function fmt12(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.slice(0, 5).split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`
}

export default function FacultyInvigilation() {
  const cu = useCurrentUser()

  const [duties,    setDuties   ] = useState([])
  const [loading,   setLoading  ] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchDuties = useCallback(async () => {
    if (!cu.userId) return
    setLoading(true)
    try {
      const res = await fetch('/api/examinations')
      if (!res.ok) return
      const rows = await res.json()
      const mine = Array.isArray(rows)
        ? rows.filter(e => e.invigilator_id === cu.userId)
        : []
      setDuties(mine)
    } catch {
      setDuties([])
    } finally {
      setLoading(false)
    }
  }, [cu.userId])

  // Initial fetch + re-fetch when refreshKey changes
  useEffect(() => {
    if (!cu.mounted || !cu.userId) return
    fetchDuties()
  }, [cu.mounted, cu.userId, refreshKey, fetchDuties])

  // Realtime subscription
  useEffect(() => {
    if (!cu.mounted || !cu.userId) return
    const supabase = createClient()
    const channel = supabase
      .channel('exams-invigilation')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'exams' }, () => fetchDuties())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'exams' }, () => fetchDuties())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [cu.mounted, cu.userId, fetchDuties])

  if (!cu.mounted) return null

  const today = new Date().toISOString().slice(0, 10)

  const duties_with_status = duties.map(exam => ({
    ...exam,
    _status: computeStatus(exam),
    _subject: exam.subjects?.name || exam.name || '—',
    _class: exam.classes
      ? `${exam.classes.name}${exam.classes.section ? ' – ' + exam.classes.section : ''}`
      : '—',
    _datetime: exam.exam_date
      ? `${fmtDate(exam.exam_date)}${exam.start_time ? ', ' + fmt12(exam.start_time) + (exam.end_time ? ' – ' + fmt12(exam.end_time) : '') : ''}`
      : '—',
    _venue: exam.hall_number || '',
  }))

  const upcoming  = duties_with_status.filter(d => d._status === 'Hall Tickets Sent' || d._status === 'Scheduled').length
  const completed = duties_with_status.filter(d => d._status === 'Completed').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Invigilation Schedule</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Your assigned examination duties</p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, fontWeight: 600, color: '#475569', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* KPI chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        {[
          { label: 'Upcoming Duties',  value: upcoming,                  color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Completed',        value: completed,                  color: '#16A34A', bg: '#F0FDF4' },
          { label: 'Total Assigned',   value: duties_with_status.length,  color: '#7C3AED', bg: '#F5F3FF' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-0.02em', margin: '0 0 4px' }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Duty cards */}
      {duties_with_status.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0' }}>
          <ClipboardList size={40} style={{ color: '#CBD5E1', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>
            {loading ? 'Loading…' : 'No invigilation duties assigned'}
          </p>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
            The admin will assign you to exam sessions from the Examinations page.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {duties_with_status.map((duty, i) => {
            const st = statusConf[duty._status] || statusConf['Scheduled']
            return (
              <motion.div key={duty.id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                style={{ background: '#FFFFFF', borderRadius: 16, border: `1px solid ${st.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ClipboardList size={20} style={{ color: st.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>{duty._subject}</p>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} /> {duty.name}
                    </span>
                    <span style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {duty._datetime}
                    </span>
                    {duty._venue && (
                      <span style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} /> {duty._venue}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: '#64748B' }}>Class: {duty._class}</span>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}`, flexShrink: 0 }}>
                  {st.label}
                </span>
              </motion.div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
