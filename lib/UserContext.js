'use client'
import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// Shared user context — provided once per Shell mount, read by all descendants.
// Eliminates the N * supabase.auth.getUser() calls that caused 429 rate limit errors.
export const UserCtx = createContext(null)

export function UserProvider({ profile: initialProfile, children }) {
  const meta = initialProfile?.metadata || {}
  const [state, setState] = useState({
    name:         [initialProfile?.first_name, initialProfile?.last_name].filter(Boolean).join(' '),
    email:        initialProfile?.email || '',
    role:         initialProfile?.role  || '',
    userId:       initialProfile?.id    || '',
    classSection: meta.class ? `${meta.class}${meta.section ? '-' + meta.section : ''}` : '',
    roll:         meta.roll_no     || '',
    dept:         meta.department  || '',
    designation:  meta.designation || '',
    avatarUrl:    initialProfile?.avatar_url || null,
  })

  // Sync when the server layout re-fetches profile (e.g. after router.refresh())
  useEffect(() => {
    setState(prev => ({ ...prev, avatarUrl: initialProfile?.avatar_url || null }))
  }, [initialProfile?.avatar_url])

  // ONE Realtime subscription for the entire Shell subtree
  useEffect(() => {
    if (!initialProfile?.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`ucx-${initialProfile.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'user_profiles',
        filter: `id=eq.${initialProfile.id}`,
      }, ({ new: p }) => {
        const m = p.metadata || {}
        setState(prev => ({
          ...prev,
          name:        [p.first_name, p.last_name].filter(Boolean).join(' ') || prev.name,
          avatarUrl:   'avatar_url' in p ? p.avatar_url : prev.avatarUrl,
          dept:        m.department  || prev.dept,
          designation: m.designation || prev.designation,
        }))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [initialProfile?.id])

  const initials = state.name
    ? state.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : state.role === 'student' ? 'S' : 'F'

  const updateAvatarUrl = (url) => setState(prev => ({ ...prev, avatarUrl: url || null }))

  const value = useMemo(
    () => ({ ...state, initials, mounted: true, updateAvatarUrl }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, initials]
  )

  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>
}

export function useUserContext() {
  return useContext(UserCtx)
}
