'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Save, ChevronDown, Send, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrentUser } from '@/lib/useCurrentUser'

const EXAMS = ['Unit Test 1', 'Unit Test 2', 'Mid Term', 'Half-Yearly', 'Annual Exam']
const AVATAR_COLORS = ['#2563EB','#7C3AED','#059669','#DC2626','#D97706','#0891B2']

function norm(s) { return (s || '').toLowerCase().replace(/^class\s+/i,'').replace(/[\s\-_]/g,'') }
function matchClass(grade, studentClass) { const g = norm(grade), c = norm(studentClass); return g === c || g.includes(c) || c.includes(g) }

function gradeColor(m, max) {
  const p = (m / max) * 100
  if (p >= 90) return { color: '#059669', bg: '#ECFDF5' }
  if (p >= 75) return { color: '#2563EB', bg: '#EFF6FF' }
  if (p >= 60) return { color: '#D97706', bg: '#FFFBEB' }
  if (p >= 40) return { color: '#EA580C', bg: '#FFF7ED' }
  return { color: '#DC2626', bg: '#FEF2F2' }
}
function letterGrade(m, max) {
  const p = (m / max) * 100
  if (p >= 90) return 'A+'; if (p >= 80) return 'A'; if (p >= 70) return 'B+'; if (p >= 60) return 'B'; if (p >= 50) return 'C'; if (p >= 40) return 'D'; return 'F'
}

