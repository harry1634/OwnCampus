'use client'
import { useState, useEffect, useContext } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserCtx } from '@/lib/UserContext'

// Context-first hook: when inside a UserProvider (Shell) it reads from context with
// zero additional auth calls. Falls back to a standalone DB fetch only for pages
// that live outside of any Shell (e.g. admin settings, standalone modals).
export function useCurrentUser() {
  const ctx = useContext(UserCtx)
  const isInProvider = !!ctx

  // Standalone state — always initialised (hooks must be unconditional).
  const [user, setUser] = useState({
    name: '', email: '', role: '', userId: '',
    classSection: '', roll: '', dept: '', designation: '', avatarUrl: null,
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Fast path: inside a UserProvider — no auth call needed at all.
    if (isInProvider) return

    setMounted(true)
    const supabase = createClient()
    let isMounted = true
    let channel   = null

    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser || !isMounted) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, role, phone, avatar_url, metadata')
        .eq('id', authUser.id)
        .single()

      if (!profile || !isMounted) return

      const meta = profile.metadata || {}
      setUser({
        name:         [profile.first_name, profile.last_name].filter(Boolean).join(' '),
        email:        authUser.email || '',
        role:         profile.role   || '',
        userId:       authUser.id,
        classSection: meta.class ? `${meta.class}${meta.section ? '-' + meta.section : ''}` : '',
        roll:         meta.roll_no     || '',
        dept:         meta.department  || '',
        designation:  meta.designation || '',
        avatarUrl:    profile.avatar_url || null,
      })

      if (!isMounted) return
      channel = supabase
        .channel(`profile-fallback-${authUser.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'user_profiles',
          filter: `id=eq.${authUser.id}`,
        }, ({ new: p }) => {
          const m = p.metadata || {}
          setUser(prev => ({
            ...prev,
            name:        [p.first_name, p.last_name].filter(Boolean).join(' ') || prev.name,
            avatarUrl:   'avatar_url' in p ? p.avatar_url : prev.avatarUrl,
            dept:        m.department  || prev.dept,
            designation: m.designation || prev.designation,
          }))
        })
        .subscribe()
    }

    load().catch(() => {})
    return () => {
      isMounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [isInProvider])

  // Context fast path: no auth call, no DB query.
  if (ctx) return ctx

  // Standalone fallback path.
  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user.role === 'student' ? 'S' : 'F'

  return { ...user, initials, mounted }
}
