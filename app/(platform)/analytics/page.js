'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import {
  BarChart3, Download, Filter, TrendingUp, Users,
  CheckCircle, CreditCard, ArrowUpRight, FileText,
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'
import { downloadCSV, openPrintWindow } from '@/lib/exportUtils'

const tooltipStyle = {
  background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12,
  fontSize: 11, color: '#0F172A', boxShadow: '0 4px 16px rgba(15,23,42,0.10)',
}

const DATE_RANGES = ['Last 30 days', 'Last 3 months', 'Last 6 months', 'This year']
const RANGE_DAYS  = { 'Last 30 days': 30, 'Last 3 months': 90, 'Last 6 months': 180, 'This year': 365 }

function fmtRs(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)} L`
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

export default function AnalyticsPage() {
  const [students,   setStudents  ] = useState([])
  const [faculty,    setFaculty   ] = useState([])
  const [stats,      setStats     ] = useState(null)
  const [loading,    setLoading   ] = useState(true)
  const [showFilter, setShowFilter] = useState(false)
  const [dateRange,  setDateRange ] = useState('Last 6 months')

  useEffect(() => {
    setLoading(true)
    const days = RANGE_DAYS[dateRange] || 180
    fetch(`/api/analytics?days=${days}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setStats(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dateRange])

  useEffect(() => {
    fetch('/api/students').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setStudents(d) }).catch(() => {})
    fetch('/api/faculty').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setFaculty(d) }).catch(() => {})
  }, [])

  const kpi = stats?.kpis || {}
  const kpiData = [
    {
      label:  'Fee Collected',
      value:  loading ? '—' : fmtRs(kpi.feeCollected || 0),
      badge:  loading ? '—' : `${kpi.feeCollection || 0}%`,
      sub:    'of total fees billed',
      pct:    kpi.feeCollection || 0,
      icon: CreditCard, iconColor: '#10B981', iconBg: '#F0FDF4',
    },
    {
      label:  'Total Students',
      value:  loading ? '—' : (kpi.students || 0).toLocaleString('en-IN'),
      badge:  'Active',
      sub:    `${kpi.faculty || 0} faculty members`,
      pct:    null,
      icon: Users, iconColor: '#2563EB', iconBg: '#EFF6FF',
    },
    {
      label:  'Avg Attendance',
      value:  loading ? '—' : `${kpi.attendance || 0}%`,
      badge:  '30-day',
      sub:    'student attendance rate',
      pct:    kpi.attendance || 0,
      icon: CheckCircle, iconColor: '#0891B2', iconBg: '#ECFEFF',
    },
    {
      label:  'Fee Outstanding',
      value:  loading ? '—' : fmtRs(kpi.feeOutstanding || 0),
      badge:  `${kpi.feePending || 0} due`,
      sub:    `${kpi.feePartial || 0} partial payments`,
      pct:    null,
      icon: TrendingUp, iconColor: '#7C3AED', iconBg: '#F5F3FF',
    },
  ]

  const attTrend            = stats?.charts?.attendanceTrend    || []
  const feeTrend            = stats?.charts?.feeCollectionTrend || []
  const radarData           = stats?.charts?.subjectPerformance || []
  const admissionSourceData = stats?.charts?.admissionSources   || []

  const attendanceTrend = feeTrend.map((m, i) => ({
    month:    m.month,
    students: attTrend[i]?.value ?? 0,
  }))

  const feeCollectionChart = feeTrend.map(m => ({
    month:     m.month,
    collected: m.collected,
  }))

  const REPORT_HANDLERS = {
    'Attendance Report': () => {
      const headers = ['Name', 'Roll No', 'Class', 'Attendance %', 'Status']
      const rows = students.map(s => [s.name, s.roll, s.class, `${s.attendance}%`, s.attendance >= 75 ? 'Regular' : 'Low Attendance'])
      downloadCSV('attendance-report.csv', headers, rows)
    },
    'Fee Collection Report': () => {
      const headers = ['Name', 'Roll No', 'Class', 'Fee Status', 'Parent', 'Phone']
      const rows = students.map(s => [s.name, s.roll, s.class, s.fees, s.parent, s.phone])
      downloadCSV('fee-collection-report.csv', headers, rows)
    },
    'Exam Results': () => {
      const headers = ['Subject', 'Avg Score (%)']
      const rows = radarData.map(r => [r.subject, r.A])
      downloadCSV('exam-results.csv', headers, rows)
    },
    'Admission Summary': () => {
      const total = admissionSourceData.reduce((a, b) => a + b.count, 0)
      const headers = ['Source', 'Leads', 'Share (%)']
      const rows = admissionSourceData.map(s => [s.source, s.count, total > 0 ? `${Math.round((s.count / total) * 100)}%` : '0%'])
      downloadCSV('admission-summary.csv', headers, rows)
    },
    'Faculty Performance': () => {
      const headers = ['Name', 'Department', 'Designation', 'Subjects', 'Attendance %', 'Rating']
      const rows = faculty.map(f => [f.name, f.dept, f.designation, Array.isArray(f.subjects) ? f.subjects.join('; ') : f.subjects, `${f.attendance}%`, f.rating])
      downloadCSV('faculty-performance.csv', headers, rows)
    },
    'Student Progress': () => {
      const headers = ['Name', 'Roll No', 'Class', 'Attendance %', 'Fee Status', 'Status']
      const rows = students.map(s => [s.name, s.roll, s.class, `${s.attendance}%`, s.fees, s.status])
      downloadCSV('student-progress.csv', headers, rows)
    },
  }

  const reports = [
    { name: 'Attendance Report',     desc: 'Monthly class-wise report',    color: '#2563EB', bg: '#EFF6FF' },
    { name: 'Fee Collection Report', desc: 'Pending & collected fees',      color: '#10B981', bg: '#F0FDF4' },
    { name: 'Exam Results',          desc: 'Subject performance analysis',  color: '#F59E0B', bg: '#FFFBEB' },
    { name: 'Admission Summary',     desc: 'Lead to enrollment funnel',     color: '#0891B2', bg: '#ECFEFF' },
    { name: 'Faculty Performance',   desc: 'Workload & rating report',      color: '#7C3AED', bg: '#F5F3FF' },
    { name: 'Student Progress',      desc: 'Academic progress report',      color: '#DB2777', bg: '#FDF2F8' },
  ]

  const admissionTotal = admissionSourceData.reduce((a, b) => a + b.count, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Analytics &amp; Reports</h1>
          <p className="page-header-sub">
            Institution-wide intelligence &amp; performance insights
            {!showFilter && <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 6, background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 700 }}>{dateRange}</span>}
          </p>
        </div>
        <div className="page-actions">
          <button
            onClick={() => setShowFilter(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              fontWeight: 600, padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
              border: showFilter ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
              background: showFilter ? '#EFF6FF' : '#FFFFFF',
              color: showFilter ? '#2563EB' : '#64748B',
              transition: 'all 0.15s',
            }}>
            <Filter size={14} /> Filter
          </button>
          <button
            onClick={() => {
              const reportDate = new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })
              const body = `
                <div style="max-width:700px;margin:0 auto;padding:40px 24px;font-family:Arial,sans-serif">
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;border-bottom:2.5px solid #2563EB;padding-bottom:16px">
                    <div>
                      <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 4px">Analytics Report</h1>
                      <p style="font-size:13px;color:#64748B;margin:0">${dateRange} &nbsp;·&nbsp; Generated ${reportDate}</p>
                    </div>
                    <div style="font-size:11px;color:#94A3B8;text-align:right;padding-top:4px">OwnCampus ERP</div>
                  </div>

                  <h2 style="font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px">Key Performance Indicators</h2>
                  <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
                    <thead>
                      <tr style="background:#F1F5F9">
                        <th style="padding:9px 12px;text-align:left;font-size:11px;color:#64748B;font-weight:600;border:1px solid #E2E8F0">Metric</th>
                        <th style="padding:9px 12px;text-align:right;font-size:11px;color:#64748B;font-weight:600;border:1px solid #E2E8F0">Value</th>
                        <th style="padding:9px 12px;text-align:left;font-size:11px;color:#64748B;font-weight:600;border:1px solid #E2E8F0">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td style="padding:9px 12px;font-size:13px;color:#374151;border:1px solid #E2E8F0">Fee Collected</td><td style="padding:9px 12px;font-size:13px;font-weight:700;color:#0F172A;text-align:right;border:1px solid #E2E8F0">${fmtRs(kpi.feeCollected||0)}</td><td style="padding:9px 12px;font-size:12px;color:#64748B;border:1px solid #E2E8F0">${kpi.feeCollection||0}% of total fees billed</td></tr>
                      <tr style="background:#F8FAFC"><td style="padding:9px 12px;font-size:13px;color:#374151;border:1px solid #E2E8F0">Fee Outstanding</td><td style="padding:9px 12px;font-size:13px;font-weight:700;color:#DC2626;text-align:right;border:1px solid #E2E8F0">${fmtRs(kpi.feeOutstanding||0)}</td><td style="padding:9px 12px;font-size:12px;color:#64748B;border:1px solid #E2E8F0">${kpi.feePending||0} pending, ${kpi.feePartial||0} partial</td></tr>
                      <tr><td style="padding:9px 12px;font-size:13px;color:#374151;border:1px solid #E2E8F0">Total Students</td><td style="padding:9px 12px;font-size:13px;font-weight:700;color:#0F172A;text-align:right;border:1px solid #E2E8F0">${(kpi.students||0).toLocaleString('en-IN')}</td><td style="padding:9px 12px;font-size:12px;color:#64748B;border:1px solid #E2E8F0">${kpi.faculty||0} faculty members</td></tr>
                      <tr style="background:#F8FAFC"><td style="padding:9px 12px;font-size:13px;color:#374151;border:1px solid #E2E8F0">Avg Attendance</td><td style="padding:9px 12px;font-size:13px;font-weight:700;color:#0F172A;text-align:right;border:1px solid #E2E8F0">${kpi.attendance||0}%</td><td style="padding:9px 12px;font-size:12px;color:#64748B;border:1px solid #E2E8F0">Student attendance rate</td></tr>
                      <tr><td style="padding:9px 12px;font-size:13px;color:#374151;border:1px solid #E2E8F0">Pass Rate</td><td style="padding:9px 12px;font-size:13px;font-weight:700;color:#0F172A;text-align:right;border:1px solid #E2E8F0">${kpi.passRate!=null?kpi.passRate+'%':'—'}</td><td style="padding:9px 12px;font-size:12px;color:#64748B;border:1px solid #E2E8F0">Based on exam marks</td></tr>
                      <tr style="background:#F8FAFC"><td style="padding:9px 12px;font-size:13px;color:#374151;border:1px solid #E2E8F0">Exams Scheduled</td><td style="padding:9px 12px;font-size:13px;font-weight:700;color:#0F172A;text-align:right;border:1px solid #E2E8F0">${kpi.examsUpcoming||0} upcoming</td><td style="padding:9px 12px;font-size:12px;color:#64748B;border:1px solid #E2E8F0">${kpi.examsCompleted||0} completed, ${kpi.examsPublished||0} published</td></tr>
                      <tr><td style="padding:9px 12px;font-size:13px;color:#374151;border:1px solid #E2E8F0">Leaves This Month</td><td style="padding:9px 12px;font-size:13px;font-weight:700;color:#0F172A;text-align:right;border:1px solid #E2E8F0">${kpi.leavesPending||0} pending</td><td style="padding:9px 12px;font-size:12px;color:#64748B;border:1px solid #E2E8F0">${kpi.leavesApproved||0} approved</td></tr>
                    </tbody>
                  </table>

                  <p style="font-size:11px;color:#94A3B8;text-align:center;margin-top:32px;border-top:1px solid #E2E8F0;padding-top:14px">
                    Generated by OwnCampus &nbsp;·&nbsp; ${reportDate}
                  </p>
                </div>
              `
              openPrintWindow('Analytics Report — OwnCampus', body)
            }}
            className="btn-secondary">
            <Download size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', flexShrink: 0 }}>Date Range</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DATE_RANGES.map(r => (
                  <button key={r} onClick={() => setDateRange(r)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                      border: dateRange === r ? '1.5px solid #2563EB' : '1.5px solid #E2E8F0',
                      background: dateRange === r ? '#EFF6FF' : '#FFFFFF',
                      color: dateRange === r ? '#2563EB' : '#64748B',
                    }}>
                    {r}
                  </button>
                ))}
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8' }}>
                Showing data for: <strong style={{ color: '#0F172A' }}>{dateRange}</strong>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
        {kpiData.map((card, i) => {
          const KpiIcon = card.icon
          return (
            <motion.div key={card.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, ease: 'easeOut' }}
              whileHover={{ y: -4, boxShadow: `0 16px 40px ${card.iconColor}14` }}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E8EDF5',
                borderRadius: 16,
                padding: '20px',
                boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
                display: 'flex', flexDirection: 'column', gap: 14,
                position: 'relative',
              }}>

              {/* Left accent stripe */}
              <div style={{
                position: 'absolute', top: 16, left: 0, width: 3, height: 32, borderRadius: '0 4px 4px 0',
                background: card.iconColor,
              }} />

              {/* Row 1: Icon left, badge right — both safe with nowrap badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                  background: card.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <KpiIcon size={18} style={{ color: card.iconColor }} />
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: card.iconColor,
                  background: card.iconBg, padding: '3px 9px', borderRadius: 99,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {card.badge}
                </span>
              </div>

              {/* Row 2: Value + label + sub stacked */}
              <div>
                <p style={{
                  fontSize: 28, fontWeight: 800, color: '#0F172A',
                  letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 3,
                }}>
                  {card.value}
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 2 }}>
                  {card.label}
                </p>
                <p style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.4 }}>
                  {card.sub}
                </p>
              </div>

              {/* Row 3: Progress bar — only for % metrics */}
              {card.pct != null && (
                <div style={{ height: 4, borderRadius: 99, background: `${card.iconColor}15` }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(card.pct, 100)}%` }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.9, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 99, background: card.iconColor }}
                  />
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Section divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>Trends</span>
        <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
      </div>

      {/* Charts Row 1: Fee Collection + Attendance — equal halves */}
      <div className="rg-2">

        {/* Fee Collection Trend */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ background: '#FFFFFF', border: '1px solid #E8EDF5', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Fee Collection Trend</h3>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>In Thousands (₹)</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>{dateRange}</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={feeCollectionChart} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}K`} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F8FAFC' }} formatter={v => [`₹${v}K`, 'Collected']} />
              <Bar dataKey="collected" name="Collected" fill="#2563EB" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Attendance Trend */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          style={{ background: '#FFFFFF', border: '1px solid #E8EDF5', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Attendance Trend</h3>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>Student attendance (%)</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0891B2', background: '#ECFEFF', padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>{dateRange}</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={attendanceTrend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 100]} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: '#64748B', paddingTop: 12 }} />
              <Line type="monotone" dataKey="students" name="Students" stroke="#2563EB" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#2563EB' }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Section divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>Insights</span>
        <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
      </div>

      {/* Charts Row 2: Admission Sources + Academic Radar — equal halves */}
      <div className="rg-2">

        {/* Admission Sources */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          style={{ background: '#FFFFFF', border: '1px solid #E8EDF5', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Admission Sources</h3>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>Lead source breakdown</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>{admissionTotal} total</span>
          </div>
          {admissionSourceData.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={20} color="#CBD5E1" />
              </div>
              <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>No admission data yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {admissionSourceData.map(src => {
                const pct = admissionTotal > 0 ? Math.round((src.count / admissionTotal) * 100) : 0
                return (
                  <div key={src.source}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 99, background: src.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{src.source}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{src.count}</span>
                        <span style={{ fontSize: 11, color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>({pct}%)</span>
                      </div>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 99, background: src.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Academic Performance Radar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          style={{ background: '#FFFFFF', border: '1px solid #E8EDF5', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Academic Performance</h3>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Subject-wise average score</p>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: '#EFF6FF', border: '1px solid #BFDBFE', flexShrink: 0 }}>
              <CheckCircle size={12} style={{ color: '#2563EB' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#2563EB', fontVariantNumeric: 'tabular-nums' }}>
                {stats?.kpis?.passRate != null ? `${stats.kpis.passRate}%` : '—'}
              </span>
              <span style={{ fontSize: 11, color: '#64748B' }}>Pass Rate</span>
            </div>
          </div>

          {/* Radar chart */}
          <ResponsiveContainer width="100%" height={230}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="68%">
              <PolarGrid stroke="#E2E8F0" strokeDasharray="4 2" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 500 }} />
              <Radar
                name="Avg Score"
                dataKey="A"
                stroke="#2563EB"
                fill="#2563EB"
                fillOpacity={0.18}
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#2563EB', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, name) => [`${v}%`, name]}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* Subject score bars */}
          {radarData.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {radarData.map(subject => (
                <div key={subject.subject} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B', width: 68, flexShrink: 0, textAlign: 'right' }}>{subject.subject}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${subject.A || 0}%` }}
                      transition={{ delay: 0.5, duration: 0.7, ease: 'easeOut' }}
                      style={{
                        height: '100%', borderRadius: 99,
                        background: subject.A >= 75
                          ? '#16A34A'
                          : subject.A >= 50
                          ? '#F59E0B'
                          : '#DC2626',
                      }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', width: 32, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {subject.A ?? '—'}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Section divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>Downloads</span>
        <div style={{ flex: 1, height: 1, background: '#F1F5F9' }} />
      </div>

      {/* Quick Reports — full-width grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
        style={{ background: '#FFFFFF', border: '1px solid #E8EDF5', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Quick Reports</h3>
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>Download ready-made reports as CSV</p>
          </div>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>{reports.length} reports</span>
        </div>
        {/* auto-fill so it never overflows at any viewport width */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {reports.map((report, i) => (
            <motion.button key={report.name}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 + i * 0.05 }}
              whileHover={{ y: -2, boxShadow: `0 8px 24px ${report.color}22` }}
              whileTap={{ scale: 0.98 }}
              onClick={() => REPORT_HANDLERS[report.name]?.()}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, minWidth: 0,
                padding: '14px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                border: `1.5px solid ${report.color}30`,
                background: report.bg,
                transition: 'all 0.15s',
              }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFFFFF', border: `1.5px solid ${report.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 8px ${report.color}18` }}>
                <FileText size={16} style={{ color: report.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.name}</p>
                <p style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>{report.desc}</p>
              </div>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${report.color}18`, border: `1.5px solid ${report.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Download size={12} strokeWidth={2.5} style={{ color: report.color }} />
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

    </div>
  )
}
