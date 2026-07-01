'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

function readFromStorage() {
  return {
    name:         localStorage.getItem('oc_user_name')  || '',
    email:        localStorage.getItem('oc_user_email') || '',
    role:         localStorage.getItem('oc_role')       || '',
    userId:       localStorage.getItem('oc_user_id')    || '',
    classSection: localStorage.getItem('oc_user_class') || '',
    roll:         localStorage.getItem('oc_user_roll')  || '',
    dept:         localStorage.getItem('oc_user_dept')  || '',
    designation:  localStorage.getItem('oc_user_desig') || '',
  }
}

export function useCurrentUser() {
  const [user, setUser] = useState({
    name: '', email: '', role: '', userId: '',
    classSection: '', roll: '',
    dept: '', designation: '',
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // First paint: read from localStorage immediately
    const local = readFromStorage()
    setUser(local)
    setMounted(true)

    // Then verify against the live Supabase session so stale localStorage never wins
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) return

      // Fetch profile for authoritative name / metadata
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, role, metadata')
        .eq('id', authUser.id)
        .single()

      const profileName =
        [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name       ||
        authUser.email.split('@')[0]

      // Overwrite only if different — prevents a flash if data was already correct
      const updates = {}
      if (profileName && profileName !== local.name) updates.name = profileName
      if (authUser.email && authUser.email !== local.email) updates.email = authUser.email
      if (authUser.id   && authUser.id   !== local.userId) updates.userId = authUser.id
      const m = profile?.metadata || {}
      if (m.class_section && m.class_section !== local.classSection) updates.classSection = m.class_section
      if (m.roll_number   && m.roll_number   !== local.roll)         updates.roll         = m.roll_number
      if (m.department    && m.department    !== local.dept)         updates.dept         = m.department
      if (m.designation   && m.designation   !== local.designation)  updates.designation  = m.designation

      if (Object.keys(updates).length > 0) {
        // Persist corrections to localStorage
        if (updates.name)         localStorage.setItem('oc_user_name',  updates.name)
        if (updates.email)        localStorage.setItem('oc_user_email', updates.email)
        if (updates.userId)       localStorage.setItem('oc_user_id',    updates.userId)
        if (updates.classSection) localStorage.setItem('oc_user_class', updates.classSection)
        if (updates.roll)         localStorage.setItem('oc_user_roll',  updates.roll)
        if (updates.dept)         localStorage.setItem('oc_user_dept',  updates.dept)
        if (updates.designation)  localStorage.setItem('oc_user_desig', updates.designation)

        setUser(prev => ({ ...prev, ...updates }))
      }
    }).catch(() => {})
  }, [])

  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user.role === 'student' ? 'S' : 'F'

  return { ...user, initials, mounted }
}
