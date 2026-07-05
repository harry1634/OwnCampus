'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, Users, Plus, Search, Target, Clock,
  PhoneCall, MessageSquare, Calendar, ArrowUpRight, ArrowRight,
  Globe, Share2, MessageCircle, MapPin, UserCheck,
  Upload, X, Download, CheckCircle, AlertCircle, FileText,
  Pencil, Save, Trash2,
} from 'lucide-react'

const ADMS_AVATAR_COLORS = ['#2563EB','#7C3AED','#0891B2','#16A34A','#D97706','#DB2777']
const augmentLead = (lead, idx) => ({
  ...lead,
  initials:    (lead.name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?',
  avatarColor: lead.avatarColor || ADMS_AVATAR_COLORS[idx % ADMS_AVATAR_COLORS.length],
})
import Link from 'next/link'
import Pagination from '@/components/ui/Pagination'

const VALID_SOURCES  = ['website','google','facebook','instagram','whatsapp','referral','walk_in']
const VALID_STATUSES = ['new','contacted','interested','follow_up','converted','not_interested']

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g,'_'))
  return lines.slice(1).filter(l => l.trim()).map((line, i) => {
    // handle quoted fields
    const vals = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = '' }
      else cur += ch
    }
    vals.push(cur.trim())
    const row = {}
    headers.forEach((h, j) => { row[h] = vals[j] ?? '' })
    // normalise common aliases
    row.name     = row.name || row.full_name || row.lead_name || ''
    row.phone    = row.phone || row.mobile || row.contact || ''
    row.program  = row.program || row.course || row.programme || ''
    row.source   = VALID_SOURCES.includes(row.source) ? row.source : 'website'
    row.status   = VALID_STATUSES.includes(row.status) ? row.status : 'new'
    row.score    = parseInt(row.score) || 0
    row.city     = row.city || row.location || ''
    row._row     = i + 2
    // validation
    const errors = []
    if (!row.name.trim())    errors.push('Name required')
    if (!row.phone.trim())   errors.push('Phone required')
    if (!row.program.trim()) errors.push('Program required')
    row._errors = errors
    row._ok     = errors.length === 0
    return row
  })
}

const CSV_TEMPLATE = `name,phone,program,source,status,counsellor,score,city
Ananya Singh,+91 98765 11111,B.Tech CSE,website,new,Priya M.,85,Delhi
Rohan Verma,+91 98765 22222,MBA,referral,follow_up,Arjun K.,72,Mumbai`

