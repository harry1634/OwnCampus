'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { BarChart3, Download, Filter, TrendingUp, Users, CheckCircle, CreditCard, ArrowUpRight } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts'
import { downloadCSV } from '@/lib/exportUtils'

const tooltipStyle = { background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 11, color: '#0F172A', boxShadow: '0 4px 16px rgba(15,23,42,0.10)' }

function fmtRs(n) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)} L`
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

export default function AnalyticsPage() {
  const [students, setStudents] = useState([])
  const [faculty,  setFaculty ] = useState([])
  const [stats,    setStats   ] = useState(null)
  const [loading,  setLoading ] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setStats(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
    fetch('/api/students').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setStudents(d) }).catch(() => {})
    fetch('/api/faculty').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setFaculty(d) }).catch(() => {})
  }, [])

  const kpi = stats?.kpis || {}
  const kpiData = [
    {
      label: 'Fee Collected',
      value: loading ? '—' : fmtRs(kpi.feeCollected || 0),
      change: loading ? '' : `${kpi.feeCollection || 0}%`,
      sub:    'of total fees',
      icon: CreditCard, iconColor: '#10B981', iconBg: '#F0FDF4',
    },
    {
      label: 'Total Students',
      value: loading ? '—' : (kpi.students || 0).toLocaleString('en-IN'),
      change: 'Active',
      sub:   `${kpi.faculty || 0} faculty`,
      icon: Users, iconColor: '#2563EB', iconBg: '#EFF6FF',
    },
    {
      label: 'Avg Attendance',
      value: loading ? '—' : `${kpi.attendance || 0}%`,
      change: 'Last 30 days',
      sub:   'student attendance',
      icon: CheckCircle, iconColor: '#0891B2', iconBg: '#ECFEFF',
    },
    {
      label: 'Fee Outstanding',
      value: loading ? '—' : fmtRs(kpi.feeOutstanding || 0),
      change: `${kpi.feePending || 0} pending`,
      sub:   `${kpi.feePartial || 0} partial`,
      icon: TrendingUp, iconColor: '#7C3AED', iconBg: '#F5F3FF',
    },
  ]

  // Real chart data from analytics API
  const attTrend         = stats?.charts?.attendanceTrend    || []
  const feeTrend         = stats?.charts?.feeCollectionTrend || []
  const feeStatus        = stats?.charts?.feeStatus          || []
  const radarData        = stats?.charts?.subjectPerformance || []
  const admissionSourceData = stats?.charts?.admissionSources || []

  // Attendance trend: single-line (student only) — no per-month faculty attendance data
  const attendanceTrend = feeTrend.map((m, i) => ({
    month:    m.month,
    students: attTrend[i]?.value ?? 0,
  }))

  // Fee collection chart (₹ in thousands per month, from API)
  const feeCollectionChart = feeTrend.map(m => ({
    month:     m.month,
    collected: m.collected,
  }))

  const REPORT_HANDLERS = {
    'Attendance Report': () => {
      const headers = ['Name', 'Roll No', 'Class', 'Attendance %', 'Status']
      const rows = students.map(s => [
        s.name, s.roll, s.class,
        `${s.attendance}%`,
        s.attendance >= 75 ? 'Regular' : 'Low Attendance',
      ])
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
      const rows = admissionSourceData.map(s => [
        s.source, s.count, total > 0 ? `${Math.round((s.count / total) * 100)}%` : '0%',
      ])
      downloadCSV('admission-summary.csv', headers, rows)
    },
    'Faculty Performance': () => {
      const headers = ['Name', 'Department', 'Designation', 'Subjects', 'Attendance %', 'Rating']
      const rows = faculty.map(f => [
        f.name, f.dept, f.designation,
        Array.isArray(f.subjects) ? f.subjects.join('; ') : f.subjects,
        `${f.attendance}%`, f.rating,
      ])
      downloadCSV('faculty-performance.csv', headers, rows)
    },
    'Student Progress': () => {
      const headers = ['Name', 'Roll No', 'Class', 'Attendance %', 'Fee Status', 'Status']
      const rows = students.map(s => [s.name, s.roll, s.class, `${s.attendance}%`, s.fees, s.status])
      downloadCSV('student-progress.csv', headers, rows)
    },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Analytics &amp; Reports</h1>
          <p className="page-header-sub">Institution-wide intelligence &amp; performance insights</p>
        </div>
        <div className="page-actions">
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, padding: '8px 14px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#64748B', cursor: 'pointer' }}>
            <Filter size={14} /> Filter
          </button>
          <button className="btn-secondary">
            <Download size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* KPI Cards — 4 wide cards */}
      <div className="rg-4">
        {kpiData.map((kpi, i) => {
          const KpiIcon = kpi.icon
          return (
            <motion.div key={kpi.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              whileHover={{ translateY: -3, boxShadow: '0 12px 32px rgba(15,23,42,0.10)' }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '24px', boxShadow: '0 2px 6px rgba(15,23,42,0.05)', display: 'flex', flexDirection: 'column' }}>

              {/* Top: icon + change badge */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: kpi.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KpiIcon size={20} style={{ color: kpi.iconColor }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <ArrowUpRight size={11} style={{ color: '#10B981' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>{kpi.change}</span>
                </div>
              </div>

              {/* Value */}
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 34, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 8 }}>{kpi.value}</p>

              {/* Label + sub */}
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 3 }}>{kpi.label}</p>
              <p style={{ fontSize: 12, color: '#94A3B8' }}>{kpi.sub}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Charts Row 1: Revenue + Attendance */}
      <div className="rg-32">

        {/* Fee Collection Trend */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '24px', boxShadow: '0 2px 6px rgba(15,23,42,0.05)' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Fee Collection Trend</h3>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>In Thousands (₹) · Last 6 months</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={feeCollectionChart} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}K`} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F8FAFC' }} formatter={v => [`₹${v}K`, 'Collected']} />
              <Bar dataKey="collected" name="Collected" fill="#2563EB" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance Trend */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '24px', boxShadow: '0 2px 6px rgba(15,23,42,0.05)' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Attendance Trend</h3>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Student attendance (%) · Last 6 months</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={attendanceTrend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[60, 100]} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: '#64748B', paddingTop: 12 }} />
              <Line type="monotone" dataKey="students" name="Students" stroke="#2563EB" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#2563EB' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Sources + Radar + Reports */}
      <div className="rg-3">

        {/* Admission Sources */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '24px', boxShadow: '0 2px 6px rgba(15,23,42,0.05)' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Admission Sources</h3>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Lead source breakdown</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {admissionSourceData.map(src => {
              const total = admissionSourceData.reduce((a, b) => a + b.count, 0)
              const pct = Math.round((src.count / total) * 100)
              return (
                <div key={src.source}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 99, background: src.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{src.source}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{src.count}</span>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>({pct}%)</span>
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.4, duration: 0.8 }}
                      style={{ height: '100%', borderRadius: 99, background: src.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Academic Performance Radar */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '24px', boxShadow: '0 2px 6px rgba(15,23,42,0.05)' }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Academic Performance</h3>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Subject-wise average score</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 10 }} />
              <Radar name="Score" dataKey="A" stroke="#2563EB" fill="#2563EB" fillOpacity={0.10} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          {/* Pass rate badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <CheckCircle size={14} style={{ color: '#2563EB' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>
                {stats?.kpis?.passRate != null ? `${stats.kpis.passRate}%` : '—'}
              </span>
              <span style={{ fontSize: 12, color: '#64748B' }}>Overall Pass Rate</span>
            </div>
          </div>
        </div>

        {/* Quick Reports */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '24px', boxShadow: '0 2px 6px rgba(15,23,42,0.05)' }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Quick Reports</h3>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Download ready-made reports</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { name: 'Attendance Report',     desc: 'Monthly class-wise report',    color: '#2563EB' },
              { name: 'Fee Collection Report', desc: 'Pending & collected fees',      color: '#10B981' },
              { name: 'Exam Results',          desc: 'Subject performance analysis',  color: '#F59E0B' },
              { name: 'Admission Summary',     desc: 'Lead to enrollment funnel',     color: '#0891B2' },
              { name: 'Faculty Performance',   desc: 'Workload & rating report',      color: '#7C3AED' },
              { name: 'Student Progress',      desc: 'Academic progress report',      color: '#DB2777' },
            ].map((report, i) => (
              <motion.button key={report.name}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                whileHover={{ background: '#F8FAFC', scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => REPORT_HANDLERS[report.name]?.()}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, border: '1px solid #F1F5F9', background: '#FFFFFF', textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${report.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BarChart3 size={15} style={{ color: report.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>{report.name}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8' }}>{report.desc}</p>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${report.color}15`, border: `1px solid ${report.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Download size={13} strokeWidth={2.5} style={{ color: report.color }} />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
