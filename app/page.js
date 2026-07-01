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
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || ''
  if (ADMIN_ROLES.includes(role))   redirect('/dashboard')
  if (FACULTY_ROLES.includes(role)) redirect('/faculty/dashboard')
  if (role === 'student')           redirect('/student/dashboard')

  redirect('/auth/login')
}
