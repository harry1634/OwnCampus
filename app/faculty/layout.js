import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import FacultyShell from '@/components/faculty/FacultyShell'

const FACULTY_ROLES = [
  'teacher', 'faculty', 'trainer', 'hod', 'staff', 'librarian', 'counsellor',
  'driver', 'helper', 'hr', 'admission_officer', 'receptionist',
  'transport_manager', 'hostel_manager', 'coordinator', 'tutor', 'instructor',
  'professor', 'dean', 'vice_principal', 'principal',
]
const ADMIN_ROLES = ['owner', 'super_admin', 'admin']

export default async function FacultyLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role, institution_id')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'guest'

  // Students should not be here
  if (role === 'student') redirect('/student/dashboard')

  // Admins may visit faculty pages without redirect (e.g. impersonating)
  if (!FACULTY_ROLES.includes(role) && !ADMIN_ROLES.includes(role)) {
    redirect('/auth/login')
  }

  return <FacultyShell>{children}</FacultyShell>
}
