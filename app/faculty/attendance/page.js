'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, Save, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrentUser } from '@/lib/useCurrentUser'

const AVATAR_COLORS = ['#2563EB','#7C3AED','#059669','#DC2626','#D97706','#0891B2','#E11D48','#EA580C']

function fmt12(t) { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}` }

export default function FacultyAttendance() {
  const cu = useCurrentUser()

  // Timetable data
  const [ttSlots,        setTtSlots       ] = useState([])   // all slots for this faculty
  const [myClasses,      setMyClasses     ] = useState([])   // [{label, class_id, subject_id, subject, slots}]
  const [loadingTt,      setLoadingTt     ] = useState(true)

  // Selection state
  const [selClassIdx,    setSelClassIdx   ] = useState(0)
  const [date,           setDate          ] = useState(new Date().toISOString().split('T')[0])

  // Students
  const [students,       setStudents      ] = useState([])
  const [loadingStudents,setLoadingStudents] = useState(false)

  // Attendance state: { [supabaseId]: 'present'|'absent'|'late' }
  const [attendance,     setAttendance    ] = useState({})
  const [saving,         setSaving        ] = useState(false)

  // ── 1. Load timetable on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!cu.mounted) return
    setLoadingTt(true)
    // API now filters to this faculty's slots server-side (via faculty_id resolution)
    fetch('/api/timetable')
      .then(r => r.json())
      .then(data => {
        const slots = data.slots || []
        setTtSlots(slots)

        // Build distinct class entries: group by class_id
        const classMap = {}
        slots.forEach(slot => {
          const cid = slot.class_id
          if (!cid) return
          if (!classMap[cid]) {
            const cls = slot.classes || {}
            const label = [cls.name, cls.section].filter(Boolean).join(' ')
            classMap[cid] = { label, class_id: cid, subjectNames: new Set() }
          }
          const sub = slot.subjects?.name
          if (sub) classMap[cid].subjectNames.add(sub)
        })

        const classList = Object.values(classMap).map(c => ({
          ...c,
          subjects: [...c.subjectNames].join(', '),
        }))
        setMyClasses(classList)
      })
      .catch(() => {})
      .finally(() => setLoadingTt(false))
  }, [cu.mounted, cu.userId])

  // ── 2. Load students when class selection changes ───────────────────────
  const selClass = myClasses[selClassIdx] || null

  useEffect(() => {
    if (!selClass) { setStudents([]); return }
    setLoadingStudents(true)
    setAttendance({})
    fetch(`/api/students?class_id=${selClass.class_id}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setStudents(d); else setStudents([]) })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false))
  }, [selClassIdx, selClass?.class_id])

  // ── 3. Load existing attendance when date or class changes ──────────────
  useEffect(() => {
    if (!selClass || !date) return
    fetch(`/api/attendance?date=${date}&class_id=${selClass.class_id}`)
      .then(r => r.json())
      .then(rows => {
        if (!Array.isArray(rows)) return
        const map = {}
        rows.forEach(row => {
          if (row.student_id) map[row.student_id] = row.status
        })
        // Also map by supabaseId (user_profiles.id) if available
        // The students array maps supabaseId → students.id (UUID)
        // row.student_id is the students table UUID
        setAttendance(map)
      })
      .catch(() => {})
  }, [selClass?.class_id, date])

  const toggle = (supabaseId) => {
    setAttendance(prev => {
      const cur = prev[supabaseId] || 'absent'
      return { ...prev, [supabaseId]: cur === 'absent' ? 'present' : cur === 'present' ? 'late' : 'absent' }
    })
  }

  const markAll = (status) => {
    const upd = {}
    students.forEach(s => {
      const sid = s.studentRowId || s.supabaseId
      if (sid) upd[sid] = status
    })
    setAttendance(prev => ({ ...prev, ...upd }))
  }

  const handleSave = async () => {
    if (!selClass) return
    const records = students.map(s => {
      const sid = s.studentRowId || s.supabaseId
      return { student_id: sid, status: attendance[sid] || 'absent' }
    }).filter(r => r.student_id)

    const unmarked = records.filter(r => !attendance[r.student_id]).length
    if (unmarked > 0) {
      // Not blocking — unmarked will be saved as 'absent'
    }

    setSaving(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          class_id: selClass.class_id,
          records,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      toast.success('Attendance saved!')
    } catch (err) {
      toast.error(err.message || 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  // ── Derived counts ──────────────────────────────────────────────────────
  const ids     = students.map(s => s.studentRowId || s.supabaseId).filter(Boolean)
  const present = ids.filter(id => attendance[id] === 'present').length
  const absent  = ids.filter(id => attendance[id] === 'absent').length
  const late    = ids.filter(id => attendance[id] === 'late').length
  const marked  = ids.filter(id => attendance[id]).length

  const noTimetable = cu.mounted && !loadingTt && myClasses.length === 0

  if (!cu.mounted) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Mark Attendance</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
            {selClass ? `${selClass.label}${selClass.subjects ? ' · ' + selClass.subjects : ''}` : 'Select class and date'}
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSave}
          disabled={!selClass || students.length === 0 || saving}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, background: 'linear-gradient(135deg,#065F46,#059669)', color: '#FFFFFF', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.35)', opacity: (!selClass || students.length === 0 || saving) ? 0.5 : 1 }}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save Attendance'}
        </motion.button>
      </div>

      {/* Loading timetable */}
      {loadingTt && (
        <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>Loading timetable…</div>
      )}

      {/* No timetable assigned */}
      {noTimetable && (
        <div style={{ padding: 32, textAlign: 'center', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#D97706', margin: 0 }}>No classes assigned to you yet</p>
          <p style={{ fontSize: 12, color: '#92400E', marginTop: 6 }}>Your timetable has not been configured yet. Please ask your admin to set up your timetable.</p>
        </div>
      )}

      {/* Filters */}
      {myClasses.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* Class */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>CLASS</label>
            <select value={selClassIdx} onChange={e => { setSelClassIdx(Number(e.target.value)); setAttendance({}) }}
              style={{ padding: '8px 36px 8px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, fontWeight: 500, color: '#0F172A', cursor: 'pointer', outline: 'none', appearance: 'none', fontFamily: 'inherit' }}>
              {myClasses.map((c, i) => <option key={c.class_id} value={i}>{c.label}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, bottom: 10, color: '#94A3B8', pointerEvents: 'none' }} />
          </div>
          {/* Date */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>DATE</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit' }} />
          </div>
        </div>
      )}

      {/* Summary chips */}
      {selClass && students.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { label: 'Present',  value: present,               color: '#059669', bg: '#ECFDF5' },
            { label: 'Absent',   value: absent,                color: '#DC2626', bg: '#FEF2F2' },
            { label: 'Late',     value: late,                  color: '#D97706', bg: '#FFFBEB' },
            { label: 'Unmarked', value: students.length-marked, color: '#94A3B8', bg: '#F8FAFC' },
          ].map(s => (
            <div key={s.label} style={{ padding: '6px 14px', borderRadius: 99, background: s.bg, border: `1px solid ${s.color}30` }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 11, color: '#64748B', marginLeft: 5 }}>{s.label}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={() => markAll('present')} style={{ padding: '6px 14px', borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', fontSize: 12, fontWeight: 600, color: '#059669', cursor: 'pointer' }}>All Present</button>
            <button onClick={() => markAll('absent')}  style={{ padding: '6px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 12, fontWeight: 600, color: '#DC2626', cursor: 'pointer' }}>All Absent</button>
          </div>
        </div>
      )}

      {/* Student list */}
      {selClass && (
        <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>{selClass.label} — {students.length} Student{students.length !== 1 ? 's' : ''}</p>
            <p style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>Tap a student to cycle: Absent → Present → Late</p>
          </div>
          {loadingStudents ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>Loading students…</div>
          ) : students.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>No students found for {selClass.label}</p>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Students need to register with the matching class section.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 0 }}>
              {students.map((student, i) => {
                const sid    = student.studentRowId || student.supabaseId
                const status = attendance[sid] || 'unmarked'
                const statusConf = {
                  present:  { bg: '#ECFDF5', border: '#A7F3D0', color: '#059669', icon: CheckCircle, label: 'Present' },
                  absent:   { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', icon: XCircle,     label: 'Absent'  },
                  late:     { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706', icon: Clock,        label: 'Late'    },
                  unmarked: { bg: '#F8FAFC', border: '#E2E8F0', color: '#94A3B8', icon: null,         label: '—'       },
                }[status]
                const StatusIcon = statusConf.icon
                const initials = (student.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <motion.button key={sid || i} whileTap={{ scale: 0.98 }}
                    onClick={() => toggle(sid)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: statusConf.bg, border: `1px solid ${statusConf.border}`, cursor: 'pointer', textAlign: 'left', margin: 4, borderRadius: 12, transition: 'all 0.1s' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: AVATAR_COLORS[i % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#FFFFFF', flexShrink: 0 }}>
                      {initials || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', margin: 0 }}>{student.name}</p>
                      <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>Roll {student.roll || '—'}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: '#FFFFFF' }}>
                      {StatusIcon && <StatusIcon size={13} style={{ color: statusConf.color }} />}
                      <span style={{ fontSize: 11, fontWeight: 700, color: statusConf.color }}>{statusConf.label}</span>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
