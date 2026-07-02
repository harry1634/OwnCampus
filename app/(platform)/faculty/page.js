'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Users, Star, BookOpen, Plus, Search,
  Download, Eye, Edit, Mail, Phone, Clock, Award, X,
  Save, KeyRound, Send, EyeOff, CheckCircle, AlertCircle,
  ArrowLeftRight, Building2, Trash2,
} from 'lucide-react'
import Link from 'next/link'
import Pagination from '@/components/ui/Pagination'
import { downloadCSV } from '@/lib/exportUtils'
import { toast } from 'sonner'
import { TableSkeleton } from '@/components/ui/SkeletonLoader'

const deptConfig = {
  'Mathematics':        { color: '#2563EB', bg: '#EFF6FF' },
  'Science':            { color: '#10B981', bg: '#F0FDF4' },
  'English':            { color: '#0891B2', bg: '#ECFEFF' },
  'Social Science':     { color: '#F59E0B', bg: '#FFFBEB' },
  'Commerce':           { color: '#7C3AED', bg: '#F5F3FF' },
  'Physical Education': { color: '#DB2777', bg: '#FDF2F8' },
  'Computer Science':   { color: '#0F766E', bg: '#F0FDFA' },
}

const avatarColors = ['#2563EB', '#7C3AED', '#0891B2', '#10B981', '#F59E0B', '#DB2777', '#0F766E', '#EA580C']

function getInitials(name) {
  return name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.) /i, '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const OVERLAY = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 24,
}

const MODAL = {
  background: '#FFFFFF', borderRadius: 20, boxShadow: '0 24px 64px rgba(15,23,42,0.20)',
  width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
}

