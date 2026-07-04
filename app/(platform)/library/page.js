'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Library, BookOpen, Search, Plus, RotateCcw, AlertCircle, Download,
  Eye, BookMarked, Clock, Upload, X, Trash2, CheckCircle, FileText, AlertTriangle, User, Pencil,
} from 'lucide-react'
import Link from 'next/link'
import Pagination from '@/components/ui/Pagination'
import { downloadCSV } from '@/lib/exportUtils'
import { TableSkeleton } from '@/components/ui/SkeletonLoader'

const CATEGORIES = ['Fiction','Science','Mathematics','History','Computer','Commerce','Language','Art','Sports','Reference','Other']
const categoryColors = { Fiction: '#2563EB', Science: '#10B981', Mathematics: '#0891B2', History: '#D97706', Computer: '#7C3AED', Commerce: '#DB2777', Language: '#0F766E', Art: '#EA580C', Sports: '#059669', Reference: '#64748B', Other: '#94A3B8' }

function defaultDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

function isOverdue(due) {
  return new Date(due) < new Date(new Date().toDateString())
}

const CATALOG_PAGE_SIZE = 8
const ISSUED_PAGE_SIZE  = 5

const CSV_TEMPLATE = `title,author,isbn,publisher,category,total,rack
To Kill a Mockingbird,Harper Lee,978-0-06-112008-4,Lippincott,Fiction,5,A-12
Organic Chemistry,Morrison & Boyd,978-0-7432-7356-5,Pearson,Science,8,B-04`

/* ── CSV Parser ──────────────────────────────────────────────────── */
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const parseRow = row => {
    const cols = []
    let cur = '', inQ = false
    for (const ch of row) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cols.push(cur.trim())
    return cols
  }

  const header = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[\s\-_]/g, ''))
  const alias  = k => {
    if (k === 'name' || k === 'bookname') return 'title'
    if (k === 'genre') return 'category'
    if (k === 'copies' || k === 'qty' || k === 'quantity') return 'total'
    if (k === 'shelf' || k === 'location') return 'rack'
    return k
  }
  const cols = header.map(alias)

  return lines.slice(1).map((line, idx) => {
    const vals = parseRow(line)
    const row  = {}
    cols.forEach((c, i) => { row[c] = (vals[i] || '').trim() })

    const errors = []
    if (!row.title)  errors.push('title required')
    if (!row.author) errors.push('author required')
    const cat = CATEGORIES.find(c => c.toLowerCase() === (row.category||'').toLowerCase()) || 'Other'

    return {
      _idx:      idx + 2,
      _ok:       errors.length === 0,
      _errors:   errors,
      title:     row.title  || '',
      author:    row.author || '',
      isbn:      row.isbn   || '',
      publisher: row.publisher || '',
      category:  cat,
      total:     parseInt(row.total) || 1,
      rack:      row.rack   || '',
    }
  })
}

