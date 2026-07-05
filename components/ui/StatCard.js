'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

/**
 * StatCard — Universal KPI stat card for the DS sprint.
 *
 * Props:
 *  icon       — lucide icon component
 *  label      — metric name
 *  value      — display value (string/number)
 *  sub        — sub-label below metric name
 *  trend      — badge text (e.g. '91%', 'Active', '+12')
 *  trendDown  — true → red arrow instead of green
 *  color      — accent colour (#2563EB)
 *  bg         — icon background (#EFF6FF)
 *  pct        — 0-100, shows an animated progress bar when provided
 *  index      — stagger delay index
 *  loading    — show shimmer when true
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  trendDown = false,
  color  = '#2563EB',
  bg     = '#EFF6FF',
  pct    = null,
  index  = 0,
  loading = false,
}) {
  const TrendIcon = trendDown ? ArrowDownRight : ArrowUpRight
  const trendColor = trendDown ? '#DC2626' : color
  const trendBg    = trendDown ? '#FEF2F2' : bg

  if (loading) {
    return (
      <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden' }}>
        <div className="shimmer" style={{ width: 42, height: 42, borderRadius: 12 }} />
        <div className="shimmer" style={{ height: 28, width: '60%', borderRadius: 6, marginTop: 4 }} />
        <div className="shimmer" style={{ height: 14, width: '80%', borderRadius: 6 }} />
        <div className="shimmer" style={{ height: 12, width: '55%', borderRadius: 6 }} />
      </div>
    )
  }

  return (
    <motion.div
      className="kpi-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, ease: 'easeOut' }}
      whileHover={{ y: -4, boxShadow: `0 16px 40px ${color}18` }}
      style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: color,
        borderRadius: '16px 16px 0 0',
      }} />

      {/* Decorative background circle */}
      <div style={{
        position: 'absolute', bottom: -28, right: -28, width: 88, height: 88,
        borderRadius: '50%', background: `${color}07`, pointerEvents: 'none',
      }} />

      {/* Row 1: icon + trend badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, background: bg,
          border: `1.5px solid ${color}25`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
          boxShadow: `0 3px 10px ${color}18`,
        }}>
          {Icon && <Icon size={19} style={{ color }} />}
        </div>

        {trend != null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
            padding: '4px 9px', borderRadius: 99,
            background: trendBg, border: `1px solid ${trendColor}30`,
          }}>
            <TrendIcon size={10} style={{ color: trendColor }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: trendColor, whiteSpace: 'nowrap' }}>
              {trend}
            </span>
          </div>
        )}
      </div>

      {/* Row 2: value */}
      <p style={{
        fontSize: 26, fontWeight: 800, color: '#0F172A',
        letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 4,
      }}>
        {value ?? '—'}
      </p>

      {/* Row 3: label */}
      <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 2 }}>{label}</p>

      {/* Row 4: sub */}
      {sub && (
        <p style={{
          fontSize: 11, color: '#94A3B8',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: pct != null ? 12 : 0,
        }}>
          {sub}
        </p>
      )}

      {/* Row 5: optional progress bar */}
      {pct != null && (
        <div style={{ height: 5, borderRadius: 99, background: `${color}15`, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
            transition={{ delay: 0.4 + index * 0.08, duration: 0.9, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 99, background: color }}
          />
        </div>
      )}
    </motion.div>
  )
}
