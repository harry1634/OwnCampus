'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Download, CheckCircle, Clock, AlertTriangle, X, Check } from 'lucide-react'
import Dropdown from '@/components/ui/Dropdown'
import { openPrintWindow } from '@/lib/exportUtils'

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
  'Computer Sci.', 'History', 'Geography', 'Economics', 'Hindi', 'Telugu', 'Physical Ed.',
]

const statusStyle = {
  'Scheduled':         { color: '#2563EB', bg: '#EFF6FF', icon: Clock         },
  'Hall Tickets Sent': { color: '#0891B2', bg: '#ECFEFF', icon: CheckCircle   },
  'Marks Pending':     { color: '#D97706', bg: '#FFFBEB', icon: AlertTriangle  },
}

function fmt12(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
function fmtDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`
}

// ── Schedule Exam Modal ────────────────────────────────────────────────────────
function timeDiffMins(start, end) {
  if (!start || !end) return 60
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? diff : 60
}

// Returns true if [s1,e1) overlaps [s2,e2) — works with 'HH:MM' strings
function overlaps(s1, e1, s2, e2) {
  if (!s1 || !s2) return false
  const end1 = e1 || addMins(s1, 180)
  const end2 = e2 || addMins(s2, 180)
  return s1 < end2 && end1 > s2
}
function addMins(t, m) {
  const [h, mn] = t.split(':').map(Number)
  const tot = h * 60 + mn + m
  return `${String(Math.floor(tot / 60)).padStart(2,'0')}:${String(tot % 60).padStart(2,'0')}`
}
// Normalise a time that may come back as 'HH:MM:SS' to 'HH:MM'
function normTime(t) { return t ? t.slice(0, 5) : '' }

function ScheduleModal({ onClose, onAdd, classes, currentExam, schedule }) {
  const [form,  setForm ] = useState({ subject: '', class: '', date: '', startTime: '', endTime: '', venue: '', invigilatorId: '', status: 'Scheduled' })
  const [saved, setSaved] = useState(false)
  const [avail, setAvail ] = useState({ rooms: [], faculty: [], loading: false, loaded: false })
  const [allFaculty, setAllFaculty] = useState([])
  const [confirmPending, setConfirmPending] = useState(false)
  const [conflicts,      setConflicts     ] = useState([])
  const [checking,       setChecking      ] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Load full faculty list for the invigilator dropdown (always available, not time-dependent)
  useEffect(() => {
    fetch('/api/faculty')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        // /api/faculty returns { faculty: [...] } or an array
        const rows = Array.isArray(data) ? data : (data?.faculty || [])
        setAllFaculty(rows)
      })
      .catch(() => {})
  }, [])

  // Auto-set endTime to 3 hours after startTime when endTime is blank
  useEffect(() => {
    if (!form.startTime || form.endTime) return
    setForm(f => ({ ...f, endTime: addMins(form.startTime, 180) }))
  }, [form.startTime])

  // Fetch availability chips whenever date + startTime are both set
  useEffect(() => {
    if (!form.date || !form.startTime) { setAvail(a => ({ ...a, rooms: [], faculty: [], loaded: false })); return }
    const duration = timeDiffMins(form.startTime, form.endTime)
    setAvail(a => ({ ...a, loading: true }))
    fetch(`/api/availability?date=${form.date}&time=${form.startTime}&duration=${duration}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setAvail({ rooms: d?.rooms || [], faculty: d?.faculty || [], loading: false, loaded: true }))
      .catch(() => setAvail(a => ({ ...a, loading: false, loaded: true })))
  }, [form.date, form.startTime, form.endTime])

  const availRooms   = avail.rooms.filter(r => r.available)
  const busyRooms    = avail.rooms.filter(r => !r.available)
  const availFaculty = avail.faculty.filter(f => f.available)
  const busyFaculty  = avail.faculty.filter(f => !f.available)

  const commitSave = async () => {
    setSaved(true)
    try {
      const selectedFaculty = allFaculty.find(f => (f.supabaseId || f.userId || f.id) === form.invigilatorId)
      const invigilatorName = selectedFaculty?.name || ''
      const res = await fetch('/api/examinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:           currentExam || form.subject,
          type:           'internal',
          exam_date:      form.date,
          start_time:     form.startTime     || null,
          end_time:       form.endTime       || null,
          hall_number:    form.venue         || null,
          invigilator_id: form.invigilatorId || null,
          total_marks:    100,
          passing_marks:  35,
          class_name:     form.class   || null,
          subject_name:   form.subject || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSaved(false)
        alert(json.error || 'Failed to schedule exam')
        return
      }
      const dbId = json.exam?.id || null
      const dateLabel = fmtDate(form.date)
      const timeLabel = form.startTime
        ? `, ${fmt12(form.startTime)}${form.endTime ? ' – ' + fmt12(form.endTime) : ''}`
        : ''
      onAdd({
        id:            dbId || Date.now(),
        subject:       form.subject,
        class:         form.class,
        datetime:      `${dateLabel}${timeLabel}`,
        rawDate:       form.date,
        rawStart:      form.startTime,
        rawEnd:        form.endTime,
        venue:         form.venue,
        invigilatorId: form.invigilatorId,
        invigilator:   invigilatorName,
        status:        form.status,
        fromApi:       !!dbId,
      })
      onClose()
    } catch (err) {
      setSaved(false)
      alert(err.message || 'Network error — exam not saved')
    }
  }

  // Client-side conflict detection against the in-memory schedule.
  // Works for BOTH new entries (with rawDate/rawStart) and OLD localStorage
  // entries that only have a `datetime` display string.
  const handleSave = async () => {
    if (!form.subject || !form.class || !form.date) return

    const found = []
    const dateLabel = fmtDate(form.date)   // e.g. "30 Jun"
    const st = form.startTime
    const et = form.endTime || (st ? addMins(st, 180) : '')

    for (const row of (schedule || [])) {
      // ── Date match ───────────────────────────────────────────────────────
      // Prefer structured rawDate; fall back to checking datetime display string
      const sameDate = row.rawDate
        ? row.rawDate === form.date
        : (row.datetime || '').startsWith(dateLabel)
      if (!sameDate) continue

      // ── Time overlap ─────────────────────────────────────────────────────
      // Only flag a conflict when we can actually verify overlap.
      // - New exam has no time → match all same-date entries (date-only warning)
      // - Existing entry has no rawStart → skip (can't verify, don't false-positive)
      // - Both have times → proper [s1,e1) ∩ [s2,e2) check
      let timeMatch = false
      if (!st) {
        timeMatch = true          // new exam is date-only; warn for same date
      } else if (row.rawStart) {
        const rs = normTime(row.rawStart)
        const re = normTime(row.rawEnd) || addMins(rs, 180)
        timeMatch = overlaps(st, et, rs, re)
      }
      // If row has no rawStart and new exam has a specific time → skip (no data)
      if (!timeMatch) continue

      // ── Conflict checks ───────────────────────────────────────────────────
      if (form.venue && row.venue &&
          form.venue.trim().toLowerCase() === row.venue.trim().toLowerCase()) {
        found.push(`Room "${form.venue}" is already booked for ${row.subject} (${row.class}) at this time`)
      }
      if (form.invigilatorId && row.invigilatorId &&
          form.invigilatorId === row.invigilatorId) {
        const invFac = allFaculty.find(f => (f.supabaseId || f.userId || f.id) === form.invigilatorId)
        const invLabel = invFac?.name || 'This invigilator'
        found.push(`${invLabel} is already invigilating ${row.subject} (${row.class}) at this time`)
      }
      if (form.class && row.class &&
          form.class.trim() === row.class.trim()) {
        found.push(`${form.class} already has an exam (${row.subject}) scheduled at this time`)
      }
    }

    // Server-side check as secondary (catches cross-admin / cross-session conflicts)
    const selectedFacForCheck = allFaculty.find(f => (f.supabaseId || f.userId || f.id) === form.invigilatorId)
    const invigilatorNameForCheck = selectedFacForCheck?.name || ''

    if (found.length === 0 && st && (form.venue || form.invigilatorId)) {
      setChecking(true)
      try {
        const r = await fetch('/api/availability/check', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date:        form.date,
            startTime:   st,
            endTime:     et || null,
            room:        form.venue              || null,
            facultyName: invigilatorNameForCheck || null,
          }),
        })
        const d = await r.json()
        if (d.conflicts?.length) found.push(...d.conflicts)
      } catch {}
      setChecking(false)
    }

    if (found.length > 0) {
      setConflicts(found)
      setConfirmPending(true)
      return
    }

    commitSave()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: 'calc(var(--header-height) + 24px) 24px 40px' }}
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#FFFFFF', borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: 'calc(100vh - var(--header-height) - 64px)', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Schedule Exam</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Create a new examination entry</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Subject + Class */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>Subject *</label>
              <select className="input-premium" style={{ width: '100%' }} value={form.subject} onChange={set('subject')}>
                <option value="">Select subject…</option>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>Class *</label>
              {classes.length > 0 ? (
                <select className="input-premium" style={{ width: '100%' }} value={form.class} onChange={set('class')}>
                  <option value="">Select class…</option>
                  {classes.map(c => <option key={c}>{c}</option>)}
                </select>
              ) : (
                <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="e.g. Grade 10" value={form.class} onChange={set('class')} />
              )}
            </div>
          </div>

          {/* Date + Start Time + End Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>Date *</label>
              <input type="date" className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} value={form.date} onChange={set('date')} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>Start Time</label>
              <input type="time" className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} value={form.startTime} onChange={set('startTime')} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>End Time</label>
              <input type="time" className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} value={form.endTime} onChange={set('endTime')} />
            </div>
          </div>

          {/* Duration badge + Availability hint */}
          {form.startTime && form.endTime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 12px', borderRadius: 99, background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>
                ⏱ Duration: {timeDiffMins(form.startTime, form.endTime)} min
              </span>
              {form.date && (
                <span style={{ fontSize: 11.5, color: avail.loading ? '#94A3B8' : '#059669', background: avail.loading ? '#F8FAFC' : '#ECFDF5', border: `1px solid ${avail.loading ? '#E2E8F0' : '#A7F3D0'}`, borderRadius: 99, padding: '4px 12px' }}>
                  {avail.loading ? '⏳ Checking availability…' : avail.loaded ? `✓ Availability checked for ${fmt12(form.startTime)} – ${fmt12(form.endTime)}` : ''}
                </span>
              )}
            </div>
          )}

          {/* Venue */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>
              Venue
              {avail.loaded && <span style={{ marginLeft: 6, fontWeight: 500, color: '#94A3B8' }}>({availRooms.length} available, {busyRooms.length} busy)</span>}
            </label>
            <input type="text" className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="Type or click a room below…" value={form.venue}
              onChange={set('venue')} />
            {avail.loaded && avail.rooms.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {availRooms.map(r => (
                  <button key={r.name} onClick={() => setForm(f => ({ ...f, venue: r.name }))}
                    style={{ padding: '4px 10px', borderRadius: 7, border: `1.5px solid ${form.venue === r.name ? '#059669' : '#A7F3D0'}`,
                      background: form.venue === r.name ? '#ECFDF5' : '#F0FDF4',
                      color: '#059669', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    ✓ {r.name}
                  </button>
                ))}
                {busyRooms.map(r => (
                  <button key={r.name} disabled title="Already booked at this time"
                    style={{ padding: '4px 10px', borderRadius: 7, border: '1.5px solid #FECACA',
                      background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>
                    ✗ {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Invigilator */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 5 }}>
              Invigilator
              {avail.loaded && <span style={{ marginLeft: 6, fontWeight: 500, color: '#94A3B8' }}>({availFaculty.length} available at selected time)</span>}
            </label>
            {(() => {
              // /api/faculty shape: { supabaseId, name, designation, ... }
              // /api/availability shape: { userId, name, designation, available }
              const busyIds = new Set(busyFaculty.map(f => f.userId))
              const useAvail = avail.loaded && avail.faculty.length > 0
              const list = allFaculty.map(f => {
                const userId = f.supabaseId || f.userId || f.id
                const isBusy = useAvail ? busyIds.has(userId) : false
                return { userId, name: f.name || '', designation: f.designation || f.dept || 'Teacher', isBusy }
              }).filter(f => f.userId)
              const available = list.filter(f => !f.isBusy)
              const busy      = list.filter(f =>  f.isBusy)
              return (
                <select className="input-premium" style={{ width: '100%' }} value={form.invigilatorId} onChange={set('invigilatorId')}>
                  <option value="">Select invigilator…</option>
                  {available.map(f => (
                    <option key={f.userId} value={f.userId}>{useAvail ? '✓ ' : ''}{f.name} ({f.designation})</option>
                  ))}
                  {busy.length > 0 && (
                    <>
                      <option disabled>── Busy at this time ──</option>
                      {busy.map(f => (
                        <option key={f.userId} value={f.userId} disabled>✗ {f.name} (has class)</option>
                      ))}
                    </>
                  )}
                </select>
              )
            })()}
          </div>
        </div>

        {/* Conflict warning banner */}
        {confirmPending && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ margin: '0 20px 0', borderRadius: 12, background: '#FFFBEB', border: '1.5px solid #FCD34D', padding: '14px 16px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <AlertTriangle size={15} color="#D97706" /> Scheduling Conflict Detected
            </p>
            <ul style={{ margin: '0 0 12px', paddingLeft: 18 }}>
              {conflicts.map((c, i) => (
                <li key={i} style={{ fontSize: 12.5, color: '#78350F', marginBottom: 3 }}>{c}</li>
              ))}
            </ul>
            <p style={{ fontSize: 12, color: '#92400E', margin: '0 0 12px' }}>Do you still want to schedule this exam?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setConfirmPending(false); setConflicts([]) }}
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1.5px solid #FCD34D', background: '#FFFFFF', fontSize: 12.5, fontWeight: 600, color: '#92400E', cursor: 'pointer' }}>
                No, Go Back
              </button>
              <button onClick={commitSave}
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: '#D97706', fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer' }}>
                Yes, Schedule Anyway
              </button>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: confirmPending ? 'none' : '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: '#FFFFFF' }}>
          {!confirmPending && (
            <>
              <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <motion.button whileHover={{ scale: checking ? 1 : 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave}
                disabled={!form.subject || !form.class || !form.date || checking}
                style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: saved ? '#16A34A' : checking ? '#64748B' : (!form.subject || !form.class || !form.date) ? '#CBD5E1' : '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: (!form.subject || !form.class || !form.date || checking) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: 'background 0.2s' }}>
                {saved ? <><Check size={14} /> Saved!</> : checking ? '⏳ Checking…' : <><Plus size={14} /> Schedule Exam</>}
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, onChange }) {
  const st = statusStyle[status] || statusStyle['Scheduled']
  const statuses = Object.keys(statusStyle)
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <span onClick={() => setOpen(o => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: st.bg, color: st.color, cursor: 'pointer' }}>
        {status}
      </span>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden', minWidth: 160 }}>
            {statuses.map(s => {
              const c = statusStyle[s]
              return (
                <button key={s} onClick={() => { onChange(s); setOpen(false) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: s === status ? 700 : 500, color: c.color }}
                  onMouseEnter={e => e.currentTarget.style.background = c.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {s === status && <Check size={11} />}
                  {s}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ExaminationsPage() {
  const [mounted,    setMounted   ] = useState(false)
  const [examNames,  setExamNames ] = useState(['Mid-Term', 'Half-Yearly', 'Annual', 'Unit Test 1', 'Unit Test 2', 'Pre-Board'])
  const [exam,       setExam      ] = useState('Mid-Term')
  const [cls,        setCls       ] = useState('All')
  const [showModal,  setShowModal ] = useState(false)
  const [schedule,   setSchedule  ] = useState([])

  // Load grades + exams in parallel on mount
  const [ttGrades, setTtGrades] = useState([])
  useEffect(() => {
    Promise.all([
      fetch('/api/timetable/grid').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/examinations').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([gridData, rows]) => {
      if (gridData?.grid?.grades?.length)  setTtGrades(gridData.grid.grades)
      else if (gridData?.classes?.length)  setTtGrades(gridData.classes.map(c => c.displayName || c.name))

      if (Array.isArray(rows) && rows.length > 0) {
        const apiSchedule = rows.map(e => ({
          id:            e.id,
          exam:          e.name,
          subject:       e.subjects?.name || '',
          class:         e.classes ? `${e.classes.name}${e.classes.section ? ' - ' + e.classes.section : ''}` : '',
          datetime:      e.exam_date
            ? `${fmtDate(e.exam_date)}${e.start_time ? ', ' + fmt12(e.start_time.slice(0,5)) + (e.end_time ? ' – ' + fmt12(e.end_time.slice(0,5)) : '') : ''}`
            : '',
          rawDate:       e.exam_date || '',
          rawStart:      e.start_time ? e.start_time.slice(0,5) : '',
          rawEnd:        e.end_time   ? e.end_time.slice(0,5)   : '',
          venue:         e.hall_number || '',
          invigilatorId: e.invigilator_id || '',
          invigilator:   e.invigilator_profile
            ? [e.invigilator_profile.first_name, e.invigilator_profile.last_name].filter(Boolean).join(' ')
            : '',
          status:        e.is_published ? 'Hall Tickets Sent' : e.computed_status === 'completed' ? 'Marks Pending' : 'Scheduled',
          fromApi:       true,
        }))
        setSchedule(apiSchedule)
        const apiNames = [...new Set(apiSchedule.map(e => e.exam).filter(Boolean))]
        if (apiNames.length) {
          setExamNames(prev => [...new Set([...prev, ...apiNames])])
          setExam(prev => apiNames.includes(prev) ? prev : apiNames[0])
        }
      }
      setMounted(true)
    })
  }, [])

  const { filtered, classesInExam, kpis } = useMemo(() => {
    const filtered = schedule.filter(row =>
      row.exam === exam &&
      (cls === 'All' || row.class === cls)
    )
    const classesInExam = ['All', ...new Set(schedule.filter(r => r.exam === exam).map(r => r.class))]
    let hallTickets = 0, marksPending = 0
    for (const r of filtered) {
      if (r.status === 'Hall Tickets Sent') hallTickets++
      else if (r.status === 'Marks Pending') marksPending++
    }
    const kpis = [
      { label: 'Exams Scheduled',     value: filtered.length,             valueColor: '#0F172A' },
      { label: 'Hall Tickets Issued', value: hallTickets,                  valueColor: '#0891B2' },
      { label: 'Marks Entry Pending', value: `${marksPending} subjects`,   valueColor: '#D97706' },
      { label: 'Total Exams (All)',   value: schedule.length,              valueColor: '#0F172A' },
    ]
    return { filtered, classesInExam, kpis }
  }, [schedule, exam, cls])

  const updateStatus = async (id, newStatus) => {
    const row = schedule.find(r => r.id === id)
    if (!row?.fromApi) {
      setSchedule(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
      return
    }
    try {
      const res = await fetch('/api/examinations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_published: newStatus === 'Hall Tickets Sent' }),
      })
      if (res.ok) setSchedule(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
    } catch {}
  }
  const deleteRow = async (id) => {
    const row = schedule.find(r => r.id === id)
    if (!row?.fromApi) {
      setSchedule(prev => prev.filter(r => r.id !== id))
      return
    }
    try {
      const res = await fetch(`/api/examinations?id=${id}`, { method: 'DELETE' })
      if (res.ok) setSchedule(prev => prev.filter(r => r.id !== id))
    } catch {}
  }

  const printHallTickets = () => {
    if (!filtered.length) return
    const rows = filtered.map((row, idx) => `
      <div class="ticket">
        <div class="ticket-header">
          <div class="school-name">OwnCampus — The Education OS</div>
          <div class="ticket-title">HALL TICKET</div>
          <div class="exam-name">${exam}</div>
        </div>
        <div class="ticket-body">
          <div class="field-row"><span class="field-label">Subject</span><span class="field-value">${row.subject}</span></div>
          <div class="field-row"><span class="field-label">Class</span><span class="field-value">${row.class}</span></div>
          <div class="field-row"><span class="field-label">Date &amp; Time</span><span class="field-value">${row.datetime}</span></div>
          <div class="field-row"><span class="field-label">Venue</span><span class="field-value">${row.venue || '—'}</span></div>
          <div class="field-row"><span class="field-label">Invigilator</span><span class="field-value">${row.invigilator || '—'}</span></div>
        </div>
        <div class="ticket-footer">
          <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Student Signature</div></div>
          <div class="ticket-no">Ticket No: HT-${String(idx + 1).padStart(4, '0')}</div>
          <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Principal / Controller</div></div>
        </div>
      </div>
    `).join('')
    openPrintWindow(
      `Hall Tickets — ${exam}`,
      `<div class="page-title no-print">Hall Tickets · ${exam} &nbsp;|&nbsp; ${filtered.length} exams</div>${rows}`,
      `.page-title{padding:20px 32px 0;font-size:18px;font-weight:700;color:#1e40af}.ticket{background:#fff;border:2px solid #e2e8f0;border-radius:12px;margin:24px 32px;padding:0;overflow:hidden;page-break-inside:avoid}.ticket-header{background:#1e40af;color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center}.school-name{font-size:13px;opacity:.75}.ticket-title{font-size:20px;font-weight:800;letter-spacing:.05em}.exam-name{font-size:13px;opacity:.85;text-align:right}.ticket-body{padding:20px 24px;display:grid;grid-template-columns:1fr 1fr;gap:12px}.field-row{display:flex;flex-direction:column;gap:3px}.field-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8}.field-value{font-size:14px;font-weight:600;color:#0f172a}.ticket-footer{border-top:1px solid #f1f5f9;padding:14px 24px;display:flex;align-items:flex-end;justify-content:space-between}.sig-box{display:flex;flex-direction:column;align-items:center;gap:6px}.sig-line{width:140px;border-top:1px solid #0f172a}.sig-label{font-size:10px;color:#64748b}.ticket-no{font-size:11px;font-weight:600;color:#94a3b8}@media print{.ticket{margin:16px}}`
    )
  }

  if (!mounted) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Examinations</h1>
          <p className="page-header-sub">Schedule exams, issue hall tickets &amp; manage marks entry</p>
        </div>
        <div className="page-actions">
          <Dropdown prefix="Exam" options={examNames} value={exam} onChange={setExam} />
          <Dropdown prefix="Class" options={classesInExam} value={cls} onChange={setCls} />
          <button className="btn-secondary" onClick={printHallTickets} disabled={!filtered.length}>
            <Download size={15} /> Print Hall Tickets
          </button>
          <motion.button whileHover={{ scale: 1.02 }} className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Schedule Exam
          </motion.button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '18px 20px' }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8', marginBottom: 8 }}>{kpi.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: kpi.valueColor, lineHeight: 1, letterSpacing: '-0.01em' }}>{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Class filter chips — only show if there's data */}
      {classesInExam.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {classesInExam.map(c => (
            <button key={c} onClick={() => setCls(c)}
              style={{ padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: cls === c ? '1px solid #BFDBFE' : '1px solid #E2E8F0', background: cls === c ? '#EFF6FF' : '#FFFFFF', color: cls === c ? '#2563EB' : '#64748B', transition: 'all 0.15s' }}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Exam Schedule Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Exam Schedule — {exam}</h3>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>{filtered.length} exam{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFA' }}>
                {['SUBJECT', 'CLASS', 'DATE & TIME', 'VENUE', 'INVIGILATOR', 'STATUS', ''].map(col => (
                  <th key={col} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', borderBottom: '1px solid #F1F5F9' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>No exams scheduled yet for {exam}</p>
                    <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Click "Schedule Exam" to add entries.</p>
                  </td>
                </tr>
              ) : filtered.map((row, i) => (
                <tr key={row.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F8FAFC' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '16px 20px' }}><span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{row.subject}</span></td>
                  <td style={{ padding: '16px 20px' }}><span style={{ fontSize: 13, color: '#2563EB', fontWeight: 500 }}>{row.class}</span></td>
                  <td style={{ padding: '16px 20px' }}><span style={{ fontSize: 13, color: '#475569' }}>{row.datetime}</span></td>
                  <td style={{ padding: '16px 20px' }}><span style={{ fontSize: 13, color: '#475569' }}>{row.venue || '—'}</span></td>
                  <td style={{ padding: '16px 20px' }}><span style={{ fontSize: 13, color: '#475569' }}>{row.invigilator || '—'}</span></td>
                  <td style={{ padding: '16px 20px' }}>
                    <StatusBadge status={row.status} onChange={(s) => updateStatus(row.id, s)} />
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <button onClick={() => deleteRow(row.id)}
                      style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                      onMouseLeave={e => e.currentTarget.style.background = '#FEF2F2'}>
                      <X size={11} style={{ color: '#DC2626' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <ScheduleModal
            onClose={() => setShowModal(false)}
            onAdd={(row) => setSchedule(p => [{ ...row, exam }, ...p])}
            classes={ttGrades}
            currentExam={exam}
            schedule={schedule}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
