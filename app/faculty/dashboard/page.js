'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar, Users, Clock, BookOpen,
  ClipboardList, ChevronRight, UserCheck, Megaphone, Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useCurrentUser } from '@/lib/useCurrentUser'

const TYPE_META = {
  general: { bg: '#EFF6FF', color: '#2563EB' },
  exam:    { bg: '#F5F3FF', color: '#7C3AED' },
  event:   { bg: '#ECFDF5', color: '#059669' },
  holiday: { bg: '#FEF2F2', color: '#DC2626' },
  meeting: { bg: '#FFFBEB', color: '#D97706' },
}

const SUBJECT_COLORS = ['#2563EB','#059669','#7C3AED','#D97706','#DC2626','#0891B2','#DB2777','#0F766E']
const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

const FAC = '#064E3B'   // sidebar anchor — all faculty-portal accents derive from this
const FAC2 = '#059669'  // emerald-600 — lighter accent for links, icons

function fmt12(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export default function FacultyDashboard() {
  const cu = useCurrentUser()

  const [data,    setData   ] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/faculty')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const announcements = data?.announcements || []
  const todaySchedule = (data?.timetable || []).map(slot => ({
    time:    slot.start_time && slot.end_time
      ? `${fmt12(slot.start_time)} – ${fmt12(slot.end_time)}`
      : 'TBD',
    subject: slot.subjects?.name || 'Class',
    grade:   slot.classes ? `${slot.classes.name} ${slot.classes.section || ''}`.trim() : '',
    sortKey: slot.start_time || '0',
  }))
  const classesToday = data?.stats?.classesToday ?? null
  const studentCount = null
  const pendingMarks = 0

  const date        = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hour        = new Date().getHours()
  const timeGreet   = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const displayName = cu.name ? cu.name.split(' ').slice(-1)[0] : 'Faculty'

  const QUICK_ACTIONS = [
    { label: 'Mark Attendance', href: '/faculty/attendance',   icon: UserCheck,     color: FAC2   },
    { label: 'Update Marks',    href: '/faculty/marks',        icon: BookOpen,      color: '#2563EB' },
    { label: 'Apply Leave',     href: '/faculty/leaves',       icon: Clock,         color: '#7C3AED' },
    { label: 'Invigilation',    href: '/faculty/invigilation', icon: ClipboardList, color: '#D97706' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* Welcome Banner — matches sidebar color */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ borderRadius: 20, padding: '28px 32px', background: FAC, position: 'relative', overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(6,78,59,0.22)' }}>
        {/* dot-grid texture */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px' }} />
        {/* glow orbs */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(16,185,129,0.22) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(5,150,105,0.18) 0%, transparent 65%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: 500, letterSpacing: '0.03em' }}>{date}</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: 6 }}>
            {timeGreet}, {displayName}! 👋
          </h1>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            {cu.dept ? `Department: ${cu.dept}` : 'Welcome to your faculty portal'}
          </p>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
        {[
          { label: 'Announcements', value: announcements.length, icon: Megaphone, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Classes Today', value: classesToday,         icon: Calendar,  color: FAC2,      bg: '#ECFDF5' },
          { label: 'Classes',       value: studentCount,         icon: Users,     color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'Pending Marks', value: pendingMarks,         icon: BookOpen,  color: '#D97706', bg: '#FFFBEB' },
        ].map((stat, i) => {
          const Icon    = stat.icon
          const display = stat.value === null ? '—' : stat.value
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon size={17} style={{ color: stat.color }} />
              </div>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 3 }}>{display}</p>
              <p style={{ fontSize: 11.5, color: '#64748B', fontWeight: 500 }}>{stat.label}</p>
            </motion.div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="responsive-2col">
        <style>{`@media(max-width:768px){.responsive-2col{grid-template-columns:1fr!important;}}`}</style>

        {/* Announcements */}
        <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Megaphone size={15} color={FAC2} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0, flex: 1 }}>Announcements</h3>
          </div>
          <div style={{ padding: '10px 16px 14px' }}>
            {loading && <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '16px 0', margin: 0 }}>Loading…</p>}
            {!loading && !announcements.length && (
              <p style={{ color: '#CBD5E1', fontSize: 13, textAlign: 'center', padding: '20px 0', margin: 0 }}>No announcements yet.</p>
            )}
            {announcements.slice(0, 5).map(ann => {
              const meta = TYPE_META[ann.type] || TYPE_META.general
              const ts   = new Date(ann.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              return (
                <div key={ann.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px', borderRadius: 10, marginBottom: 4, transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0, marginTop: 5 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: '#1E293B', margin: 0 }}>{ann.title}</p>
                    <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{ann.content.slice(0, 60)}{ann.content.length > 60 ? '…' : ''}</p>
                    <p style={{ fontSize: 10.5, color: '#CBD5E1', marginTop: 2 }}>By {ann.created_by_name || 'Admin'} · {ts}</p>
                  </div>
                  <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: meta.bg, color: meta.color, flexShrink: 0 }}>{ann.type}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Today's Schedule */}
          <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Today's Schedule</h3>
              <Link href="/faculty/timetable" style={{ fontSize: 12, fontWeight: 600, color: FAC2, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                View <ChevronRight size={13} />
              </Link>
            </div>

            {!cu.mounted || classesToday === null ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: 12.5, color: '#CBD5E1', margin: 0 }}>Loading…</p>
              </div>
            ) : todaySchedule.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Calendar size={28} color="#E2E8F0" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 12.5, color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
                  No classes scheduled for today.
                </p>
              </div>
            ) : (
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todaySchedule.map((item, i) => {
                  const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length]
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                      <div style={{ width: 4, height: 36, borderRadius: 99, background: color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', margin: 0 }}>{item.subject}</p>
                        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                          {item.grade ? `${item.grade} · ` : ''}{item.time}
                        </p>
                      </div>
                      {item.grade && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: `${color}15`, color, border: `1px solid ${color}30`, flexShrink: 0 }}>
                          {item.grade}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              <Zap size={14} color={FAC2} />
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>Quick Actions</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {QUICK_ACTIONS.map(a => {
                const Icon = a.icon
                return (
                  <Link key={a.label} href={a.href}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10,
                      background: '#F8FAFC', border: '1px solid #E2E8F0', textDecoration: 'none', transition: 'all 0.15s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${a.color}0d`; e.currentTarget.style.borderColor = `${a.color}30`; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.transform = 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${a.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={13} style={{ color: a.color }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{a.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
