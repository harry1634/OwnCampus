import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const FACULTY_ROLES = [
  'teacher','faculty','trainer','hod','staff','librarian','counsellor','hr',
  'admission_officer','transport_manager','hostel_manager','coordinator','tutor',
  'instructor','professor','dean','vice_principal','principal','receptionist',
]

const VALID_BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-']
const VALID_GENDERS      = ['male','female','other','prefer_not_to_say']

// Omit institutions(id,name) — PostgREST schema cache may not expose that FK join.
// Institution name is rarely needed on profile pages; fetch separately if required.
const UP_SELECT = '*, branches(id,name)'

function buildProfileShape(up, meta) {
  return {
    id:             up.id,
    name:           [up.first_name, up.last_name].filter(Boolean).join(' '),
    first_name:     up.first_name,
    last_name:      up.last_name,
    email:          up.email,
    phone:          up.phone,
    avatar_url:     up.avatar_url,
    role:           up.role,
    institution_id: up.institution_id,
    institution:    null,
    branch_id:      up.branch_id,
    branch:         up.branches?.name    || null,
    // Personal fields — proper columns, fall back to metadata for data not yet migrated
    gender:         up.gender         || meta.gender      || null,
    date_of_birth:  up.date_of_birth  || meta.dob         || null,
    blood_group:    up.blood_group    || meta.blood_group  || null,
    address:        up.address        || meta.address      || null,
    city:           up.city           || null,
    state:          up.state          || null,
    pincode:        up.pincode        || null,
    metadata:       meta,
  }
}

