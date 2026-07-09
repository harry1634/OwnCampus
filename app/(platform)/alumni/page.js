'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, MapPin, Search, Plus, Mail, ExternalLink, Users, Globe, Building2, GraduationCap, SlidersHorizontal, Star } from 'lucide-react'
import Link from 'next/link'


function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const SORT_OPTIONS = ['name', 'batch-desc', 'company']

export default function AlumniPage() {
  const [alumniList, setAlumniList] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')

  useEffect(() => {
    fetch('/api/alumni')
      .then(r => r.json())
      .then(d => {
        if (d.alumni) {
          setAlumniList(d.alumni.map(a => ({ ...a, avatarColor: a.avatar_color, isMentor: a.is_mentor })))
        }
      })
      .catch(() => {})
  }, [])

  const handleSort = () => {
    const idx = SORT_OPTIONS.indexOf(sortBy)
    setSortBy(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length])
  }

  const sortLabel = sortBy === 'name' ? 'Name A–Z' : sortBy === 'batch-desc' ? 'Batch (New→Old)' : 'Company A–Z'

  const filtered = alumniList
    .filter(a => {
      const q = search.toLowerCase()
      const matchSearch = a.name.toLowerCase().includes(q) || a.company.toLowerCase().includes(q) || a.program.toLowerCase().includes(q)
      const matchFilter = filter === 'all' || (filter === 'mentor' && a.isMentor)
      return matchSearch && matchFilter
    })
    .sort((a, b) => {
      if (sortBy === 'batch-desc') return Number(b.batch) - Number(a.batch)
      if (sortBy === 'company') return a.company.localeCompare(b.company)
      return a.name.localeCompare(b.name)
    })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Alumni Network</h1>
          <p className="page-header-sub">Connect and engage with our global alumni community</p>
        </div>
        <div className="page-actions">
          <Link href="/alumni/new">
            <motion.button whileHover={{ scale: 1.02 }} className="btn-primary">
              <Plus size={15} /> Add Alumni
            </motion.button>
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="rg-4">
        {[
          { label: 'Total Alumni',  value: alumniList.length,                                                             icon: Users,         iconColor: '#2563EB', iconBg: '#EFF6FF' },
          { label: 'Countries',     value: new Set(alumniList.map(a => a.location).filter(Boolean)).size,                 icon: Globe,         iconColor: '#10B981', iconBg: '#F0FDF4' },
          { label: 'Top Companies', value: new Set(alumniList.map(a => a.company).filter(Boolean)).size,                  icon: Building2,     iconColor: '#F59E0B', iconBg: '#FFFBEB' },
          { label: 'Mentors',       value: alumniList.filter(a => a.isMentor).length,                                     icon: GraduationCap, iconColor: '#0891B2', iconBg: '#ECFEFF' },
        ].map((stat, i) => {
          const StatIcon = stat.icon
          return (
            <motion.div key={stat.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ translateY: -2, boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <StatIcon size={19} style={{ color: stat.iconColor }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#64748B', marginBottom: 8 }}>{stat.label}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 32, fontWeight: 700, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.03em' }}>{stat.value}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Search + Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, padding: '12px 16px', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1' }} />
          <input
            type="text"
            placeholder="Search by name, company or program…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 13, border: '1px solid #E2E8F0', borderRadius: 9, outline: 'none', color: '#0F172A', background: '#F8FAFC' }}
          />
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[
            { key: 'all',    label: 'All Alumni'  },
            { key: 'mentor', label: 'Mentors Only' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                background: filter === f.key ? '#2563EB' : 'transparent',
                color:      filter === f.key ? '#FFFFFF'  : '#64748B',
                border:     filter === f.key ? '1px solid #2563EB' : '1px solid transparent',
              }}>
              {f.label}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap', marginLeft: 'auto' }}>{filtered.length} of {alumniList.length}</span>

        <button onClick={handleSort} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#64748B', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <SlidersHorizontal size={12} /> {sortLabel}
        </button>
      </div>

      {/* Alumni Cards Grid */}
      <div className="rg-3">
        {filtered.map((alum, i) => (
          <motion.div key={alum.id}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            whileHover={{ translateY: -3, boxShadow: '0 12px 32px rgba(15,23,42,0.10)' }}
            style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 2px 6px rgba(15,23,42,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

            {/* Card top: avatar + name + batch */}
            <div style={{ padding: '24px 24px 20px', display: 'flex', alignItems: 'flex-start', gap: 16, borderBottom: '1px solid #F1F5F9' }}>
              {/* Avatar */}
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: alum.avatarColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 17, color: '#FFFFFF',
                boxShadow: `0 4px 12px ${alum.avatarColor}50`,
              }}>
                {getInitials(alum.name)}
              </div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alum.name}</p>
                  {alum.isMentor && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', flexShrink: 0 }}>
                      <Star size={8} fill="#D97706" /> MENTOR
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>Batch {alum.batch}</p>
                <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: '#F1F5F9', color: '#64748B' }}>{alum.program}</span>
              </div>
            </div>

            {/* Card body: company + location */}
            <div style={{ padding: '16px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Role + Company */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Briefcase size={14} style={{ color: '#94A3B8' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1 }}>Role</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alum.role}</p>
                </div>
              </div>

              {/* Company */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${alum.avatarColor}14`, border: `1px solid ${alum.avatarColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 size={14} style={{ color: alum.avatarColor }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: alum.avatarColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alum.company}</p>
              </div>

              {/* Location */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F8FAFC', border: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={14} style={{ color: '#94A3B8' }} />
                </div>
                <p style={{ fontSize: 13, color: '#64748B' }}>{alum.location}</p>
              </div>
            </div>

            {/* Card footer: actions */}
            <div style={{ padding: '14px 24px 20px', display: 'flex', gap: 10, borderTop: '1px solid #F1F5F9' }}>
              <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 9, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <Mail size={13} /> Email
              </button>
              <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 9, border: '1px solid #A7F3D0', background: '#ECFDF5', color: '#059669', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <ExternalLink size={13} /> LinkedIn
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
