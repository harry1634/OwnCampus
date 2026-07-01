'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const colorMap = {
  primary: { bg: '#EEF2FF', icon: '#4F46E5', accent: '#4F46E5' },
  accent:  { bg: '#ECFEFF', icon: '#0891B2', accent: '#06B6D4' },
  success: { bg: '#F0FDF4', icon: '#16A34A', accent: '#10B981' },
  warning: { bg: '#FFFBEB', icon: '#D97706', accent: '#F59E0B' },
  danger:  { bg: '#FEF2F2', icon: '#DC2626', accent: '#EF4444' },
  purple:  { bg: '#F5F3FF', icon: '#7C3AED', accent: '#8B5CF6' },
  pink:    { bg: '#FDF2F8', icon: '#DB2777', accent: '#EC4899' },
  orange:  { bg: '#FFF7ED', icon: '#EA580C', accent: '#F97316' },
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'primary',
  loading = false,
  index = 0,
}) {
  const c = colorMap[color] || colorMap.primary

  if (loading) {
    return (
      <div className="rounded-xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8ECF0' }}>
        <div className="shimmer h-8 w-32 rounded mb-3" />
        <div className="shimmer h-9 w-20 rounded mb-2" />
        <div className="shimmer h-3.5 w-24 rounded" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="rounded-xl p-5 cursor-default"
      style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {/* Icon */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mb-3"
        style={{ background: c.bg }}>
        <Icon size={16} style={{ color: c.icon }} />
      </div>

      {/* Title */}
      <p style={{ fontSize: 12.5, fontWeight: 500, color: '#475569', marginBottom: 6 }}>{title}</p>

      {/* Value */}
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 25, fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>{value}</p>

      {/* Trend + subtitle row */}
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {trend !== undefined && trend !== 0 && (
          <span className="flex items-center gap-0.5 text-xs font-semibold"
            style={{ color: trend >= 0 ? '#16A34A' : '#DC2626' }}>
            {trend > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
        {trend === 0 && (
          <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: '#94A3B8' }}>
            <Minus size={11} /> 0%
          </span>
        )}
        {subtitle && (
          <span className="text-xs" style={{ color: '#94A3B8' }}>{subtitle}</span>
        )}
      </div>
    </motion.div>
  )
}

