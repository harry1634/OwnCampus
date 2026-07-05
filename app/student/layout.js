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
  if (!user) {
    redirect('/auth/login?redirect=/student/dashboard')
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('*, branches(id,name), institutions(id,name)')
    .eq('id', user.id)
    .maybeSingle()

  const roleSource = [
    profile?.role,
    profile?.metadata?.role,
    profile?.metadata?.portal_role,
    user?.user_metadata?.role,
    user?.user_metadata?.portal_role,
  ].find(Boolean)
  const role = String(roleSource || 'guest').toLowerCase().trim()

  const { data: studentRecord } = await admin
    .from('students')
    .select('id, roll_number, classes(name, section)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  const isStudent = role === 'student' || Boolean(studentRecord)

  // Inject the authoritative class/section from the students table so the sidebar
  // always matches the timetable (metadata.class can be stale).
  if (isStudent && profile) {
    if (studentRecord?.classes) {
      const cls = studentRecord.classes
      profile._classSection = `${cls.name}${cls.section ? '-' + cls.section : ''}`
      profile._roll = studentRecord.roll_number || ''
    }
  }

  // Redirect non-students to their correct portal
  if (ADMIN_ROLES.includes(role))   redirect('/dashboard')
  if (FACULTY_ROLES.includes(role)) redirect('/faculty/dashboard')

  if (!isStudent) {
    redirect('/auth/login?redirect=/student/dashboard')
  }

  return <StudentShell user={user} profile={profile}>{children}</StudentShell>
}
