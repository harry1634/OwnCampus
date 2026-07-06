'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp,
         Loader2, Upload, FileText, X, Paperclip, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DueBadge({ due_date, submitted }) {
  if (submitted) return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>Submitted</span>
  )
  if (!due_date) return null
  const days = Math.ceil((new Date(due_date) - new Date()) / 86400000)
  if (days < 0)  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>Overdue</span>
  if (days === 0) return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>Due Today</span>
  if (days <= 2)  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>Due in {days}d</span>
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>Due {formatDate(due_date)}</span>
}

/* ── Submit Modal ─────────────────────────────────────────────────────── */
function SubmitModal({ hw, onClose, onSubmitted }) {
  const [file,       setFile      ] = useState(null)
  const [uploading,  setUploading ] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    let fileUrl  = null
    let fileName = null

    try {
      // Upload PDF first if one was selected
      if (file) {
        setUploading(true)
        const fd = new FormData()
        fd.append('file', file)
        fd.append('homework_id', hw.id)
        const upRes  = await fetch('/api/upload/homework', { method: 'POST', body: fd })
        const upJson = await upRes.json()
        setUploading(false)
        if (!upRes.ok) throw new Error(upJson.error || 'Upload failed')
        fileUrl  = upJson.url
        fileName = upJson.name
      }

      // Submit homework
      const res  = await fetch(`/api/homework?id=${hw.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'submit', file_url: fileUrl, file_name: fileName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Submission failed')

      toast.success(json.status === 'late' ? 'Submitted (late)' : 'Work submitted successfully!')
      onSubmitted(hw.id, json.status || 'submitted', fileUrl, fileName)
      onClose()
    } catch (err) {
      setUploading(false)
      toast.error(err.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const busy = uploading || submitting

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && !busy && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        style={{ width: '100%', maxWidth: 460, background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 64px rgba(15,23,42,0.18)' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={16} color="#7C3AED" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Submit Your Work</p>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{hw.title}</p>
            </div>
          </div>
          {!busy && (
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Upload PDF (optional)</p>

            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#F5F3FF', border: '1.5px solid #DDD6FE', borderRadius: 12 }}>
                <FileText size={18} color="#7C3AED" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                {!busy && (
                  <button type="button" onClick={() => setFile(null)} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: '#EDE9FE', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED', flexShrink: 0 }}>
                    <X size={11} />
                  </button>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                style={{ width: '100%', padding: '20px', border: '2px dashed #E2E8F0', borderRadius: 12, background: '#F8FAFC', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#DDD6FE'; e.currentTarget.style.background = '#F5F3FF' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC' }}>
                <Paperclip size={22} color="#94A3B8" />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#64748B', margin: 0 }}>Click to attach PDF</p>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>PDF only · Max 10 MB</p>
              </button>
            )}
            <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0]
                if (!f) return
                if (f.type !== 'application/pdf') { toast.error('Only PDF files are allowed'); return }
                if (f.size > 10 * 1024 * 1024) { toast.error('File must be under 10 MB'); return }
                setFile(f)
              }} />
          </div>

          {hw.is_overdue && (
            <div style={{ padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: 12, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 7 }}>
              <AlertTriangle size={13} /> This assignment is overdue — it will be marked as a late submission.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} disabled={busy}
              style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.5 : 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={busy}
              style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: '#7C3AED', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: busy ? 0.7 : 1 }}>
              {uploading
                ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Uploading…</>
                : submitting
                  ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Submitting…</>
                  : <><CheckCircle size={14} /> Submit Work</>
              }
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

/* ── Homework Card ─────────────────────────────────────────────────────── */
function HomeworkCard({ hw, onSubmitted }) {
  const [open,       setOpen      ] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)

  const isOverdue = hw.is_overdue && !hw.submitted

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: '#FFFFFF', border: `1px solid ${isOverdue ? '#FECACA' : '#E2E8F0'}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {isOverdue   && <div style={{ height: 3, background: '#EF4444' }} />}
        {hw.submitted && <div style={{ height: 3, background: '#059669' }} />}

        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: hw.submitted ? '#ECFDF5' : isOverdue ? '#FEF2F2' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {hw.submitted
              ? <CheckCircle size={18} color="#059669" />
              : isOverdue
                ? <AlertTriangle size={18} color="#DC2626" />
                : <BookOpen size={18} color="#2563EB" />
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>{hw.title}</h3>
              <DueBadge due_date={hw.due_date} submitted={hw.submitted} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: '#EFF6FF', color: '#2563EB' }}>{hw.subject}</span>
              {hw.class_name  && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: '#F1F5F9', color: '#475569' }}>Class {hw.class_name}</span>}
              {hw.faculty_name && <span style={{ fontSize: 11, color: '#94A3B8' }}>by {hw.faculty_name}</span>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {hw.description && (
                <button onClick={() => setOpen(o => !o)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {open ? 'Hide details' : 'View details'}
                </button>
              )}

              {hw.submitted && hw.file_url && (
                <a href={hw.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#059669', textDecoration: 'none' }}>
                  <FileText size={12} /> {hw.file_name || 'View submission'} <ExternalLink size={10} />
                </a>
              )}
              {hw.submitted && !hw.file_url && (
                <span style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={12} color="#059669" /> Marked complete
                </span>
              )}

              {!hw.submitted && (
                <button onClick={() => setShowSubmit(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', background: isOverdue ? '#FEF2F2' : '#7C3AED', color: isOverdue ? '#DC2626' : '#FFFFFF', cursor: 'pointer' }}>
                  <Upload size={12} /> Submit Your Work
                </button>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {open && hw.description && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '0 20px 16px 76px', fontSize: 13, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{hw.description}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showSubmit && (
          <SubmitModal
            key="submit-modal"
            hw={hw}
            onClose={() => setShowSubmit(false)}
            onSubmitted={(id, status, fileUrl, fileName) => {
              onSubmitted(id, status, fileUrl, fileName)
              setShowSubmit(false)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}

/* ── Main Page ────────────────────────────────────────────────────────── */
export default function StudentHomeworkPage() {
  const [homework, setHomework] = useState([])
  const [loading,  setLoading ] = useState(true)
  const [tab,      setTab     ] = useState('pending')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/homework?my=true', { cache: 'no-store' })
      const json = res.ok ? await res.json() : {}
      setHomework(json.homework || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onVisible() { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  function markSubmitted(id, status, fileUrl, fileName) {
    setHomework(prev => prev.map(h =>
      h.id === id ? { ...h, submitted: true, submission_status: status, file_url: fileUrl, file_name: fileName } : h
    ))
  }

  const pending   = homework.filter(h => !h.submitted)
  const submitted = homework.filter(h =>  h.submitted)
  const overdue   = pending.filter(h => h.is_overdue)
  const displayed = tab === 'pending' ? pending : submitted

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>My Homework</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Assignments from your teachers</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {[
          { label: 'Pending',   value: pending.length,   color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Overdue',   value: overdue.length,   color: '#DC2626', bg: '#FEF2F2' },
          { label: 'Submitted', value: submitted.length, color: '#059669', bg: '#ECFDF5' },
        ].map(s => (
          <div key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: '0 0 3px', letterSpacing: '-0.02em' }}>{loading ? '—' : s.value}</p>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'pending',   label: `Pending (${pending.length})`   },
          { key: 'submitted', label: `Submitted (${submitted.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              background: tab === t.key ? '#FFFFFF' : 'transparent',
              color:      tab === t.key ? '#0F172A' : '#64748B',
              boxShadow:  tab === t.key ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <Loader2 size={24} color="#CBD5E1" style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '48px 32px', textAlign: 'center' }}>
          <BookOpen size={32} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: '#64748B', margin: '0 0 4px' }}>
            {tab === 'pending' ? 'No pending homework' : 'No submitted homework yet'}
          </p>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
            {tab === 'pending' ? "You're all caught up!" : 'Submit your work to see it here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.map(h => (
            <HomeworkCard key={h.id} hw={h} onSubmitted={markSubmitted} />
          ))}
        </div>
      )}
    </div>
  )
}