function ImportModal({ onClose, onImport }) {
  const fileRef = useRef()
  const [dragging, setDragging]   = useState(false)
  const [rows, setRows]           = useState(null)
  const [fileName, setFileName]   = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone]           = useState(false)

  const load = (file) => {
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => setRows(parseCSV(e.target.result))
    reader.readAsText(file)
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false)
    load(e.dataTransfer.files[0])
  }

  const goodRows  = rows ? rows.filter(r => r._ok)  : []
  const badRows   = rows ? rows.filter(r => !r._ok) : []

  const handleImport = async () => {
    if (!goodRows.length) return
    setImporting(true)
    try {
      const res = await fetch('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'bulk', leads: goodRows }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Import failed')
      onImport(Array.isArray(json.leads) ? json.leads : goodRows.map((r, i) => ({ ...r, id: `tmp_${Date.now()}_${i}` })))
      setDone(true)
      await new Promise(r => setTimeout(r, 700))
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'leads_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,0.55)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', overflowY:'auto', padding:'calc(var(--header-height) + 24px) 20px 40px' }}>
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }}
        style={{ background:'#FFFFFF', borderRadius:20, width:'100%', maxWidth:680, maxHeight:'calc(100vh - var(--header-height) - 64px)', display:'flex', flexDirection:'column', overflowX:'hidden', overflowY:'auto', boxShadow:'0 32px 80px rgba(15,23,42,0.22)' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Upload size={17} style={{ color:'#2563EB' }} />
            </div>
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:'#0F172A' }}>Import Leads from CSV</p>
              <p style={{ fontSize:12, color:'#94A3B8', marginTop:1 }}>Bulk-add leads from a spreadsheet</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:'1px solid #E2E8F0', background:'#F8FAFC', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={15} style={{ color:'#64748B' }} />
          </button>
        </div>

        <div style={{ overflowY:'auto', flex:1 }}>

          {/* Template download */}
          <div style={{ margin:'20px 24px 0', padding:'12px 16px', borderRadius:12, background:'#F8FAFC', border:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <FileText size={14} style={{ color:'#64748B' }} />
              <div>
                <p style={{ fontSize:12, fontWeight:600, color:'#374151' }}>Need a template?</p>
                <p style={{ fontSize:11, color:'#94A3B8' }}>Columns: name, phone, program, source, status, counsellor, score, city</p>
              </div>
            </div>
            <button onClick={downloadTemplate}
              style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'#2563EB', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:8, padding:'7px 12px', cursor:'pointer' }}>
              <Download size={13} /> Download
            </button>
          </div>

          {/* Drop zone */}
          <div style={{ margin:'16px 24px 0' }}>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border:`2px dashed ${dragging ? '#2563EB' : '#CBD5E1'}`,
                borderRadius:14, padding:'32px 20px', textAlign:'center', cursor:'pointer',
                background: dragging ? '#EFF6FF' : '#FAFAFA',
                transition:'all 0.15s',
              }}>
              <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }}
                onChange={e => load(e.target.files[0])} />
              <Upload size={28} style={{ color: dragging ? '#2563EB' : '#CBD5E1', margin:'0 auto 10px' }} />
              {fileName ? (
                <>
                  <p style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{fileName}</p>
                  <p style={{ fontSize:12, color:'#64748B', marginTop:4 }}>Click to choose a different file</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize:14, fontWeight:600, color:'#374151' }}>Drop your CSV here or <span style={{ color:'#2563EB' }}>click to browse</span></p>
                  <p style={{ fontSize:12, color:'#94A3B8', marginTop:6 }}>Only .csv files accepted</p>
                </>
              )}
            </div>
          </div>

          {/* Preview */}
          {rows && (
            <div style={{ margin:'16px 24px' }}>

              {/* Summary */}
              <div style={{ display:'flex', gap:10, marginBottom:14 }}>
                <div style={{ flex:1, padding:'10px 14px', borderRadius:10, background:'#F0FDF4', border:'1px solid #BBF7D0', display:'flex', alignItems:'center', gap:8 }}>
                  <CheckCircle size={14} style={{ color:'#16A34A' }} />
                  <span style={{ fontSize:13, fontWeight:700, color:'#15803D' }}>{goodRows.length} valid</span>
                </div>
                {badRows.length > 0 && (
                  <div style={{ flex:1, padding:'10px 14px', borderRadius:10, background:'#FEF2F2', border:'1px solid #FECACA', display:'flex', alignItems:'center', gap:8 }}>
                    <AlertCircle size={14} style={{ color:'#DC2626' }} />
                    <span style={{ fontSize:13, fontWeight:700, color:'#DC2626' }}>{badRows.length} skipped (errors)</span>
                  </div>
                )}
              </div>

              {/* Rows preview */}
              <div style={{ border:'1px solid #E2E8F0', borderRadius:12, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#F8FAFC' }}>
                      {['Row','Name','Phone','Program','Source','Status',''].map(h => (
                        <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#94A3B8', letterSpacing:'0.06em', textTransform:'uppercase', borderBottom:'1px solid #E2E8F0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #F8FAFC', background: row._ok ? '' : '#FFF5F5' }}>
                        <td style={{ padding:'9px 12px', fontSize:11, color:'#94A3B8' }}>#{row._row}</td>
                        <td style={{ padding:'9px 12px', fontSize:12, fontWeight:600, color:'#0F172A' }}>{row.name || <em style={{ color:'#EF4444' }}>—</em>}</td>
                        <td style={{ padding:'9px 12px', fontSize:12, color:'#475569' }}>{row.phone || <em style={{ color:'#EF4444' }}>—</em>}</td>
                        <td style={{ padding:'9px 12px', fontSize:12, color:'#475569' }}>{row.program || <em style={{ color:'#EF4444' }}>—</em>}</td>
                        <td style={{ padding:'9px 12px', fontSize:11, color:'#64748B' }}>{row.source}</td>
                        <td style={{ padding:'9px 12px', fontSize:11, color:'#64748B' }}>{row.status}</td>
                        <td style={{ padding:'9px 12px' }}>
                          {row._ok
                            ? <CheckCircle size={13} style={{ color:'#16A34A' }} />
                            : <span style={{ fontSize:10, fontWeight:600, color:'#DC2626' }}>{row._errors.join(', ')}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 24px', borderTop:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10, flexShrink:0 }}>
          <button onClick={onClose}
            style={{ padding:'9px 18px', borderRadius:10, border:'1px solid #E2E8F0', background:'#FFFFFF', fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer' }}>
            Cancel
          </button>
          <button onClick={handleImport} disabled={!goodRows.length || importing || done}
            style={{ padding:'9px 20px', borderRadius:10, border:'none', background: done ? '#16A34A' : !goodRows.length ? '#CBD5E1' : '#2563EB', fontSize:13, fontWeight:700, color:'#FFFFFF', cursor: goodRows.length && !importing ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', gap:8, transition:'background 0.2s', minWidth:140, justifyContent:'center' }}>
            {done ? <><CheckCircle size={14} /> Imported!</>
              : importing ? 'Importing…'
              : <><Upload size={14} /> Import {goodRows.length > 0 ? `${goodRows.length} Lead${goodRows.length > 1 ? 's' : ''}` : ''}</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const PROGRAMS   = ['B.Tech CSE','B.Tech ECE','B.Tech Mechanical','B.Tech Civil','MBA','BBA','B.Com','MCA','M.Tech','B.Sc Physics','B.Sc Chemistry','B.Ed','Other']
const SOURCES_L  = ['website','google','facebook','instagram','whatsapp','referral','walk_in']
const STATUSES_L = ['new','contacted','interested','follow_up','converted','not_interested']
const STATUS_LBL = { new:'New', contacted:'Contacted', interested:'Interested', follow_up:'Follow Up', converted:'Converted', not_interested:'Not Interested' }
const SRC_LBL    = { website:'Website', google:'Google', facebook:'Facebook', instagram:'Instagram', whatsapp:'WhatsApp', referral:'Referral', walk_in:'Walk-in' }
const COUNSELLORS = ['Priya M.','Arjun K.','Sneha P.','Rahul V.']

function LeadEditModal({ lead, onClose, onSave }) {
  const [form, setForm] = useState({
    name:       lead.name       || '',
    phone:      lead.phone      || '',
    city:       lead.city       || '',
    program:    lead.program    || '',
    source:     lead.source     || 'website',
    status:     lead.status     || 'new',
    counsellor: lead.counsellor || '',
    score:      String(lead.score ?? ''),
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name  = 'Required'
    if (!form.phone.trim()) e.phone = 'Required'
    setErrors(e); return !Object.keys(e).length
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({ ...form, score: parseInt(form.score) || 0 })
    onClose()
  }

  const F = ({ label, err, children }) => (
    <div>
      <label style={{ fontSize:11, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>{label}</label>
      {children}
      {err && <p style={{ fontSize:11, color:'#EF4444', marginTop:3 }}>{err}</p>}
    </div>
  )
  const inp = (k, extra={}) => (
    <input value={form[k]} onChange={set(k)} {...extra}
      style={{ width:'100%', boxSizing:'border-box', padding:'8px 12px', borderRadius:8, border:`1px solid ${errors[k] ? '#FCA5A5' : '#E2E8F0'}`, fontSize:13, outline:'none' }} />
  )
  const sel = (k, opts) => (
    <select value={form[k]} onChange={set(k)}
      style={{ width:'100%', boxSizing:'border-box', padding:'8px 12px', borderRadius:8, border:'1px solid #E2E8F0', fontSize:13, background:'#FFFFFF', outline:'none' }}>
      {opts.map(o => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,0.55)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', overflowY:'auto', padding:'calc(var(--header-height) + 24px) 20px 40px' }}>
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }}
        style={{ background:'#FFFFFF', borderRadius:20, width:'100%', maxWidth:540, maxHeight:'calc(100vh - var(--header-height) - 64px)', overflowY:'auto', boxShadow:'0 32px 80px rgba(15,23,42,0.22)' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Pencil size={15} style={{ color:'#2563EB' }} />
            </div>
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:'#0F172A' }}>Edit Lead</p>
              <p style={{ fontSize:12, color:'#94A3B8' }}>{lead.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'1px solid #E2E8F0', background:'#F8FAFC', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={14} style={{ color:'#64748B' }} />
          </button>
        </div>

        <div style={{ padding:24, display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <F label="Full Name *" err={errors.name}>{inp('name', { placeholder:'Lead name' })}</F>
          <F label="Phone *"     err={errors.phone}>{inp('phone', { placeholder:'+91 98765 00000' })}</F>
          <F label="City">{inp('city', { placeholder:'e.g. Delhi' })}</F>
          <F label="Lead Score (0–100)">{inp('score', { type:'number', min:0, max:100, placeholder:'0' })}</F>
          <F label="Program">
            {sel('program', [{ v:'', l:'Select program…' }, ...PROGRAMS.map(p => ({ v:p, l:p }))])}
          </F>
          <F label="Source">
            {sel('source', SOURCES_L.map(s => ({ v:s, l:SRC_LBL[s] })))}
          </F>
          <F label="Stage">
            {sel('status', STATUSES_L.map(s => ({ v:s, l:STATUS_LBL[s] })))}
          </F>
          <F label="Counsellor">
            {sel('counsellor', [{ v:'', l:'Unassigned' }, ...COUNSELLORS.map(c => ({ v:c, l:c }))])}
          </F>
        </div>

        <div style={{ padding:'16px 24px', borderTop:'1px solid #F1F5F9', display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:10, border:'1px solid #E2E8F0', background:'#FFF', fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{ padding:'9px 20px', borderRadius:10, border:'none', background:'#2563EB', fontSize:13, fontWeight:700, color:'#FFF', cursor:'pointer', display:'flex', alignItems:'center', gap:7 }}>
            {saving ? 'Saving…' : <><Save size={13} /> Save Changes</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function ScheduleModal({ lead, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ date: today, type: 'call', notes: '' })
  const [saved, setSaved] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.date) return
    try {
      const res = await fetch('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:           'follow_up',
          lead_id:        lead.id,
          follow_up_date: form.date,
          follow_up_type: form.type,
          notes:          form.notes,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert(d.error || 'Failed to schedule follow-up')
        return
      }
      setSaved(true)
      await new Promise(r => setTimeout(r, 600))
      onClose()
    } catch {
      alert('Network error — follow-up not saved')
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,0.55)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }}
        style={{ background:'#FFFFFF', borderRadius:20, width:'100%', maxWidth:420, boxShadow:'0 32px 80px rgba(15,23,42,0.22)' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Calendar size={15} style={{ color:'#2563EB' }} />
            </div>
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:'#0F172A' }}>Schedule Follow-up</p>
              <p style={{ fontSize:12, color:'#94A3B8' }}>{lead.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'1px solid #E2E8F0', background:'#F8FAFC', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={14} style={{ color:'#64748B' }} />
          </button>
        </div>

        <div style={{ padding:24, display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Date &amp; Time</label>
            <input type="datetime-local" value={form.date} onChange={set('date')}
              style={{ width:'100%', boxSizing:'border-box', padding:'8px 12px', borderRadius:8, border:'1px solid #E2E8F0', fontSize:13, outline:'none' }} />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Follow-up Type</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {[
                { v:'call',     l:'Call',     color:'#16A34A', bg:'#F0FDF4', border:'#BBF7D0' },
                { v:'whatsapp', l:'WhatsApp', color:'#16A34A', bg:'#F0FDF4', border:'#BBF7D0' },
                { v:'email',    l:'Email',    color:'#2563EB', bg:'#EFF6FF', border:'#BFDBFE' },
                { v:'visit',    l:'Visit',    color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
              ].map(t => (
                <button key={t.v} onClick={() => setForm(f => ({ ...f, type: t.v }))}
                  style={{ padding:'8px 0', borderRadius:8, border:`1px solid ${form.type===t.v ? t.border : '#E2E8F0'}`, background: form.type===t.v ? t.bg : '#F8FAFC', fontSize:12, fontWeight:600, color: form.type===t.v ? t.color : '#94A3B8', cursor:'pointer', transition:'all 0.12s' }}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="What to discuss…"
              style={{ width:'100%', boxSizing:'border-box', padding:'8px 12px', borderRadius:8, border:'1px solid #E2E8F0', fontSize:13, resize:'vertical', outline:'none' }} />
          </div>
        </div>

        <div style={{ padding:'16px 24px', borderTop:'1px solid #F1F5F9', display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:10, border:'1px solid #E2E8F0', background:'#FFF', fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{ padding:'9px 20px', borderRadius:10, border:'none', background: saved ? '#16A34A' : '#2563EB', fontSize:13, fontWeight:700, color:'#FFF', cursor:'pointer', display:'flex', alignItems:'center', gap:7 }}>
            {saved ? <><CheckCircle size={13} /> Scheduled!</> : <><Calendar size={13} /> Schedule</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const statusConfig = {
  new:            { label: 'New',            color: '#0891B2', bg: '#ECFEFF',  border: '#A5F3FC' },
  contacted:      { label: 'Contacted',      color: '#7C3AED', bg: '#F5F3FF',  border: '#DDD6FE' },
  interested:     { label: 'Interested',     color: '#2563EB', bg: '#EFF6FF',  border: '#BFDBFE' },
  follow_up:      { label: 'Follow Up',      color: '#D97706', bg: '#FFFBEB',  border: '#FDE68A' },
  converted:      { label: 'Converted',      color: '#16A34A', bg: '#F0FDF4',  border: '#BBF7D0' },
  not_interested: { label: 'Not Interested', color: '#DC2626', bg: '#FEF2F2',  border: '#FECACA' },
}

const SOURCE_META = {
  website:   { label: 'Website',      icon: Globe,         color: '#2563EB', bg: '#EFF6FF' },
  referral:  { label: 'Referral',     icon: Share2,        color: '#10B981', bg: '#F0FDF4' },
  instagram: { label: 'Social Media', icon: Share2,        color: '#DB2777', bg: '#FDF2F8' },
  facebook:  { label: 'Facebook',     icon: Share2,        color: '#DB2777', bg: '#FDF2F8' },
  google:    { label: 'Google',       icon: MapPin,        color: '#F59E0B', bg: '#FFFBEB' },
  walk_in:   { label: 'Walk-in',      icon: MapPin,        color: '#F59E0B', bg: '#FFFBEB' },
  whatsapp:  { label: 'WhatsApp',     icon: MessageCircle, color: '#16A34A', bg: '#F0FDF4' },
}

const PIPELINE_META = [
  { key: 'new',          label: 'New',          color: '#0891B2', bg: '#ECFEFF' },
  { key: 'contacted',    label: 'Contacted',    color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'interested',   label: 'Interested',   color: '#2563EB', bg: '#EFF6FF' },
  { key: 'follow_up',    label: 'Follow Up',    color: '#D97706', bg: '#FFFBEB' },
  { key: 'converted',    label: 'Converted',    color: '#16A34A', bg: '#F0FDF4' },
]

const PAGE_SIZE = 5

export default function AdmissionsPage() {
  const [leads, setLeads] = useState([])
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [page, setPage]                   = useState(1)
  const [showImport, setShowImport]       = useState(false)
  const [importToast, setImportToast]     = useState('')
  const [editLead, setEditLead]           = useState(null)
  const [scheduleLead, setScheduleLead]   = useState(null)

  useEffect(() => {
    fetch('/api/admissions')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setLeads(data.map(augmentLead)) })
      .catch(() => {})
  }, [])

  const handleImport = (rows) => {
    setLeads(prev => [...rows.map((r, i) => augmentLead(r, i)), ...prev])
    setImportToast(`${rows.length} lead${rows.length !== 1 ? 's' : ''} imported successfully`)
    setTimeout(() => setImportToast(''), 4000)
  }

  const handleCall = (lead) => {
    if (lead.phone) window.location.href = `tel:${lead.phone.replace(/\s/g,'')}`
  }

  const handleMessage = (lead) => {
    const num = lead.phone.replace(/\D/g, '')
    window.open(`https://wa.me/${num.startsWith('91') ? num : '91' + num}`, '_blank')
  }

  const handleSaveEdit = async (id, updates) => {
    try {
      const res = await fetch(`/api/admissions?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
      const updated = json.lead ? augmentLead(json.lead, 0) : null
      setLeads(prev => prev.map((l, i) => l.id === id ? augmentLead(updated || { ...l, ...updates }, i) : l))
      setImportToast('Lead updated successfully')
    } catch (err) {
      setImportToast(`Error: ${err.message}`)
    }
    setTimeout(() => setImportToast(''), 3000)
  }

  const handleDeleteLead = async (id) => {
    try {
      const res = await fetch(`/api/admissions?id=${id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Delete failed') }
      setLeads(prev => prev.filter(l => l.id !== id))
      setImportToast('Lead deleted')
    } catch (err) {
      setImportToast(`Error: ${err.message}`)
    }
    setTimeout(() => setImportToast(''), 3000)
  }

  const handleExport = () => {
    const headers = ['Name','Phone','City','Program','Source','Status','Counsellor','Score','Date']
    const rows = leads.map(l => [
      `"${l.name}"`, l.phone, l.city, `"${l.program}"`, l.source, l.status,
      l.counsellor || '', l.score, l.date,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'leads_export.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = leads.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = l.name.toLowerCase().includes(q) || l.phone.includes(q) || l.program.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    return matchSearch && matchStatus
  })

  useEffect(() => { setPage(1) }, [search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Real computed KPIs ──
  const total       = leads.length
  const converted   = leads.filter(l => l.status === 'converted').length
  const followUps   = leads.filter(l => l.status === 'follow_up').length
  const hotLeads    = leads.filter(l => l.score >= 75).length
  const convRate    = total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0'
  const avgScore    = total > 0 ? Math.round(leads.reduce((s, l) => s + (l.score || 0), 0) / total) : 0

  // Pipeline counts from real data
  const pipeline = PIPELINE_META.map(m => ({ ...m, count: leads.filter(l => l.status === m.key).length }))
  const pipelineTotal = pipeline.reduce((s, p) => s + p.count, 0)

  // Source breakdown from real data
  const sourceCounts = leads.reduce((acc, l) => { acc[l.source] = (acc[l.source] || 0) + 1; return acc }, {})
  const sourceConfig = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count, ...(SOURCE_META[key] || { label: key, icon: Globe, color: '#64748B', bg: '#F8FAFC' }) }))
  const sourceTotal = sourceConfig.reduce((s, x) => s + x.count, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <AnimatePresence>
        {showImport   && <ImportModal    onClose={() => setShowImport(false)}   onImport={handleImport} />}
        {editLead     && <LeadEditModal  onClose={() => setEditLead(null)}      lead={editLead}  onSave={u => handleSaveEdit(editLead.id, u)} />}
        {scheduleLead && <ScheduleModal  onClose={() => setScheduleLead(null)}  lead={scheduleLead} />}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {importToast && (
          <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-16 }}
            style={{ position:'fixed', top:24, right:24, zIndex:2000, background:'#0F172A', color:'#FFFFFF', padding:'12px 18px', borderRadius:12, fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8, boxShadow:'0 8px 24px rgba(0,0,0,0.2)' }}>
            <CheckCircle size={15} style={{ color:'#4ADE80' }} />
            {importToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Admission CRM</h1>
          <p className="page-header-sub">Track leads, counselling &amp; admission pipeline</p>
        </div>
        <div className="page-actions">
          <motion.button whileHover={{ scale: 1.02 }} onClick={handleExport}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10, border:'1px solid #E2E8F0', background:'#FFFFFF', fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer' }}>
            <Download size={14} /> Export CSV
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} onClick={() => setShowImport(true)}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:10, border:'1px solid #E2E8F0', background:'#FFFFFF', fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer' }}>
            <Upload size={14} /> Import CSV
          </motion.button>
          <Link href="/admissions/new">
            <motion.button whileHover={{ scale: 1.02 }} className="btn-primary">
              <Plus size={15} /> Add Lead
            </motion.button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="rg-4">
        {[
          { label: 'Total Leads',     value: String(total),        change: `${followUps} follow-ups`, sub: `${leads.filter(l=>l.status==='new').length} new this cycle`, icon: Users,      iconColor: '#2563EB', iconBg: '#EFF6FF', positive: true  },
          { label: 'Conversion Rate', value: `${convRate}%`,       change: `${converted} converted`,  sub: `of ${total} total leads`,                                    icon: Target,     iconColor: '#10B981', iconBg: '#F0FDF4', positive: true  },
          { label: 'Avg Lead Score',  value: String(avgScore),     change: `${hotLeads} hot`,         sub: 'leads with score ≥ 75',                                      icon: Clock,      iconColor: '#F59E0B', iconBg: '#FFFBEB', positive: hotLeads > 0 },
          { label: 'Not Interested',  value: String(leads.filter(l=>l.status==='not_interested').length), change: `${leads.filter(l=>l.status==='contacted').length} contacted`, sub: 'stage breakdown', icon: TrendingUp, iconColor: '#0891B2', iconBg: '#ECFEFF', positive: false },
        ].map((kpi, i) => {
          const KpiIcon = kpi.icon
          return (
            <motion.div key={kpi.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ translateY: -3, boxShadow: '0 12px 32px rgba(15,23,42,0.10)' }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '22px 24px', boxShadow: '0 2px 6px rgba(15,23,42,0.05)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: kpi.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KpiIcon size={19} style={{ color: kpi.iconColor }} />
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                  background: kpi.positive ? '#F0FDF4' : '#FFFBEB',
                  color: kpi.positive ? '#16A34A' : '#D97706',
                  border: `1px solid ${kpi.positive ? '#BBF7D0' : '#FDE68A'}`,
                }}>
                  {kpi.positive && <ArrowUpRight size={11} />}
                  {kpi.change}
                </span>
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 32, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 8 }}>{kpi.value}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 3 }}>{kpi.label}</p>
              <p style={{ fontSize: 12, color: '#94A3B8' }}>{kpi.sub}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Pipeline + Source Breakdown */}
      <div className="rg-32">

        {/* Pipeline Funnel */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '24px', boxShadow: '0 2px 6px rgba(15,23,42,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Admission Pipeline</h3>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{pipelineTotal} leads across all tracked stages</p>
            </div>
            <Link href="#leads" style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>View all →</Link>
          </div>

          {/* Stage cards with arrows */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20 }}>
            {pipeline.map((stage, i) => (
              <div key={stage.label} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  style={{
                    flex: 1, minWidth: 0, minHeight: 90,
                    padding: '12px 8px', borderRadius: 12,
                    background: stage.bg, border: `1px solid ${stage.color}25`,
                    textAlign: 'center', cursor: 'default',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                  whileHover={{ scale: 1.03, boxShadow: `0 6px 20px ${stage.color}25` }}
                >
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 26, fontWeight: 800, color: stage.color, lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {stage.count}
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#64748B', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{stage.label}</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: stage.color, opacity: 0.8 }}>
                    {pipelineTotal > 0 ? Math.round((stage.count / pipelineTotal) * 100) : 0}%
                  </p>
                </motion.div>
                {i < pipeline.length - 1 && (
                  <ArrowRight size={13} style={{ color: '#CBD5E1', flexShrink: 0, margin: '0 3px' }} />
                )}
              </div>
            ))}
          </div>

          {/* Segmented bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>Pipeline progress</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>
                {converted} converted of {total} total
              </p>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden', display: 'flex', gap: 2 }}>
              {pipeline.map((stage, i) => (
                <motion.div key={i}
                  initial={{ width: 0 }} animate={{ width: `${pipelineTotal > 0 ? (stage.count / pipelineTotal) * 100 : 0}%` }}
                  transition={{ delay: 0.4 + i * 0.06, duration: 0.5 }}
                  style={{ height: '100%', background: stage.color, borderRadius: 2 }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 10 }}>
              {pipeline.map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Source Breakdown */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '24px', boxShadow: '0 2px 6px rgba(15,23,42,0.05)' }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Lead Sources</h3>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>Where your leads come from</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sourceConfig.length === 0 && (
              <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>No leads yet</p>
            )}
            {sourceConfig.map((src, i) => {
              const SrcIcon = src.icon
              const pct = sourceTotal > 0 ? Math.round((src.count / sourceTotal) * 100) : 0
              return (
                <motion.div key={src.key}
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: src.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SrcIcon size={13} style={{ color: src.color }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{src.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{src.count}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: src.color, background: src.bg, padding: '2px 7px', borderRadius: 99 }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: '#F1F5F9' }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                      style={{ height: '100%', borderRadius: 99, background: src.color }} />
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Total */}
          <div style={{ marginTop: 18, padding: '12px 14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Total leads</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{total}</span>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div id="leads" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 2px 6px rgba(15,23,42,0.05)', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px 20px', borderBottom: '1px solid #F1F5F9', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1' }} />
            <input
              type="text"
              placeholder="Search by name, phone or program…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-premium"
              style={{ paddingLeft: 36, paddingTop: 8, paddingBottom: 8, fontSize: 13, width: '100%' }}
            />
          </div>

          {/* Status filter pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            {['all', 'new', 'follow_up', 'converted'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{
                  fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                  background: statusFilter === s ? '#2563EB' : 'transparent',
                  color: statusFilter === s ? '#FFFFFF' : '#64748B',
                  border: statusFilter === s ? '1px solid #2563EB' : '1px solid #E2E8F0',
                }}>
                {s === 'all' ? 'All' : s === 'follow_up' ? 'Follow Up' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <span style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {filtered.length} leads
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Lead', 'Program', 'Source', 'Status', 'Score', 'Counsellor', 'Date', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '11px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.07em', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((lead, i) => {
                const status = statusConfig[lead.status]
                const scoreColor = lead.score >= 80 ? '#10B981' : lead.score >= 60 ? '#F59E0B' : '#EF4444'
                return (
                  <motion.tr key={lead.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F8FAFC' : 'none', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    {/* Lead */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: lead.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#FFFFFF', flexShrink: 0 }}>
                          {lead.initials}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{lead.name}</p>
                          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{lead.phone} · {lead.city}</p>
                        </div>
                      </div>
                    </td>

                    {/* Program */}
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{lead.program}</span>
                    </td>

                    {/* Source */}
                    <td style={{ padding: '14px 20px' }}>
                      {(() => {
                        const src = sourceConfig.find(s => s.key === lead.source)
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: src?.bg || '#F8FAFC', color: src?.color || '#64748B', border: `1px solid ${src?.color || '#64748B'}22` }}>
                            {lead.source.charAt(0).toUpperCase() + lead.source.slice(1)}
                          </span>
                        )
                      })()}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 20px' }}>
                      {status ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: status.bg, color: status.color, border: `1px solid ${status.border}` }}>
                          {status.label}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>{lead.status}</span>
                      )}
                    </td>

                    {/* Score */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 52, height: 5, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                          <div style={{ width: `${lead.score}%`, height: '100%', borderRadius: 99, background: scoreColor }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor }}>{lead.score}</span>
                      </div>
                    </td>

                    {/* Counsellor */}
                    <td style={{ padding: '14px 20px' }}>
                      {lead.counsellor ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <UserCheck size={11} style={{ color: '#2563EB' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{lead.counsellor}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#CBD5E1', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>

                    {/* Date */}
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: 12, color: '#94A3B8' }}>{lead.date}</span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {[
                          { icon: PhoneCall,     color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', title: 'Call',     onClick: () => handleCall(lead)                 },
                          { icon: MessageSquare, color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', title: 'WhatsApp', onClick: () => handleMessage(lead)              },
                          { icon: Calendar,      color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', title: 'Schedule', onClick: () => setScheduleLead(lead)            },
                          { icon: Pencil,        color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', title: 'Edit',     onClick: () => setEditLead(lead)                },
                          { icon: Trash2,        color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', title: 'Delete',   onClick: () => handleDeleteLead(lead.id)        },
                        ].map(({ icon: Icon, color, bg, border, title, onClick }) => (
                          <button key={title} title={title} onClick={onClick}
                            style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, border: `1px solid ${border}`, cursor: 'pointer', transition: 'transform 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            <Icon size={13} style={{ color }} />
                          </button>
                        ))}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#94A3B8' }}>No leads match your search</p>
            </div>
          )}

          <Pagination
            page={page} totalPages={totalPages}
            totalItems={filtered.length} pageSize={PAGE_SIZE}
            onPageChange={setPage} label="leads"
          />
        </div>
      </div>

    </div>
  )
}
