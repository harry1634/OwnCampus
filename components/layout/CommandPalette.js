'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ArrowRight, Clock, X, Hash,
  Users, GraduationCap, BookOpen, Bus, Building2,
  Megaphone, LayoutDashboard, Zap, ChevronRight,
} from 'lucide-react'
import { navigation } from '@/config/navigation'

/* ── Entity meta ─────────────────────────────────────────────── */
const ENTITY_META = {
  student:      { label: 'Student',      icon: Users,          bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  faculty:      { label: 'Faculty',      icon: GraduationCap,  bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  book:         { label: 'Book',         icon: BookOpen,        bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  vehicle:      { label: 'Vehicle',      icon: Bus,             bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA' },
  hostel_room:  { label: 'Room',         icon: Building2,       bg: '#ECFEFF', color: '#0891B2', border: '#A5F3FC' },
  announcement: { label: 'Notice',       icon: Megaphone,       bg: '#FFF1F2', color: '#E11D48', border: '#FECDD3' },
  page:         { label: 'Page',         icon: LayoutDashboard, bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' },
}

const TABS = [
  { id: 'all',      label: 'All'      },
  { id: 'student',  label: 'Students' },
  { id: 'faculty',  label: 'Faculty'  },
  { id: 'book',     label: 'Books'    },
  { id: 'page',     label: 'Pages'    },
]

const GROUP_META = {
  Overview:       { bg: '#EFF6FF', color: '#2563EB' },
  Academics:      { bg: '#F5F3FF', color: '#7C3AED' },
  Finance:        { bg: '#F0FDF4', color: '#16A34A' },
  Operations:     { bg: '#FFF7ED', color: '#EA580C' },
  Engagement:     { bg: '#ECFEFF', color: '#0891B2' },
  Intelligence:   { bg: '#FFF1F2', color: '#E11D48' },
  Administration: { bg: '#F8FAFC', color: '#475569' },
  Recent:         { bg: '#F1F5F9', color: '#64748B' },
}

const QUICK_ACTIONS = [
  { label: 'Students',   href: '/students',   icon: Users,         bg: '#EFF6FF', color: '#2563EB' },
  { label: 'Faculty',    href: '/faculty',    icon: GraduationCap, bg: '#F5F3FF', color: '#7C3AED' },
  { label: 'Library',    href: '/library',    icon: BookOpen,       bg: '#F0FDF4', color: '#16A34A' },
  { label: 'Transport',  href: '/transport',  icon: Bus,            bg: '#FFF7ED', color: '#EA580C' },
]

const recentLinks = [
  { name: 'Dashboard', href: '/dashboard', group: 'Recent' },
  { name: 'Students',  href: '/students',  group: 'Recent' },
  { name: 'Attendance',href: '/attendance',group: 'Recent' },
]

const allNavItems = navigation.flatMap(g =>
  g.items.map(item => ({ ...item, group: g.label }))
)

/* ── Highlight matching chars ─────────────────────────────────── */
function Highlight({ text, query }) {
  if (!text || !query) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <mark style={{ background: '#FEF08A', color: '#713F12', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  )
}

/* ── Skeleton row ─────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F1F5F9' }} className="animate-pulse" />
      <div style={{ flex: 1 }}>
        <div style={{ width: '55%', height: 12, borderRadius: 6, background: '#F1F5F9', marginBottom: 6 }} className="animate-pulse" />
        <div style={{ width: '35%', height: 10, borderRadius: 6, background: '#F8FAFC' }} className="animate-pulse" />
      </div>
      <div style={{ width: 44, height: 20, borderRadius: 8, background: '#F1F5F9' }} className="animate-pulse" />
    </div>
  )
}

/* ── Entity result row ────────────────────────────────────────── */
function EntityRow({ result, isFocused, query, onMouseEnter, onClick }) {
  const meta = ENTITY_META[result.type] || ENTITY_META.page
  const Icon = meta.icon
  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '9px 18px', border: 'none', textAlign: 'left', cursor: 'pointer',
        background: isFocused ? meta.bg : 'transparent',
        borderLeft: `3px solid ${isFocused ? meta.color : 'transparent'}`,
        transition: 'all 0.1s',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: isFocused ? meta.color : meta.bg,
        border: `1px solid ${meta.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        <Icon size={15} color={isFocused ? '#FFF' : meta.color} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: isFocused ? meta.color : '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Highlight text={result.title} query={query} />
        </p>
        <p style={{ fontSize: 11, color: isFocused ? meta.color + 'AA' : '#64748B', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Highlight text={result.subtitle} query={query} />
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {result.meta && (
          <span style={{ fontSize: 10, color: '#94A3B8', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {result.meta}
          </span>
        )}
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`,
          padding: '2px 7px', borderRadius: 6,
        }}>{meta.label}</span>
      </div>
    </motion.button>
  )
}

/* ── Nav result row ───────────────────────────────────────────── */
function NavRow({ item, isFocused, isRecent, query, onMouseEnter, onClick }) {
  const gm = GROUP_META[item.group] || GROUP_META.Administration
  const Icon = item.icon
  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '9px 10px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
        border: 'none', background: isFocused ? gm.bg : 'transparent',
        borderLeft: `3px solid ${isFocused ? gm.color : 'transparent'}`,
        transition: 'background 0.1s',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: isFocused ? gm.bg : '#F8FAFC',
        border: isFocused ? `1px solid ${gm.color}33` : '1px solid #F1F5F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isRecent
          ? <Clock size={13} color={isFocused ? gm.color : '#94A3B8'} />
          : Icon ? <Icon size={13} color={isFocused ? gm.color : '#94A3B8'} /> : <Hash size={13} color="#94A3B8" />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: isFocused ? gm.color : '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {query ? <Highlight text={item.name} query={query} /> : item.name}
        </p>
        <p style={{ fontSize: 11, margin: '1px 0 0', color: isFocused ? gm.color + 'BB' : '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.href}
        </p>
      </div>
      <ArrowRight size={13} color={isFocused ? gm.color : '#E2E8F0'} style={{ flexShrink: 0, transform: isFocused ? 'translateX(2px)' : 'none', transition: 'transform 0.1s' }} />
    </motion.button>
  )
}

/* ── Main component ───────────────────────────────────────────── */
export default function CommandPalette({ open, onClose }) {
  const [query,         setQuery        ] = useState('')
  const [tab,           setTab          ] = useState('all')
  const [focused,       setFocused      ] = useState(0)
  const [searchResults, setSearchResults] = useState([])
  const [searching,     setSearching    ] = useState(false)
  const router     = useRouter()
  const inputRef   = useRef(null)
  const listRef    = useRef(null)
  const debounceRef= useRef(null)

  /* Nav items filtered by query */
  const navFiltered = query.trim()
    ? allNavItems.filter(i =>
        (tab === 'all' || tab === 'page') &&
        (i.name.toLowerCase().includes(query.toLowerCase()) ||
         i.group.toLowerCase().includes(query.toLowerCase()))
      )
    : recentLinks

  /* Entity results filtered by tab */
  const entityFiltered = searchResults.filter(r =>
    tab === 'all' || r.type === tab
  )

  /* Flat list for keyboard nav: entities first, then nav */
  const allFocusable = [...entityFiltered, ...navFiltered]

  /* Debounced API search */
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setSearchResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=all`)
        const json = await res.json()
        setSearchResults(json.results || [])
      } catch {}
      setSearching(false)
    }, 260)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  /* Reset on open */
  useEffect(() => {
    if (open) {
      setQuery(''); setFocused(0); setTab('all'); setSearchResults([])
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => setFocused(0), [query, tab])

  const navigate = useCallback((href) => {
    router.push(href); onClose()
  }, [router, onClose])

  /* Keyboard navigation */
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, allFocusable.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)) }
      if (e.key === 'Enter' && allFocusable[focused]) {
        const item = allFocusable[focused]
        navigate(item.href || item.href_prefix || '/')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, focused, allFocusable, navigate, onClose])

  if (!open) return null

  const showEmpty = query.length >= 2 && !searching && entityFiltered.length === 0 && navFiltered.length === 0

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-start justify-center"
        style={{ paddingTop: '8vh', paddingLeft: 14, paddingRight: 14 }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0"
          style={{ background: 'rgba(2,6,23,0.6)', backdropFilter: 'blur(10px)' }}
          onClick={onClose}
        />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full"
          style={{ maxWidth: 660 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Ambient glow */}
          <div style={{
            position: 'absolute', inset: -2, borderRadius: 24,
            background: 'linear-gradient(135deg, #2563EB33 0%, #7C3AED33 100%)',
            filter: 'blur(12px)', zIndex: 0, pointerEvents: 'none',
          }} />

          <div style={{
            position: 'relative', zIndex: 1,
            background: '#FFFFFF',
            borderRadius: 22,
            border: '1px solid #E2E8F0',
            boxShadow: '0 48px 140px rgba(0,0,0,0.28), 0 12px 40px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}>

            {/* ── Input row ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #F8FAFF 0%, #F5F3FF 100%)',
              borderBottom: '1px solid #EEF2FF',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: searching
                  ? 'linear-gradient(135deg,#7C3AED,#2563EB)'
                  : 'linear-gradient(135deg,#2563EB,#7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(37,99,235,0.35)',
                transition: 'background 0.3s',
              }}>
                {searching
                  ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%' }} className="animate-spin" />
                  : <Search size={16} color="#FFFFFF" strokeWidth={2.5} />
                }
              </div>

              <input
                ref={inputRef}
                type="text"
                placeholder="Search students, faculty, books, pages…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 15.5, fontWeight: 500, color: '#0F172A',
                  letterSpacing: '-0.015em',
                }}
              />

              {query ? (
                <button
                  onClick={() => setQuery('')}
                  style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background: '#E2E8F0', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={12} color="#64748B" strokeWidth={2.5} />
                </button>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  padding: '3px 9px', borderRadius: 8, flexShrink: 0,
                  background: 'rgba(255,255,255,0.85)', border: '1px solid #DDE3F0',
                }}>
                  <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>⌘K</span>
                </div>
              )}
            </div>

            {/* ── Tabs (shown when query exists) ── */}
            {query.trim().length >= 2 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '10px 20px 0',
                background: 'linear-gradient(135deg, #F8FAFF 0%, #F5F3FF 100%)',
                borderBottom: '1px solid #EEF2FF',
              }}>
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    style={{
                      padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      border: tab === t.id ? '1.5px solid #2563EB' : '1.5px solid transparent',
                      background: tab === t.id ? '#EFF6FF' : 'transparent',
                      color: tab === t.id ? '#2563EB' : '#64748B',
                      cursor: 'pointer', marginBottom: 8,
                      transition: 'all 0.15s',
                    }}
                  >
                    {t.label}
                    {t.id !== 'all' && t.id !== 'page' && searchResults.filter(r => r.type === t.id).length > 0 && (
                      <span style={{
                        marginLeft: 5, background: '#DBEAFE', color: '#1D4ED8',
                        fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 10,
                      }}>
                        {searchResults.filter(r => r.type === t.id).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* ── Quick actions (no query) ── */}
            {!query.trim() && (
              <div style={{ padding: '14px 20px 0', borderBottom: '1px solid #F1F5F9' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Quick Jump
                </p>
                <div style={{ display: 'flex', gap: 8, paddingBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {QUICK_ACTIONS.map(a => {
                    const Icon = a.icon
                    return (
                      <motion.button
                        key={a.href}
                        whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}
                        onClick={() => navigate(a.href)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
                          padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
                          background: a.bg, border: `1.5px solid ${a.color}22`,
                          fontSize: 12, fontWeight: 600, color: a.color,
                          boxShadow: `0 2px 8px ${a.color}14`,
                        }}
                      >
                        <Icon size={13} style={{ color: a.color }} />
                        {a.label}
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Scrollable results ── */}
            <div ref={listRef} style={{ maxHeight: 400, overflowY: 'auto' }}>

              {/* Skeleton while loading */}
              {searching && searchResults.length === 0 && (
                <div style={{ padding: '8px 0' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 20px 4px' }}>
                    Searching…
                  </p>
                  {[1,2,3].map(i => <SkeletonRow key={i} />)}
                </div>
              )}

              {/* Entity results */}
              {entityFiltered.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 4px' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                      Records
                    </p>
                    <span style={{ fontSize: 10, color: '#CBD5E1' }}>{entityFiltered.length} found</span>
                  </div>
                  {entityFiltered.slice(0, 8).map((r, i) => (
                    <EntityRow
                      key={r.id + i}
                      result={r}
                      query={query}
                      isFocused={focused === i}
                      onMouseEnter={() => setFocused(i)}
                      onClick={() => navigate(r.href)}
                    />
                  ))}
                  {entityFiltered.length > 8 && (
                    <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', padding: '6px 0 10px' }}>
                      +{entityFiltered.length - 8} more — refine your search
                    </p>
                  )}
                </div>
              )}

              {/* Nav/page results */}
              {navFiltered.length > 0 && query.trim() && (
                <div>
                  <div style={{ padding: '10px 20px 4px' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                      Pages
                    </p>
                  </div>
                  <div style={{ padding: '0 8px 8px' }}>
                    {navFiltered.map((item, i) => {
                      const flatIdx = entityFiltered.length + i
                      return (
                        <NavRow
                          key={item.href + i}
                          item={item}
                          query={query}
                          isFocused={focused === flatIdx}
                          isRecent={false}
                          onMouseEnter={() => setFocused(flatIdx)}
                          onClick={() => navigate(item.href)}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recent (no query) */}
              {!query.trim() && (
                <div style={{ padding: '8px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px 4px' }}>
                    Recent
                  </p>
                  {recentLinks.map((item, i) => (
                    <NavRow
                      key={item.href + i}
                      item={item}
                      query=""
                      isFocused={i === focused}
                      isRecent={true}
                      onMouseEnter={() => setFocused(i)}
                      onClick={() => navigate(item.href)}
                    />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {showEmpty && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '44px 20px', gap: 12 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: 'linear-gradient(135deg,#EFF6FF,#F5F3FF)',
                    border: '1px solid #E2E8F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Search size={22} color="#CBD5E1" strokeWidth={1.5} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>No results for <span style={{ color: '#0F172A' }}>"{query}"</span></p>
                    <p style={{ fontSize: 12, color: '#CBD5E1', marginTop: 4, margin: '6px 0 0' }}>Try name, roll number, class, or book title</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 18px',
              borderTop: '1px solid #F1F5F9',
              background: 'linear-gradient(to right, #FAFAFE, #FAF9FF)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {[
                  { keys: ['↑', '↓'], label: 'Navigate' },
                  { keys: ['↵'],      label: 'Open'     },
                  { keys: ['Esc'],    label: 'Close'    },
                ].map(({ keys, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {keys.map(k => (
                        <kbd key={k} style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          minWidth: 20, height: 20, padding: '0 5px', borderRadius: 5,
                          background: '#FFFFFF', border: '1px solid #E2E8F0',
                          boxShadow: '0 1px 0 #CBD5E1',
                          fontSize: 10, fontWeight: 600, color: '#475569', fontFamily: 'inherit',
                        }}>{k}</kbd>
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Zap size={10} color="#2563EB" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.04em' }}>OwnCampus</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