// GET /api/profile — canonical read; DB is single source of truth
export async function GET() {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: up, error: upErr } = await admin
      .from('user_profiles')
      .select(UP_SELECT)
      .eq('id', user.id)
      .single()

    let resolvedUp = up

    // No user_profiles row — auth user exists but profile was never created.
    // Auto-create a minimal row so the page loads and data persists.
    if (upErr || !up) {
      try {
        // user object already has email + user_metadata — no need for admin.auth API
        const email     = user.email || ''
        const aMeta     = user.user_metadata || {}
        const nameParts = (aMeta.full_name || aMeta.name || email.split('@')[0] || 'Student').split(' ')

        if (!email) return Response.json({ error: 'Profile not found' }, { status: 404 })

        // Try to inherit institution from an approved access_request for this email
        const { data: accessReq } = await admin
          .from('access_requests')
          .select('institution_id, role')
          .eq('email', email)
          .eq('status', 'approved')
          .limit(1)
          .maybeSingle()

        const insertData = {
          id:             user.id,
          email:          email,
          first_name:     nameParts[0] || 'Student',
          last_name:      nameParts.slice(1).join(' ') || null,
          role:           aMeta.role || accessReq?.role || 'student',
          institution_id: aMeta.institution_id || accessReq?.institution_id || null,
          metadata:       {},
        }

        // upsert handles race conditions gracefully
        const { data: created, error: createErr } = await admin
          .from('user_profiles')
          .upsert(insertData, { onConflict: 'id' })
          .select(UP_SELECT)
          .single()

        if (createErr) {
          // Unique email violation — another row already owns this email; find it
          if (createErr.code === '23505') {
            const { data: existing } = await admin
              .from('user_profiles')
              .select(UP_SELECT)
              .eq('email', email)
              .maybeSingle()
            if (existing) { resolvedUp = existing }
            else return Response.json({ error: createErr.message }, { status: 400 })
          } else {
            return Response.json({ error: createErr.message }, { status: 400 })
          }
        } else {
          resolvedUp = created
        }
      } catch (autoErr) {
        return Response.json({ error: autoErr?.message || 'Profile not found' }, { status: 500 })
      }
    }

    const meta    = resolvedUp.metadata || {}
    const profile = buildProfileShape(resolvedUp, meta)

    if (resolvedUp.role === 'student') {
      const { data: stu } = await admin
        .from('students')
        .select(`
          id, roll_number, admission_number, admission_date,
          class_id, branch_id,
          father_name, mother_name,
          guardian_name, guardian_phone, guardian_email,
          parent_name, parent_phone,
          hostel_required, transport_required,
          total_fee, paid_amount, fee_status,
          classes  ( id, name, section ),
          branches ( id, name )
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single()

      if (stu) {
        profile.student = {
          id:                 stu.id,
          roll_number:        stu.roll_number      || meta.roll_no        || null,
          admission_number:   stu.admission_number                        || null,
          admission_date:     stu.admission_date   || meta.admission_date || null,
          class_id:           stu.class_id                                || null,
          class_name:         stu.classes
            ? `${stu.classes.name}${stu.classes.section ? '-' + stu.classes.section : ''}`
            : null,
          branch:             stu.branches?.name                          || null,
          father_name:        stu.father_name                             || null,
          mother_name:        stu.mother_name                             || null,
          guardian_name:      stu.guardian_name                           || null,
          guardian_phone:     stu.guardian_phone                          || null,
          guardian_email:     stu.guardian_email                          || null,
          parent_name:        stu.parent_name      || meta.parent_name    || null,
          parent_phone:       stu.parent_phone     || meta.parent_phone   || null,
          hostel_required:    stu.hostel_required,
          transport_required: stu.transport_required,
          total_fee:          stu.total_fee,
          paid_amount:        stu.paid_amount,
          fee_status:         stu.fee_status,
        }
      }
    } else if (FACULTY_ROLES.includes(resolvedUp.role)) {
      const { data: fac } = await admin
        .from('faculty')
        // employee_id added in migration 007; classes_assigned does NOT exist in schema
        .select(`
          id, designation, employee_code, employee_id, employment_type,
          joining_date, qualification, experience_years, specialization,
          subjects_teaching,
          department_id,
          departments ( id, name ),
          branches    ( id, name )
        `)
        .eq('user_id', user.id)
        .single()

      if (fac) {
        profile.faculty = {
          id:               fac.id,
          designation:      fac.designation                         || meta.designation  || null,
          employee_code:    fac.employee_code  || fac.employee_id   || meta.employee_id  || null,
          employment_type:  fac.employment_type                     || null,
          department_id:    fac.department_id                       || null,
          department:       fac.departments?.name || meta.department || null,
          branch:           fac.branches?.name                      || null,
          joining_date:     fac.joining_date                        || null,
          qualification:    fac.qualification                       || null,
          experience_years: fac.experience_years                    ?? null,
          specialization:   fac.specialization                      || null,
          subjects_teaching: fac.subjects_teaching || [],
        }
      }
    }

    return Response.json(profile)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/profile — writes to correct tables; returns confirmed profile
export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const body  = await req.json()

    // Caller's role and institution are needed to route sub-table writes
    let { data: callerData } = await admin
      .from('user_profiles')
      .select('role, institution_id, metadata')
      .eq('id', user.id)
      .maybeSingle()

    // Auto-create if missing (same logic as GET)
    if (!callerData) {
      const email     = user.email || ''
      const aMeta     = user.user_metadata || {}
      const nameParts = (aMeta.full_name || aMeta.name || email.split('@')[0] || 'Student').split(' ')
      if (email) {
        const { data: accessReq } = await admin
          .from('access_requests')
          .select('institution_id, role')
          .eq('email', email).eq('status', 'approved')
          .limit(1).maybeSingle()
        await admin.from('user_profiles').upsert({
          id:             user.id,
          email:          email,
          first_name:     nameParts[0] || 'Student',
          last_name:      nameParts.slice(1).join(' ') || null,
          role:           aMeta.role || accessReq?.role || 'student',
          institution_id: aMeta.institution_id || accessReq?.institution_id || null,
          metadata:       {},
        }, { onConflict: 'id' })
        const { data: refetched } = await admin
          .from('user_profiles').select('role, institution_id, metadata').eq('id', user.id).maybeSingle()
        callerData = refetched
      }
    }

    if (!callerData) return Response.json({ error: 'Profile not found' }, { status: 404 })

    const role          = callerData.role           || ''
    const institutionId = callerData.institution_id || null
    const existingMeta  = callerData.metadata        || {}
    const bodyMeta = (body.metadata && typeof body.metadata === 'object') ? { ...body.metadata } : {}

    // ── 1. user_profiles — shared identity + personal fields ────────────
    const upUpdate = {}

    // Columns that exist in user_profiles (confirmed by migration 017)
    for (const key of ['first_name', 'last_name', 'phone', 'avatar_url', 'address', 'city', 'state', 'pincode']) {
      if (key in body) upUpdate[key] = body[key] || null
    }
    // Personal fields added by migration 017 (VARCHAR, not enum)
    if ('gender'        in body) upUpdate.gender        = body.gender        || null
    if ('blood_group'   in body) upUpdate.blood_group   = body.blood_group   || null
    if ('date_of_birth' in body) upUpdate.date_of_birth = body.date_of_birth || null

    // Truly orphaned fields (no DB column) — persist in metadata JSONB
    const ORPHANED_META_KEYS = ['house', 'classes_assigned', 'temp_password', 'notif_prefs']
    const orphanedMeta = {}
    for (const key of ORPHANED_META_KEYS) {
      if (key in bodyMeta) orphanedMeta[key] = bodyMeta[key]
    }
    if (Object.keys(orphanedMeta).length > 0) {
      upUpdate.metadata = { ...existingMeta, ...orphanedMeta }
    }

    if (Object.keys(upUpdate).length > 0) {
      const { error } = await admin
        .from('user_profiles').update(upUpdate).eq('id', user.id)
      if (error) return Response.json({ error: error.message }, { status: 400 })
    }

    // ── 2. Faculty table ─────────────────────────────────────────────
    if (FACULTY_ROLES.includes(role) && body.faculty_data && typeof body.faculty_data === 'object') {
      const src = body.faculty_data
      const facUpdate = {}

      for (const key of ['designation', 'joining_date', 'qualification', 'specialization']) {
        if (key in src) facUpdate[key] = src[key] || null
      }
      if ('employee_code'     in src) facUpdate.employee_code     = src.employee_code     || null
      if ('experience_years'  in src) facUpdate.experience_years  = src.experience_years  ?? null
      if ('subjects_teaching' in src) {
        facUpdate.subjects_teaching = Array.isArray(src.subjects_teaching) ? src.subjects_teaching : null
      }

      // Accept employee_code from legacy metadata.employee_id (old page format)
      if ('employee_id' in bodyMeta && !('employee_code' in facUpdate)) {
        facUpdate.employee_code = bodyMeta.employee_id || null
      }

      // Resolve department name → department_id UUID
      const deptName = src.department || bodyMeta.department || null
      if (deptName && institutionId) {
        const { data: deptRow } = await admin
          .from('departments')
          .select('id')
          .eq('institution_id', institutionId)
          .ilike('name', deptName.trim())
          .limit(1)
          .single()
        if (deptRow) facUpdate.department_id = deptRow.id
      }

      if (Object.keys(facUpdate).length > 0) {
        const { error: facErr } = await admin
          .from('faculty').update(facUpdate).eq('user_id', user.id)
        if (facErr) return Response.json({ error: facErr.message }, { status: 400 })
      }
    }

    // ── 3. Students table ────────────────────────────────────────────
    if (role === 'student') {
      const stuUpdate = {}

      for (const key of ['parent_name', 'parent_phone', 'father_name', 'mother_name', 'guardian_name', 'guardian_phone', 'guardian_email']) {
        if (key in body) stuUpdate[key] = body[key] || null
      }
      // Accept from legacy metadata format
      if ('parent_name'  in bodyMeta && !('parent_name'  in stuUpdate)) stuUpdate.parent_name  = bodyMeta.parent_name  || null
      if ('parent_phone' in bodyMeta && !('parent_phone' in stuUpdate)) stuUpdate.parent_phone = bodyMeta.parent_phone || null

      if (Object.keys(stuUpdate).length > 0) {
        const { error: stuErr } = await admin
          .from('students').update(stuUpdate).eq('user_id', user.id)
        if (stuErr) return Response.json({ error: stuErr.message }, { status: 400 })
      }
    }

    // ── 4. Read back full confirmed profile (mirrors GET shape) ──────
    const { data: saved } = await admin
      .from('user_profiles')
      .select(UP_SELECT)
      .eq('id', user.id)
      .single()

    if (!saved) return Response.json({ success: true, profile: null })

    const savedMeta = saved.metadata || {}
    const profile   = buildProfileShape(saved, savedMeta)

    if (role === 'student') {
      const { data: stu } = await admin
        .from('students')
        .select(`
          id, roll_number, admission_number, admission_date, class_id,
          parent_name, parent_phone,
          classes  ( name, section ),
          branches ( name )
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single()
      if (stu) {
        profile.student = {
          id:               stu.id,
          roll_number:      stu.roll_number      || savedMeta.roll_no        || null,
          admission_number: stu.admission_number                             || null,
          admission_date:   stu.admission_date   || savedMeta.admission_date || null,
          class_id:         stu.class_id                                     || null,
          class_name:       stu.classes
            ? `${stu.classes.name}${stu.classes.section ? '-' + stu.classes.section : ''}`
            : null,
          branch:           stu.branches?.name   || null,
          parent_name:      stu.parent_name      || savedMeta.parent_name  || null,
          parent_phone:     stu.parent_phone     || savedMeta.parent_phone || null,
        }
      }
    } else if (FACULTY_ROLES.includes(role)) {
      const { data: fac } = await admin
        .from('faculty')
        .select(`
          id, designation, employee_code, employee_id, joining_date,
          qualification, experience_years, subjects_teaching, department_id,
          departments ( name ),
          branches    ( name )
        `)
        .eq('user_id', user.id)
        .single()
      if (fac) {
        profile.faculty = {
          id:               fac.id,
          designation:      fac.designation                        || null,
          employee_code:    fac.employee_code  || fac.employee_id  || null,
          department_id:    fac.department_id                      || null,
          department:       fac.departments?.name || savedMeta.department || null,
          branch:           fac.branches?.name                     || null,
          joining_date:     fac.joining_date                       || null,
          qualification:    fac.qualification                      || null,
          experience_years: fac.experience_years                   ?? null,
          subjects_teaching: fac.subjects_teaching || [],
        }
      }
    }

    return Response.json({ success: true, profile })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
