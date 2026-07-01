'use client'

import { useEffect, useState } from 'react'

/* ── Skeleton primitives ─────────────────────────────────── */
function Bone({ w = '100%', h = 16, r = 6, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      flexShrink: 0,
      ...style,
    }} />
  )
}

export const skeletonCSS = `
  @keyframes shimmer {
    0%   { background-position: 200% 0 }
    100% { background-position: -200% 0 }
  }
`

/* ── Reusable skeleton patterns ──────────────────────────── */

export function CardSkeleton({ count = 1 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Bone w={40} h={40} r={10} />
        <div style={{ flex: 1 }}>
          <Bone w="60%" h={14} r={4} style={{ marginBottom: 8 }} />
          <Bone w="40%" h={12} r={4} />
        </div>
      </div>
      <Bone h={28} r={6} style={{ marginBottom: 8 }} />
      <Bone w="70%" h={12} r={4} />
    </div>
  ))
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 16, padding: '14px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
        {Array.from({ length: cols }).map((_, i) => <Bone key={i} h={12} r={4} />)}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 16, padding: '14px 20px', borderBottom: r < rows - 1 ? '1px solid #F8FAFC' : 'none' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Bone key={c} w={c === 0 ? '80%' : c === cols - 1 ? '50%' : '70%'} h={14} r={4} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div style={{ background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < rows - 1 ? '1px solid #F8FAFC' : 'none' }}>
          <Bone w={36} h={36} r={10} />
          <div style={{ flex: 1 }}>
            <Bone w="55%" h={13} r={4} style={{ marginBottom: 8 }} />
            <Bone w="35%" h={11} r={4} />
          </div>
          <Bone w={64} h={26} r={8} />
        </div>
      ))}
    </div>
  )
}

/* ── Empty State ─────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', textAlign: 'center' }}>
      {Icon && (
        <div style={{ width: 52, height: 52, borderRadius: 14, background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Icon size={22} color="#94A3B8" />
        </div>
      )}
      <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>{title}</p>
      {body && <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px', lineHeight: 1.6, maxWidth: 300 }}>{body}</p>}
      {action}
    </div>
  )
}

/* ── Offline Banner ──────────────────────────────────────── */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const on  = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    setOffline(!navigator.onLine)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (!offline) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#EF4444', color: '#FFF', textAlign: 'center',
      padding: '8px 16px', fontSize: 13, fontWeight: 600,
    }}>
      You are offline. Data may be stale until connection is restored.
    </div>
  )
}

/* ── Inject shimmer CSS once ─────────────────────────────── */
export function SkeletonStyles() {
  return <style>{skeletonCSS}</style>
}
