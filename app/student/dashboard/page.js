'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  UserCheck, BookOpen, Calendar, ClipboardList,
  CreditCard, Library, Bell, Clock, ChevronRight,
  Megaphone, Pin, BookMarked, CheckCircle,
} from 'lucide-react'
import { useCurrentUser } from '@/lib/useCurrentUser'

function fmtDate(str) {
  if (!str) return '—'
  const m = typeof str === 'string' && str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${m[3]} ${months[parseInt(m[2],10)-1]} ${m[1]}`
  }
  const d = new Date(str)
  if (isNaN(d.getTime())) return '—'
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`
}

const PERIOD_COLORS = ['#7C3AED','#2563EB','#059669','#D97706','#DC2626','#0891B2','#EA580C','#9333EA']
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

const TYPE_META = {
  general: { bg: '#EFF6FF', color: '#2563EB' },
  exam:    { bg: '#F5F3FF', color: '#7C3AED' },
  event:   { bg: '#ECFDF5', color: '#059669' },
  holiday: { bg: '#FEF2F2', color: '#DC2626' },
  meeting: { bg: '#FFFBEB', color: '#D97706' },
}

const QUICK = [
  { label: 'Attendance', href: '/student/attendance', icon: UserCheck,     bg: '#F5F3FF', color: '#7C3AED' },
  { label: 'My Marks',   href: '/student/marks',      icon: BookOpen,      bg: '#EFF6FF', color: '#2563EB' },
  { label: 'Timetable',  href: '/student/timetable',  icon: Calendar,      bg: '#ECFDF5', color: '#059669' },
  { label: 'Exams',      href: '/student/exams',       icon: ClipboardList, bg: '#FEF2F2', color: '#DC2626' },
]

