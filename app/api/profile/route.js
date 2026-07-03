import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const FACULTY_ROLES = [
  'teacher','faculty','trainer','hod','staff','librarian','counsellor','hr',
  'admission_officer','transport_manager','hostel_manager','coordinator','tutor',
  'instructor','professor','dean','vice_principal','principal','receptionist',
]

// GET /api/profile — returns unified profile for the authenticated user
export async function GET() {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: up, error: upErr } = await admin
      .from('user_profiles')
      .select('id, first_name, last_name, email, phone, avatar_url, role, institution_id, metadata')
      .eq('id', user.id)
      .single()

    if (upErr || !up) return Response.json({ error: 'Profile not found' }, { status: 404 })

    const profile = {
      id:             up.id,
      name:           [up.first_name, up.last_name].filter(Boolean).join(' '),
      first_name:     up.first_name,
      last_name:      up.last_name,
      email:          up.email || user.email,
      phone:          up.phone,
      avatar_url:     up.avatar_url,
      role:           up.role,
      institution_id: up.institution_id,
      metadata:       up.metadata || {},
    }

    if (up.role === 'student') {
      const { data: stu } = await admin
        .from('students')
        .select('id, roll_number, admission_number, class_id, classes(name, section)')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single()
      if (stu) {
        profile.student = {
          roll_number:      stu.roll_number,
          admission_number: stu.admission_number,
          class_id:         stu.class_id,
          class_name:       stu.classes
            ? `${stu.classes.name}${stu.classes.section ? ' ' + stu.classes.section : ''}`
            : null,
        }
      }
    } else if (FACULTY_ROLES.includes(up.role)) {
      const { data: fac } = await admin
        .from('faculty')
        .select('id, designation, employee_code, joining_date, qualification, experience_years, subjects_teaching, classes_assigned, departments(name)')
        .eq('user_id', user.id)
        .single()
      if (fac) {
        profile.faculty = {
          designation:      fac.designation,
          employee_code:    fac.employee_code,
          department:       fac.departments?.name,
          joining_date:     fac.joining_date,
          qualification:    fac.qualification,
          experience_years: fac.experience_years,
          subjects_teaching: fac.subjects_teaching,
          classes_assigned:  fac.classes_assigned,
        }
      }
    }

    return Response.json(profile)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/profile — updates allowed profile fields for the authenticated user
export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const body  = await req.json()

    const allowed = ['first_name', 'last_name', 'phone', 'avatar_url', 'metadata']
    const update  = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    if (Object.keys(update).length === 0) {
      return Response.json({ error: 'No valid fields to update.' }, { status: 400 })
    }

    const { error } = await admin
      .from('user_profiles')
      .update(update)
      .eq('id', user.id)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
