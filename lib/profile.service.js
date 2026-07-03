'use client'
import { createClient } from '@/lib/supabase/client'

export async function getCurrentProfile() {
  const res = await fetch('/api/profile')
  if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Failed to load profile') }
  return res.json()
}

export async function updateProfile(data) {
  const res = await fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Failed to update profile') }
  return res.json()
}

export async function uploadAvatar(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Photo must be under 5 MB.')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated.')
  const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
  const fd = new FormData()
  fd.append('file', file)
  fd.append('path', `avatars/${user.id}/avatar.${ext}`)
  const res = await fetch('/api/upload/photo', { method: 'POST', body: fd })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Upload failed.')
  return json.url
}

export async function deleteAvatar() {
  return updateProfile({ avatar_url: null })
}

export async function getStudentProfile() {
  return getCurrentProfile()
}

export async function getFacultyProfile() {
  return getCurrentProfile()
}

export async function getAdminProfile() {
  return getCurrentProfile()
}
