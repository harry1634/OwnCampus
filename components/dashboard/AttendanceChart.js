'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

const data = [
  { class: '6th', percentage: 92 },
  { class: '7th', percentage: 88 },
  { class: '8th', percentage: 85 },
  { class: '9th', percentage: 79 },
  { class: '10th', percentage: 94 },
  { class: '11th', percentage: 82 },
  { class: '12th', percentage: 87 },
]

const getColor = (value) => {
  if (value >= 90) return '#10B981'
  if (value >= 80) return '#4F46E5'
  if (value >= 75) return '#F59E0B'
  return '#EF4444'
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const color = getColor(payload[0].value)
  return (
    <div className="p-3 rounded-xl text-xs" style={{
      background: '#FFFFFF',
      border: '1px solid #E8ECF0',
      boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
    }}>
      <p className="font-semibold mb-1" style={{ color: '#0F172A' }}>Class {label}</p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span style={{ color: '#64748B' }}>Attendance:</span>
        <span className="font-bold" style={{ color }}>{payload[0].value}%</span>
      </div>
    </div>
  )
}

const legend = [
  { color: '#10B981', label: '≥90% Excellent' },
  { color: '#4F46E5', label: '≥80% Good' },
  { color: '#F59E0B', label: '≥75% Average' },
  { color: '#EF4444', label: '<75% Low' },
]

export default function AttendanceChart() {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-semibold text-sm" style={{ color: '#0F172A' }}>Attendance by Class</h3>
          <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Today's overview</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {legend.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-xs" style={{ color: '#94A3B8', fontSize: '11px' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis
            dataKey="class"
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[60, 100]}
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC', radius: 6 }} />
          <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={38}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getColor(entry.percentage)} opacity={0.9} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
