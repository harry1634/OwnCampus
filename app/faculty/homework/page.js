'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Pencil, Trash2, Eye, EyeOff, X, Loader2, Check,
         Calendar, Users, FileText, ExternalLink, CheckCircle, Clock,
         ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

const FAC = '#064E3B'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function isOverdue(d) { return d && new Date(d) < new Date() }

/* ── Compose / Edit Modal ───────────────────────────────────────────── */
function HomeworkModal({ hw, classes, onClose, onSaved }) {
  const isEdit = !!hw
  const [form, setForm] = useState({
    title:        hw?.title       || '',
    subject:      hw?.subject     || '',
    description:  hw?.description || '',
    due_date:     hw?.due_date    || '',
    class_id:     hw?.class_id    || (classes[0]?.id || ''),
    is_published: hw?.is_published ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError ] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function handleSave() {
    if (!form.title.trim())   { setError('Title is required'); return }
    if (!form.subject.trim()) { setError('Subject is required'); return }
    setError(''); setSaving(true)
    try {
      const method = isEdit ? 'PATCH' : 'POST'
      const url    = isEdit ? `/api/homework?id=${hw.id}` : '/api/homework'
      const body   = isEdit ? { action: 'update', ...form } : form
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json   = await res.json()
      if (!res.ok || json.error) { setError(json.error || 'Failed to save'); setSaving(false); return }
      toast.success(isEdit ? 'Homework updated' : 'Homework created')
      onSaved(); onClose()
    } catch { setError('Network error'); setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        style={{ width: '100%', maxWidth: 540, background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 64px rgba(15,23,42,0.16)' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(6,78,59,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={16} color={FAC} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>{isEdit ? 'Edit Homework' : 'New Homework'}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, color: '#DC2626' }}>{error}</div>}
          {[
            { label: 'Title *',   key: 'title',   placeholder: 'e.g. Chapter 5 — Quadratic Equations' },
            { label: 'Subject *', key: 'subject', placeholder: 'e.g. Mathematics' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>{label}</label>
              <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} placeholder={placeholder} value={form[key]} onChange={set(key)} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Class</label>
              <select className="input-premium" style={{ width: '100%' }} value={form.class_id} onChange={set('class_id')}>
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.section ? '-' + c.section : ''}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Due Date</label>
              <input type="date" className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} value={form.due_date} onChange={set('due_date')} min="2000-01-01" max="2099-12-31" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Description</label>
            <textarea rows={3} className="input-premium" style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
              placeholder="Detailed instructions for students…" value={form.description} onChange={set('description')} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}>
            <input type="checkbox" checked={form.is_published} onChange={set('is_published')} />
            Publish (visible to students)
          </label>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: FAC, color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, opacity: saving ? 0.7 : 1 }}>
            {saving ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</> : <><Check size={14} /> {isEdit ? 'Save Changes' : 'Create'}</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Submissions Panel ───────────────────────────────────────────────── */
function SubmissionsPanel({ hw, onClose }) {
  const [data,    setData   ] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter ] = useState('all')

  useEffect(() => {
    fetch(`/api/homework/submissions?homework_id=${hw.id}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [hw.id])

  const students = data?.students || []
  const shown = filter === 'all'
    ? students
    : filter === 'submitted'
      ? students.filter(s => s.submitted)
      : students.filter(s => !s.submitted)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
        style={{ width: '100%', maxWidth: 680, height: '85vh', maxHeight: 640, background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 64px rgba(15,23,42,0.18)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Submissions</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{hw.title}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={24} color="#CBD5E1" style={{ animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div style={{ padding: '12px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 10, flexShrink: 0 }}>
              {[
                { key: 'all',       label: `All (${data?.total || 0})`,           color: '#475569', bg: '#F1F5F9' },
                { key: 'submitted', label: `Submitted (${data?.submitted || 0})`, color: '#059669', bg: '#ECFDF5' },
                { key: 'pending',   label: `Pending (${data?.pending || 0})`,     color: '#D97706', bg: '#FFFBEB' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${filter === tab.key ? tab.color + '40' : '#E2E8F0'}`, background: filter === tab.key ? tab.bg : 'transparent', fontSize: 12, fontWeight: 600, color: filter === tab.key ? tab.color : '#64748B', cursor: 'pointer', transition: 'all 0.12s' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Student list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {shown.length === 0 ? (
                <div style={{ padding: '48px 32px', textAlign: 'center' }}>
                  <Users size={28} color="#CBD5E1" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>No students found</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', position: 'sticky', top: 0 }}>
                      {['#', 'STUDENT', 'STATUS', 'SUBMITTED AT', 'FILE'].map(col => (
                        <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.07em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((stu, i) => (
                      <tr key={stu.student_id}
                        style={{ borderBottom: '1px solid #F8FAFC' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#94A3B8', width: 40 }}>
                          {stu.roll_number !== '—' ? stu.roll_number : i + 1}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{stu.name}</p>
                          {stu.email && <p style={{ fontSize: 11, color: '#94A3B8', margin: '1px 0 0' }}>{stu.email}</p>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {stu.submitted ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                              background: stu.status === 'late' ? '#FFFBEB' : '#ECFDF5',
                              color:      stu.status === 'late' ? '#D97706' : '#059669',
                              border: `1px solid ${stu.status === 'late' ? '#FDE68A' : '#A7F3D0'}` }}>
                              <CheckCircle size={9} />
                              {stu.status === 'late' ? 'Late' : 'Submitted'}
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99, background: '#F1F5F9', color: '#94A3B8', border: '1px solid #E2E8F0' }}>
                              <Clock size={9} /> Pending
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>
                          {stu.submitted_at
                            ? new Date(stu.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {stu.file_url ? (
                            <a href={stu.file_url} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: FAC, textDecoration: 'none', padding: '4px 10px', borderRadius: 8, background: 'rgba(6,78,59,0.07)', border: '1px solid rgba(6,78,59,0.20)' }}>
                              <FileText size={11} />
                              {stu.file_name ? stu.file_name.slice(0, 20) + (stu.file_name.length > 20 ? '…' : '') : 'View PDF'}
                              <ExternalLink size={9} />
                            </a>
                          ) : stu.submitted ? (
                            <span style={{ fontSize: 12, color: '#94A3B8' }}>No file</span>
                          ) : (
                            <span style={{ fontSize: 12, color: '#CBD5E1' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────────────── */
export default function FacultyHomeworkPage() {
  const [homework,  setHomework ] = useState([])
  const [classes,   setClasses  ] = useState([])
  const [loading,   setLoading  ] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editHw,    setEditHw   ] = useState(null)
  const [viewSubs,  setViewSubs ] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [hwRes, classRes] = await Promise.all([
        fetch('/api/homework?faculty=true', { cache: 'no-store' }),
        fetch('/api/timetable/grid',        { cache: 'no-store' }),
      ])
      const hwJson    = hwRes.ok    ? await hwRes.json()    : {}
      const classJson = classRes.ok ? await classRes.json() : {}
      setHomework(hwJson.homework || [])
      setClasses(classJson.classes || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function togglePublish(hw) {
    const action = hw.is_published ? 'unpublish' : 'publish'
    const res = await fetch(`/api/homework?id=${hw.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      setHomework(prev => prev.map(h => h.id === hw.id ? { ...h, is_published: !h.is_published } : h))
      toast.success(action === 'publish' ? 'Published' : 'Unpublished')
    }
  }

  async function deleteHw(hw) {
    if (!confirm(`Delete "${hw.title}"?`)) return
    const res = await fetch(`/api/homework?id=${hw.id}`, { method: 'DELETE' })
    if (res.ok) {
      setHomework(prev => prev.filter(h => h.id !== hw.id))
      toast.success('Deleted')
    }
  }

  const published   = homework.filter(h =>  h.is_published)
  const unpublished = homework.filter(h => !h.is_published)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div className="page-header">
        <div>
          <h1 className="page-header-title">Homework</h1>
          <p className="page-header-sub">Create, manage, and review student submissions</p>
        </div>
        <div className="page-actions">
          <motion.button whileHover={{ scale: 1.02 }} className="btn-primary" onClick={() => { setEditHw(null); setShowModal(true) }}>
            <Plus size={15} /> New Homework
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total',     value: homework.length,   color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Published', value: published.length,  color: '#059669', bg: '#ECFDF5' },
          { label: 'Draft',     value: unpublished.length,color: '#D97706', bg: '#FFFBEB' },
        ].map(s => (
          <div key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 26, fontWeight: 800, color: s.color, margin: '0 0 4px', letterSpacing: '-0.02em' }}>{loading ? '—' : s.value}</p>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <Loader2 size={24} color="#CBD5E1" style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      ) : homework.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '56px 32px', textAlign: 'center' }}>
          <BookOpen size={36} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: '#64748B', margin: '0 0 6px' }}>No homework yet</p>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Click "New Homework" to create your first assignment.</p>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['TITLE','SUBJECT','CLASS','DUE DATE','SUBMISSIONS','STATUS','ACTIONS'].map(col => (
                    <th key={col} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B', letterSpacing: '0.07em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {homework.map((h, i) => (
                  <tr key={h.id}
                    style={{ borderBottom: i < homework.length - 1 ? '1px solid #F8FAFC' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '14px 20px', maxWidth: 240 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.title}</p>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'rgba(6,78,59,0.07)', color: FAC }}>{h.subject}</span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: 12, color: '#64748B' }}>{h.class_name || 'All'}</span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: 12, color: isOverdue(h.due_date) ? '#DC2626' : '#475569', fontWeight: isOverdue(h.due_date) ? 700 : 400 }}>
                        {formatDate(h.due_date)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <button onClick={() => setViewSubs(h)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: FAC, background: 'rgba(6,78,59,0.07)', border: '1px solid rgba(6,78,59,0.20)', padding: '4px 10px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,78,59,0.12)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(6,78,59,0.07)'}>
                        <Users size={12} /> {h.submission_count}
                      </button>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'capitalize',
                        background: h.is_published ? '#ECFDF5' : '#FFFBEB',
                        color:      h.is_published ? '#059669' : '#D97706',
                        border:     `1px solid ${h.is_published ? '#A7F3D0' : '#FDE68A'}` }}>
                        {h.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => setViewSubs(h)} title="View Submissions"
                          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(6,78,59,0.07)'; e.currentTarget.style.color = FAC }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' }}>
                          <Users size={12} />
                        </button>
                        <button onClick={() => { setEditHw(h); setShowModal(true) }} title="Edit"
                          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#2563EB' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' }}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => togglePublish(h)} title={h.is_published ? 'Unpublish' : 'Publish'}
                          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#F0FDF4'; e.currentTarget.style.color = '#059669' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' }}>
                          {h.is_published ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button onClick={() => deleteHw(h)} title="Delete"
                          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #E2E8F0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <HomeworkModal key="hw-modal" hw={editHw} classes={classes}
            onClose={() => { setShowModal(false); setEditHw(null) }}
            onSaved={load} />
        )}
        {viewSubs && (
          <SubmissionsPanel key="subs-panel" hw={viewSubs} onClose={() => setViewSubs(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
