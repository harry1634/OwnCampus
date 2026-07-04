'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Printer, Plus, X, Check, ChevronLeft, ChevronRight, Pencil, RotateCcw, AlertCircle } from 'lucide-react'
import { openPrintWindow } from '@/lib/exportUtils'
import { toast } from 'sonner'
// ── Subject colors (config only — no mock schedule data) ─────────────────────
const SUBJECT_COLORS = {
  'Mathematics':    { bg: '#EFF6FF', color: '#2563EB' },
  'Physics':        { bg: '#F5F3FF', color: '#7C3AED' },
  'Chemistry':      { bg: '#FFF7ED', color: '#EA580C' },
  'Biology':        { bg: '#F0FDF4', color: '#16A34A' },
  'English':        { bg: '#ECFEFF', color: '#0891B2' },
  'Computer Sci.':  { bg: '#FEF9C3', color: '#CA8A04' },
  'History':        { bg: '#FFF1F2', color: '#E11D48' },
  'Geography':      { bg: '#F0FDF4', color: '#15803D' },
  'Economics':      { bg: '#FDF4FF', color: '#A21CAF' },
  'Hindi':          { bg: '#FFF7ED', color: '#C2410C' },
  'Telugu':         { bg: '#ECFDF5', color: '#047857' },
  'Physical Ed.':   { bg: '#FEF2F2', color: '#DC2626' },
}
const SUBJECTS = Object.keys(SUBJECT_COLORS)

// Subject → department keywords (specific — avoids 'science' matching 'Computer Science')
const SUBJECT_DEPT = {
  'Mathematics':   ['mathematics', 'maths', 'math'],
  'Physics':       ['physics'],
  'Chemistry':     ['chemistry'],
  'Biology':       ['biology'],
  'English':       ['english'],
  'Computer Sci.': ['computer science', 'computer', 'information technology', 'it'],
  'History':       ['history'],
  'Geography':     ['geography'],
  'Economics':     ['economics', 'commerce'],
  'Hindi':         ['hindi'],
  'Telugu':        ['telugu'],
  'Physical Ed.':  ['physical education', 'physical ed', 'pe'],
}

// Returns only matched faculty — empty array when no dept match (no fallback to all)
function getTeachersForSubject(subject, allFaculty) {
  if (!subject || !allFaculty.length) return []
  // 1. Try subjects[] array on faculty profile (if populated)
  const subjectNorm = subject.toLowerCase().replace('sci.', 'science')
  const bySubject = allFaculty.filter(f =>
    f.subjects?.some(s => {
      const sn = s.toLowerCase()
      return sn === subjectNorm || sn.includes(subjectNorm) || subjectNorm.includes(sn)
    })
  )
  if (bySubject.length) return bySubject.map(f => f.name)
  // 2. Match by department — whole-word match only
  const keywords = SUBJECT_DEPT[subject] || []
  const byDept = allFaculty.filter(f => {
    const dept = (f.dept || '').toLowerCase()
    return keywords.some(kw => new RegExp(`(?:^|\\s)${kw}(?:\\s|$)`).test(dept))
  })
  return byDept.map(f => f.name)
  // No fallback — empty result means "no faculty for this subject dept"
}

const days    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKEND = new Set(['Sat', 'Sun'])

const DEFAULT_PERIODS = [
  { id: 1, start: '09:00', end: '09:45' },
  { id: 2, start: '09:45', end: '10:30' },
  { id: 3, start: '10:45', end: '11:30' },
  { id: 4, start: '11:30', end: '12:15' },
  { id: 5, start: '13:00', end: '13:45' },
  { id: 6, start: '13:45', end: '14:30' },
]

const DEFAULT_GRADES = [
  'Class 6', 'Class 7', 'Class 8',
  'Class 9 - A', 'Class 9 - B',
  'Class 10 - A', 'Class 10 - B',
  'Class 11 - A', 'Class 12 - A',
]


