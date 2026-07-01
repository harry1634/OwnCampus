'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'New Leads', value: 342, color: '#4F46E5', bg: '#EEF2FF' },
  { name: 'Contacted', value: 280, color: '#7C3AED', bg: '#F5F3FF' },
  { name: 'Interested', value: 198, color: '#0891B2', bg: '#ECFEFF' },
  { name: 'Applied', value: 124, color: '#10B981', bg: '#F0FDF4' },
  { name: 'Enrolled', value: 89, color: '#D97706', bg: '#FFFBEB' },
]

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="p-3 rounded-xl text-xs" style={{
      background: '#FFFFFF',
      border: '1px solid #E8ECF0',
      boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
    }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.payload.color }} />
        <p className="font-semibold" style={{ color: '#0F172A' }}>{d.name}</p>
      </div>
      <p style={{ color: '#64748B' }}>Count: <span className="font-bold" style={{ color: '#0F172A' }}>{d.value}</span></p>
    </div>
  )
}

export default function AdmissionFunnel() {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className="mb-4">
        <h3 className="font-semibold text-sm" style={{ color: '#0F172A' }}>Admission Funnel</h3>
        <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Current academic year pipeline</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5">
        <ResponsiveContainer width={150} height={150}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={46}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex-1 w-full space-y-2.5">
          {data.map((item) => {
            const pct = Math.round((item.value / data[0].value) * 100)
            return (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span className="text-xs font-medium" style={{ color: '#475569' }}>{item.name}</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: '#0F172A' }}>{item.value}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: item.color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
