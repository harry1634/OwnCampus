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
  const ADMIN_ROLES = ['owner','super_admin','principal','vice_principal','academic_coordinator',
                       'chairman','director','administrator']
  if (!ADMIN_ROLES.includes(role)) redirect('/auth/login')

  // Fetch institution separately with admin client — RLS blocks the join otherwise
  let institution = null
  if (profileRaw?.institution_id) {
    const { data: inst } = await admin
      .from('institutions')
      .select('id, name, slug, type, email')
      .eq('id', profileRaw.institution_id)
      .single()
    institution = inst || null
  }

  const profile = profileRaw ? { ...profileRaw, institutions: institution } : null

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#F8FAFC' }}>
      <Sidebar profile={profile} />

      <LayoutShell>
        <Header user={user} profile={profile} institution={profile?.institutions} />

        <main
          className="flex-1 overflow-auto min-h-0"
          style={{ marginTop: 'var(--header-height)' }}
        >
          <PlatformErrorShell>
            <div className="platform-content max-w-screen-2xl mx-auto w-full animate-fade-in">
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
