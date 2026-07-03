'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useCurrentUser } from '@/lib/useCurrentUser'

const DAYS_FULL  = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const SUBJECT_PALETTE = [
  { bg: '#EFF6FF', color: '#2563EB' },
  { bg: '#F5F3FF', color: '#7C3AED' },
  { bg: '#FFF7ED', color: '#EA580C' },
  { bg: '#F0FDF4', color: '#16A34A' },
  { bg: '#ECFEFF', color: '#0891B2' },
  { bg: '#FEF9C3', color: '#CA8A04' },
  { bg: '#FFF1F2', color: '#E11D48' },
  { bg: '#FDF4FF', color: '#A21CAF' },
]

function fmt12(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

const todayIdx = (new Date().getDay() + 6) % 7

function Spinner() {
  return (
    <div style={{ padding: '48px', textAlign: 'center' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#7C3AED', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Loading timetable…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function StudentTimetable() {
  const cu = useCurrentUser()
  const [loading,  setLoading ] = useState(true)
  const [byDay,    setByDay   ] = useState({})
  const [allSlots, setAllSlots] = useState([])
  const [classInfo, setClassInfo] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/timetable')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => {
        setByDay(data.byDay || {})
        setAllSlots(data.slots || [])
        const first = (data.slots || [])[0]
        if (first?.classes) setClassInfo(first.classes)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Build all unique periods
  const periodsMap = {}
  allSlots.forEach(s => {
    if (s.period_number && !periodsMap[s.period_number]) {
      periodsMap[s.period_number] = { num: s.period_number, start: s.start_time, end: s.end_time }
    }
  })
  const periods = Object.values(periodsMap).sort((a, b) => a.num - b.num)

  // Color by subject name
  const subjectNames = [...new Set(allSlots.map(s => s.subjects?.name).filter(Boolean))]
  const subjectColor = {}
  subjectNames.forEach((name, i) => { subjectColor[name] = SUBJECT_PALETTE[i % SUBJECT_PALETTE.length] })

  // Slot lookup: day → period_number → slot
  const slotMap = {}
  DAYS_FULL.forEach(day => {
    slotMap[day] = {}
    ;(byDay[day] || []).forEach(s => { slotMap[day][s.period_number] = s })
  })

  // Today's slots
  const todayDay      = DAYS_FULL[todayIdx > 6 ? 6 : todayIdx] || 'monday'
  const todaySlots    = (byDay[todayDay] || []).sort((a, b) => a.period_number - b.period_number)
  const classLabel    = classInfo ? `${classInfo.name} ${classInfo.section || ''}`.trim() : (cu.classSection || 'Your class')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Class Timetable</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{classLabel} · Weekly Schedule</p>
      </div>

      {loading && <Spinner />}

      {!loading && allSlots.length === 0 && (
        <div style={{ padding: '32px', textAlign: 'center', background: '#F8FAFC', borderRadius: 16, border: '1px dashed #CBD5E1' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>Timetable not configured for your class yet</p>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Ask your admin to set up the timetable.</p>
        </div>
      )}

      {!loading && todaySlots.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,#4C1D95,#7C3AED)', borderRadius: 18, padding: '18px 22px' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: '0 0 12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Today — {DAYS_SHORT[todayIdx]}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {todaySlots.map((slot, i) => {
              const facultyName = slot.user_profiles
                ? [slot.user_profiles.first_name, slot.user_profiles.last_name].filter(Boolean).join(' ')
                : ''
              return (
                <motion.div key={slot.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  style={{ padding: '8px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: '0 0 2px' }}>
                    P{slot.period_number}{slot.start_time ? ` · ${fmt12(slot.start_time)}` : ''}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{slot.subjects?.name || '—'}</p>
                  {facultyName && <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.55)', margin: '2px 0 0' }}>{facultyName}</p>}
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && todaySlots.length === 0 && allSlots.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,#4C1D95,#7C3AED)', borderRadius: 18, padding: '18px 22px' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: '0 0 8px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Today — {DAYS_SHORT[todayIdx]}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>No classes scheduled for today.</p>
        </div>
      )}

      {!loading && periods.length > 0 && (
        <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', borderBottom: '1px solid #E2E8F0', letterSpacing: '0.04em', textTransform: 'uppercase', width: 100 }}>Period</th>
                  {DAYS_SHORT.map((d, di) => (
                    <th key={d} style={{ padding: '12px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: di === todayIdx ? '#7C3AED' : '#64748B', borderBottom: '1px solid #E2E8F0', letterSpacing: '0.04em', textTransform: 'uppercase', background: di === todayIdx ? '#F5F3FF' : 'transparent' }}>
                      {d}
                      {di === todayIdx && <span style={{ display: 'block', fontSize: 9, color: '#A78BFA', fontWeight: 500, marginTop: 2 }}>Today</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((p, pi) => (
                  <tr key={pi} style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <td style={{ padding: '10px 14px', background: '#FAFAFA' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', margin: 0 }}>P{p.num}</p>
                      {p.start && <p style={{ fontSize: 10, color: '#CBD5E1', margin: 0 }}>{fmt12(p.start)}{p.end ? ` – ${fmt12(p.end)}` : ''}</p>}
                    </td>
                    {DAYS_FULL.map((day, di) => {
                      const slot    = slotMap[day]?.[p.num]
                      const subName = slot?.subjects?.name || null
                      const c       = subName ? (subjectColor[subName] || SUBJECT_PALETTE[0]) : null
                      const faculty = slot?.user_profiles
                        ? [slot.user_profiles.first_name, slot.user_profiles.last_name].filter(Boolean).join(' ')
                        : ''
                      const isToday = di === todayIdx
                      return (
                        <td key={day} style={{ padding: '6px', background: isToday ? '#FAFAFF' : 'transparent' }}>
                          {slot && c ? (
                            <div style={{ padding: '8px', borderRadius: 10, background: c.bg, textAlign: 'center' }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: c.color, margin: '0 0 2px' }}>{subName}</p>
                              {slot.room && <p style={{ fontSize: 9, color: c.color, opacity: 0.7, margin: 0 }}>Rm {slot.room}</p>}
                              {faculty && <p style={{ fontSize: 9.5, color: '#94A3B8', margin: '2px 0 0' }}>{faculty.split(' ').pop()}</p>}
                            </div>
                          ) : (
                            <div style={{ height: 40, background: isToday ? '#F5F3FF14' : 'transparent' }} />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
