'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, BookOpen, GraduationCap, Building, Search, X } from 'lucide-react'

const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2']
const avatarInitials = name => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

export default function StudentContact() {
  const [faculty,  setFaculty ] = useState([])
  const [loading,  setLoading ] = useState(true)
  const [search,   setSearch  ] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [departments, setDepartments] = useState([])

  const load = useCallback(async (q = '', dept = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q)    params.set('q', q)
      if (dept) params.set('dept', dept)
      const res  = await fetch(`/api/faculty?${params}`, { cache: 'no-store' })
      const data = res.ok ? await res.json() : []
      const list = Array.isArray(data) ? data : []
      setFaculty(list)
      // Collect unique departments for the filter
      const depts = [...new Set(list.map(f => f.dept).filter(Boolean))].sort()
      setDepartments(depts)
    } catch {
      setFaculty([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Live debounced search — fires 400 ms after the user stops typing
  useEffect(() => {
    const t = setTimeout(() => { load(search, deptFilter) }, 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function handleSearch(e) {
    e.preventDefault()
    load(search, deptFilter)
  }

  function clearFilters() {
    setSearch('')
    setDeptFilter('')
    load('', '')
  }

  const hasFilters = search || deptFilter

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Contact Faculty</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Find and contact faculty members at your institution</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by name, subject, or department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-premium"
            style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box' }}
          />
        </div>
        {departments.length > 0 && (
          <select
            value={deptFilter}
            onChange={e => { setDeptFilter(e.target.value); load(search, e.target.value) }}
            className="input-premium"
            style={{ minWidth: 160, fontSize: 13 }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <button type="submit" className="btn-primary" style={{ padding: '9px 20px', fontSize: 13 }}>Search</button>
        {hasFilters && (
          <button type="button" onClick={clearFilters}
            style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <X size={13} /> Clear
          </button>
        )}
      </form>

      {/* Faculty list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', padding: '20px 22px', height: 100 }} className="shimmer" />
          ))}
        </div>
      ) : faculty.length === 0 ? (
        <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', padding: '56px 32px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <GraduationCap size={24} color="#CBD5E1" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#64748B', margin: '0 0 6px' }}>
            {hasFilters ? 'No faculty match your search' : 'No faculty found'}
          </p>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
            {hasFilters ? 'Try a different name, subject, or department.' : 'Contact admin to add faculty members.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faculty.map((f, i) => {
            const color    = AVATAR_COLORS[i % AVATAR_COLORS.length]
            const subjects = Array.isArray(f.subjects) ? f.subjects : String(f.subjects || '').split(',').map(s => s.trim()).filter(Boolean)
            return (
              <motion.div key={f.supabaseId || f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <div style={{ height: 4, background: color, opacity: 0.7 }} />
                <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  {/* Avatar */}
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: f.avatar_url ? 'transparent' : `${color}18`, border: `2px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {f.avatar_url
                      ? <img src={f.avatar_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 18, fontWeight: 800, color }}>{avatarInitials(f.name)}</span>
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0 }}>{f.name || f.email}</h3>
                      {f.designation && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: '#F1F5F9', color: '#475569' }}>
                          {f.designation}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {f.dept && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color, background: `${color}12`, padding: '3px 9px', borderRadius: 99 }}>
                          <Building size={10} /> {f.dept}
                        </span>
                      )}
                      {subjects.map(sub => (
                        <span key={sub} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#475569', background: '#F1F5F9', padding: '3px 9px', borderRadius: 99 }}>
                          <BookOpen size={10} /> {sub}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {f.email && (
                        <a href={`mailto:${f.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Mail size={12} color="#2563EB" />
                          </div>
                          <span style={{ fontSize: 13, color: '#2563EB', fontWeight: 500 }}>{f.email}</span>
                        </a>
                      )}
                      {f.phone && (
                        <a href={`tel:${f.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Phone size={12} color="#059669" />
                          </div>
                          <span style={{ fontSize: 13, color: '#059669', fontWeight: 500 }}>{f.phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Help footer */}
      <div style={{ background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={16} color="#2563EB" />
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', margin: 0 }}>Can't find who you're looking for?</p>
          <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Contact the school administration office or your class teacher for assistance.</p>
        </div>
      </div>
    </div>
  )
}
