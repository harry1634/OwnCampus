'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ClipboardList, Calendar, Clock, BookOpen, AlertCircle, FileText } from 'lucide-react'
import { useCurrentUser } from '@/lib/useCurrentUser'

function fmt12(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`
}

const TYPE_LABELS = {
  unit_test:  'Unit Test',
  internal:   'Internal',
  midterm:    'Mid Term',
  final:      'Final Exam',
  assignment: 'Assignment',
  quiz:       'Quiz',
  practical:  'Practical',
  project:    'Project',
  external:   'External',
}

const TYPE_COLOR = {
  unit_test:  { bg: '#EFF6FF', color: '#2563EB' },
  internal:   { bg: '#F5F3FF', color: '#7C3AED' },
  midterm:    { bg: '#ECFDF5', color: '#059669' },
  final:      { bg: '#FEF2F2', color: '#DC2626' },
  assignment: { bg: '#FFFBEB', color: '#D97706' },
  quiz:       { bg: '#ECFEFF', color: '#0891B2' },
  practical:  { bg: '#FFF7ED', color: '#EA580C' },
  project:    { bg: '#F0FDF4', color: '#16A34A' },
  external:   { bg: '#FFF1F2', color: '#E11D48' },
}

export default function StudentExams() {
  const cu = useCurrentUser()
  const [exams,   setExams  ] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError  ] = useState(null)
  const [filter,  setFilter ] = useState('all')   // all | upcoming | completed

  useEffect(() => {
    if (!cu.mounted) return
    fetch('/api/examinations')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setExams(Array.isArray(d) ? d : [])
      })
      .catch(() => setError('Failed to load exams.'))
      .finally(() => setLoading(false))
  }, [cu.mounted])

  if (!cu.mounted || loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 28, width: 200, borderRadius: 8, background: '#E2E8F0' }} className="shimmer" />
        {[0, 1, 2, 4].map(i => (
          <div key={i} style={{ height: 90, borderRadius: 14, background: '#E2E8F0' }} className="shimmer" />
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

  const today     = new Date().toISOString().slice(0, 10)
  const upcoming  = exams.filter(e => !e.exam_date || e.exam_date >= today)
  const completed = exams.filter(e => e.exam_date  && e.exam_date < today)

  const shown = filter === 'upcoming' ? upcoming : filter === 'completed' ? completed : exams

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Examinations</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
          {cu.classSection ? `Schedule for ${cu.classSection}` : 'Your exam schedule'}
        </p>
      </div>

      {/* Student card */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '2px solid #DDD6FE', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={18} color="#7C3AED" />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>{cu.name || '—'}</p>
          <p style={{ fontSize: 11.5, color: '#94A3B8', margin: '2px 0 0' }}>
            {[cu.classSection, cu.roll ? `Roll ${cu.roll}` : null].filter(Boolean).join(' · ') || 'Student'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#7C3AED', margin: 0 }}>{upcoming.length}</p>
            <p style={{ fontSize: 10.5, color: '#94A3B8', margin: '2px 0 0' }}>Upcoming</p>
          </div>
          <div style={{ width: 1, background: '#E2E8F0' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#64748B', margin: 0 }}>{completed.length}</p>
            <p style={{ fontSize: 10.5, color: '#94A3B8', margin: '2px 0 0' }}>Completed</p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[['all','All'],['upcoming','Upcoming'],['completed','Completed']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{
              padding: '6px 16px', borderRadius: 99, border: '1.5px solid', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
              borderColor: filter === key ? '#7C3AED' : '#E2E8F0',
              background:  filter === key ? '#7C3AED' : '#FFFFFF',
              color:       filter === key ? '#FFFFFF'  : '#64748B',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Exam list */}
      {shown.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: '#F8FAFC', borderRadius: 16, border: '1px solid #E2E8F0' }}>
          <Clock size={36} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>
            {filter === 'upcoming' ? 'No upcoming exams' : filter === 'completed' ? 'No completed exams yet' : 'No exams scheduled'}
          </p>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Exams will appear here once your admin schedules them.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map((exam, i) => {
            const tc      = TYPE_COLOR[exam.type] || { bg: '#F1F5F9', color: '#475569' }
            const isPast  = exam.exam_date && exam.exam_date < today
            const dateStr = exam.exam_date
              ? new Date(exam.exam_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
              : 'Date TBA'

            return (
              <motion.div key={exam.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                style={{ background: '#FFFFFF', borderRadius: 14, border: `1px solid ${isPast ? '#E2E8F0' : '#DDD6FE'}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, opacity: isPast ? 0.75 : 1 }}>

                {/* Icon */}
                <div style={{ width: 44, height: 44, borderRadius: 12, background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ClipboardList size={19} color={tc.color} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: tc.bg, color: tc.color }}>
                      {TYPE_LABELS[exam.type] || exam.type}
                    </span>
                    {exam.subjects?.name && (
                      <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#F8FAFC', color: '#64748B' }}>
                        {exam.subjects.name}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', margin: 0 }}>{exam.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 5, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Calendar size={11} color="#94A3B8" />
                      <span style={{ fontSize: 11.5, color: '#64748B' }}>{dateStr}</span>
                    </div>
                    {(exam.start_time || exam.end_time) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock size={11} color="#94A3B8" />
                        <span style={{ fontSize: 11.5, color: '#64748B' }}>
                          {exam.start_time ? fmt12(exam.start_time.slice(0,5)) : ''}
                          {exam.end_time   ? ' – ' + fmt12(exam.end_time.slice(0,5)) : ''}
                        </span>
                      </div>
                    )}
                    {exam.total_marks && (
                      <span style={{ fontSize: 11.5, color: '#94A3B8' }}>Max: {exam.total_marks} marks</span>
                    )}
                    {exam.passing_marks && (
                      <span style={{ fontSize: 11.5, color: '#94A3B8' }}>Pass: {exam.passing_marks}</span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ flexShrink: 0 }}>
                  {isPast ? (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: '#F1F5F9', color: '#64748B' }}>Completed</span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>Upcoming</span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