export default function StudentDashboard() {
  const cu = useCurrentUser()
  const [dashData,     setDashData    ] = useState(null)
  const [loading,      setLoading     ] = useState(true)
  const [isMobile,     setIsMobile    ] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Single aggregated API call — replaces 4 separate fetches
  useEffect(() => {
    fetch('/api/dashboard/student')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setDashData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const announcements = dashData?.announcements || []
  const loadingAnn    = loading
  const feeData = {
    totalFee:   dashData?.stats?.totalFee   ?? 0,
    paidAmount: dashData?.stats?.paidAmount ?? 0,
    feeStatus:  dashData?.stats?.feeStatus  ?? 'pending',
  }
  const payments   = dashData?.feeHistory || []
  const dashStats  = {
    attendancePct: dashData?.stats?.attendance   ?? null,
    upcomingExams: dashData?.stats?.upcomingExamCount ?? 0,
    overdueBooks:  dashData?.stats?.overdueBooks ?? 0,
  }

  // Timetable: map from aggregated API
  const todayDayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()]
  const todaySchedule = {
    periods: (dashData?.timetable || []).map((s, i) => ({
      periodIdx: i,
      subject:   s.subjects?.name || '—',
      teacher:   s.user_profiles
        ? [s.user_profiles.first_name, s.user_profiles.last_name].filter(Boolean).join(' ')
        : '',
      time:      s.start_time ? `${s.start_time}–${s.end_time || ''}` : '',
    })),
    dayName: todayDayName,
    grade:   dashData?.profile?.className || null,
  }

  const hour         = new Date().getHours()
  const greeting     = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const displayName  = cu.name || 'Student'
  const displayClass = cu.classSection
    ? `Class ${cu.classSection}${cu.roll ? ' · Roll No. ' + cu.roll : ''}`
    : 'Student Portal'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Welcome banner */}
      <div style={{ background: '#7C3AED', borderRadius: 20, padding: '24px 28px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500, margin: '0 0 4px' }}>{greeting}</p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: '0 0 6px' }}>{displayName}</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: 0 }}>
            {displayClass} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Quick access */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10 }}>
        {QUICK.map(q => {
          const Icon = q.icon
          return (
            <Link key={q.label} href={q.href}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: isMobile ? '18px 12px' : '16px 10px', borderRadius: 14, background: q.bg, textDecoration: 'none', border: '1px solid transparent', WebkitTapHighlightColor: 'transparent' }}>
              <Icon size={22} style={{ color: q.color }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: q.color, textAlign: 'center' }}>{q.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Fee & Payment Summary */}
      {(payments.length > 0 || feeData.totalFee > 0) && (
        <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={14} color="#059669" />
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Fee & Payments</h2>
            </div>
            {feeData.totalFee > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                background: feeData.feeStatus === 'paid' ? '#ECFDF5' : feeData.feeStatus === 'partial' ? '#EFF6FF' : '#FFFBEB',
                color:      feeData.feeStatus === 'paid' ? '#059669' : feeData.feeStatus === 'partial' ? '#2563EB' : '#D97706',
              }}>
                {feeData.feeStatus === 'paid' ? 'Paid' : feeData.feeStatus === 'partial' ? 'Partial' : 'Pending'}
              </span>
            )}
          </div>

          {/* Fee summary row */}
          {feeData.totalFee > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, borderBottom: payments.length > 0 ? '1px solid #F1F5F9' : 'none' }}>
              {[
                { label: 'Total Fee',  value: `₹${feeData.totalFee.toLocaleString('en-IN')}`,   color: '#0F172A', bg: '#F8FAFC' },
                { label: 'Paid',       value: `₹${feeData.paidAmount.toLocaleString('en-IN')}`, color: '#059669', bg: '#F0FDF4' },
                { label: 'Balance',    value: `₹${Math.max(0, feeData.totalFee - feeData.paidAmount).toLocaleString('en-IN')}`,
                  color: feeData.paidAmount >= feeData.totalFee ? '#059669' : '#DC2626',
                  bg:    feeData.paidAmount >= feeData.totalFee ? '#F0FDF4' : '#FEF2F2' },
              ].map((c, i) => (
                <div key={c.label} style={{ padding: '14px 20px', background: c.bg, borderRight: i < 2 ? '1px solid #F1F5F9' : 'none', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{c.label}</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: c.color, margin: 0 }}>{c.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Payment history */}
          {payments.length > 0 && (
            <div style={{ padding: '4px 16px 8px' }}>
              {payments.slice().reverse().slice(0, 3).map((p, i) => (
                <div key={i} style={{ padding: '11px 0', borderBottom: i < Math.min(payments.length, 3) - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle size={15} color="#059669" />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>Payment Received</p>
                      <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>{p.payment_mode || p.mode || 'Cash'} · {fmtDate(p.payment_date || p.date)}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#059669', margin: '0 0 2px' }}>+₹{Number(p.amount).toLocaleString('en-IN')}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#ECFDF5', color: '#059669' }}>Success</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Announcements */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Megaphone size={14} color="#2563EB" />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Announcements</h2>
        </div>
        <div style={{ padding: '8px 16px' }}>
          {loadingAnn && <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0', margin: 0 }}>Loading…</p>}
          {!loadingAnn && !announcements.length && (
            <p style={{ color: '#CBD5E1', fontSize: 13, textAlign: 'center', padding: '20px 0', margin: 0 }}>No announcements yet.</p>
          )}
          {announcements.map((ann, i) => {
            const meta = TYPE_META[ann.type] || TYPE_META.general
            const ts   = new Date(ann.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
            return (
              <div key={ann.id} style={{ padding: '13px 0', borderBottom: i < announcements.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    {ann.is_pinned && <Pin size={10} color="#D97706" />}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: meta.bg, color: meta.color }}>{ann.type}</span>
                  </div>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A', margin: '0 0 3px' }}>{ann.title}</p>
                  <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 4px', lineHeight: 1.5 }}>{ann.content}</p>
                  <p style={{ fontSize: 11, color: '#CBD5E1', margin: 0 }}>By {ann.created_by_name || 'Admin'} · {ts}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Schedule & Marks placeholders */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={14} color="#7C3AED" />
              <h2 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>Today's Schedule</h2>
            </div>
            {todaySchedule.dayName && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', padding: '2px 8px', borderRadius: 99 }}>
                {todaySchedule.dayName}
              </span>
            )}
          </div>

          {todaySchedule.periods.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <Calendar size={26} color="#E2E8F0" style={{ marginBottom: 8 }} />
              <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                {todaySchedule.grade ? 'No classes scheduled today.' : 'Timetable not configured yet.'}
              </p>
            </div>
          ) : (
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {todaySchedule.periods.map(({ periodIdx, subject, teacher }, i) => {
                const color = PERIOD_COLORS[i % PERIOD_COLORS.length]
                return (
                  <motion.div key={periodIdx}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: '#F8FAFC' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BookMarked size={13} style={{ color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 700, color: '#1E293B', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subject}</p>
                      {teacher && <p style={{ fontSize: 10.5, color: '#94A3B8', margin: 0, marginTop: 1 }}>{teacher}</p>}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color, flexShrink: 0 }}>P{periodIdx + 1}</span>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
        <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={14} color="#059669" />
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>Quick Stats</h2>
          </div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href="/student/attendance"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: '#F8FAFC', textDecoration: 'none' }}>
              <UserCheck size={14} color="#7C3AED" />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', flex: 1 }}>Attendance</span>
              <span style={{ fontSize: 12, fontWeight: 700,
                color: dashStats.attendancePct === null ? '#94A3B8' : dashStats.attendancePct >= 75 ? '#059669' : '#DC2626' }}>
                {dashStats.attendancePct === null ? '—' : `${dashStats.attendancePct}%`}
              </span>
              <ChevronRight size={12} color="#CBD5E1" />
            </Link>
            <Link href="/student/exams"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: '#F8FAFC', textDecoration: 'none' }}>
              <ClipboardList size={14} color="#2563EB" />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', flex: 1 }}>Upcoming Exams</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: dashStats.upcomingExams > 0 ? '#2563EB' : '#94A3B8' }}>
                {dashStats.upcomingExams}
              </span>
              <ChevronRight size={12} color="#CBD5E1" />
            </Link>
            <Link href="/student/library"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: '#F8FAFC', textDecoration: 'none' }}>
              <Library size={14} color="#D97706" />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', flex: 1 }}>Overdue Books</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: dashStats.overdueBooks > 0 ? '#DC2626' : '#94A3B8' }}>
                {dashStats.overdueBooks > 0 ? `${dashStats.overdueBooks} overdue` : 'None'}
              </span>
              <ChevronRight size={12} color="#CBD5E1" />
            </Link>
            <Link href="/student/fees"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: '#F8FAFC', textDecoration: 'none' }}>
              <CreditCard size={14} color="#DC2626" />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', flex: 1 }}>Fee Balance</span>
              <span style={{ fontSize: 12, fontWeight: 700,
                color: feeData.paidAmount >= feeData.totalFee && feeData.totalFee > 0 ? '#059669' : '#DC2626' }}>
                {feeData.totalFee > 0 ? `₹${Math.max(0, feeData.totalFee - feeData.paidAmount).toLocaleString('en-IN')}` : '—'}
              </span>
              <ChevronRight size={12} color="#CBD5E1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
