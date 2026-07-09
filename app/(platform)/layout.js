import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import LayoutShell from '@/components/layout/LayoutShell'
import GlobalDataLoader from '@/components/layout/GlobalDataLoader'
import PlatformErrorShell from '@/components/layout/PlatformErrorShell'
const STUDENT_ROLES = ['student']
const FACULTY_ROLES = ['teacher','faculty','trainer','hod','staff','librarian','counsellor',
                       'driver','helper','hr','admission_officer','receptionist',
                       'transport_manager','hostel_manager','coordinator','tutor','instructor',
                       'professor','dean']

const BLOCKED_STATUSES  = new Set(['suspended', 'cancelled'])
const EXPIRED_STATUSES  = new Set(['expired'])

export default async function PlatformLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const admin = createAdminClient()

  // Use admin client to bypass RLS on institutions join
  const { data: profileRaw } = await admin
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Role-based access control — platform layout is for admin/owner roles only
  const role = profileRaw?.role || 'guest'
  if (STUDENT_ROLES.includes(role)) redirect('/student/dashboard')
  if (FACULTY_ROLES.includes(role)) redirect('/faculty/dashboard')
  // Any remaining non-admin role (guest, unrecognised) must be denied
  const ADMIN_ROLES = ['owner','super_admin','admin','principal','vice_principal','academic_coordinator',
                       'chairman','director','administrator']
  if (!ADMIN_ROLES.includes(role)) redirect('/auth/login')

  const institutionId = profileRaw?.institution_id || null

  // Fetch institution, modules, and status in parallel
  let institution   = null
  let enabledModules = null  // null = no restrictions
  let controlStatus = null

  if (institutionId) {
    const [instResult, modulesResult] = await Promise.all([
      admin
        .from('institutions')
        .select('id, name, slug, type, email, control_status')
        .eq('id', institutionId)
        .single(),
      admin
        .from('institution_modules')
        .select('module_key, is_enabled')
        .eq('institution_id', institutionId),
    ])

    institution   = instResult.data || null
    controlStatus = institution?.control_status || null

    const moduleRows = modulesResult.data || []
    if (moduleRows.length > 0) {
      enabledModules = {}
      moduleRows.forEach(r => { enabledModules[r.module_key] = r.is_enabled })
    }
  }

  // Block access if institution is suspended or cancelled
  if (controlStatus && BLOCKED_STATUSES.has(controlStatus)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'Inter, system-ui, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ fontSize: 28 }}>🔒</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Institution {controlStatus === 'suspended' ? 'Suspended' : 'Cancelled'}
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 24px', lineHeight: 1.6 }}>
            {controlStatus === 'suspended'
              ? 'Your institution account has been temporarily suspended. Please contact OwnCampus support to resolve this.'
              : 'Your institution account has been cancelled. Please contact OwnCampus support if you believe this is an error.'}
          </p>
          <a href="mailto:support@owncampus.in" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 10, background: '#2563EB', color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Contact Support
          </a>
        </div>
      </div>
    )
  }

  // Show expiry wall if institution is expired
  if (controlStatus && EXPIRED_STATUSES.has(controlStatus)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'Inter, system-ui, sans-serif', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ fontSize: 28 }}>⏰</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Subscription Expired
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 24px', lineHeight: 1.6 }}>
            Your OwnCampus subscription has expired. Please renew to continue accessing your institution portal.
          </p>
          <a href="mailto:support@owncampus.in" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 10, background: '#2563EB', color: 'white', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Renew Subscription
          </a>
        </div>
      </div>
    )
  }

  const profile = profileRaw ? { ...profileRaw, institutions: institution } : null

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#F8FAFC' }}>
      <Sidebar profile={profile} enabledModules={enabledModules} />

      <LayoutShell profile={profile}>
        <Header user={user} profile={profile} institution={profile?.institutions} />

        <main
          className="flex-1 overflow-auto min-h-0"
          style={{ marginTop: 'var(--header-height)' }}
        >
          <PlatformErrorShell>
            <div className="platform-content w-full animate-fade-in">
              {children}
            </div>
          </PlatformErrorShell>
        </main>
      </LayoutShell>

      <MobileNav />
      <GlobalDataLoader />
    </div>
  )
}