export default function FacultyMarks() {
  const cu     = useCurrentUser()
  const myName = cu.name || cu.email || ''

  const [myClasses,    setMyClasses   ] = useState([])
  const [mySubjectMap, setMySubjectMap] = useState({})
  const [allStudents,  setAllStudents ] = useState([])
  const [loading,      setLoading     ] = useState(true)
  const [mounted,      setMounted     ] = useState(false)

  const [selClass,   setSelClass  ] = useState('')
  const [selExam,    setSelExam   ] = useState(EXAMS[0])
  const [selSubject, setSelSubject] = useState('')
  const [maxMark,    setMaxMark   ] = useState(100)
  const [marks,      setMarks     ] = useState({})
  const [remarks,    setRemarks   ] = useState({})
  const [saved,      setSaved     ] = useState(false)
  const [posted,     setPosted    ] = useState(false)
  const [posting,    setPosting   ] = useState(false)

  useEffect(() => {
    if (!cu.mounted) return

    // Load classes directly from timetable_slots by faculty user ID (no name-matching)
    fetch('/api/faculty/classes')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const rows = d?.classes || []
        const classes = rows.map(r => r.name)
        const subjectMap = {}
        rows.forEach(r => { subjectMap[r.name] = new Set(r.subjects) })
        setMyClasses(classes)
        setMySubjectMap(subjectMap)
        if (classes.length > 0) {
          setSelClass(classes[0])
          const subs = [...(subjectMap[classes[0]] || [])]
          if (subs.length > 0) setSelSubject(subs[0])
        }
      })
      .catch(() => {})

    fetch('/api/students')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          setAllStudents(d)
        }
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setMounted(true) })
  }, [cu.mounted])

  // Load saved marks from DB whenever class/exam/subject changes (DB is the only source of truth)
  useEffect(() => {
    if (!selClass || !selExam) return
    setMarks({}); setRemarks({}); setSaved(false); setPosted(false)
    if (!selSubject) { setMaxMark(100); return }
    const params = new URLSearchParams({ className: selClass, examName: selExam, subject: selSubject })
    fetch(`/api/faculty/marks?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.found && Object.keys(d.marks || {}).length > 0) {
          setMarks(d.marks)
          setRemarks(d.remarks || {})
          setMaxMark(d.maxMark ?? 100)
          setSaved(true)
        }
      })
      .catch(() => {})
  }, [selClass, selExam, selSubject])

  const students = allStudents.filter(s => matchClass(selClass, s.class || s.classSection || ''))
  const mySubjectsForClass = selClass ? [...(mySubjectMap[selClass] || [])] : []
  const marksKey = selSubject ? `${selClass}__${selExam}__${selSubject}` : `${selClass}__${selExam}`
  const safeMax = Number(maxMark) > 0 ? Number(maxMark) : 100

  const handleSave = async () => {
    if (!selSubject) { toast.error('Select a subject before saving.'); return }
    const ids = students.map(s => s.supabaseId || s.id)
    const unmarked = ids.filter(id => marks[id] === undefined || marks[id] === '').length
    if (unmarked > 0) { toast.error(`${unmarked} student${unmarked>1?'s':''} have no marks entered`); return }

    const marksPayload = students
      .filter(s => s.supabaseId)
      .map(s => ({
        userAuthId:    s.supabaseId,
        studentRowId:  s.studentRowId || null,
        marksObtained: Number(marks[s.supabaseId] ?? 0),
        remarks:       remarks[s.supabaseId] || null,
      }))

    if (marksPayload.length === 0) { toast.error('No students with accounts found.'); return }

    try {
      const res = await fetch('/api/faculty/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className: selClass, examName: selExam, subject: selSubject, maxMark: safeMax, marks: marksPayload }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Save failed'); return }
      setSaved(true)
      toast.success(`Draft saved — ${selClass} · ${selExam} · ${selSubject}`)
    } catch (err) {
      toast.error('Network error — marks not saved')
    }
  }

  const handlePost = async () => {
    const ids = students.map(s => s.supabaseId || s.id)
    const allFilled = ids.every(id => marks[id] !== undefined && marks[id] !== '')
    if (!allFilled) { toast.error('Enter marks for all students before posting.'); return }
    if (!selSubject) { toast.error('Select a subject before posting.'); return }

    setPosting(true)

    // Build payload — only students with Supabase accounts can be synced
    const marksPayload = students
      .filter(s => s.supabaseId)
      .map(s => ({
        userAuthId:    s.supabaseId,
        studentRowId:  s.studentRowId || null,
        marksObtained: Number(marks[s.supabaseId] ?? 0),
        remarks:       remarks[s.supabaseId] || null,
      }))

    if (marksPayload.length === 0) {
      toast.error('No students with Supabase accounts found.')
      setPosting(false)
      return
    }

    try {
      const res = await fetch('/api/faculty/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          className: selClass,
          examName:  selExam,
          subject:   selSubject,
          maxMark:   safeMax,
          marks:     marksPayload,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        toast.error(json.error || 'Failed to post marks.')
        setPosting(false)
        return
      }

      setPosted(true)
      setSaved(true)
      toast.success(`Marks posted! Students can now view their ${selExam} results.`)
    } catch {
      toast.error('Network error. Try again.')
    }
    setPosting(false)
  }

  const avg = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + (parseFloat(marks[s.supabaseId || s.id]) || 0), 0) / students.length)
    : 0

  if (!cu.mounted) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Student Marks</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Enter and publish marks for your classes</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {posted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
              <CheckCircle size={13} color="#059669" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>Posted to Students</span>
            </div>
          )}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSave}
            disabled={!selClass || students.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: '#F8FAFC', color: '#0F172A', border: '1.5px solid #E2E8F0', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (!selClass || students.length === 0) ? 0.5 : 1 }}>
            <Save size={14} /> Save Draft
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handlePost}
            disabled={!selClass || students.length === 0 || posted || posting}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: posted ? '#ECFDF5' : '#064E3B', color: posted ? '#059669' : '#FFFFFF', border: posted ? '1.5px solid #A7F3D0' : 'none', fontSize: 13, fontWeight: 700, cursor: (posted || posting) ? 'default' : 'pointer', boxShadow: posted ? 'none' : '0 4px 14px rgba(6,78,59,0.35)', opacity: (!selClass || students.length === 0) ? 0.5 : 1 }}>
            <Send size={14} /> {posting ? 'Posting…' : posted ? 'Posted' : 'Post Marks'}
          </motion.button>
        </div>
      </div>

      {/* No timetable assigned */}
      {mounted && myName && myClasses.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#D97706', margin: 0 }}>No classes assigned to you yet</p>
          <p style={{ fontSize: 12, color: '#92400E', marginTop: 6 }}>Ask your admin to assign you to periods in the timetable.</p>
        </div>
      )}

      {/* Filters row */}
      {myClasses.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {/* Class */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>Class</label>
            <select value={selClass}
              onChange={e => {
                const cls = e.target.value
                const subs = [...(mySubjectMap[cls] || [])]
                setSelClass(cls); setSelSubject(subs[0] || ''); setMarks({}); setRemarks({}); setSaved(false); setPosted(false); setMaxMark(100)
              }}
              style={{ padding: '8px 36px 8px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, fontWeight: 500, color: '#0F172A', cursor: 'pointer', outline: 'none', appearance: 'none', fontFamily: 'inherit' }}>
              {myClasses.map(o => <option key={o}>{o}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, bottom: 10, color: '#94A3B8', pointerEvents: 'none' }} />
          </div>

          {/* Exam */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>Exam</label>
            <select value={selExam}
              onChange={e => { setSelExam(e.target.value); setSaved(false); setPosted(false) }}
              style={{ padding: '8px 36px 8px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, fontWeight: 500, color: '#0F172A', cursor: 'pointer', outline: 'none', appearance: 'none', fontFamily: 'inherit' }}>
              {EXAMS.map(o => <option key={o}>{o}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, bottom: 10, color: '#94A3B8', pointerEvents: 'none' }} />
          </div>

          {/* Subject */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>Subject</label>
            {mySubjectsForClass.length > 1 ? (
              <>
                <select value={selSubject}
                  onChange={e => { setSelSubject(e.target.value); setMarks({}); setRemarks({}); setSaved(false); setPosted(false) }}
                  style={{ padding: '8px 36px 8px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, fontWeight: 500, color: '#0F172A', cursor: 'pointer', outline: 'none', appearance: 'none', fontFamily: 'inherit' }}>
                  {mySubjectsForClass.map(s => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown size={13} style={{ position: 'absolute', right: 10, bottom: 10, color: '#94A3B8', pointerEvents: 'none' }} />
              </>
            ) : (
              <div style={{ padding: '8px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: 13, fontWeight: 600, color: '#0F172A', minWidth: 100 }}>
                {selSubject || 'Not assigned'}
              </div>
            )}
          </div>

          {/* Max Marks — editable */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 5 }}>Max Marks</label>
            <input
              type="number" min={1} max={1000}
              value={maxMark}
              onChange={e => { setMaxMark(Number(e.target.value) || 100); setSaved(false) }}
              disabled={posted}
              style={{ width: 80, padding: '8px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: posted ? '#F8FAFC' : '#FFFFFF', fontSize: 13, fontWeight: 700, color: '#0F172A', outline: 'none', fontFamily: 'inherit', cursor: posted ? 'default' : 'auto' }}
            />
          </div>

          {/* Class average */}
          <div style={{ marginLeft: 'auto' }}>
            <div style={{ padding: '8px 16px', borderRadius: 10, background: avg >= safeMax * 0.75 ? '#ECFDF5' : avg >= safeMax * 0.5 ? '#FFFBEB' : '#FEF2F2', border: `1px solid ${avg >= safeMax * 0.75 ? '#A7F3D0' : avg >= safeMax * 0.5 ? '#FDE68A' : '#FECACA'}` }}>
              <span style={{ fontSize: 11, color: '#64748B' }}>Class Avg: </span>
              <span style={{ fontSize: 15, fontWeight: 800, color: avg >= safeMax * 0.75 ? '#059669' : avg >= safeMax * 0.5 ? '#D97706' : '#DC2626' }}>{avg}</span>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>/{safeMax}</span>
            </div>
          </div>
        </div>
      )}

      {/* Info banner */}
      {selClass && students.length > 0 && !posted && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 12, background: '#FFF7ED', border: '1px solid #FDE68A' }}>
          <Send size={13} color="#D97706" />
          <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>
            Students cannot see marks until you click <strong>Post Marks</strong>. Marks are saved to Supabase and appear in the student portal by subject.
          </p>
        </div>
      )}

      {/* Marks table */}
      {selClass && (
        <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 12 }}>
            <BookOpen size={15} color="#059669" />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              {selClass} · {selExam}{selSubject ? ` · ${selSubject}` : ''}{' '}
              <span style={{ fontWeight: 400, color: '#94A3B8' }}>(Max: {safeMax})</span>
            </p>
          </div>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>Loading students…</div>
          ) : students.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>No students found for {selClass}</p>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Students need to register with matching class section.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Student', `Marks / ${safeMax}`, 'Grade', 'Remarks'].map(col => (
                      <th key={col} style={{ padding: '12px 16px', textAlign: col === 'Student' || col === 'Remarks' ? 'left' : 'center', fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const sid   = s.supabaseId || s.id
                    const m     = parseFloat(marks[sid])
                    const gc    = isNaN(m) ? null : gradeColor(m, safeMax)
                    const grade = isNaN(m) ? '—' : letterGrade(m, safeMax)
                    return (
                      <tr key={sid} style={{ borderBottom: '1px solid #F8FAFC' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: AVATAR_COLORS[i % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#FFFFFF', flexShrink: 0 }}>
                              {(s.name||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', margin: 0 }}>{s.name}</p>
                              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                                Roll {s.roll || '—'}
                                {!s.supabaseId && <span style={{ color: '#F59E0B', marginLeft: 6 }}>· local only</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <input type="number" min={0} max={safeMax}
                            value={marks[sid] ?? ''}
                            onChange={e => { setMarks(prev => ({ ...prev, [sid]: e.target.value })); setSaved(false) }}
                            placeholder="—"
                            style={{ width: 70, padding: '7px 10px', borderRadius: 9, border: `1.5px solid ${gc ? gc.bg : '#E2E8F0'}`, background: gc ? gc.bg : '#F8FAFC', fontSize: 14, fontWeight: 700, color: gc ? gc.color : '#94A3B8', textAlign: 'center', outline: 'none', fontFamily: 'inherit' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {gc
                            ? <span style={{ fontSize: 13, fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: gc.bg, color: gc.color }}>{grade}</span>
                            : <span style={{ color: '#CBD5E1' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <input type="text" value={remarks[sid] ?? ''}
                            onChange={e => { setRemarks(prev => ({ ...prev, [sid]: e.target.value })); setSaved(false) }}
                            placeholder="Add remark..."
                            style={{ width: '100%', padding: '7px 10px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: 12, color: '#475569', outline: 'none', fontFamily: 'inherit' }}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
