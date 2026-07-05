'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react'
import { useCurrentUser } from '@/lib/useCurrentUser'

const DAYS_FULL = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const PALETTE = [
  { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA' },
  { bg: '#F0FDF4', color: '#16A34A', border: '#A7F3D0' },
  { bg: '#ECFEFF', color: '#0891B2', border: '#A5F3FC' },
  { bg: '#FFF1F2', color: '#E11D48', border: '#FECDD3' },
  { bg: '#FDF4FF', color: '#A21CAF', border: '#F0ABFC' },
]

function fmt12(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

const todayIdx = (new Date().getDay() + 6) % 7

function getWeekLabel(offset) {
  const now = new Date(); now.setDate(now.getDate() + offset * 7)
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const fmt = d => `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4)
  if (offset === 0) return `This Week (${fmt(mon)} – ${fmt(fri)})`
  return `${fmt(mon)} – ${fmt(fri)}`
}

function Spinner() {
  return (
    <div style={{ padding: '48px', textAlign: 'center' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#059669', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Loading timetable…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function FacultyTimetable() {
  const cu = useCurrentUser()
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading,    setLoading   ] = useState(true)
  const [byDay,      setByDay     ] = useState({})
  const [allSlots,   setAllSlots  ] = useState([])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/timetable?week_offset=${weekOffset}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => {
        setByDay(data.byDay || {})
        setAllSlots(data.slots || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [weekOffset])

  // Build all unique periods (sorted by period_number)
  const periodsMap = {}
  allSlots.forEach(s => {
    if (s.period_number && !periodsMap[s.period_number]) {
      periodsMap[s.period_number] = { num: s.period_number, start: s.start_time, end: s.end_time }
    }
  })
  const periods = Object.values(periodsMap).sort((a, b) => a.num - b.num)

  // Build a lookup: day → period_number → slot
  const slotMap = {}
  DAYS_FULL.forEach(day => {
    slotMap[day] = {}
    ;(byDay[day] || []).forEach(s => { slotMap[day][s.period_number] = s })
  })

  // Color by class
  const classIds = [...new Set(allSlots.map(s => s.class_id).filter(Boolean))]
  const classColor = {}
  classIds.forEach((id, i) => { classColor[id] = PALETTE[i % PALETTE.length] })

  const totalPeriods = allSlots.length
  const myClasses    = [...new Set(allSlots.map(s => s.classes ? `${s.classes.name} ${s.classes.section || ''}`.trim() : '').filter(Boolean))]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>My Timetable</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
            {loading ? 'Loading…' : `${totalPeriods} period${totalPeriods !== 1 ? 's' : ''} per week`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronLeft size={15} color="#64748B" />
          </button>
          <div style={{ padding: '6px 16px', borderRadius: 9, border: '1px solid #A7F3D0', background: '#ECFDF5', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Calendar size={13} color="#059669" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>{getWeekLabel(weekOffset)}</span>
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronRight size={15} color="#64748B" />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} style={{ padding: '6px 12px', borderRadius: 9, border: '1px solid #A7F3D0', background: '#ECFDF5', fontSize: 12, fontWeight: 600, color: '#059669', cursor: 'pointer' }}>Today</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Periods', value: totalPeriods,    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
          { label: 'Classes',       value: myClasses.length, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
        ].map(s => (
          <div key={s.label} style={{ padding: '8px 16px', borderRadius: 10, background: s.bg, border: `1px solid ${s.border}` }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 12, color: '#64748B', marginLeft: 6 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {loading && <Spinner />}

      {!loading && totalPeriods === 0 && (
        <div style={{ padding: 40, textAlign: 'center', background: '#F8FAFC', borderRadius: 16, border: '1px dashed #CBD5E1' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>No periods assigned to you yet</p>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>The admin needs to assign you to classes in the timetable.</p>
        </div>
      )}

      {!loading && periods.length > 0 && (
        <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0', width: 120 }}>Period / Time</th>
                {DAYS_SHORT.map((d, di) => (
                  <th key={d} style={{ padding: '14px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: di === todayIdx ? '#059669' : '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0', background: di === todayIdx ? '#F0FDF4' : 'transparent', minWidth: 100 }}>
                    {d}
                    {di === todayIdx && <span style={{ display: 'block', fontSize: 9, color: '#059669', fontWeight: 700, marginTop: 2 }}>TODAY</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period, pi) => (
                <tr key={pi} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px', background: '#FAFAFA', borderRight: '1px solid #F1F5F9' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', margin: 0 }}>P{period.num}</p>
                    {period.start && (
                      <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={9} />{fmt12(period.start)}{period.end ? ` – ${fmt12(period.end)}` : ''}
                      </p>
                    )}
                  </td>
                  {DAYS_FULL.map((day, di) => {
                    const slot    = slotMap[day]?.[period.num]
                    const isToday = di === todayIdx
                    const theme   = slot ? (classColor[slot.class_id] || PALETTE[0]) : null
                    const clsName = slot?.classes ? `${slot.classes.name} ${slot.classes.section || ''}`.trim() : ''
                    return (
                      <td key={day} style={{ padding: '8px', textAlign: 'center', background: isToday ? '#FAFFF9' : 'transparent' }}>
                        {slot ? (
                          <div style={{ padding: '8px', borderRadius: 10, background: theme.bg, border: `1px solid ${theme.border}`, textAlign: 'center' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: theme.color, margin: 0 }}>{slot.subjects?.name || '—'}</p>
                            <p style={{ fontSize: 9.5, color: theme.color, opacity: 0.7, margin: '2px 0 0', fontWeight: 500 }}>{clsName}</p>
                            {slot.room && <p style={{ fontSize: 9, color: '#94A3B8', margin: '1px 0 0' }}>Rm {slot.room}</p>}
                          </div>
                        ) : (
                          <div style={{ height: 44 }} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {myClasses.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {classIds.map((id, i) => {
            const c    = classColor[id] || PALETTE[0]
            const slot = allSlots.find(s => s.class_id === id)
            const name = slot?.classes ? `${slot.classes.name} ${slot.classes.section || ''}`.trim() : id
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
                <span style={{ fontSize: 11, color: '#64748B' }}>{name}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
