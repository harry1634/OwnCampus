'use client'

const metrics = [
  { label: 'Attendance',       value: '96.2%',  trend: '+2.1%',   trendUp: true,  live: false, color: '#2563EB', iconBg: '#EFF6FF', spark: [6,8,7,10,9,11,12,10,13,12] },
  { label: 'Fee Collected MTD',value: '₹84.2L', trend: '+26%',    trendUp: true,  live: false, color: '#10B981', iconBg: '#F0FDF4', spark: [5,7,6,8,7,9,10,9,11,13] },
  { label: 'Active Users',     value: '412',    trend: 'Live',    trendUp: null,  live: true,  color: '#0891B2', iconBg: '#ECFEFF', spark: [8,7,9,8,10,9,11,10,12,11] },
  { label: 'Admission Leads',  value: '58',     trend: '+9 today',trendUp: true,  live: false, color: '#7C3AED', iconBg: '#F5F3FF', spark: [4,6,5,7,6,8,7,9,8,10] },
  { label: 'Pending Approvals',value: '7',      trend: '−2',      trendUp: true,  live: false, color: '#F59E0B', iconBg: '#FFFBEB', spark: [3,4,3,5,4,6,5,4,6,5] },
]

function Sparkline({ data, color }) {
  const max = Math.max(...data)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24, flexShrink: 0 }}>
      {data.map((v, i) => (
        <div key={i} style={{
          width: 3,
          height: `${Math.max(3, (v / max) * 24)}px`,
          background: color,
          borderRadius: 2,
          opacity: 0.25 + (i / (data.length - 1)) * 0.75,
        }} />
      ))}
    </div>
  )
}

export default function PulseStrip() {
  return (
    <div style={{
      background: '#F8FAFC',
      borderBottom: '1px solid #E2E8F0',
      display: 'flex',
      alignItems: 'stretch',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }}>
      {metrics.map((m, i) => (
        <div
          key={m.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 24px',
            borderRight: i < metrics.length - 1 ? '1px solid #E2E8F0' : 'none',
            flexShrink: 0,
            cursor: 'default',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#FFFFFF'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Sparkline data={m.spark} color={m.color} />

          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3, whiteSpace: 'nowrap' }}>
              {m.label}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {m.value}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 10, fontWeight: 600,
                padding: '2px 6px', borderRadius: 99,
                background: m.live ? '#ECFEFF' : (m.trendUp ? '#F0FDF4' : '#FEF2F2'),
                color: m.live ? '#0891B2' : (m.trendUp ? '#16A34A' : '#DC2626'),
              }}>
                {m.live && (
                  <span style={{
                    width: 5, height: 5, borderRadius: 99, background: '#0891B2',
                    animation: 'pulse 2s infinite',
                    display: 'inline-block',
                  }} />
                )}
                {m.trend}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