/* ── Import Modal ────────────────────────────────────────────────── */
function ImportModal({ onClose, onImport }) {
  const [rows,     setRows    ] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)

  const process = text => { setRows(parseCSV(text)) }
  const onFile  = e => { const f = e.target.files[0]; if (f) f.text().then(process) }
  const onDrop  = e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) f.text().then(process) }

  const valid   = rows ? rows.filter(r => r._ok) : []
  const skipped = rows ? rows.filter(r => !r._ok) : []

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'books_template.csv'; a.click()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        style={{ background: '#FFFFFF', borderRadius: 20, boxShadow: '0 24px 64px rgba(15,23,42,0.22)', width: '100%', maxWidth: 640, maxHeight: '88vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={16} style={{ color: '#2563EB' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Import Books</p>
              <p style={{ fontSize: 12, color: '#64748B' }}>Upload a CSV file to bulk-add books</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><X size={14} /></button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Drop zone */}
          {!rows && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${dragging ? '#2563EB' : '#CBD5E1'}`, borderRadius: 14, padding: '36px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? '#EFF6FF' : '#F8FAFC', transition: 'all 0.15s' }}>
              <Upload size={28} style={{ color: dragging ? '#2563EB' : '#CBD5E1', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>Drop CSV here or <span style={{ color: '#2563EB' }}>browse</span></p>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Columns: title, author, isbn, publisher, category, total, rack</p>
              <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onFile} />
            </div>
          )}

          {/* Template download */}
          {!rows && (
            <button onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              <FileText size={14} /> Download CSV Template
            </button>
          )}

          {/* Preview */}
          {rows && (
            <>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: '#F0FDF4', color: '#16A34A', fontSize: 12, fontWeight: 600 }}>
                  <CheckCircle size={12} /> {valid.length} valid
                </span>
                {skipped.length > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 600 }}>
                    <AlertCircle size={12} /> {skipped.length} skipped
                  </span>
                )}
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['#', 'Title', 'Author', 'Category', 'Copies', 'Rack', 'Status'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r._idx} style={{ borderBottom: '1px solid #F1F5F9', background: r._ok ? 'transparent' : '#FFF8F8' }}>
                        <td style={{ padding: '7px 10px', color: '#94A3B8' }}>{r._idx}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0F172A', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title || '—'}</td>
                        <td style={{ padding: '7px 10px', color: '#475569' }}>{r.author || '—'}</td>
                        <td style={{ padding: '7px 10px', color: '#475569' }}>{r.category}</td>
                        <td style={{ padding: '7px 10px', color: '#475569' }}>{r.total}</td>
                        <td style={{ padding: '7px 10px', color: '#475569' }}>{r.rack || '—'}</td>
                        <td style={{ padding: '7px 10px' }}>
                          {r._ok
                            ? <span style={{ color: '#16A34A', fontWeight: 600 }}>✓</span>
                            : <span style={{ color: '#DC2626', fontSize: 11 }}>{r._errors.join(', ')}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setRows(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Choose another file</button>
                <button onClick={() => valid.length && onImport(valid)} disabled={!valid.length}
                  style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: valid.length ? '#2563EB' : '#CBD5E1', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: valid.length ? 'pointer' : 'default' }}>
                  Import {valid.length} Book{valid.length !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

/* ── Issue Modal ─────────────────────────────────────────────────── */
function IssueModal({ book, onClose, onConfirm }) {
  const [query,         setQuery        ] = useState('')
  const [selected,      setSelected     ] = useState(null)
  const [dueDate,       setDueDate      ] = useState(defaultDueDate)
  const [error,         setError        ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching,     setSearching    ] = useState(false)

  useEffect(() => {
    if (query.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    const t = setTimeout(() => {
      fetch(`/api/students?q=${encodeURIComponent(query)}&limit=6`)
        .then(r => r.json())
        .then(data => setSearchResults(Array.isArray(data) ? data.slice(0, 6) : []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false))
    }, 280)
    return () => clearTimeout(t)
  }, [query])

  const matches = searchResults

  const handleConfirm = () => {
    if (!selected) { setError('Select a student first'); return }
    if (!dueDate)  { setError('Set a due date'); return }
    onConfirm(selected.name, dueDate, selected.supabaseId)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        style={{ background: '#FFFFFF', borderRadius: 20, boxShadow: '0 24px 64px rgba(15,23,42,0.22)', width: '100%', maxWidth: 460 }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Issue Book</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{book.title}</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><X size={14} /></button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Book summary */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 36, height: 44, borderRadius: 5, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={16} style={{ color: '#FFF' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{book.title}</p>
              <p style={{ fontSize: 12, color: '#64748B' }}>{book.author} · {book.available} of {book.total} available</p>
            </div>
          </div>

          {/* Student search */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Student *</label>
            {selected ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #2563EB', background: '#EFF6FF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={13} style={{ color: '#FFF' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{selected.name}</p>
                    <p style={{ fontSize: 11, color: '#64748B' }}>{selected.class || ''}{selected.roll ? ` · ${selected.roll}` : ''}</p>
                  </div>
                </div>
                <button onClick={() => { setSelected(null); setQuery('') }} style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: '#BFDBFE', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D4ED8' }}><X size={11} /></button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1' }} />
                <input value={query} onChange={e => { setQuery(e.target.value); setError('') }} placeholder="Search student by name or roll…"
                  className="input-premium" style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 36 }} autoFocus />
                {matches.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', zIndex: 10, overflow: 'hidden' }}>
                    {matches.map(s => (
                      <button key={s.id} onClick={() => { setSelected(s); setQuery(''); setError('') }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                        onMouseOver={e => e.currentTarget.style.background = '#F8FAFC'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={12} style={{ color: '#2563EB' }} />
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{s.name}</p>
                          <p style={{ fontSize: 11, color: '#94A3B8' }}>{s.class || 'No class'}{s.roll ? ` · ${s.roll}` : ''}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searching && <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Searching…</p>}
                {!searching && query.trim().length >= 2 && matches.length === 0 && (
                  <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>No students found for "{query}"</p>
                )}
                {query.trim().length > 0 && query.trim().length < 2 && (
                  <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Type at least 2 characters to search</p>
                )}
              </div>
            )}
          </div>

          {/* Due date */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Due Date *</label>
            <input type="date" value={dueDate} min={new Date().toISOString().slice(0, 10)} onChange={e => setDueDate(e.target.value)}
              className="input-premium" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>

          {error && <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>{error}</p>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleConfirm}
              style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: '#2563EB', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Issue Book
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Delete Confirm Dialog ───────────────────────────────────────── */
function DeleteConfirm({ book, onConfirm, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        style={{ background: '#FFFFFF', borderRadius: 18, boxShadow: '0 20px 56px rgba(15,23,42,0.20)', width: '100%', maxWidth: 380, padding: 28 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={18} style={{ color: '#DC2626' }} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Delete Book</p>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>This will permanently remove <strong>{book.title}</strong> from the catalog.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#DC2626', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Edit Book Modal ─────────────────────────────────────────────── */
function EditBookModal({ book, onClose, onSaved }) {
  const CATS = ['Fiction','Science','Mathematics','History','Computer','Commerce','Language','Art','Sports','Reference','Other']
  const [form,    setForm   ] = useState({
    title:     book.title     || '',
    author:    book.author    || '',
    isbn:      book.isbn      || '',
    publisher: book.publisher || '',
    category:  book.category  || 'Other',
    total:     String(book.total || 1),
    rack:      book.rack      || '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError ] = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    try {
      const res  = await fetch('/api/library', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          id:            book.id,
          title:         form.title.trim(),
          author:        form.author.trim()    || null,
          isbn:          form.isbn.trim()      || null,
          publisher:     form.publisher.trim() || null,
          category:      form.category         || 'Other',
          total_copies:  parseInt(form.total)  || 1,
          rack_number:   form.rack.trim()      || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setError(json.error || 'Failed to save'); setSaving(false); return }
      onSaved(json.book)
      onClose()
    } catch (e) { setError(e.message); setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        style={{ background: '#FFFFFF', borderRadius: 20, boxShadow: '0 24px 64px rgba(15,23,42,0.22)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pencil size={15} style={{ color: '#2563EB' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Edit Book</p>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>Update book details</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}><X size={14} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <p style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', margin: 0 }}>{error}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Title *', key: 'title', placeholder: 'e.g. Organic Chemistry', span: 2 },
              { label: 'Author', key: 'author', placeholder: 'e.g. Morrison & Boyd' },
              { label: 'Publisher', key: 'publisher', placeholder: 'e.g. Pearson' },
              { label: 'ISBN', key: 'isbn', placeholder: '978-0-00-000000-0' },
              { label: 'Total Copies', key: 'total', placeholder: '1', type: 'number' },
              { label: 'Rack / Shelf', key: 'rack', placeholder: 'e.g. B-04' },
            ].map(f => (
              <div key={f.key} style={f.span ? { gridColumn: `1 / span ${f.span}` } : {}}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>{f.label}</label>
                <input type={f.type || 'text'} value={form[f.key]} onChange={set(f.key)} placeholder={f.placeholder}
                  className="input-premium" style={{ width: '100%', boxSizing: 'border-box', fontSize: 13 }} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Category</label>
              <select value={form.category} onChange={set('category')} className="input-premium" style={{ width: '100%', fontSize: 13 }}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: saving ? '#93C5FD' : '#2563EB', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function LibraryPage() {

  const [books,         setBooks        ] = useState([])
  const [issuedBooks,   setIssuedBooks  ] = useState([])
  const [loadingBooks,  setLoadingBooks ] = useState(true)
  const [search,        setSearch       ] = useState('')
  const [activeTab,     setActiveTab    ] = useState('catalog')
  const [catalogPage,   setCatalogPage  ] = useState(1)
  const [issuedPage,    setIssuedPage   ] = useState(1)
  const [showImport,    setShowImport   ] = useState(false)
  const [importToast,   setImportToast  ] = useState(null)
  const [deleteTarget,  setDeleteTarget ] = useState(null)
  const [issueTarget,   setIssueTarget  ] = useState(null)
  const [editTarget,    setEditTarget   ] = useState(null)

  const loadBooks = () => {
    return Promise.all([
      fetch('/api/library?type=catalog&limit=200', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}),
      fetch('/api/library?type=issued&limit=100',  { cache: 'no-store' }).then(r => r.ok ? r.json() : {}),
    ]).then(([catData, issData]) => {
      setBooks(catData.books || [])
      setIssuedBooks((issData.issues || []).map(i => ({
        ...i,
        due:      i.dueDate,
        returned: i.status === 'returned',
        student:  i.borrower,
        book:     i.bookTitle,
        issued:   i.issuedDate,
      })))
    }).catch(() => {}).finally(() => setLoadingBooks(false))
  }

  useEffect(() => { loadBooks() }, [])

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.author || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.isbn || '').includes(search)
  )

  const totalBooks = books.reduce((s, b) => s + (b.total || 0), 0)
  const available  = books.reduce((s, b) => s + (b.available || 0), 0)
  const issued     = totalBooks - available
  const overdue    = issuedBooks.filter(i => isOverdue(i.due || i.dueDate) && !i.returned).length

  const catalogTotalPages = Math.max(1, Math.ceil(filtered.length / CATALOG_PAGE_SIZE))
  const paginatedCatalog  = filtered.slice((catalogPage - 1) * CATALOG_PAGE_SIZE, catalogPage * CATALOG_PAGE_SIZE)
  const issuedTotalPages  = Math.max(1, Math.ceil(issuedBooks.length / ISSUED_PAGE_SIZE))
  const paginatedIssued   = issuedBooks.slice((issuedPage - 1) * ISSUED_PAGE_SIZE, issuedPage * ISSUED_PAGE_SIZE)

  const handleImport = async rows => {
    let count = 0
    for (const r of rows) {
      try {
        const res = await fetch('/api/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_book', ...r }),
        })
        const json = await res.json()
        if (json.success) count++
      } catch {}
    }
    setShowImport(false)
    setImportToast(`${count} book${count !== 1 ? 's' : ''} imported`)
    setTimeout(() => setImportToast(null), 3500)
    loadBooks()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      if (deleteTarget.id && typeof deleteTarget.id === 'string' && deleteTarget.id.includes('-')) {
        await fetch(`/api/library?id=${deleteTarget.id}`, { method: 'DELETE' })
      }
      setBooks(prev => prev.filter(b => b.id !== deleteTarget.id))
    } catch {}
    setDeleteTarget(null)
  }

  const handleReturn = async (issueId) => {
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'return', issue_id: issueId }),
      })
      const json = await res.json()
      if (json.error) { setImportToast(`Error: ${json.error}`); setTimeout(() => setImportToast(null), 4000); return }
    } catch {}
    setImportToast('Book returned successfully')
    setTimeout(() => setImportToast(null), 3000)
    loadBooks()
  }

  const handleIssue = async (studentName, dueDate, studentId) => {
    if (!issueTarget) return
    const bookTitle = issueTarget.title
    const bookId    = issueTarget.id
    setIssueTarget(null)
    try {
      const res  = await fetch('/api/library', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'issue', book_id: bookId, user_id: studentId }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setImportToast(`Error: ${json.error || 'Issue failed'}`)
        setTimeout(() => setImportToast(null), 4000)
        return
      }
    } catch {
      setImportToast('Network error — book not issued')
      setTimeout(() => setImportToast(null), 4000)
      return
    }
    setImportToast(`"${bookTitle}" issued to ${studentName}`)
    setTimeout(() => setImportToast(null), 3500)
    await loadBooks()
    setActiveTab('issued')
  }

  const handleEditSaved = () => {
    loadBooks()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Library</h1>
          <p className="page-header-sub">Manage books, issues, returns &amp; fines</p>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => {
            const headers = ['ISBN', 'Title', 'Author', 'Publisher', 'Category', 'Total Copies', 'Available', 'Issued', 'Rack']
            const rows = books.map(b => [b.isbn, b.title, b.author, b.publisher, b.category, b.total, b.available, b.total - b.available, b.rack])
            downloadCSV('library-report.csv', headers, rows)
          }}><Download size={15} /> Export</button>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload size={15} /> Import CSV
          </button>
          <Link href="/library/new">
            <motion.button whileHover={{ scale: 1.02 }} className="btn-primary">
              <Plus size={15} /> Add Book
            </motion.button>
          </Link>
        </div>
      </div>

      {/* KPI Cards — real data from store */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Books',  value: totalBooks.toLocaleString(), icon: BookOpen,    iconColor: '#2563EB', iconBg: '#EFF6FF' },
          { label: 'Available',    value: available.toLocaleString(),   icon: Library,     iconColor: '#10B981', iconBg: '#F0FDF4' },
          { label: 'Issued',       value: issued.toLocaleString(),      icon: RotateCcw,   iconColor: '#F59E0B', iconBg: '#FFFBEB' },
          { label: 'Overdue',      value: overdue,                      icon: AlertCircle, iconColor: '#EF4444', iconBg: '#FEF2F2' },
        ].map((stat, i) => {
          const StatIcon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ translateY: -2, boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <StatIcon size={18} style={{ color: stat.iconColor }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#64748B', marginBottom: 6 }}>{stat.label}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 30, fontWeight: 700, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.03em' }}>{stat.value}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: 5, borderRadius: 14, background: '#F1F5F9', border: '1px solid #E2E8F0', width: 'fit-content', position: 'relative' }}>
        {[
          { key: 'catalog', label: 'Book Catalog', icon: BookMarked, count: filtered.length },
          { key: 'issued',  label: 'Issued Books',  icon: Clock,      count: issuedBooks.length },
        ].map(tab => {
          const active = activeTab === tab.key
          const Icon = tab.icon
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'transparent', transition: 'color 0.15s', color: active ? '#2563EB' : '#64748B', fontWeight: active ? 600 : 500, fontSize: 13, zIndex: 1 }}>
              {active && (
                <motion.div layoutId="lib-tab-bg"
                  style={{ position: 'absolute', inset: 0, borderRadius: 10, background: '#FFFFFF', boxShadow: '0 1px 6px rgba(15,23,42,0.08), 0 0 0 1px rgba(37,99,235,0.10)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
              )}
              <Icon size={14} style={{ position: 'relative', zIndex: 1, flexShrink: 0 }} />
              <span style={{ position: 'relative', zIndex: 1, whiteSpace: 'nowrap' }}>{tab.label}</span>
              <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 18, padding: '0 6px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: active ? '#EFF6FF' : '#E2E8F0', color: active ? '#2563EB' : '#94A3B8', border: active ? '1px solid #BFDBFE' : '1px solid #E2E8F0', transition: 'all 0.15s' }}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Catalog Tab */}
      {activeTab === 'catalog' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1', pointerEvents: 'none' }} />
              <input type="text" placeholder="Search title, author, ISBN…" value={search} onChange={e => { setSearch(e.target.value); setCatalogPage(1) }}
                className="input-premium" style={{ paddingLeft: 36, paddingTop: 8, paddingBottom: 8, fontSize: 12 }} />
            </div>
          </div>

          {loadingBooks ? (
            <TableSkeleton rows={8} cols={6} />
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <BookOpen size={36} style={{ color: '#E2E8F0', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8' }}>
                {books.length === 0 ? 'No books in catalog yet. Add a book or import CSV.' : 'No books match your search.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table-premium">
                  <thead>
                    <tr>
                      <th>Title / Author</th><th>Category</th><th>Publisher</th>
                      <th>Rack</th><th>Available</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCatalog.map((book, i) => {
                      const catColor = categoryColors[book.category] || '#64748B'
                      return (
                        <motion.tr key={book.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                          <td>
                            <p className="font-semibold text-xs" style={{ color: '#0F172A' }}>{book.title}</p>
                            <p className="text-xs" style={{ color: '#94A3B8' }}>{book.author}{book.isbn ? ` · ISBN: ${book.isbn}` : ''}</p>
                          </td>
                          <td><span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: `${catColor}18`, color: catColor }}>{book.category}</span></td>
                          <td><span className="text-xs" style={{ color: '#64748B' }}>{book.publisher || '—'}</span></td>
                          <td><span className="font-mono text-xs" style={{ color: '#2563EB' }}>{book.rack || '—'}</span></td>
                          <td><span className="text-sm font-bold" style={{ color: book.available === 0 ? '#DC2626' : '#16A34A' }}>{book.available}/{book.total}</span></td>
                          <td>
                            <span className="text-xs px-2 py-1 rounded-lg font-medium"
                              style={{ background: book.available === 0 ? '#FEF2F2' : '#F0FDF4', color: book.available === 0 ? '#DC2626' : '#16A34A' }}>
                              {book.available === 0 ? 'All Issued' : 'Available'}
                            </span>
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <button onClick={() => setEditTarget(book)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors" style={{ color: '#2563EB' }} title="Edit">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setIssueTarget(book)} disabled={book.available === 0}
                                className="text-xs px-2 py-1 rounded-lg font-medium disabled:opacity-40"
                                style={{ background: book.available === 0 ? '#F1F5F9' : '#EFF6FF', color: book.available === 0 ? '#94A3B8' : '#2563EB', cursor: book.available === 0 ? 'default' : 'pointer' }}>
                                Issue
                              </button>
                              <button onClick={() => setDeleteTarget(book)}
                                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: '#EF4444' }} title="Delete">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={catalogPage} totalPages={catalogTotalPages} totalItems={filtered.length} pageSize={CATALOG_PAGE_SIZE} onPageChange={setCatalogPage} label="books" />
            </>
          )}
        </div>
      )}

      {/* Issued Tab */}
      {activeTab === 'issued' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {issuedBooks.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <Clock size={36} style={{ color: '#E2E8F0', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8' }}>No books issued yet.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table-premium">
                  <thead>
                    <tr><th>Book</th><th>Student</th><th>Issued</th><th>Due Date</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {issuedBooks.slice((issuedPage - 1) * ISSUED_PAGE_SIZE, issuedPage * ISSUED_PAGE_SIZE).map((issue, i) => {
                      const over = isOverdue(issue.due)
                      return (
                        <motion.tr key={issue.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                          <td><p className="text-xs font-semibold" style={{ color: '#0F172A' }}>{issue.book}</p></td>
                          <td><p className="text-xs" style={{ color: '#64748B' }}>{issue.student}</p></td>
                          <td><p className="text-xs" style={{ color: '#94A3B8' }}>{issue.issued}</p></td>
                          <td><p className="text-xs font-medium" style={{ color: over ? '#DC2626' : '#64748B' }}>{issue.due}</p></td>
                          <td>
                            <span className="text-xs px-2 py-1 rounded-lg font-medium"
                              style={{ background: over ? '#FEF2F2' : '#F0FDF4', color: over ? '#DC2626' : '#16A34A' }}>
                              {over ? 'Overdue' : 'Active'}
                            </span>
                          </td>
                          <td>
                            <button onClick={() => handleReturn(issue.id)}
                              className="text-xs px-2 py-1 rounded-lg font-medium"
                              style={{ background: '#F0FDF4', color: '#16A34A', cursor: 'pointer', border: 'none' }}>
                              Return
                            </button>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={issuedPage} totalPages={Math.max(1, Math.ceil(issuedBooks.length / ISSUED_PAGE_SIZE))} totalItems={issuedBooks.length} pageSize={ISSUED_PAGE_SIZE} onPageChange={setIssuedPage} label="issued books" />
            </>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showImport   && <ImportModal key="import" onClose={() => setShowImport(false)} onImport={handleImport} />}
        {deleteTarget && <DeleteConfirm key="delete" book={deleteTarget} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
        {issueTarget  && <IssueModal key="issue" book={issueTarget} onClose={() => setIssueTarget(null)} onConfirm={handleIssue} />}
        {editTarget   && <EditBookModal key="edit" book={editTarget} onClose={() => setEditTarget(null)} onSaved={handleEditSaved} />}
      </AnimatePresence>

      {/* Import toast */}
      <AnimatePresence>
        {importToast && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 9998, background: '#0F172A', color: '#FFF', borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(15,23,42,0.22)', whiteSpace: 'nowrap' }}>
            <CheckCircle size={15} style={{ color: '#4ADE80' }} />
            {importToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
