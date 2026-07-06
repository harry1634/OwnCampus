'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Clock, AlertTriangle, CheckCircle, Library } from 'lucide-react'
import { useCurrentUser } from '@/lib/useCurrentUser'

const STATUS_CONF = {
  overdue:   { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Overdue',  icon: AlertTriangle },
  'due-soon':{ color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Due Soon', icon: Clock         },
  active:    { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'Active',   icon: BookOpen      },
  returned:  { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Returned', icon: CheckCircle   },
}

function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

function bookStatus(dueDate, returned) {
  if (returned) return 'returned'
  const d = daysUntil(dueDate)
  if (d < 0)  return 'overdue'
  if (d <= 3) return 'due-soon'
  return 'active'
}

const ICON_COLORS = ['#DC2626','#2563EB','#059669','#D97706']
const ICON_BG     = ['#FEF2F2','#EFF6FF','#ECFDF5','#FFFBEB']
const ICON_BORDER = ['#FECACA','#BFDBFE','#A7F3D0','#FDE68A']

function Spinner() {
  return (
    <div style={{ padding: '48px', textAlign: 'center' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Loading library…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function StudentLibrary() {
  const cu = useCurrentUser()
  const [loading, setLoading] = useState(true)
  const [issues,  setIssues ] = useState([])

  const fetchIssues = () => {
    setLoading(true)
    fetch('/api/library?type=issued&my=true')
      .then(r => r.json())
      .then(data => setIssues(Array.isArray(data.issues) ? data.issues : []))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!cu.mounted) return
    fetchIssues()

    const onVisible = () => { if (document.visibilityState === 'visible') fetchIssues() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [cu.mounted])

  if (!cu.mounted) return null

  const active       = issues.filter(b => !b.returnedDate)
  const history      = issues.filter(b => b.returnedDate)
  const overdueCount = active.filter(b => daysUntil(b.dueDate) < 0).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Library</h1>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Issued books and borrowing history</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
        {[
          { label: 'Currently Issued', value: active.length,  color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Overdue Books',    value: overdueCount,   color: '#DC2626', bg: '#FEF2F2' },
          { label: 'Books Returned',   value: history.length, color: '#059669', bg: '#ECFDF5' },
          { label: 'Max Allowed',      value: 4,              color: '#7C3AED', bg: '#F5F3FF' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-0.02em', margin: '0 0 4px' }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {overdueCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <AlertTriangle size={14} color="#DC2626" />
          <p style={{ fontSize: 13, color: '#991B1B', margin: 0, fontWeight: 500 }}>
            You have {overdueCount} overdue book{overdueCount > 1 ? 's' : ''}. Return immediately to avoid fine accumulation (₹2/day per book).
          </p>
        </div>
      )}

      {/* Currently issued */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={14} color="#2563EB" />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Currently Issued</h2>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', padding: '2px 8px', borderRadius: 99 }}>{active.length}</span>
        </div>

        {loading ? (
          <Spinner />
        ) : active.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center' }}>
            <Library size={28} color="#E2E8F0" style={{ marginBottom: 10 }} />
            <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>No books currently issued to you</p>
            <p style={{ fontSize: 12, color: '#CBD5E1', marginTop: 4 }}>Visit the library to borrow books</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {active.map((book, i) => {
              const status = bookStatus(book.dueDate, false)
              const conf   = STATUS_CONF[status]
              const Icon   = conf.icon
              const days   = daysUntil(book.dueDate)
              const ci     = i % 4
              return (
                <div key={book.id} style={{ padding: '16px 20px', borderBottom: i < active.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 46, height: 60, borderRadius: 8, background: ICON_BG[ci], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1.5px solid ${ICON_BORDER[ci]}` }}>
                    <BookOpen size={18} color={ICON_COLORS[ci]} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.bookTitle}</p>
                    <p style={{ fontSize: 11, color: '#64748B', margin: '0 0 1px' }}>{book.bookAuthor}</p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#64748B' }}>Issued: {book.issuedDate}</span>
                      <span style={{ fontSize: 11, color: conf.color, fontWeight: 600 }}>Due: {book.dueDate}</span>
                      {book.fine > 0 && (
                        <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>Fine: ₹{book.fine}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ padding: '6px 12px', borderRadius: 10, background: conf.bg, border: `1px solid ${conf.border}` }}>
                      <Icon size={13} style={{ color: conf.color, display: 'block', margin: '0 auto 2px' }} />
                      <p style={{ fontSize: 10, fontWeight: 700, color: conf.color, margin: 0, whiteSpace: 'nowrap' }}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Return History */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Return History</h2>
        </div>
        {!loading && history.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>No return history yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {history.map((book, i) => (
              <div key={book.id} style={{ padding: '14px 20px', borderBottom: i < history.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle size={16} color="#059669" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.bookTitle}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                    Issued: {book.issuedDate}
                    {book.returnedDate && ` · Returned: ${book.returnedDate}`}
                    {book.fine > 0 && <span style={{ color: '#DC2626' }}> · Fine paid: ₹{book.fine}</span>}
                  </p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#ECFDF5', color: '#059669', flexShrink: 0 }}>Returned</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