function buildEmptySchedule(periodCount, grades) {
  const s = {}, r = {}, t = {}
  grades.forEach(g => {
    s[g] = Array.from({ length: periodCount }, () => Array(days.length).fill(null))
    r[g] = Array.from({ length: periodCount }, () => Array(days.length).fill(''))
    t[g] = Array.from({ length: periodCount }, () => Array(days.length).fill(''))
  })
  return { schedules: s, rooms: r, teachers: t }
}

function fmt12(t) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}
function addOneHour(t) {
  const [h, m] = t.split(':').map(Number)
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
function getWeekLabel(offset) {
  if (offset === 0) return 'This Week'
  if (offset === -1) return 'Last Week'
  if (offset === 1) return 'Next Week'
  const now = new Date(); now.setDate(now.getDate() + offset * 7)
  const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1)
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4)
  const fmt = d => `${d.getDate()} ${d.toLocaleString('en',{month:'short'})}`
  return `${fmt(mon)} – ${fmt(fri)}`
}

// ── Dropdown ──────────────────────────────────────────────────────────────────
function Dropdown({ label, options, value, onChange, alignLeft }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} className="btn-filter"
        style={{ background: open ? '#EFF6FF' : undefined, borderColor: open ? '#BFDBFE' : undefined, color: open ? '#2563EB' : undefined }}>
        {value || label}
        <ChevronDown size={13} style={{ transition: 'transform 0.18s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}
            style={{ position: 'absolute', top: 'calc(100% + 6px)', [alignLeft ? 'left' : 'right']: 0, minWidth: 190, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 60, overflow: 'hidden' }}>
            {options.map((opt, i) => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: value === opt ? '#2563EB' : '#0F172A', fontWeight: value === opt ? 600 : 400, borderTop: i === 0 ? 'none' : '1px solid #F8FAFC' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {opt}{value === opt && <Check size={13} style={{ color: '#2563EB', flexShrink: 0 }} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Cell subject picker ───────────────────────────────────────────────────────
function CellPicker({ subject, onSelect, onClose, style }) {
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, scale: 0.92, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.14 }}
      onClick={e => e.stopPropagation()}
      style={{ position: 'absolute', zIndex: 100, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.14)', minWidth: 170, overflow: 'hidden', ...style }}>
      <p style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Select Subject</p>
      {SUBJECTS.map(s => {
        const c = SUBJECT_COLORS[s]
        const active = s === subject
        return (
          <button key={s} onClick={() => onSelect(s)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: active ? '#F8FAFC' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.background = active ? '#F8FAFC' : 'transparent'}>
            <div style={{ width: 8, height: 8, borderRadius: 99, background: c.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? c.color : '#0F172A', flex: 1 }}>{s}</span>
            {active && <Check size={11} style={{ color: c.color }} />}
          </button>
        )
      })}
      <div style={{ borderTop: '1px solid #F1F5F9', margin: '4px 0' }} />
      <button onClick={() => onSelect(null)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <X size={11} style={{ color: '#EF4444' }} /><span style={{ fontSize: 12, fontWeight: 500, color: '#EF4444' }}>Free Period</span>
      </button>
    </motion.div>
  )
}

// ── Period time editor ────────────────────────────────────────────────────────
function PeriodEditor({ period, onSave, onClose }) {
  const [start, setStart] = useState(period.start)
  const [end,   setEnd  ] = useState(period.end)
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, scale: 0.92, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.14 }}
      onClick={e => e.stopPropagation()}
      style={{ position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 200, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.14)', padding: 14, minWidth: 210 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10 }}>Edit Period Time</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>Start</label>
          <input type="time" value={start} onChange={e => setStart(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '6px 8px', border: '1px solid #E2E8F0', borderRadius: 8, outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 4 }}>End</label>
          <input type="time" value={end} onChange={e => setEnd(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '6px 8px', border: '1px solid #E2E8F0', borderRadius: 8, outline: 'none', fontFamily: 'inherit' }} />
        </div>
      </div>
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={() => { onSave({ ...period, start, end }); onClose() }}
        style={{ width: '100%', padding: '7px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#FFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
        Save Time
      </motion.button>
    </motion.div>
  )
}

// ── Add Grade modal ───────────────────────────────────────────────────────────
function AddGradeModal({ onAdd, onClose }) {
  const [name, setName] = useState('')
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: 'calc(var(--header-height) + 24px) 24px 40px' }}
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#FFFFFF', borderRadius: 18, width: '100%', maxWidth: 380, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Add Class / Grade</p>
        <p style={{ fontSize: 12, color: '#64748B', marginBottom: 18 }}>e.g. "Class 10 - C" or "Grade 11 Science"</p>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) { onAdd(name.trim()); onClose() } }}
          placeholder="Class name…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', marginBottom: 14, fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer' }}>
            Cancel
          </button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            disabled={!name.trim()}
            onClick={() => { if (name.trim()) { onAdd(name.trim()); onClose() } }}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: name.trim() ? '#2563EB' : '#E2E8F0', color: name.trim() ? '#FFF' : '#94A3B8', fontSize: 13, fontWeight: 700, cursor: name.trim() ? 'pointer' : 'default' }}>
            Add Class
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TimetablePage() {
  const [apiFaculty, setApiFaculty] = useState([])
  const TEACHERS = apiFaculty.length
    ? apiFaculty.map(f => f.name).filter(Boolean)
    : ['Assign Faculty']

  const [mounted,      setMounted     ] = useState(false)
  const [grades,       setGrades      ] = useState(DEFAULT_GRADES)
  const [grade,        setGrade       ] = useState(DEFAULT_GRADES[0])
  const [weekOffset,   setWeekOffset  ] = useState(0)
  const [editMode,     setEditMode    ] = useState(false)
  const [activeCell,   setActiveCell  ] = useState(null)
  const [editingRoom,  setEditingRoom ] = useState(null)
  const [roomInput,    setRoomInput   ] = useState('')
  const [editingPeriod, setEditingPeriod]   = useState(null)
  const [editingTeacher, setEditingTeacher] = useState(null)
  const [showAddGrade, setShowAddGrade]     = useState(false)

  const [periods,      setPeriods     ] = useState(DEFAULT_PERIODS)
  const [schedules,    setSchedules   ] = useState({})
  const [rooms,        setRooms       ] = useState({})
  const [cellTeachers, setCellTeachers] = useState({})
  const [publishing,   setPublishing  ] = useState(false)
  const [published,    setPublished   ] = useState(false)

  // Fetch faculty for the teacher dropdown
  useEffect(() => {
    fetch('/api/faculty').then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length) setApiFaculty(data)
    }).catch(() => {})
  }, [])

  // Load timetable from timetable_slots via the grid API
  function loadGrid(markMounted) {
    return fetch('/api/timetable/grid')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.grid) {
          const g = d.grid
          if (g.grades?.length) {
            setGrades(g.grades)
            setGrade(g.grades[0])  // always sync active grade to DB — prevents mismatch with DEFAULT_GRADES
          }
          if (g.periods?.length) setPeriods(g.periods)
          if (g.schedules)       setSchedules(g.schedules)
          if (g.rooms)           setRooms(g.rooms)
          if (g.cellTeachers)    setCellTeachers(g.cellTeachers)
        } else if (d?.classes?.length) {
          // Classes exist in DB but no timetable yet — use class names as grades
          const dbGrades = d.classes.map(c => c.displayName)
          setGrades(dbGrades)
          if (dbGrades.length) setGrade(dbGrades[0])
        }
      })
      .catch(() => {})
      .finally(() => { if (markMounted) setMounted(true) })
  }

  useEffect(() => {
    loadGrid(true)
  }, [])

  // Ensure new grades / periods always have initialized slots
  useEffect(() => {
    if (!mounted) return
    setSchedules(prev => {
      const next = { ...prev }
      grades.forEach(g => {
        if (!next[g]) next[g] = Array.from({ length: periods.length }, () => Array(days.length).fill(null))
        else while (next[g].length < periods.length) next[g].push(Array(days.length).fill(null))
      })
      return next
    })
    setRooms(prev => {
      const next = { ...prev }
      grades.forEach(g => {
        if (!next[g]) next[g] = Array.from({ length: periods.length }, () => Array(days.length).fill(''))
        else while (next[g].length < periods.length) next[g].push(Array(days.length).fill(''))
      })
      return next
    })
    setCellTeachers(prev => {
      const next = { ...prev }
      grades.forEach(g => {
        if (!next[g]) next[g] = Array.from({ length: periods.length }, () => Array(days.length).fill(''))
        else while (next[g].length < periods.length) next[g].push(Array(days.length).fill(''))
      })
      return next
    })
  }, [grades, periods, mounted])



  const schedule = schedules[grade] || []

  const updateCell = (ti, di, value) => {
    setSchedules(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      if (!next[grade]) next[grade] = []
      if (!next[grade][ti]) next[grade][ti] = Array(days.length).fill(null)
      next[grade][ti][di] = value
      return next
    })
    setActiveCell(null)
  }

  const updateRoom = (ti, di, value) => {
    setRooms(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      if (!next[grade]) next[grade] = []
      if (!next[grade][ti]) next[grade][ti] = Array(days.length).fill('')
      next[grade][ti][di] = value.trim()
      return next
    })
    setEditingRoom(null)
  }

  const updateTeacher = (ti, di, name) => {
    setCellTeachers(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      if (!next[grade]) next[grade] = []
      if (!next[grade][ti]) next[grade][ti] = Array(days.length).fill('')
      next[grade][ti][di] = name
      return next
    })
    setEditingTeacher(null)
  }

  const updatePeriod = (ti, updated) => {
    setPeriods(prev => prev.map((p, i) => i === ti ? updated : p))
    setEditingPeriod(null)
  }

  const addPeriod = () => {
    const last    = periods[periods.length - 1]
    const newStart = last ? last.end : '09:00'
    const newEnd   = addOneHour(newStart)
    const newId    = Math.max(0, ...periods.map(p => p.id)) + 1
    setPeriods(prev => [...prev, { id: newId, start: newStart, end: newEnd }])
  }

  const removePeriod = (ti) => {
    if (periods.length <= 1) return
    setPeriods(prev => prev.filter((_, i) => i !== ti))
    setSchedules(prev => {
      const next = {}
      for (const g of Object.keys(prev)) next[g] = prev[g].filter((_, i) => i !== ti)
      return next
    })
    setRooms(prev => {
      const next = {}
      for (const g of Object.keys(prev)) next[g] = prev[g].filter((_, i) => i !== ti)
      return next
    })
    setCellTeachers(prev => {
      const next = {}
      for (const g of Object.keys(prev)) next[g] = prev[g].filter((_, i) => i !== ti)
      return next
    })
    setActiveCell(null)
    setEditingPeriod(null)
  }

  const resetGrade = () => {
    setSchedules(prev => ({ ...prev, [grade]: Array.from({ length: periods.length }, () => Array(days.length).fill(null)) }))
    setRooms(prev =>     ({ ...prev, [grade]: Array.from({ length: periods.length }, () => Array(days.length).fill(''))  }))
    setCellTeachers(prev =>({ ...prev, [grade]: Array.from({ length: periods.length }, () => Array(days.length).fill('')) }))
  }

  const addGrade = (name) => {
    if (grades.includes(name)) return
    setGrades(prev => [...prev, name])
    setGrade(name)
  }

  const removeGrade = (g) => {
    const next = grades.filter(x => x !== g)
    if (!next.length) return
    setGrades(next)
    if (grade === g) setGrade(next[0])
  }

  const publishToDb = async () => {
    setPublishing(true)
    try {
      const res  = await fetch('/api/timetable/grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades, periods, schedules, rooms, cellTeachers }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setPublished(true)
        toast.success(`Timetable published — ${json.slots_written} slot${json.slots_written !== 1 ? 's' : ''} saved.`)
        if (json.warning) toast.warning(json.warning)
        // Re-load from DB so the displayed grid matches what was actually saved
        loadGrid(false)
        setTimeout(() => setPublished(false), 3000)
      } else {
        toast.error(json.error || 'Publish failed. Check that classes exist in the system.')
      }
    } catch (err) {
      toast.error(err.message || 'Network error while publishing.')
    } finally {
      setPublishing(false)
    }
  }

  const dotColors = ['#2563EB','#7C3AED','#0891B2','#16A34A','#D97706','#DB2777','#0F766E']
  const WEEK_OPTIONS = [-1, 0, 1, 2].map(o => getWeekLabel(o))
  const weekLabel    = getWeekLabel(weekOffset)

  if (!mounted) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Timetable</h1>
          <p className="page-header-sub">Class schedules &amp; period management</p>
        </div>
        <div className="page-actions">
          <Dropdown label="Grade" options={grades} value={grade} onChange={(g) => { setGrade(g); setActiveCell(null) }} />
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E2E8F0', borderRadius: 9, background: '#FFFFFF' }}>
            <button onClick={() => setWeekOffset(o => o - 1)} style={{ padding: '7px 9px', border: 'none', borderRight: '1px solid #F1F5F9', background: 'transparent', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', borderRadius: '9px 0 0 9px' }} onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background='transparent'}><ChevronLeft size={14} /></button>
            <Dropdown label="This Week" options={WEEK_OPTIONS} value={weekLabel} onChange={(label) => setWeekOffset([-1,0,1,2].find(o => getWeekLabel(o) === label) ?? 0)} />
            <button onClick={() => setWeekOffset(o => o + 1)} style={{ padding: '7px 9px', border: 'none', borderLeft: '1px solid #F1F5F9', background: 'transparent', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', borderRadius: '0 9px 9px 0' }} onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background='transparent'}><ChevronRight size={14} /></button>
          </div>
          <button className="btn-secondary" onClick={() => {
            const headerRow = `<tr><th>Time</th>${days.map(d => `<th${WEEKEND.has(d) ? ' class="wknd"' : ''}>${d}</th>`).join('')}</tr>`
            const bodyRows  = periods.map((period, ti) =>
              `<tr><td class="period">${fmt12(period.start)} – ${fmt12(period.end)}</td>${(schedule[ti] ?? []).map((subj, di) => `<td${WEEKEND.has(days[di]) ? ' class="wknd"' : ''}>${subj || '—'}</td>`).join('')}</tr>`
            ).join('')
            openPrintWindow(`Timetable — ${grade}`,
              `<div class="header"><h1>Timetable</h1><p>${grade} · ${getWeekLabel(weekOffset)}</p></div><table><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>`,
              `body{padding:32px;background:#fff}.header{margin-bottom:20px}.header h1{font-size:22px;font-weight:800;color:#1e40af}.header p{font-size:13px;color:#64748b;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#1e40af;color:#fff;padding:10px 14px;text-align:left;font-weight:600}td{padding:10px 14px;border-bottom:1px solid #e2e8f0}td.period{font-weight:600;color:#64748b;white-space:nowrap}tr:nth-child(even) td{background:#f8fafc}th.wknd{background:#f5f3ff!important;color:#7c3aed!important}td.wknd{background:#fdfaff}`
            )
          }}><Printer size={15} /> Print</button>
          <button onClick={publishToDb} disabled={publishing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: published ? '#16A34A' : '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: publishing ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}>
            {published ? <><Check size={14} /> Published!</> : publishing ? 'Publishing…' : <><Check size={14} /> Publish to DB</>}
          </button>
          <button onClick={() => { setEditMode(m => !m); setActiveCell(null) }} className={editMode ? 'btn-primary' : 'btn-secondary'} style={editMode ? { background: '#0F172A', borderColor: '#0F172A' } : {}}>
            <Pencil size={14} /> {editMode ? 'Done Editing' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Grade chips */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 14, padding: '6px 8px', boxShadow: '0 1px 3px rgba(15,23,42,0.05)', display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' }}>
        {grades.map((g, i) => {
          const active = grade === g
          const dot    = dotColors[i % dotColors.length]
          return (
            <motion.div key={g} style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <motion.button onClick={() => { setGrade(g); setActiveCell(null) }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: editMode ? '7px 10px 7px 14px' : '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', background: active ? '#2563EB' : 'transparent', color: active ? '#FFFFFF' : '#64748B', fontWeight: active ? 700 : 500, fontSize: 13, whiteSpace: 'nowrap', transition: 'background 0.18s, color 0.18s', boxShadow: active ? '0 2px 8px rgba(37,99,235,0.28)' : 'none' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? 'rgba(255,255,255,0.7)' : dot, flexShrink: 0, display: 'inline-block' }} />
                {g}
              </motion.button>
              {editMode && (
                <button onClick={() => removeGrade(g)}
                  style={{ width: 16, height: 16, borderRadius: 99, border: 'none', background: active ? 'rgba(255,255,255,0.25)' : '#FEE2E2', color: active ? '#fff' : '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: -6, flexShrink: 0 }}>
                  <X size={9} />
                </button>
              )}
            </motion.div>
          )
        })}
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddGrade(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, border: '1.5px dashed #BFDBFE', background: 'transparent', color: '#2563EB', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <Plus size={12} /> Add Class
        </motion.button>
      </div>

      {/* Edit mode banner */}
      <AnimatePresence>
        {editMode && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Pencil size={14} style={{ color: '#EA580C' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#C2410C' }}>Edit Mode — click a cell to assign a subject · click Rm/teacher text to edit</span>
            </div>
            <button onClick={resetGrade}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#EA580C', background: 'none', border: '1px solid #FED7AA', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontWeight: 600 }}>
              <RotateCcw size={12} /> Clear {grade}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {weekOffset !== 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB' }}>Viewing: {weekLabel}</span>
          <button onClick={() => setWeekOffset(0)} style={{ fontSize: 11, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Back to current week</button>
        </div>
      )}

      {/* Timetable grid */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ padding: '14px 16px', width: 110, borderBottom: '1px solid #F1F5F9', background: '#FAFBFC' }} />
                {days.map(day => {
                  const isWknd = WEEKEND.has(day)
                  return (
                    <th key={day} style={{ padding: '14px 12px', textAlign: 'center', fontSize: 13, fontWeight: 700, borderBottom: '1px solid #F1F5F9', background: isWknd ? '#FDF4FF' : '#FAFBFC', color: isWknd ? '#7C3AED' : '#0F172A' }}>
                      {day}
                      {isWknd && <span style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#A78BFA', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 2 }}>SPECIAL</span>}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {periods.map((period, ti) => (
                <tr key={period.id}>
                  {/* Time column */}
                  <td style={{ padding: '6px 10px 6px 14px', borderBottom: '1px solid #F8FAFC', verticalAlign: 'middle', position: 'relative', minWidth: 110 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                      {editMode && (
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          onClick={e => { e.stopPropagation(); setEditingPeriod(editingPeriod === ti ? null : ti) }}
                          style={{ width: 18, height: 18, borderRadius: 5, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B', flexShrink: 0 }}>
                          <Pencil size={9} />
                        </motion.button>
                      )}
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block' }}>{fmt12(period.start)}</span>
                        <span style={{ fontSize: 10, color: '#CBD5E1' }}>–</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', display: 'block' }}>{fmt12(period.end)}</span>
                      </div>
                    </div>
                    <AnimatePresence>
                      {editingPeriod === ti && <PeriodEditor period={period} onSave={(u) => updatePeriod(ti, u)} onClose={() => setEditingPeriod(null)} />}
                    </AnimatePresence>
                  </td>

                  {/* Day cells */}
                  {days.map((day, di) => {
                    const subject       = schedule[ti]?.[di] || null
                    const colors        = subject ? (SUBJECT_COLORS[subject] || { bg: '#F8FAFC', color: '#64748B' }) : null
                    const room          = rooms[grade]?.[ti]?.[di] || ''
                    const teacher       = cellTeachers[grade]?.[ti]?.[di] || ''
                    const isActive      = activeCell?.ti === ti && activeCell?.di === di
                    const isRoomEdit    = editingRoom?.ti === ti && editingRoom?.di === di
                    const isTeacherEdit = editingTeacher?.ti === ti && editingTeacher?.di === di
                    const isWknd        = WEEKEND.has(day)

                    // Subject-filtered teachers + conflict detection (only computed when dropdown is open)
                    const subjectTeachers = isTeacherEdit ? getTeachersForSubject(subject, apiFaculty) : []
                    const noSubjectMatch  = isTeacherEdit && subjectTeachers.length === 0
                    const displayTeachers = isTeacherEdit
                      ? [...new Set(
                          (subjectTeachers.length > 0 ? subjectTeachers : apiFaculty.map(f => f.name))
                            .filter(Boolean)
                        )]
                      : []
                    // Teachers already assigned this period+day in OTHER grades → busy
                    const busyTeachers = isTeacherEdit
                      ? new Set(Object.entries(cellTeachers).filter(([g]) => g !== grade).map(([, rows]) => rows[ti]?.[di] || '').filter(Boolean))
                      : new Set()

                    return (
                      <td key={day} style={{ padding: '6px', borderBottom: '1px solid #F8FAFC', verticalAlign: 'middle', position: 'relative', background: isWknd ? '#FDFAFF' : 'transparent', borderLeft: isWknd && day === 'Sat' ? '2px solid #E9D5FF' : undefined }}>
                        {subject && colors ? (
                          <motion.div whileHover={editMode ? { scale: 1.03 } : { scale: 1.02 }}
                            onClick={() => editMode && !isRoomEdit && setActiveCell(isActive ? null : { ti, di })}
                            style={{ background: colors.bg, borderRadius: 8, padding: '10px 12px', cursor: editMode ? 'pointer' : 'default', border: isActive ? `2px solid ${colors.color}` : '2px solid transparent', position: 'relative' }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: colors.color, lineHeight: 1.3 }}>{subject}</p>
                            {/* Room */}
                            {isRoomEdit ? (
                              <input autoFocus value={roomInput} onChange={e => setRoomInput(e.target.value)}
                                onBlur={() => updateRoom(ti, di, roomInput)}
                                onKeyDown={e => { if (e.key === 'Enter') updateRoom(ti, di, roomInput); if (e.key === 'Escape') setEditingRoom(null) }}
                                onClick={e => e.stopPropagation()}
                                style={{ marginTop: 3, width: 64, fontSize: 10, fontWeight: 700, color: colors.color, border: 'none', borderBottom: `1px solid ${colors.color}`, background: 'transparent', outline: 'none', padding: '0 0 1px', fontFamily: 'inherit' }} />
                            ) : (
                              <p onClick={e => { if (editMode) { e.stopPropagation(); setEditingRoom({ ti, di }); setRoomInput(room) } }}
                                style={{ fontSize: 10, fontWeight: 500, color: colors.color, opacity: editMode ? 1 : 0.65, marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 3, cursor: editMode ? 'text' : 'default', padding: editMode ? '1px 4px' : 0, borderRadius: 4, background: editMode ? `${colors.color}12` : 'transparent', border: editMode ? `1px solid ${colors.color}25` : 'none' }}>
                                {room ? `Rm ${room}` : (editMode ? <span style={{ opacity: 0.5 }}>+ Room</span> : '')}
                                {editMode && <Pencil size={7} style={{ color: colors.color, opacity: 0.7 }} />}
                              </p>
                            )}
                            {/* Teacher */}
                            {isTeacherEdit ? (
                              <select autoFocus value={teacher}
                                onChange={e => updateTeacher(ti, di, e.target.value)}
                                onBlur={() => setEditingTeacher(null)}
                                onClick={e => e.stopPropagation()}
                                style={{ marginTop: 3, width: '100%', fontSize: 9, color: colors.color, border: `1px solid ${colors.color}`, borderRadius: 4, background: colors.bg, outline: 'none', fontFamily: 'inherit', padding: '2px 4px' }}>
                                <option value="">— Assign —</option>
                                {noSubjectMatch && apiFaculty.length > 0 && (
                                  <option disabled>── No {subject} dept · showing all ──</option>
                                )}
                                {displayTeachers.map((t, ti) => {
                                  const busy = busyTeachers.has(t)
                                  return (
                                    <option key={`${t}-${ti}`} value={t} disabled={busy}>
                                      {busy ? `${t} — busy this period` : t}
                                    </option>
                                  )
                                })}
                              </select>
                            ) : (
                              <p onClick={e => { if (editMode) { e.stopPropagation(); setEditingTeacher({ ti, di }); setActiveCell(null) } }}
                                style={{ fontSize: 9.5, color: colors.color, opacity: 0.75, marginTop: 2, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: editMode ? 'pointer' : 'default' }}>
                                {teacher || (editMode ? '+ Assign faculty' : '')}
                              </p>
                            )}
                            {editMode && !isRoomEdit && (
                              <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 4, background: colors.color, opacity: 0.15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Pencil size={8} style={{ color: colors.color, opacity: 1 }} />
                              </div>
                            )}
                          </motion.div>
                        ) : (
                          <div onClick={() => editMode && setActiveCell(isActive ? null : { ti, di })}
                            style={{ height: 52, borderRadius: 8, border: editMode ? `1.5px dashed ${isWknd ? '#C4B5FD' : '#CBD5E1'}` : (isWknd ? '1px dashed #E9D5FF' : 'none'), cursor: editMode ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 3, background: isActive ? '#F5F3FF' : 'transparent' }}
                            onMouseEnter={e => { if (editMode) e.currentTarget.style.borderColor = isWknd ? '#A78BFA' : '#94A3B8' }}
                            onMouseLeave={e => { if (editMode) e.currentTarget.style.borderColor = isWknd ? '#C4B5FD' : '#CBD5E1' }}>
                            {editMode && <Plus size={13} style={{ color: isWknd ? '#C4B5FD' : '#CBD5E1' }} />}
                            {!editMode && isWknd && <span style={{ fontSize: 9, color: '#C4B5FD', fontWeight: 600, letterSpacing: '0.04em' }}>NO CLASS</span>}
                          </div>
                        )}
                        <AnimatePresence>
                          {isActive && (
                            <CellPicker subject={subject} onSelect={(val) => updateCell(ti, di, val)} onClose={() => setActiveCell(null)}
                              style={{ top: 'calc(100% - 4px)', left: di >= 3 ? 'auto' : 0, right: di >= 3 ? 0 : 'auto' }} />
                          )}
                        </AnimatePresence>
                      </td>
                    )
                  })}

                  {editMode && (
                    <td style={{ padding: '0 8px', borderBottom: '1px solid #F8FAFC', verticalAlign: 'middle' }}>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => removePeriod(ti)} title="Remove period"
                        style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: periods.length <= 1 ? 'not-allowed' : 'pointer', opacity: periods.length <= 1 ? 0.4 : 1 }}>
                        <X size={11} style={{ color: '#DC2626' }} />
                      </motion.button>
                    </td>
                  )}
                </tr>
              ))}

              {editMode && (
                <tr>
                  <td colSpan={days.length + 2} style={{ padding: '10px 14px' }}>
                    <motion.button whileHover={{ scale: 1.02, background: '#EFF6FF' }} whileTap={{ scale: 0.98 }}
                      onClick={addPeriod}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, border: '1.5px dashed #BFDBFE', background: '#F8FBFF', color: '#2563EB', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center', transition: 'background 0.15s' }}>
                      <Plus size={14} strokeWidth={2.5} /> Add Period
                    </motion.button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showAddGrade && <AddGradeModal onAdd={addGrade} onClose={() => setShowAddGrade(false)} />}
      </AnimatePresence>
    </div>
  )
}
