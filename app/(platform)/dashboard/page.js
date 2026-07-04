import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import DashboardClient from './DashboardClient'

export const metadata = { title: 'Dashboard — OwnCampus' }

const FACULTY_ROLES = ['teacher','faculty','trainer','hod','academic_coordinator','librarian','counsellor','hr','admission_officer','receptionist','transport_manager','hostel_manager','staff','driver','helper','vice_principal','principal']

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  // Use admin client for all server-side data fetching — user is already verified above.
  // The user-scoped client hits RLS on joined tables (institutions), so admin client is used throughout.
  // Fetch profile first so we can scope all counts to this institution
  const { data: profileRaw } = await admin.from('user_profiles').select('*').eq('id', user.id).single()
  const institutionId = profileRaw?.institution_id || null

  const [
    { count: pendingCount },
    { data: pendingRequests },
    { data: annRows },
    { data: stuTableRows },
    { data: stuProfileRows },
    { data: facTableRows },
    { data: facProfileRows },
  ] = await Promise.all([
    (() => { let q = admin.from('access_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'); if (institutionId) q = q.or(`institution_id.eq.${institutionId},institution_id.is.null`); return q })(),
    (() => { let q = admin.from('access_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }); if (institutionId) q = q.or(`institution_id.eq.${institutionId},institution_id.is.null`); return q })(),
    (() => { let q = admin.from('announcements').select('*').is('deleted_at', null).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(50); if (institutionId) q = q.eq('institution_id', institutionId); return q })(),
    // Students: both sources for accurate union count (exclude soft-deleted)
    (() => { let q = admin.from('students').select('user_id').eq('status', 'active').is('deleted_at', null); if (institutionId) q = q.eq('institution_id', institutionId); return q })(),
    (() => { let q = admin.from('user_profiles').select('id').eq('role', 'student'); if (institutionId) q = q.eq('institution_id', institutionId); return q })(),
    // Faculty: both sources for accurate union count
    (() => { let q = admin.from('faculty').select('user_id'); if (institutionId) q = q.eq('institution_id', institutionId); return q })(),
    (() => { let q = admin.from('user_profiles').select('id').in('role', FACULTY_ROLES); if (institutionId) q = q.eq('institution_id', institutionId); return q })(),
  ])

  // Union students (table + profiles, deduplicated)
  const stuTableUserIds = new Set((stuTableRows  || []).map(s => s.user_id).filter(Boolean))
  const stuProfileExtra = (stuProfileRows || []).filter(p => !stuTableUserIds.has(p.id))
  const stuOrphans      = (stuTableRows  || []).filter(s => !s.user_id).length
  const studentCount    = stuTableUserIds.size + stuProfileExtra.length + stuOrphans

  // Union faculty (table + profiles, deduplicated)
  const facTableUserIds = new Set((facTableRows  || []).map(f => f.user_id).filter(Boolean))
  const facProfileExtra = (facProfileRows || []).filter(p => !facTableUserIds.has(p.id))
  const facultyCount    = facTableUserIds.size + facProfileExtra.length

  // Fetch the institution separately with the admin client so RLS never blocks it
  let profile = profileRaw || null
  let institution = null

  if (profile?.institution_id) {
    const { data: inst } = await admin
      .from('institutions')
      .select('id, name, slug, type, email')
      .eq('id', profile.institution_id)
      .single()
    institution = inst || null
  } else if (profile) {
    // Profile exists but institution not linked — try matching by admin's auth email
    const { data: instByEmail } = await admin
      .from('institutions')
      .select('id, name, slug, type, email')
      .eq('email', user.email)
      .maybeSingle()
    if (instByEmail) {
      await admin.from('user_profiles').update({ institution_id: instByEmail.id }).eq('id', user.id)
      institution = instByEmail
    }
  }

  if (profile) profile = { ...profile, institutions: institution }

  // Resolve creator names in one batch
  const rows = annRows || []
  const creatorIds = [...new Set(rows.map(a => a.created_by).filter(Boolean))]
  let nameMap = {}
  if (creatorIds.length > 0) {
    const { data: profiles } = await admin
      .from('user_profiles')
      .select('id, first_name, last_name')
      .in('id', creatorIds)
    ;(profiles || []).forEach(p => {
      nameMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Admin'
    })
  }
  const announcements = rows.map(a => ({ ...a, created_by_name: nameMap[a.created_by] || 'Admin' }))

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient
        user={user}
        profile={profile}
        initialStats={{ students: studentCount || 0, faculty: facultyCount || 0, pending: pendingCount || 0 }}
        initialRequests={pendingRequests || []}
        initialAnnouncements={announcements}
      />
    </Suspense>
  )
}

function DashboardSkeleton() {
  const C = { border: '#E5E7EB', card: '#FFFFFF' }
  return (
    <div className="space-y-8 pb-8">
      <div>
        <div className="shimmer h-3.5 w-48 rounded mb-3" />
        <div className="shimmer h-8 w-64 rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <div className="shimmer h-3 w-20 rounded mb-3" />
            <div className="shimmer h-8 w-24 rounded mb-2" />
            <div className="shimmer h-3 w-28 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, height: 340 }}>
          <div className="shimmer h-4 w-40 rounded mb-2" />
          <div className="shimmer h-3 w-56 rounded mb-6" />
          <div className="shimmer w-full rounded" style={{ height: 230 }} />
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
          <div className="shimmer h-4 w-32 rounded mb-5" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3 mb-4">
              <div className="shimmer w-8 h-8 rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <div className="shimmer h-3 w-full rounded mb-1.5" />
                <div className="shimmer h-2.5 w-4/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
