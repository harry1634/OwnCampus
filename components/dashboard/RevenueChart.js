'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'

const data = [
  { month: 'Jan', revenue: 4200000, target: 5000000 },
  { month: 'Feb', revenue: 3800000, target: 5000000 },
  { month: 'Mar', revenue: 5100000, target: 5000000 },
  { month: 'Apr', revenue: 4700000, target: 5000000 },
  { month: 'May', revenue: 5800000, target: 5500000 },
  { month: 'Jun', revenue: 6200000, target: 5500000 },
  { month: 'Jul', revenue: 5900000, target: 5500000 },
  { month: 'Aug', revenue: 6800000, target: 6000000 },
  { month: 'Sep', revenue: 7200000, target: 6000000 },
  { month: 'Oct', revenue: 6500000, target: 6000000 },
  { month: 'Nov', revenue: 7800000, target: 6500000 },
  { month: 'Dec', revenue: 8200000, target: 6500000 },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="p-3 rounded-xl text-xs" style={{
      background: '#FFFFFF',
      border: '1px solid #E8ECF0',
      boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
    }}>
      <p className="font-semibold mb-2" style={{ color: '#0F172A' }}>{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span style={{ color: '#64748B' }}>{entry.name}:</span>
          <span className="font-semibold" style={{ color: '#0F172A' }}>
            Rs.{(entry.value / 100000).toFixed(1)}L
          </span>
        </div>
      ))}
    </div>
  )
}

export default function RevenueChart() {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-sm" style={{ color: '#0F172A' }}>Revenue Overview</h3>
          <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Monthly collection vs target</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ background: '#4F46E5' }} />
            <span className="text-xs" style={{ color: '#94A3B8' }}>Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded border-t-2 border-dashed" style={{ borderColor: '#06B6D4' }} />
            <span className="text-xs" style={{ color: '#94A3B8' }}>Target</span>
          </div>
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-lg"
            style={{ background: '#EEF2FF', color: '#4F46E5' }}
          >
            2024-25
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.08} />
              <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#94A3B8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `Rs.${(v / 100000).toFixed(0)}L`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#4F46E5"
            strokeWidth={2}
            fill="url(#colorRevenue)"
            dot={false}
            activeDot={{ r: 4, fill: '#4F46E5', strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="target"
            name="Target"
            stroke="#06B6D4"
            strokeWidth={1.5}
            fill="url(#colorTarget)"
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 3, fill: '#06B6D4', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
