'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange, label = 'items' }) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, totalItems)

  // Build visible page numbers with ellipsis
  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) pages.push(i)
  }
  const withGaps = []
  let prev = null
  for (const p of pages) {
    if (prev !== null && p - prev > 1) withGaps.push('…')
    withGaps.push(p)
    prev = p
  }

  const btnBase = {
    width: 34, height: 34, borderRadius: 9,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    transition: 'all 0.14s', border: '1px solid #E2E8F0',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 24px', borderTop: '1px solid #F1F5F9',
      background: '#FAFBFC',
    }}>
      <p style={{ fontSize: 12, color: '#94A3B8' }}>
        Showing{' '}
        <span style={{ fontWeight: 700, color: '#0F172A' }}>{from}–{to}</span>
        {' '}of{' '}
        <span style={{ fontWeight: 700, color: '#0F172A' }}>{totalItems}</span>
        {' '}{label}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          style={{ ...btnBase, background: '#FFFFFF', color: page === 1 ? '#CBD5E1' : '#64748B', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          onMouseEnter={e => { if (page > 1) e.currentTarget.style.background = '#F8FAFC' }}
          onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page numbers */}
        {withGaps.map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} style={{ width: 34, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                ...btnBase,
                border:      p === page ? '1px solid #2563EB' : '1px solid #E2E8F0',
                background:  p === page ? '#2563EB' : '#FFFFFF',
                color:       p === page ? '#FFFFFF' : '#64748B',
                fontWeight:  p === page ? 700 : 500,
              }}
              onMouseEnter={e => { if (p !== page) e.currentTarget.style.background = '#F8FAFC' }}
              onMouseLeave={e => { if (p !== page) e.currentTarget.style.background = '#FFFFFF' }}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          style={{ ...btnBase, background: '#FFFFFF', color: page === totalPages ? '#CBD5E1' : '#64748B', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
          onMouseEnter={e => { if (page < totalPages) e.currentTarget.style.background = '#F8FAFC' }}
          onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
