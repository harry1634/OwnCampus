import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const ADMIN_ROLES   = ['super_admin','chairman','director','owner','principal','vice_principal','academic_coordinator']
const FACULTY_ROLES = ['teacher','faculty','trainer','hod','staff','librarian','counsellor','driver','helper']

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, metadata')
    .eq('id', user.id)
    .maybeSingle()

  const roleSource = [
    profile?.role,
    profile?.metadata?.role,
    profile?.metadata?.portal_role,
    user?.user_metadata?.role,
    user?.user_metadata?.portal_role,
  ].find(Boolean)
  const role = String(roleSource || '').toLowerCase().trim()

  const { data: studentRecord } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (ADMIN_ROLES.includes(role))   redirect('/dashboard')
  if (FACULTY_ROLES.includes(role)) redirect('/faculty/dashboard')
  if (role === 'student' || studentRecord) redirect('/student/dashboard')

  redirect('/auth/login?redirect=/')
}
