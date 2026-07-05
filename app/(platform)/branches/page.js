'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Plus, Trash2, Edit2, Check, X, Users, UserCheck, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export default function BranchesPage() {
  const [branches,    setBranches   ] = useState([])
  const [loading,     setLoading    ] = useState(true)
  const [newName,     setNewName    ] = useState('')
  const [newCode,     setNewCode    ] = useState('')
  const [creating,    setCreating   ] = useState(false)
  const [editId,      setEditId     ] = useState(null)
  const [editName,    setEditName   ] = useState('')
  const [editCode,    setEditCode   ] = useState('')
  const [saving,      setSaving     ] = useState(false)
  const [deleteId,    setDeleteId   ] = useState(null)
  const [deleting,    setDeleting   ] = useState(false)
  const [counts,      setCounts     ] = useState({})   // { branchId: { students, faculty } }

  async function fetchBranches() {
    setLoading(true)
    try {
      const r = await fetch('/api/branches')
      const d = await r.json()
      setBranches(d.branches || [])
    } catch { toast.error('Failed to load branches.') }
    finally { setLoading(false) }
  }

  async function fetchCounts() {
    try {
      const [sr, fr] = await Promise.all([fetch('/api/students'), fetch('/api/faculty')])
      const students = await sr.json()
      const faculty  = await fr.json()
      const map = {}
      ;(Array.isArray(students) ? students : []).forEach(s => {
        if (s.branchId) { map[s.branchId] = map[s.branchId] || { students: 0, faculty: 0 }; map[s.branchId].students++ }
      })
      ;(Array.isArray(faculty) ? faculty : []).forEach(f => {
        if (f.branchId) { map[f.branchId] = map[f.branchId] || { students: 0, faculty: 0 }; map[f.branchId].faculty++ }
      })
      setCounts(map)
    } catch {}
  }

  useEffect(() => { fetchBranches(); fetchCounts() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const r = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), code: newCode.trim() }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setBranches(prev => [...prev, d.branch])
      setNewName(''); setNewCode('')
      toast.success(`Branch "${d.branch.name}" created.`)
    } catch (err) { toast.error(err.message) }
    finally { setCreating(false) }
  }

  async function handleSaveEdit(id) {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const r = await fetch(`/api/branches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), code: editCode.trim() }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setBranches(prev => prev.map(b => b.id === id ? { ...b, name: editName.trim(), code: editCode.trim() } : b))
      setEditId(null)
      toast.success('Branch updated.')
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    setDeleting(true)
    try {
      const r = await fetch(`/api/branches/${id}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setBranches(prev => prev.filter(b => b.id !== id))
      setDeleteId(null)
      toast.success('Branch removed.')
    } catch (err) { toast.error(err.message) }
    finally { setDeleting(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Branch Management</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Create and manage campus branches. Students and faculty register under a specific branch.</p>
      </div>

      {/* Create form */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={15} color="#2563EB" /> Add New Branch
        </h2>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Branch Name *</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Main Campus"
              required style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ flex: '0 1 140px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Code (optional)</label>
            <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="e.g. MAIN-01"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <button type="submit" disabled={creating || !newName.trim()}
            style={{ padding: '9px 20px', borderRadius: 10, background: '#2563EB', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 700, cursor: creating ? 'default' : 'pointer', opacity: !newName.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}>
            {creating ? 'Creating…' : '+ Add Branch'}
          </button>
        </form>
      </div>

      {/* Branch list */}
      <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
            {loading ? 'Loading…' : `${branches.length} Branch${branches.length !== 1 ? 'es' : ''}`}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Loading branches…</div>
        ) : branches.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Building2 size={32} color="#E2E8F0" style={{ marginBottom: 10 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', margin: 0 }}>No branches yet</p>
            <p style={{ fontSize: 12, color: '#CBD5E1', marginTop: 5 }}>Add a branch above to get started.</p>
          </div>
        ) : (
          <div style={{ padding: '8px 16px 16px' }}>
            {branches.map((branch, i) => {
              const cnt = counts[branch.id] || { students: 0, faculty: 0 }
              const isEditing = editId === branch.id
              const isDelConfirm = deleteId === branch.id
              return (
                <motion.div key={branch.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 12px', borderRadius: 12, marginTop: 6, border: '1px solid #F1F5F9', background: isEditing ? '#FAFBFF' : '#FAFAFA' }}>

                  <div style={{ width: 42, height: 42, borderRadius: 11, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={18} color="#2563EB" />
                  </div>

                  {isEditing ? (
                    <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                        style={{ flex: '1 1 160px', padding: '6px 10px', borderRadius: 8, border: '1.5px solid #2563EB', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit' }} />
                      <input value={editCode} onChange={e => setEditCode(e.target.value)} placeholder="Code"
                        style={{ flex: '0 1 110px', padding: '6px 10px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit' }} />
                      <button onClick={() => handleSaveEdit(branch.id)} disabled={saving}
                        style={{ padding: '6px 14px', borderRadius: 8, background: '#2563EB', color: '#FFF', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Check size={12} /> Save
                      </button>
                      <button onClick={() => setEditId(null)}
                        style={{ padding: '6px 12px', borderRadius: 8, background: '#F1F5F9', color: '#64748B', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{branch.name}</span>
                        {branch.code && <span style={{ fontSize: 10, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', padding: '1px 7px', borderRadius: 99 }}>{branch.code}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Users size={10} /> {cnt.students} student{cnt.students !== 1 ? 's' : ''}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <UserCheck size={10} /> {cnt.faculty} faculty
                        </span>
                      </div>
                    </div>
                  )}

                  {!isEditing && !isDelConfirm && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { setEditId(branch.id); setEditName(branch.name); setEditCode(branch.code || '') }}
                        style={{ padding: '6px 10px', borderRadius: 8, background: '#F1F5F9', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteId(branch.id)}
                        style={{ padding: '6px 10px', borderRadius: 8, background: '#FEF2F2', border: 'none', cursor: 'pointer', color: '#DC2626' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}

                  {isDelConfirm && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <AlertTriangle size={14} color="#D97706" />
                      <span style={{ fontSize: 11.5, color: '#92400E' }}>Remove branch?</span>
                      <button onClick={() => handleDelete(branch.id)} disabled={deleting}
                        style={{ padding: '5px 12px', borderRadius: 8, background: '#DC2626', color: '#FFF', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {deleting ? '…' : 'Remove'}
                      </button>
                      <button onClick={() => setDeleteId(null)}
                        style={{ padding: '5px 10px', borderRadius: 8, background: '#F1F5F9', color: '#64748B', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>


    </div>
  )
}
