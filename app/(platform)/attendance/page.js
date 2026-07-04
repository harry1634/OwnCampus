'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  AlertCircle, Calendar, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, QrCode, Download,
  Users, TrendingUp, X, GraduationCap, BookOpen,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

/* ─── constants ─── */
const statusConfig = {
  present: { label: 'Present', color: '#16A34A', icon: CheckCircle, bg: '#F0FDF4', border: '#BBF7D0' },
  absent:  { label: 'Absent',  color: '#DC2626', icon: XCircle,     bg: '#FEF2F2', border: '#FECACA' },
  late:    { label: 'Late',    color: '#D97706', icon: Clock,        bg: '#FFFBEB', border: '#FDE68A' },
}
const avatarPalette = ['#2563EB','#7C3AED','#0891B2','#16A34A','#D97706','#DB2777','#EA580C','#0D9488','#6366F1','#7C3AED']
// weekData is computed dynamically in the component from saved records
const cardStyle = { background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
const sansNum   = { fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '-0.02em' }

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

/* ─── QR Modal ─── */
function QRModal({ label, onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: 'calc(var(--header-height) + 24px) 24px 40px' }}
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#FFFFFF', borderRadius: 20, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>QR Attendance Scan</p>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ padding: '28px 24px' }}>
          <div style={{ width: 160, height: 160, margin: '0 auto 20px', background: '#F8FAFC', border: '2px solid #E2E8F0', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={90} style={{ color: '#2563EB' }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{label}</p>
          <p style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.6 }}>Scan to mark attendance. Code expires after session.</p>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Close</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Shared: summary sidebar ─── */
function SummaryPanel({ present, absent, late, total, weekDataArr }) {
  const pct = total ? Math.round((present / total) * 100) : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Donut */}
      <div style={{ ...cardStyle, padding: '18px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Today&apos;s Summary</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
              <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="9" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#10B981" strokeWidth="9"
                strokeDasharray={`${total ? (present / total) * 238.76 : 0} 238.76`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', lineHeight: 1, ...sansNum }}>{pct}%</p>
              <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Present</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Present', count: present, color: '#16A34A' },
            { label: 'Absent',  count: absent,  color: '#DC2626' },
            { label: 'Late',    count: late,    color: '#D97706' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#64748B', flex: 1 }}>{item.label}</span>
              <div style={{ height: 4, width: 56, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${total ? (item.count / total) * 100 : 0}%`, background: item.color, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', minWidth: 14, textAlign: 'right', ...sansNum }}>{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* This Week */}
      <div style={{ ...cardStyle, padding: '18px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>This Week</p>
        <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12 }}>Daily attendance (%)</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={weekDataArr} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[60, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 10, fontSize: 11 }} formatter={v => [`${v}%`, 'Attendance']} />
            <Bar dataKey="pct" fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ─── Attendance row (shared) ─── */
function AttendanceRow({ person, index, status, onToggle, subLabel }) {
  const conf = statusConfig[status]
  const Icon = conf.icon
  const bg   = avatarPalette[index % avatarPalette.length]
  return (
    <motion.div
      onClick={onToggle}
      whileHover={{ background: '#F8FAFC' }}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 20px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', transition: 'background 0.12s' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
        {initials(person.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A', lineHeight: 1.2 }}>{person.name}</p>
        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{subLabel}</p>
      </div>
      <motion.button
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        onClick={e => { e.stopPropagation(); onToggle() }}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, flexShrink: 0, background: conf.bg, border: `1px solid ${conf.border}`, color: conf.color, cursor: 'pointer' }}>
        <Icon size={12} />
        {conf.label}
      </motion.button>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════ */
export default function AttendancePage() {
  const [allStudents, setAllStudents] = useState([])
  const [allFaculty,  setAllFaculty ] = useState([])
  // Per-date attendance maps — survive tab navigation within this session
  const [studentAttByDate, setStudentAttByDate] = useState({})
  const [facultyAttByDate, setFacultyAttByDate] = useState({})

  const [activeTab, setActiveTab] = useState('students')
  const [date, setDate]           = useState(new Date())
  const [showQR, setShowQR]       = useState(false)
  const [saving, setSaving]       = useState(false)
  const [fetchKey, setFetchKey]   = useState(0)

  /* ── Date key: each date gets its own attendance record ── */
  const dateKey = date.toISOString().slice(0, 10) // "YYYY-MM-DD"

  /* ── Student state ── */
  const classes = useMemo(() => {
    const from = [...new Set(allStudents.map(s => s.class).filter(Boolean))].sort()
    return from.length ? from : ['10-A','10-B','9-A','9-B','11-A','12-A']
  }, [allStudents])
  const [selectedClass,      setSelectedClass     ] = useState(() => classes[0] || '10-A')
  const currentClass = classes.includes(selectedClass) ? selectedClass : (classes[0] || '')

  /* ── Faculty state ── */
  const depts = useMemo(() => {
    const from = [...new Set(allFaculty.map(f => f.dept).filter(Boolean))].sort()
    return from.length ? from : ['All Faculty']
  }, [allFaculty])
  const [selectedDept,     setSelectedDept    ] = useState(() => depts[0] || 'All Faculty')
  const currentDept = depts.includes(selectedDept) ? selectedDept : (depts[0] || 'All Faculty')

  const refreshPeople = useCallback(async () => {
    const [studentsRes, facultyRes] = await Promise.all([
      fetch('/api/students'),
      fetch('/api/faculty'),
    ])
    const [students, faculty] = await Promise.all([
      studentsRes.ok ? studentsRes.json() : [],
      facultyRes.ok ? facultyRes.json() : [],
    ])
    if (Array.isArray(students)) setAllStudents(students)
    if (Array.isArray(faculty)) setAllFaculty(faculty)
  }, [])

  // Load students and faculty from API on mount.
  useEffect(() => {
    fetch('/api/students').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setAllStudents(d) }).catch(() => {})
    fetch('/api/faculty').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setAllFaculty(d) }).catch(() => {})
  }, [])

  // Load saved attendance from DB whenever date or tab changes
  useEffect(() => {
    const type = activeTab === 'students' ? 'student' : 'faculty'
    fetch(`/api/attendance?date=${dateKey}&type=${type}`)
      .then(r => r.ok ? r.json() : [])
      .then(rows => {
        if (!Array.isArray(rows) || rows.length === 0) return
        if (type === 'student') {
          // Map student_id → status using the local student list to get s.id (sequential)
          setStudentAttByDate(prev => {
            const dayMap = { ...(prev[dateKey] || {}) }
            rows.forEach(row => {
              // row.student_id is students.id (UUID) — find the matching local student
              const found = allStudents.find(
                s => s.studentRowId === row.student_id || s.supabaseId === row.student_id
              )
              if (found) dayMap[found.id] = row.status
            })
            return { ...prev, [dateKey]: dayMap }
          })
        } else {
          setFacultyAttByDate(prev => {
            const dayMap = { ...(prev[dateKey] || {}) }
            rows.forEach(row => {
              const found = allFaculty.find(f => f.supabaseId === row.faculty_id)
              if (found) dayMap[found.id] = row.status
            })
            return { ...prev, [dateKey]: dayMap }
          })
        }
      })
      .catch(() => {})
  // Re-run when date changes, tab changes, students/faculty list loads, or after a save
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, activeTab, allStudents.length, allFaculty.length, fetchKey])

  /* ── Helpers: read today's map (default 'present' for unknown) ── */
  const getStudentStatus = id => (studentAttByDate[dateKey] || {})[id] || 'present'
  const getFacultyStatus = id => (facultyAttByDate[dateKey] || {})[id] || 'present'

  /* ── Date nav ── */
  const prevDay = () => setDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n })
  const nextDay = () => setDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n })
  const today   = new Date()
  const isToday = date.toDateString() === today.toDateString()
  const dateLabel = isToday
    ? `Today, ${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
    : date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })

  /* ── Student computations ── */
  const classStudents = useMemo(() => allStudents.filter(s => s.class === currentClass), [allStudents, currentClass])
  const sPresent = classStudents.filter(s => getStudentStatus(s.id) === 'present').length
  const sAbsent  = classStudents.filter(s => getStudentStatus(s.id) === 'absent').length
  const sLate    = classStudents.filter(s => getStudentStatus(s.id) === 'late').length
  const sTotal   = classStudents.length

  const toggleStudent = id => setStudentAttByDate(prev => {
    const day = prev[dateKey] || {}
    const cur = day[id] || 'present'
    const nxt = cur === 'present' ? 'absent' : cur === 'absent' ? 'late' : 'present'
    return { ...prev, [dateKey]: { ...day, [id]: nxt } }
  })
  const markAllStudents = status => setStudentAttByDate(prev => ({
    ...prev,
    [dateKey]: { ...(prev[dateKey] || {}), ...Object.fromEntries(classStudents.map(s => [s.id, status])) }
  }))

  /* ── Faculty computations ── */
  const deptFaculty = useMemo(
    () => currentDept === 'All Faculty' ? allFaculty : allFaculty.filter(f => f.dept === currentDept),
    [allFaculty, currentDept]
  )
  const fPresent = deptFaculty.filter(f => getFacultyStatus(f.id) === 'present').length
  const fAbsent  = deptFaculty.filter(f => getFacultyStatus(f.id) === 'absent').length
  const fLate    = deptFaculty.filter(f => getFacultyStatus(f.id) === 'late').length
  const fTotal   = deptFaculty.length

  const toggleFaculty = id => setFacultyAttByDate(prev => {
    const day = prev[dateKey] || {}
    const cur = day[id] || 'present'
    const nxt = cur === 'present' ? 'absent' : cur === 'absent' ? 'late' : 'present'
    return { ...prev, [dateKey]: { ...day, [id]: nxt } }
  })
  const markAllFaculty = status => setFacultyAttByDate(prev => ({
    ...prev,
    [dateKey]: { ...(prev[dateKey] || {}), ...Object.fromEntries(deptFaculty.map(f => [f.id, status])) }
  }))

  /* ── Export ── */
  const exportCSV = () => {
    let rows, filename
    if (activeTab === 'students') {
      rows = ['Roll,Name,Class,Status', ...classStudents.map(s => `${s.roll},"${s.name}",${currentClass},${getStudentStatus(s.id)}`)]
      filename = `student_attendance_${currentClass}_${date.toISOString().slice(0,10)}.csv`
    } else {
      rows = ['Code,Name,Department,Designation,Status', ...deptFaculty.map(f => `${f.code},"${f.name}","${f.dept}","${f.designation}",${getFacultyStatus(f.id)}`)]
      filename = `faculty_attendance_${currentDept.replace(/\s+/g,'_')}_${date.toISOString().slice(0,10)}.csv`
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = filename; a.click()
  }

  const isStudentTab = activeTab === 'students'

  const handleSave = async () => {
    setSaving(true)
    const isStudents = isStudentTab
    try {
      if (isStudents) {
        // Resolve class_id from the selected class name
        const classId = classStudents[0]?.classId || null

        const records = classStudents
          .filter(s => s.studentRowId || s.supabaseId)
          .map(s => ({
            student_id: s.studentRowId || s.supabaseId,
            class_id:   s.classId || classId,
            class_label: currentClass,
            status:     getStudentStatus(s.id),
          }))

        if (records.length > 0) {
          const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: dateKey, class_id: classId, class_label: currentClass, records }),
          })
          const data = await res.json()
          if (!res.ok) { toast.error(data?.error || 'Failed to save attendance.'); return }
          toast.success(`Attendance saved for ${records.length} student${records.length !== 1 ? 's' : ''}.`)
          await refreshPeople().catch(() => {})
          setFetchKey(k => k + 1)
        }
      } else {
        const records = deptFaculty
          .filter(f => f.supabaseId)
          .map(f => ({ faculty_id: f.supabaseId, status: getFacultyStatus(f.id) }))

        if (records.length > 0) {
          const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: dateKey, records, type: 'faculty' }),
          })
          const data = await res.json()
          if (!res.ok) { toast.error(data?.error || 'Failed to save attendance.'); return }
          toast.success(`Attendance saved for ${records.length} faculty member${records.length !== 1 ? 's' : ''}.`)
          await refreshPeople().catch(() => {})
          setFetchKey(k => k + 1)
        }
      }
    } catch (err) {
      toast.error('Network error — attendance not saved.')
    } finally {
      setSaving(false)
    }
  }

  /* ── KPIs ── */
  const isStudents = isStudentTab

  /* ── "This Week" chart: last 6 days from saved data ── */
  const weekData = useMemo(() => {
    const days = []
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(today)
      d.setDate(today.getDate() - i)
      const key      = d.toISOString().slice(0, 10)
      const dayLabel = d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3)
      const attMap   = isStudents ? (studentAttByDate[key] || {}) : (facultyAttByDate[key] || {})
      const people   = isStudents ? allStudents : allFaculty
      if (!people.length) { days.push({ day: dayLabel, pct: 0 }); continue }
      const presentCount = people.filter(p => (attMap[p.id] || 'present') === 'present').length
      days.push({ day: dayLabel, pct: Math.round((presentCount / people.length) * 100) })
    }
    return days
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentAttByDate, facultyAttByDate, isStudents, allStudents, allFaculty])

  const present = isStudents ? sPresent : fPresent
  const absent  = isStudents ? sAbsent  : fAbsent
  const late    = isStudents ? sLate    : fLate
  const total   = isStudents ? sTotal   : fTotal
  const pct     = total ? Math.round((present / total) * 100) : 0

  const kpis = [
    { label: isStudents ? 'Total Students' : 'Total Faculty', value: total,     icon: isStudents ? GraduationCap : Users,       iconColor: '#2563EB', iconBg: '#EFF6FF' },
    { label: 'Present Today',   value: present,   icon: CheckCircle,  iconColor: '#10B981', iconBg: '#F0FDF4' },
    { label: 'Absent Today',    value: absent,    icon: XCircle,      iconColor: '#EF4444', iconBg: '#FEF2F2' },
    { label: 'Attendance Rate', value: `${pct}%`, icon: TrendingUp,   iconColor: '#F59E0B', iconBg: '#FFFBEB' },
  ]

  /* ── Low attendance alerts ── */
  const lowAttStudents = allStudents.filter(s => s.attendance != null && s.attendance < 75)
  const lowAttFaculty  = allFaculty.filter(f => f.attendance != null && f.attendance < 75)
  const alerts = isStudents ? lowAttStudents : lowAttFaculty

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Attendance</h1>
          <p className="page-header-sub">Mark and track daily attendance</p>
        </div>
        <div className="page-actions">
          <button onClick={() => setShowQR(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, fontSize: 13.5, fontWeight: 600, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <QrCode size={15} /> QR Scan
          </button>
          <button className="btn-secondary" onClick={exportCSV}><Download size={15} /> Export</button>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div style={{ display: 'flex', gap: 4, padding: 4, background: '#F1F5F9', borderRadius: 12, width: 'fit-content' }}>
        {[
          { key: 'students', label: 'Students', icon: GraduationCap },
          { key: 'faculty',  label: 'Faculty',  icon: Users },
        ].map(tab => {
          const active = activeTab === tab.key
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 20px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                background: active ? '#FFFFFF' : 'transparent',
                color:      active ? '#0F172A'  : '#64748B',
                boxShadow:  active ? '0 1px 4px rgba(15,23,42,0.10)' : 'none',
              }}>
              <tab.icon size={14} />
              {tab.label}
              {tab.key === 'faculty' && allFaculty.filter(f => getFacultyStatus(f.id) === 'absent').length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                  {allFaculty.filter(f => getFacultyStatus(f.id) === 'absent').length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── KPI Cards ── */}
      <div className="rg-4">
        {kpis.map((kpi, i) => {
          const KpiIcon = kpi.icon
          return (
            <motion.div key={kpi.label}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ translateY: -2, boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.06)', padding: '22px 24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: kpi.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, flexShrink: 0 }}>
                <KpiIcon size={18} style={{ color: kpi.iconColor }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#64748B', marginBottom: 6 }}>{kpi.label}</p>
              <p style={{ fontSize: 30, fontWeight: 700, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.03em', ...sansNum }}>{kpi.value}</p>
            </motion.div>
          )
        })}
      </div>

      {/* ── Main Grid ── */}
      <div className="att-layout">

        {/* Left — List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Toolbar */}
          <div style={{ ...cardStyle, padding: '10px 16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            {/* Date nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={prevDay} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E8ECF0', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', cursor: 'pointer' }}>
                <ChevronLeft size={14} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 30, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E8ECF0' }}>
                <Calendar size={12} style={{ color: '#2563EB' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{dateLabel}</span>
              </div>
              <button onClick={nextDay} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E8ECF0', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', cursor: 'pointer' }}>
                <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ width: 1, height: 20, background: '#E8ECF0', flexShrink: 0 }} />

            {/* Group picker */}
            {isStudents ? (
              <select value={currentClass} onChange={e => setSelectedClass(e.target.value)}
                style={{ height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid #E8ECF0', background: '#FFFFFF', fontSize: 12.5, fontWeight: 600, color: '#0F172A', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                {classes.map(c => <option key={c}>{c}</option>)}
              </select>
            ) : (
              <select value={currentDept} onChange={e => setSelectedDept(e.target.value)}
                style={{ height: 30, padding: '0 10px', borderRadius: 8, border: '1px solid #E8ECF0', background: '#FFFFFF', fontSize: 12.5, fontWeight: 600, color: '#0F172A', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                <option value="All Faculty">All Departments</option>
                {depts.map(d => <option key={d}>{d}</option>)}
              </select>
            )}

            {/* Bulk mark */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={() => isStudents ? markAllStudents('present') : markAllFaculty('present')}
                style={{ height: 30, padding: '0 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', cursor: 'pointer' }}>
                All Present
              </button>
              <button onClick={() => isStudents ? markAllStudents('absent') : markAllFaculty('absent')}
                style={{ height: 30, padding: '0 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', cursor: 'pointer' }}>
                All Absent
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', alignItems: 'center', padding: '9px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {isStudents
                  ? `Class ${currentClass} · ${sTotal} Student${sTotal !== 1 ? 's' : ''}`
                  : `${currentDept === 'All Faculty' ? 'All Departments' : currentDept} · ${fTotal} Faculty Member${fTotal !== 1 ? 's' : ''}`}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#16A34A' }}>{present}P</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#DC2626' }}>{absent}A</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#D97706' }}>{late}L</span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {isStudents ? (
                <motion.div key="students" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {classStudents.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                      No students in class {currentClass}. Add students from the Students page.
                    </div>
                  ) : classStudents.map((s, i) => (
                    <AttendanceRow key={s.id} person={s} index={i}
                      status={getStudentStatus(s.id)}
                      onToggle={() => toggleStudent(s.id)}
                      subLabel={`Roll ${s.roll}`} />
                  ))}
                </motion.div>
              ) : (
                <motion.div key="faculty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {deptFaculty.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                      No faculty in this department. Add faculty from the Faculty page.
                    </div>
                  ) : deptFaculty.map((f, i) => (
                    <AttendanceRow key={f.id} person={f} index={i}
                      status={getFacultyStatus(f.id)}
                      onToggle={() => toggleFaculty(f.id)}
                      subLabel={[f.designation, f.dept].filter(Boolean).join(' · ')} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Save */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #F1F5F9' }}>
              <motion.button onClick={handleSave} disabled={saving}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                style={{ width: '100%', height: 40, borderRadius: 10, fontWeight: 600, fontSize: 13.5, color: 'white', border: 'none', background: saving ? '#94A3B8' : '#2563EB', boxShadow: saving ? 'none' : '0 2px 8px rgba(37,99,235,0.30)', cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.7 : 1 }}>
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
                  : `Save ${isStudents ? 'Student' : 'Faculty'} Attendance`}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SummaryPanel present={present} absent={absent} late={late} total={total} weekDataArr={weekData} />

          {/* Alerts */}
          <div style={{ ...cardStyle, padding: '18px 20px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
              {isStudents ? 'Student' : 'Faculty'} Attendance Alerts
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.slice(0, 5).map(alert => {
                const critical = alert.attendance < 70
                const color  = critical ? '#DC2626' : '#D97706'
                const bg     = critical ? '#FEF2F2' : '#FFFBEB'
                const border = critical ? '#FECACA' : '#FDE68A'
                return (
                  <div key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
                    <AlertCircle size={14} style={{ color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A' }}>{alert.name}</p>
                      <p style={{ fontSize: 11, color, marginTop: 1 }}>
                        {isStudents ? alert.class : alert.dept} · Only {alert.attendance}%
                      </p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color, ...sansNum }}>{alert.attendance}%</span>
                  </div>
                )
              })}
              {alerts.length === 0 && (
                <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '8px 0' }}>
                  No alerts — all {isStudents ? 'students' : 'faculty'} above 75%
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showQR && (
          <QRModal
            label={isStudents ? `Class ${currentClass}` : `${currentDept} Faculty`}
            onClose={() => setShowQR(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
