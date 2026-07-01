'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useCurrentUser } from '@/lib/useCurrentUser'

function pctColor(p) {
  if (p >= 75) return { color: '#059669', bg: '#ECFDF5' }
  if (p >= 65) return { color: '#D97706', bg: '#FFFBEB' }
  return { color: '#DC2626', bg: '#FEF2F2' }
}

function Spinner() {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#7C3AED', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Loading attendance…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function StudentAttendance() {
  const cu = useCurrentUser()

  const [loading,  setLoading ] = useState(true)
  const [subjects, setSubjects] = useState([])
  const [monthly,  setMonthly ] = useState([])
  const [recent,   setRecent  ] = useState([])

  useEffect(() => {
    if (!cu.mounted) return

    setLoading(true)
    fetch('/api/attendance?my=true')
      .then(r => r.json())
      .then(data => {
        const records = data.records || []

        // Build subject-wise stats
        const subjectStats = {}
        const monthlyMap   = {}
        const recentMap    = {}

        records.forEach(row => {
          const subjectName = row.subjects?.name || row.subject_name || 'General'
          const date        = row.date

          if (!subjectStats[subjectName]) subjectStats[subjectName] = { present: 0, absent: 0, late: 0, total: 0 }
          subjectStats[subjectName].total++
          if (row.status === 'present')      subjectStats[subjectName].present++
          else if (row.status === 'absent')  subjectStats[subjectName].absent++
          else if (row.status === 'late')    subjectStats[subjectName].late++

          const month = date?.slice(0, 7)
          if (month) {
            if (!monthlyMap[month]) monthlyMap[month] = { present: 0, total: 0 }
            monthlyMap[month].total++
            if (row.status !== 'absent') monthlyMap[month].present++
          }

          if (date) {
            if (!recentMap[date]) recentMap[date] = []
            recentMap[date].push({ subject: subjectName, status: row.status })
          }
        })

        setSubjects(Object.entries(subjectStats).map(([name, s]) => ({ name, ...s })))

        setMonthly(
          Object.entries(monthlyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([month, s]) => ({
              month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short' }),
              pct:   s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
            }))
        )

        setRecent(
          Object.entries(recentMap)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 10)
            .map(([date, entries]) => ({ date, entries }))
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [cu.mounted])

  const overallPresent = subjects.reduce((a, s) => a + s.present, 0)
  const overallTotal   = subjects.reduce((a, s) => a + s.total, 0)
  const overallPct     = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : null
  const needed         = overallPct !== null && overallPct < 75
    ? Math.max(0, Math.ceil((0.75 * overallTotal - overallPresent) / 0.25)) : 0
  const classLabel     = cu.classSection ? `Class ${cu.classSection}` : 'My Class'

  if (!cu.mounted) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>My Attendance</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{classLabel} · Last 90 days</p>
      </div>

      {loading && <Spinner />}

      {!loading && subjects.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: '#F8FAFC', borderRadius: 18, border: '1px solid #E2E8F0' }}>
          <CheckCircle size={36} color="#E2E8F0" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', margin: 0 }}>No attendance records yet</p>
          <p style={{ fontSize: 12, color: '#CBD5E1', marginTop: 6 }}>Attendance will appear here once your faculty marks it.</p>
        </div>
      )}

      {!loading && subjects.length > 0 && (
        <>
          {/* Overall banner */}
          <div style={{ background: `linear-gradient(135deg,${overallPct >= 75 ? '#065F46,#059669' : '#991B1B,#DC2626'})`, borderRadius: 20, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: '0 0 4px' }}>Overall Attendance</p>
              <p style={{ fontSize: 48, fontWeight: 900, color: '#FFFFFF', lineHeight: 1, margin: '0 0 6px', letterSpacing: '-0.04em' }}>{overallPct}%</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.70)', margin: 0 }}>{overallPresent} present out of {overallTotal} sessions</p>
            </div>
            {overallPct < 75 && (
              <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.20)' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.70)', margin: '0 0 4px' }}>Sessions needed for 75%</p>
                <p style={{ fontSize: 26, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>{needed}</p>
              </div>
            )}
          </div>

          {overallPct < 75 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <AlertTriangle size={15} color="#DC2626" />
              <p style={{ fontSize: 13, color: '#991B1B', margin: 0, fontWeight: 500 }}>Attendance below 75%. Attend {needed} more consecutive sessions to reach the minimum.</p>
            </div>
          )}

          {/* Subject-wise */}
          <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Subject-wise Attendance</h2>
            </div>
            {subjects.map((s, i) => {
              const pct = Math.round((s.present / s.total) * 100)
              const c   = pctColor(pct)
              return (
                <div key={s.name} style={{ padding: '14px 20px', borderBottom: i < subjects.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', margin: 0 }}>{s.name}</p>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: c.color }}>{pct}%</span>
                      <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{s.present}/{s.total}</p>
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.04, duration: 0.5 }}
                      style={{ height: '100%', borderRadius: 3, background: c.color }} />
                  </div>
                  {pct < 75 && (
                    <p style={{ fontSize: 10.5, color: '#DC2626', marginTop: 4, fontWeight: 500 }}>
                      Below minimum — attend {Math.max(0, Math.ceil((0.75 * s.total - s.present) / 0.25))} more
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Monthly trend */}
          {monthly.length > 0 && (
            <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '18px 20px' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Monthly Trend</h2>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                {monthly.map(m => {
                  const c = pctColor(m.pct)
                  return (
                    <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: c.color, margin: 0 }}>{m.pct}%</p>
                      <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'flex-end' }}>
                        <motion.div initial={{ height: 0 }} animate={{ height: `${m.pct}%` }} transition={{ duration: 0.6 }}
                          style={{ width: '100%', borderRadius: '6px 6px 0 0', background: c.bg, border: `1.5px solid ${c.color}` }} />
                      </div>
                      <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{m.month}</p>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 10, padding: '8px 0', borderTop: '1px solid #F1F5F9' }}>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Minimum required: <strong style={{ color: '#475569' }}>75%</strong></p>
              </div>
            </div>
          )}

          {/* Recent days */}
          {recent.length > 0 && (
            <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Recent Days</h2>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recent.map(({ date, entries }) => (
                  <div key={date} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #F8FAFC' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', minWidth: 70, margin: 0 }}>
                      {new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {entries.map(({ subject, status }, j) => (
                        <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: status === 'present' ? '#ECFDF5' : status === 'absent' ? '#FEF2F2' : '#FFFBEB', color: status === 'present' ? '#059669' : status === 'absent' ? '#DC2626' : '#D97706', border: `1px solid ${status === 'present' ? '#A7F3D0' : status === 'absent' ? '#FECACA' : '#FDE68A'}` }}>
                          {status === 'present' ? <CheckCircle size={10} /> : status === 'absent' ? <XCircle size={10} /> : <Clock size={10} />}
                          {subject.slice(0, 8)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