// ── View Modal ─────────────────────────────────────────────────────────────
function ViewModal({ f, attColor, attPct, onEdit, onSetPwd, onClose }) {
  const dept = deptConfig[f.dept] || { color: '#64748B', bg: '#F8FAFC' }
  const color = avatarColors[(f.id || 0) % avatarColors.length]
  return (
    <div style={OVERLAY} onClick={onClose}>
      <motion.div style={MODAL} initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1E3A8A,#2563EB)', borderRadius: '20px 20px 0 0', padding: '28px 24px 24px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
            <X size={15} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#FFF', boxShadow: `0 4px 16px ${color}60`, border: '3px solid rgba(255,255,255,0.25)' }}>
              {getInitials(f.name)}
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: 4 }}>{f.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {f.designation === 'HOD' && (
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: '#FEF9C3', color: '#854D0E', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Award size={8} /> HOD
                  </span>
                )}
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.80)', fontWeight: 500 }}>{f.designation}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: f.type === 'full_time' ? 'rgba(187,247,208,0.25)' : 'rgba(254,215,170,0.25)', color: f.type === 'full_time' ? '#A7F3D0' : '#FDE68A', border: `1px solid ${f.type === 'full_time' ? 'rgba(167,243,208,0.4)' : 'rgba(253,230,138,0.4)'}`, fontWeight: 600 }}>
                  {f.type === 'full_time' ? 'Full-time' : 'Part-time'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: dept.bg, color: dept.color, border: `1px solid ${dept.color}30` }}>{f.dept || 'No dept'}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>{f.code}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Contact */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {f.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={13} style={{ color: '#2563EB' }} />
                </div>
                <span style={{ fontSize: 13, color: '#374151', wordBreak: 'break-all' }}>{f.email}</span>
              </div>
            )}
            {f.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={13} style={{ color: '#16A34A' }} />
                </div>
                <span style={{ fontSize: 13, color: '#374151' }}>{f.phone}</span>
              </div>
            )}
          </div>

          {/* Subjects */}
          {f.subjects?.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Subjects</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {f.subjects.map(s => (
                  <span key={s} style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 6, background: '#F8FAFC', color: '#374151', border: '1px solid #E2E8F0' }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Experience', value: `${f.exp} yrs`, color: '#0F172A' },
              { label: 'Attendance', value: `${attPct}%`, color: attColor },
              { label: 'Rating', value: f.rating || '—', color: '#F59E0B' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{s.label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button onClick={onEdit}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Edit size={13} /> Edit Details
            </button>
            {f.supabaseId && (
              <button onClick={onSetPwd}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <KeyRound size={13} /> Set Password
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── Edit Modal ─────────────────────────────────────────────────────────────
function EditModal({ f, onSave, onClose }) {
  const [form, setForm] = useState({
    name:        f.name || '',
    designation: f.designation || '',
    dept:        f.dept || '',
    type:        f.type || 'full_time',
    subjects:    (f.subjects || []).join(', '),
    exp:         String(f.exp || 0),
    phone:       f.phone || '',
  })
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))
  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #E2E8F0', fontSize: 13, color: '#0F172A', background: '#F8FAFC', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5, display: 'block' }

  return (
    <div style={OVERLAY} onClick={onClose}>
      <motion.div style={MODAL} initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Edit Faculty — {f.name}</p>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Full Name</label>
              <input style={inputStyle} value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label style={labelStyle}>Designation</label>
              <input style={inputStyle} value={form.designation} onChange={set('designation')} />
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <input style={inputStyle} value={form.dept} onChange={set('dept')} />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select style={inputStyle} value={form.type} onChange={set('type')}>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Experience (yrs)</label>
              <input style={inputStyle} type="number" min="0" value={form.exp} onChange={set('exp')} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Subjects (comma-separated)</label>
              <input style={inputStyle} value={form.subjects} onChange={set('subjects')} placeholder="e.g. Mathematics, Statistics" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={form.phone} onChange={set('phone')} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={() => onSave(f.supabaseId, f.email, { ...form, subjects: form.subjects.split(',').map(s => s.trim()).filter(Boolean), exp: parseInt(form.exp) || 0 })}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, border: 'none', background: '#2563EB', color: '#FFF', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Save size={13} /> Save Changes
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── Set Password Modal ─────────────────────────────────────────────────────
function SetPwdModal({ f, onClose }) {
  const [pwd,     setPwd    ] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show,    setShow   ] = useState(false)
  const [saving,  setSaving ] = useState(false)
  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #E2E8F0', fontSize: 13, color: '#0F172A', background: '#F8FAFC', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', paddingRight: 40 }

  const handleSave = async () => {
    if (pwd.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (pwd !== confirm) { toast.error('Passwords do not match'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/set-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supabaseId: f.supabaseId, password: pwd }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Password updated for ${f.name}`)
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={OVERLAY} onClick={onClose}>
      <motion.div style={{ ...MODAL, maxWidth: 420 }} initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Set New Password</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{f.name}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: 12, color: '#1E40AF', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <KeyRound size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            This sets the password directly — no email required. Useful when the faculty is on localhost and can't receive reset emails.
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5, display: 'block' }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input type={show ? 'text' : 'password'} style={inputStyle} value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Minimum 6 characters" />
              <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5, display: 'block' }}>Confirm Password</label>
            <input type="password" style={inputStyle} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" />
            {confirm && pwd !== confirm && <p style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>Passwords do not match</p>}
            {confirm && pwd === confirm && confirm.length >= 6 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <CheckCircle size={11} style={{ color: '#16A34A' }} />
                <p style={{ fontSize: 11, color: '#16A34A' }}>Passwords match</p>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 10, border: 'none', background: saving ? '#93C5FD' : '#2563EB', color: '#FFF', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Saving…' : <><KeyRound size={13} /> Set Password</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function FacultyPage() {
  const [storeFaculty, setStoreFaculty] = useState([])
  const facultyRef = useRef([])

  const [loading,         setLoading        ] = useState(true)
  const [search,          setSearch         ] = useState('')
  const [deptFilter,      setDeptFilter     ] = useState('All')
  const [branchFilter,    setBranchFilter   ] = useState('all')
  const [page,            setPage           ] = useState(1)
  const [viewFaculty,     setViewFaculty    ] = useState(null)
  const [editFaculty,     setEditFaculty    ] = useState(null)
  const [setPwdFor,       setSetPwdFor      ] = useState(null)
  const [branches,        setBranches       ] = useState([])
  const [transferFaculty, setTransferFaculty] = useState(null)
  const [transferBranchId,setTransferBranchId] = useState('')
  const [transferring,    setTransferring   ] = useState(false)
  const [deleteConfirm,   setDeleteConfirm  ] = useState(null)
  const [deleting,        setDeleting       ] = useState(false)

  // Keep ref in sync for async access
  useEffect(() => { facultyRef.current = storeFaculty }, [storeFaculty])

  useEffect(() => {
    fetch('/api/faculty')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) {
          if (data?.error) console.warn('[faculty] API error:', data.error)
          return
        }
        if (data.length > 0) setStoreFaculty(data)
      })
      .catch(err => console.warn('[faculty] fetch error:', err))
      .finally(() => setLoading(false))

    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || [])).catch(() => {})
  }, [])

  async function handleTransferFaculty(e) {
    e.preventDefault()
    if (!transferFaculty?.supabaseId) return
    setTransferring(true)
    try {
      const r = await fetch(`/api/admin/users/${transferFaculty.supabaseId}/branch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: transferBranchId || null }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      const newBranchName = branches.find(b => b.id === transferBranchId)?.name || ''
      setStoreFaculty(prev => prev.map(f => f.supabaseId === transferFaculty.supabaseId
        ? { ...f, branchId: transferBranchId || null, branch: newBranchName }
        : f
      ))
      toast.success(`${transferFaculty.name} transferred to ${newBranchName || 'No Branch'}`)
      setTransferFaculty(null)
    } catch (err) { toast.error(err.message) }
    finally { setTransferring(false) }
  }

  // Deduplicate by supabaseId (same person can appear twice if they have multiple DB records)
  const seenIds = new Set()
  const faculty = storeFaculty
    .filter(f => {
      const uid = f.supabaseId || f.email
      if (!uid || seenIds.has(uid)) return false
      seenIds.add(uid)
      return true
    })
    .map(f => ({
      ...f,
      }))

  const PAGE_SIZE = 6

  const fullTime  = faculty.filter(f => f.type === 'full_time').length
  const partTime  = faculty.length - fullTime
  const avgRating = faculty.length ? (faculty.reduce((s, f) => s + (f.rating || 0), 0) / faculty.length).toFixed(1) : '—'
  const avgExp    = faculty.length ? (faculty.reduce((s, f) => s + (f.exp || 0), 0) / faculty.length).toFixed(1) : '—'

  const allDepts   = [...new Set(faculty.map(f => f.dept).filter(Boolean))]
  const departments = ['All', ...allDepts]

  const filtered = faculty.filter(f => {
    const q = search.toLowerCase()
    const matchSearch  = f.name.toLowerCase().includes(q) || (f.code || '').toLowerCase().includes(q) || (f.dept || '').toLowerCase().includes(q)
    const matchDept    = deptFilter   === 'All' || f.dept   === deptFilter
    const matchBranch  = branchFilter === 'all' || f.branch === branchFilter || !f.branch
    return matchSearch && matchDept && matchBranch
  })

  useEffect(() => { setPage(1) }, [search, deptFilter, branchFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleDelete = async (f) => {
    setDeleting(true)
    try {
      if (f.facultyRowId) {
        const r = await fetch(`/api/faculty?id=${f.facultyRowId}`, { method: 'DELETE' })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
      } else if (f.supabaseId) {
        const r = await fetch(`/api/admin/users/${f.supabaseId}`, { method: 'DELETE' })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
      }
      setStoreFaculty(prev => prev.filter(x => x.supabaseId ? x.supabaseId !== f.supabaseId : x.id !== f.id))
      toast.success(`${f.name} removed`)
      setDeleteConfirm(null)
    } catch (err) { toast.error(err.message) }
    finally { setDeleting(false) }
  }

  const handleSaveEdit = async (supabaseId, email, fields) => {
    try {
      const res = await fetch('/api/faculty', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseId, ...fields }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error || 'Update failed'); return }
    } catch {
      toast.error('Network error — changes not saved')
      return
    }
    setStoreFaculty(prev => prev.map(f => f.supabaseId === supabaseId ? { ...f, ...fields } : f))
    if (viewFaculty?.supabaseId === supabaseId) setViewFaculty(prev => ({ ...prev, ...fields }))
    setEditFaculty(null)
    setViewFaculty(null)
    toast.success('Faculty details updated')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Modals */}
      <AnimatePresence>
        {viewFaculty && !editFaculty && !setPwdFor && (() => {
          const attPct   = viewFaculty.attendance ?? 100
          const attColor = attPct >= 95 ? '#16A34A' : attPct >= 90 ? '#0891B2' : '#D97706'
          return (
            <ViewModal
              f={viewFaculty}
              attPct={attPct}
              attColor={attColor}
              onEdit={() => setEditFaculty(viewFaculty)}
              onSetPwd={() => setSetPwdFor(viewFaculty)}
              onClose={() => setViewFaculty(null)}
            />
          )
        })()}
        {editFaculty && (
          <EditModal f={editFaculty} onSave={handleSaveEdit} onClose={() => setEditFaculty(null)} />
        )}
        {setPwdFor && (
          <SetPwdModal f={setPwdFor} onClose={() => setSetPwdFor(null)} />
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Faculty</h1>
          <p className="page-header-sub">Manage faculty profiles, workload &amp; performance</p>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => {
            const headers = ['Code', 'Name', 'Department', 'Designation', 'Type', 'Experience (yrs)', 'Subjects', 'Email', 'Phone', 'Attendance %', 'Rating']
            const rows = faculty.map(f => [f.code, f.name, f.dept, f.designation, f.type, f.exp, (f.subjects || []).join('; '), f.email, f.phone, f.attendance ?? 100, f.rating])
            downloadCSV('faculty.csv', headers, rows)
          }}><Download size={15} /> Export</button>
          <Link href="/faculty/new">
            <motion.button whileHover={{ scale: 1.02 }} className="btn-primary">
              <Plus size={15} /> Add Faculty
            </motion.button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="rg-4">
        {[
          { label: 'Total Faculty',   value: faculty.length,                         sub: `${allDepts.length} department${allDepts.length !== 1 ? 's' : ''}`, icon: GraduationCap, iconColor: '#2563EB', iconBg: '#EFF6FF' },
          { label: 'Full Time',       value: fullTime,                                sub: `${partTime} part-time`,   icon: Users,    iconColor: '#10B981', iconBg: '#F0FDF4' },
          { label: 'Avg. Rating',     value: avgRating,                               sub: 'out of 5.0',              icon: Star,     iconColor: '#F59E0B', iconBg: '#FFFBEB' },
          { label: 'Avg. Experience', value: avgExp === '—' ? '—' : avgExp + ' yrs', sub: 'across all staff',        icon: BookOpen, iconColor: '#0891B2', iconBg: '#ECFEFF' },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ translateY: -2, boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon size={19} style={{ color: stat.iconColor }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#64748B', marginBottom: 6 }}>{stat.label}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 30, fontWeight: 700, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 6 }}>{stat.value}</p>
              <p style={{ fontSize: 11, color: '#94A3B8' }}>{stat.sub}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Search + Department filter */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 20px', boxShadow: '0 1px 4px rgba(15,23,42,0.04)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 280, flexShrink: 0 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1' }} />
          <input type="text" placeholder="Search by name, code, department…" value={search} onChange={e => setSearch(e.target.value)}
            className="input-premium" style={{ paddingLeft: 36, paddingTop: 8, paddingBottom: 8, fontSize: 13, width: '100%' }} />
        </div>
        <div style={{ width: 1, height: 28, background: '#E2E8F0', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {departments.map(d => {
            const cfg = deptConfig[d]
            const active = deptFilter === d
            return (
              <button key={d} onClick={() => setDeptFilter(d)}
                style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.14s',
                  background: active ? (cfg?.bg || '#EFF6FF') : 'transparent',
                  color:      active ? (cfg?.color || '#2563EB') : '#64748B',
                  border:     active ? `1px solid ${cfg?.color || '#2563EB'}40` : '1px solid transparent' }}>
                {d}
              </button>
            )
          })}
        </div>
        {branches.length > 0 && (
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 9, border: '1.5px solid #E2E8F0', fontSize: 12, color: '#374151', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            <option value="__none__">No Branch</option>
          </select>
        )}
        <span style={{ fontSize: 12, color: '#94A3B8', flexShrink: 0 }}>{filtered.length} faculty</span>
      </div>

      {/* Faculty Card Grid */}
      {loading && <div style={{ marginTop: 8 }}><TableSkeleton rows={6} cols={5} /></div>}
      {!loading && faculty.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8', fontSize: 14 }}>No faculty registered yet. Approve access requests from the dashboard to add faculty.</div>
      )}

      <div className="rg-3 rg-faculty">
        {paginated.map((f, i) => {
          const color    = avatarColors[i % avatarColors.length]
          const dept     = deptConfig[f.dept] || { color: '#64748B', bg: '#F8FAFC' }
          const attPct   = f.attendance ?? 100
          const attColor = attPct >= 95 ? '#16A34A' : attPct >= 90 ? '#0891B2' : '#D97706'

          return (
            <motion.div key={`${f.supabaseId || f.facultyRowId || f.email || 'f'}-${i}`}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ translateY: -3, boxShadow: '0 16px 40px rgba(15,23,42,0.10)' }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

              {/* Card Header */}
              <div style={{ padding: '22px 22px 18px', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 16, color: '#FFFFFF', boxShadow: `0 4px 12px ${color}50` }}>
                      {getInitials(f.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{f.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                        {f.designation === 'HOD' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE68A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            <Award size={8} /> HOD
                          </span>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B' }}>{f.designation === 'HOD' ? f.dept : f.designation}</span>
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 99, flexShrink: 0, background: f.type === 'full_time' ? '#F0FDF4' : '#FFFBEB', color: f.type === 'full_time' ? '#16A34A' : '#D97706', border: `1px solid ${f.type === 'full_time' ? '#BBF7D0' : '#FDE68A'}`, letterSpacing: '0.03em' }}>
                    {f.type === 'full_time' ? 'Full-time' : 'Part-time'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: dept.bg, color: dept.color, border: `1px solid ${dept.color}30` }}>{f.dept || 'No dept'}</span>
                  <span style={{ fontSize: 11, color: '#CBD5E1', fontFamily: 'JetBrains Mono, monospace' }}>{f.code}</span>
                  {f.branch && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', gap: 3 }}><Building2 size={9} />{f.branch}</span>}
                </div>
              </div>

              {/* Contact */}
              <div style={{ padding: '14px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: '#F8FAFC', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={11} style={{ color: '#94A3B8' }} />
                  </div>
                  <span style={{ fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.email}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: '#F8FAFC', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone size={11} style={{ color: '#94A3B8' }} />
                  </div>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{f.phone || '—'}</span>
                </div>
              </div>

              {/* Subjects */}
              <div style={{ padding: '12px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 44 }}>
                {(f.subjects || []).length > 0
                  ? f.subjects.map(s => <span key={s} style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 6, background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }}>{s}</span>)
                  : <span style={{ fontSize: 11, color: '#CBD5E1' }}>No subjects assigned</span>}
              </div>

              {/* Stats */}
              <div style={{ padding: '14px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'stretch', gap: 0 }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 4 }}>
                    <Clock size={11} style={{ color: '#94A3B8' }} />
                    <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Exp.</p>
                  </div>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1 }}>{f.exp}</p>
                  <p style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>years</p>
                </div>
                <div style={{ width: 1, background: '#F1F5F9', margin: '0 4px' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Attend.</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: attColor, letterSpacing: '-0.02em', lineHeight: 1 }}>{attPct}%</p>
                  <div style={{ height: 3, borderRadius: 99, background: '#F1F5F9', marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, width: `${attPct}%`, background: attColor }} />
                  </div>
                </div>
                <div style={{ width: 1, background: '#F1F5F9', margin: '0 4px' }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>Rating</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B', letterSpacing: '-0.02em', lineHeight: 1 }}>{f.rating}</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 4 }}>
                    {[1,2,3,4,5].map(n => <Star key={n} size={9} style={{ color: n <= Math.round(f.rating) ? '#F59E0B' : '#E2E8F0', fill: n <= Math.round(f.rating) ? '#F59E0B' : 'none' }} />)}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: '14px 22px', display: 'flex', gap: 8 }}>
                <button onClick={() => setViewFaculty(f)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 9, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.14s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#2563EB'; e.currentTarget.style.color = '#FFF' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2563EB' }}>
                  <Eye size={13} /> View
                </button>
                <button onClick={() => setEditFaculty(f)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 9, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.14s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#E2E8F0'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}>
                  <Edit size={13} /> Edit
                </button>
                <button onClick={() => { if (f.email) window.location.href = 'mailto:' + f.email }}
                  title="Send Email"
                  style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid #BBF7D0', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <Mail size={13} style={{ color: '#16A34A' }} />
                </button>
                {f.supabaseId && branches.length > 0 && (
                  <button title="Transfer Branch" onClick={() => { setTransferFaculty(f); setTransferBranchId(f.branchId || '') }}
                    style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid #BFDBFE', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <ArrowLeftRight size={13} style={{ color: '#2563EB' }} />
                  </button>
                )}
                <button title="Delete" onClick={() => setDeleteConfirm(f)}
                  style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid #FECACA', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <Trash2 size={13} style={{ color: '#DC2626' }} />
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {filtered.length === 0 && !loading && (
        <div style={{ padding: '64px', textAlign: 'center', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0' }}>
          <p style={{ fontSize: 14, color: '#94A3B8' }}>No faculty match your search</p>
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
          <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} label="faculty" />
        </div>
      )}

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFF', borderRadius: 18, padding: 28, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <Trash2 size={22} color="#DC2626" />
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Remove Faculty?</p>
                <p style={{ fontSize: 13, color: '#64748B', marginTop: 8, lineHeight: 1.5 }}>
                  <strong>{deleteConfirm.name}</strong> will be deactivated and removed from this list.
                  {deleteConfirm.supabaseId ? ' This also deactivates their login.' : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteConfirm(null)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#DC2626', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: deleting ? 'default' : 'pointer' }}>
                  {deleting ? 'Removing…' : 'Yes, Remove'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Branch Modal */}
      <AnimatePresence>
        {transferFaculty && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={() => setTransferFaculty(null)}>
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFF', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowLeftRight size={18} color="#2563EB" />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Transfer Branch</p>
                  <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{transferFaculty.name}</p>
                </div>
                <button onClick={() => setTransferFaculty(null)} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={16} /></button>
              </div>
              <form onSubmit={handleTransferFaculty} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Select Branch</label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1', pointerEvents: 'none' }} />
                    <select value={transferBranchId} onChange={e => setTransferBranchId(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box', appearance: 'none' }}>
                      <option value="">— No Branch —</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  {transferFaculty.branch && <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>Current: {transferFaculty.branch}</p>}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setTransferFaculty(null)}
                    style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={transferring}
                    style={{ padding: '9px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#1E40AF,#2563EB)', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 700, cursor: transferring ? 'default' : 'pointer' }}>
                    {transferring ? 'Transferring…' : 'Transfer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
