import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import StudentShell from '@/components/student/StudentShell'

const ADMIN_ROLES  = ['owner', 'super_admin', 'admin']
const FACULTY_ROLES = ['teacher', 'faculty', 'trainer', 'hod', 'staff', 'librarian',
  'counsellor', 'hr', 'admission_officer', 'transport_manager', 'hostel_manager',
  'coordinator', 'tutor', 'instructor', 'professor', 'dean', 'vice_principal', 'principal']

export default async function StudentLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'guest'

  // Redirect non-students to their correct portal
  if (ADMIN_ROLES.includes(role))   redirect('/dashboard')
  if (FACULTY_ROLES.includes(role)) redirect('/faculty/dashboard')

  if (role !== 'student') redirect('/auth/login')

  return <StudentShell user={user} profile={profile}>{children}</StudentShell>
}
