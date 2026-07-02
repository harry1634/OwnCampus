'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, BookOpen, GraduationCap, Building } from 'lucide-react'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { createClient }   from '@/lib/supabase/client'

export default function StudentContact() {
  const cu = useCurrentUser()
  const [faculty,    setFaculty   ] = useState([])
  const [branchName, setBranchName] = useState('')

  useEffect(() => {
    if (!cu.mounted || !cu.userId) return

    const supabase = createClient()

    async function load() {
      try {
        const { data: student } = await supabase
          .from('students')
          .select('branch_id, branches(name)')
          .eq('user_id', cu.userId)
          .single()

        const bName = student?.branches?.name || ''
        setBranchName(bName)

        const url  = bName ? `/api/faculty?branch=${encodeURIComponent(bName)}` : '/api/faculty'
        const r    = await fetch(url)
        const data = r.ok ? await r.json() : []
        setFaculty(Array.isArray(data) ? data : [])
      } catch {
        setFaculty([])
      }
    }

    load()
  }, [cu.mounted, cu.userId])

  if (!cu.mounted) return null

  const classFaculty = faculty

  const avatarInitials = name => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  const AVATAR_COLORS  = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Contact Faculty</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
          Faculty members assigned to{branchName ? ` ${branchName} Branch` : cu.classSection ? ` Class ${cu.classSection}` : ' your class'}
        </p>
      </div>

      {classFaculty.length === 0 ? (
        <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', padding: '56px 32px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <GraduationCap size={24} color="#CBD5E1" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#64748B', margin: '0 0 6px' }}>No faculty found for your class</p>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
            {branchName
              ? `No faculty assigned to ${branchName} Branch yet. Contact admin.`
              : cu.classSection
                ? `Class "${cu.classSection}" has no faculty assigned yet. Contact admin.`
                : 'Your class is not configured. Contact admin.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {classFaculty.map((f, i) => {
            const color    = AVATAR_COLORS[i % AVATAR_COLORS.length]
            const isHead   = f.role === 'class_teacher' || f.isClassTeacher
            return (
              <motion.div key={f.id || f.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <div style={{ height: 4, background: color, opacity: 0.7 }} />
                <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  {/* Avatar */}
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `${color}18`, border: `2px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color }}>{avatarInitials(f.name)}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0 }}>{f.name}</h3>
                      {isHead && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' }}>
                          Class Teacher
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {f.department && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: color, background: `${color}12`, padding: '3px 9px', borderRadius: 99 }}>
                          <Building size={10} /> {f.department}
                        </span>
                      )}
                      {(Array.isArray(f.subjects) ? f.subjects : String(f.subjects || f.subject || '').split(',')).map(s => String(s).trim()).filter(Boolean).map(sub => (
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

      {/* HOD/Admin contact */}
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
