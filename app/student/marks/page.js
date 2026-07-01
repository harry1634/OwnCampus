'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Award, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { useCurrentUser } from '@/lib/useCurrentUser'

const TYPE_LABELS = {
  unit_test:   'Unit Test',
  internal:    'Internal',
  midterm:     'Mid Term',
  final:       'Final Exam',
  assignment:  'Assignment',
  quiz:        'Quiz',
  practical:   'Practical',
  project:     'Project',
  external:    'External',
}

const GRADE_STYLE = {
  'A+': { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  'A':  { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  'B+': { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  'B':  { color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
  'C':  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  'D':  { color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
  'F':  { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  'AB': { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
}

function gradeStyle(g) { return GRADE_STYLE[g] || GRADE_STYLE['D'] }

function ProgressBar({ pct, color }) {
  return (
    <div style={{ height: 5, borderRadius: 99, background: '#E2E8F0', overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(pct, 100)}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ height: '100%', borderRadius: 99, background: color }}
      />
    </div>
  )
}

export default function StudentMarks() {
  const cu = useCurrentUser()
  const [data,       setData      ] = useState(null)
  const [loading,    setLoading   ] = useState(true)
  const [error,      setError     ] = useState(null)
  const [activeType, setActiveType] = useState('all')

  useEffect(() => {
    if (!cu.mounted) return
    fetch('/api/student/marks')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Failed to load marks.'))
      .finally(() => setLoading(false))
  }, [cu.mounted])

  if (!cu.mounted || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 28, width: 180, borderRadius: 8, background: '#E2E8F0' }} className="shimmer" />
        <div style={{ height: 110, borderRadius: 16, background: '#E2E8F0' }} className="shimmer" />
        {[0, 1, 2].map(i => (
          <div key={i} style={{ height: 160, borderRadius: 16, background: '#E2E8F0' }} className="shimmer" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <AlertCircle size={32} color="#EF4444" style={{ marginBottom: 10 }} />
        <p style={{ color: '#EF4444', fontSize: 14 }}>{error}</p>
      </div>
    )
  }

  const { subjects = [], marks = [], totalExams = 0, passedExams = 0 } = data || {}

  const presentTypes    = [...new Set(marks.map(m => m.examType).filter(Boolean))]
  const filteredSubjects = activeType === 'all'
    ? subjects
    : subjects.map(s => ({ ...s, exams: s.exams.filter(e => e.examType === activeType) })).filter(s => s.exams.length > 0)

  const overallPct = marks.filter(m => !m.isAbsent).length > 0
    ? Math.round(marks.filter(m => !m.isAbsent).reduce((sum, m) => sum + m.percentage, 0) / marks.filter(m => !m.isAbsent).length)
    : null

  const overallGrade = overallPct === null ? '—'
    : overallPct >= 90 ? 'A+' : overallPct >= 80 ? 'A' : overallPct >= 70 ? 'B+'
    : overallPct >= 60 ? 'B'  : overallPct >= 50 ? 'C' : overallPct >= 40 ? 'D' : 'F'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>My Marks</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Subject-wise exam results</p>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12 }}>
        {[
          { label: 'Exams Taken',   value: totalExams,              icon: BookOpen,    color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Passed',        value: passedExams,             icon: CheckCircle, color: '#059669', bg: '#ECFDF5' },
          { label: 'Failed/Absent', value: totalExams - passedExams,icon: XCircle,     color: '#DC2626', bg: '#FEF2F2' },
          { label: 'Overall Grade', value: overallGrade,            icon: Award,       color: '#7C3AED', bg: '#F5F3FF' },
        ].map(k => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <k.icon size={16} color={k.color} />
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1 }}>{k.value}</p>
              <p style={{ fontSize: 11, color: '#64748B', margin: '3px 0 0', lineHeight: 1 }}>{k.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {marks.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: '#F8FAFC', borderRadius: 16, border: '1px solid #E2E8F0' }}>
          <Clock size={36} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>No marks published yet</p>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Your faculty will publish results after each exam.</p>
        </div>
      )}

      {marks.length > 0 && (
        <>
          {/* Exam type filter */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['all', ...presentTypes].map(t => (
              <button key={t} onClick={() => setActiveType(t)}
                style={{
                  padding: '6px 14px', borderRadius: 99, border: '1.5px solid',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  borderColor: activeType === t ? '#7C3AED' : '#E2E8F0',
                  background:  activeType === t ? '#7C3AED' : '#FFFFFF',
                  color:       activeType === t ? '#FFFFFF'  : '#64748B',
                }}>
                {t === 'all' ? 'All Exams' : (TYPE_LABELS[t] || t)}
              </button>
            ))}
          </div>

          {/* Subject cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredSubjects.map((s, si) => (
              <motion.div key={s.subject.id || s.subject.name}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }}
                style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>

                {/* Subject header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <BookOpen size={18} color="#7C3AED" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>{s.subject.name}</p>
                    {s.subject.code && <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>{s.subject.code}</p>}
                  </div>
                  {s.averagePercentage !== null && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 2px' }}>Average</p>
                      <span style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{s.averagePercentage}%</span>
                    </div>
                  )}
                </div>

                {/* Exam rows */}
                <div style={{ padding: '8px 0' }}>
                  {s.exams.map((exam, ei) => {
                    const gs = gradeStyle(exam.grade)
                    return (
                      <div key={exam.id || ei}
                        style={{ padding: '12px 20px', borderBottom: ei < s.exams.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#F1F5F9', color: '#475569' }}>
                              {TYPE_LABELS[exam.examType] || exam.examType}
                            </span>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#1E293B', margin: 0 }}>{exam.examName}</p>
                          </div>
                          {exam.examDate && (
                            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                              {new Date(exam.examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                          {!exam.isAbsent && exam.obtained !== null && (
                            <div style={{ marginTop: 8, maxWidth: 200 }}>
                              <ProgressBar pct={exam.percentage} color={gs.color} />
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          {exam.isAbsent ? (
                            <span style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 12px', borderRadius: 8, background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>Absent</span>
                          ) : exam.obtained === null ? (
                            <span style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 12px', borderRadius: 8, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>Awaiting</span>
                          ) : (
                            <>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                                  {exam.obtained}<span style={{ fontSize: 12, fontWeight: 500, color: '#94A3B8' }}>/{exam.totalMarks}</span>
                                </div>
                                <div style={{ fontSize: 10.5, color: exam.passed ? '#059669' : '#DC2626', marginTop: 2, fontWeight: 600 }}>
                                  {exam.passed ? '✓ Pass' : '✗ Fail'}
                                </div>
                              </div>
                              <div style={{ width: 40, height: 40, borderRadius: 11, background: gs.bg, border: `1.5px solid ${gs.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: gs.color }}>{exam.grade}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
