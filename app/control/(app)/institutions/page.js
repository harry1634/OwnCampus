'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, Building2, ChevronRight, RefreshCw, Plus, X, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_CONFIG = {
  '':          { label: 'All',       bg: '#F8FAFC', color: '#475569' },
  pending:     { label: 'Pending',   bg: '#FFF7ED', color: '#C2410C' },
  trial:       { label: 'Trial',     bg: '#EFF6FF', color: '#1D4ED8' },
  active:      { label: 'Active',    bg: '#F0FDF4', color: '#15803D' },
  suspended:   { label: 'Suspended', bg: '#FEF2F2', color: '#B91C1C' },
  cancelled:   { label: 'Cancelled', bg: '#F8FAFC', color: '#475569' },
}

function Badge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['']
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
      background: cfg.bg, color: cfg.color,
    }}>{cfg.label}</span>
  )
}

// ── Add Institution Modal ─────────────────────────────────────────────────
const EMPTY_FORM = { name: '', type: 'school', email: '', phone: '', initial_status: 'pending' }

function AddInstitutionModal({ onClose, onCreated }) {
  const [form,    setForm   ] = useState(EMPTY_FORM)
  const [saving,  setSaving ] = useState(false)
  const [created, setCreated] = useState(null) // { name, code }
  const [copied,  setCopied ] = useState(false)

  const setF = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res  = await fetch('/api/control/institutions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setCreated({ name: json.institution.name, code: json.institution.code })
      onCreated()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(created.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const iStyle = {
    width: '100%', height: 42, boxSizing: 'border-box', padding: '0 12px',
    border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13.5,
    color: '#0F172A', fontFamily: 'inherit', outline: 'none', background: '#FAFCFF',
  }
  const L = (t) => <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>{t}</label>

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: '#FFFFFF', borderRadius: 18, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 64px rgba(15,23,42,0.2)', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '22px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: '0 0 2px', letterSpacing: '-0.02em' }}>Add Institution</h2>
            <p style={{ fontSize: 12.5, color: '#94A3B8', margin: 0 }}>A unique code will be generated automatically.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#94A3B8', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Success state — show the generated code */}
        {created ? (
          <div style={{ padding: '24px 24px 28px' }}>
            <div style={{ background: '#F0FDF4', border: '1.5px solid #A7F3D0', borderRadius: 14, padding: '20px 20px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#065F46', margin: '0 0 4px' }}>Institution created successfully!</p>
              <p style={{ fontSize: 12.5, color: '#047857', margin: '0 0 18px' }}>
                Share this code with the admin, faculty, and students of <strong>{created.name}</strong> so they can sign up.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  flex: 1, background: '#FFFFFF', border: '1.5px solid #6EE7B7', borderRadius: 9,
                  padding: '10px 14px', fontFamily: 'monospace', fontSize: 20, fontWeight: 800,
                  color: '#065F46', letterSpacing: '0.15em', textAlign: 'center',
                }}>{created.code}</div>
                <button onClick={copyCode} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                  borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: copied ? '#059669' : '#0F172A', color: '#FFFFFF',
                  fontSize: 13, fontWeight: 600, transition: 'background 0.2s',
                }}>
                  {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                </button>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: '100%', marginTop: 16, height: 42, borderRadius: 9, border: 'none',
              background: '#F1F5F9', color: '#475569', fontSize: 13.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                {L('Institution Name *')}
                <input value={form.name} onChange={setF('name')} placeholder="e.g. Greenfield Public School" required style={iStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  {L('Type *')}
                  <select value={form.type} onChange={setF('type')} required style={{ ...iStyle, cursor: 'pointer' }}>
                    <option value="school">School</option>
                    <option value="college">College</option>
                    <option value="university">University</option>
                    <option value="coaching">Coaching Institute</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  {L('Initial Status')}
                  <select value={form.initial_status} onChange={setF('initial_status')} style={{ ...iStyle, cursor: 'pointer' }}>
                    <option value="pending">Pending</option>
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                  </select>
                </div>
              </div>
              <div>
                {L('Official Email *')}
                <input type="email" value={form.email} onChange={setF('email')} placeholder="admin@institution.edu" required style={iStyle} />
              </div>
              <div>
                {L('Phone (optional)')}
                <input type="tel" value={form.phone} onChange={setF('phone')} placeholder="+91 98765 43210" style={iStyle} />
              </div>
            </div>

            <div style={{ marginTop: 12, padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 9 }}>
              <p style={{ fontSize: 12, color: '#1D4ED8', margin: 0, lineHeight: 1.6 }}>
                A unique institution code (e.g. <strong>GRFLA3B7</strong>) will be auto-generated and shown after creation. Share it with the institution so their users can register.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="button" onClick={onClose} style={{
                flex: 1, height: 42, borderRadius: 9, border: '1.5px solid #E2E8F0',
                background: '#FFFFFF', color: '#64748B', fontSize: 13.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
              <button type="submit" disabled={saving} style={{
                flex: 2, height: 42, borderRadius: 9, border: 'none',
                background: saving ? '#94A3B8' : '#2563EB',
                color: '#FFFFFF', fontSize: 13.5, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                boxShadow: saving ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
              }}>{saving ? 'Creating…' : 'Create Institution'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
function InstitutionsInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [institutions, setInstitutions] = useState([])
  const [total,        setTotal        ] = useState(0)
  const [loading,      setLoading      ] = useState(true)
  const [search,       setSearch       ] = useState(searchParams.get('search') || '')
  const [status,       setStatus       ] = useState(searchParams.get('status') || '')
  const [page,         setPage         ] = useState(1)
  const [showAdd,      setShowAdd      ] = useState(false)

  const load = useCallback(async (s = search, st = status, pg = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (s)  params.set('search', s)
      if (st) params.set('status', st)
      params.set('page', pg)
      const res  = await fetch('/api/control/institutions?' + params)
      const json = await res.json()
      setInstitutions(json.institutions || [])
      setTotal(json.total || 0)
    } finally {
      setLoading(false)
    }
  }, [search, status, page])

  useEffect(() => { load() }, []) // initial load

  function applySearch(e) {
    e.preventDefault()
    setPage(1)
    load(search, status, 1)
  }

  function changeStatus(st) {
    setStatus(st)
    setPage(1)
    load(search, st, 1)
  }

  return (
    <div>
      {showAdd && (
        <AddInstitutionModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { load(search, status, 1) }}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: '0 0 4px' }}>Institutions</h1>
          <p style={{ fontSize: 13.5, color: '#64748B', margin: 0 }}>Manage all institutions on the OwnCampus platform</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 10, border: 'none',
            background: '#2563EB',
            color: '#FFFFFF', fontSize: 13.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
          }}>
          <Plus size={15} /> Add Institution
        </button>
      </div>

      {/* Filters bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Search */}
        <form onSubmit={applySearch} style={{ display: 'flex', gap: 8, flex: '1 1 240px', maxWidth: 360 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search institutions…"
              style={{
                width: '100%', height: 38, boxSizing: 'border-box',
                padding: '0 12px 0 36px', borderRadius: 9, border: '1px solid #E2E8F0',
                background: '#FFFFFF', fontSize: 13.5, color: '#0F172A', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
          <button className="btn-primary" type="submit" style={{ height: 38, padding: '0 16px', fontSize: 13 }}>Search</button>
        </form>

        {/* Status pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
            <button
              key={val}
              onClick={() => changeStatus(val)}
              style={{
                padding: '5px 14px', borderRadius: 99, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                border: `1.5px solid ${status === val ? cfg.color + '80' : '#E2E8F0'}`,
                background: status === val ? cfg.bg : '#FFFFFF',
                color: status === val ? cfg.color : '#64748B',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}>
              {cfg.label}
            </button>
          ))}
        </div>

        <button onClick={() => load()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: 12.5, color: '#64748B', fontFamily: 'inherit' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8EDF4', borderRadius: 16, boxShadow: '0 1px 4px rgba(15,23,42,0.04)', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 12, padding: '12px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          {['Institution', 'Type', 'Status', 'MRR', 'Joined', ''].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: 24, height: 24, border: '2.5px solid #E2E8F0', borderTop: '2.5px solid #3B82F6', borderRadius: '50%', margin: '0 auto' }} className="animate-spin" />
          </div>
        ) : institutions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>
            <Building2 size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No institutions found</p>
          </div>
        ) : (
          institutions.map(inst => {
            const license = inst.institution_licenses
            const pmts    = inst.institution_payments || []
            const mrr     = license?.monthly_fee || 0
            return (
              <Link
                key={inst.id}
                href={`/control/institutions/${inst.id}`}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
                  gap: 12, padding: '14px 20px',
                  borderBottom: '1px solid #F8FAFC',
                  textDecoration: 'none', alignItems: 'center',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{inst.name}</p>
                  <p style={{ fontSize: 11.5, color: '#94A3B8', margin: 0 }}>{inst.code}</p>
                </div>
                <span style={{ fontSize: 12.5, color: '#475569', textTransform: 'capitalize' }}>{(inst.type || '').replace(/_/g, ' ')}</span>
                <Badge status={inst.control_status} />
                <span style={{ fontSize: 13, fontWeight: 600, color: mrr > 0 ? '#059669' : '#94A3B8' }}>
                  {mrr > 0 ? '₹' + mrr.toLocaleString('en-IN') : '—'}
                </span>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>{new Date(inst.created_at).toLocaleDateString('en-IN')}</span>
                <ChevronRight size={14} color="#CBD5E1" />
              </Link>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <span style={{ fontSize: 12.5, color: '#94A3B8' }}>
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              disabled={page === 1}
              onClick={() => { setPage(p => p - 1); load(search, status, page - 1) }}
              className="btn-secondary" style={{ height: 34, fontSize: 12.5 }}>Previous</button>
            <button
              disabled={page * 20 >= total}
              onClick={() => { setPage(p => p + 1); load(search, status, page + 1) }}
              className="btn-secondary" style={{ height: 34, fontSize: 12.5 }}>Next</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function InstitutionsPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}><div style={{ width: 24, height: 24, border: '2.5px solid #E2E8F0', borderTop: '2.5px solid #3B82F6', borderRadius: '50%' }} className="animate-spin" /></div>}>
      <InstitutionsInner />
    </Suspense>
  )
}
