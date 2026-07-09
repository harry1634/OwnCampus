import { randomBytes }       from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { checkFacultyLimit, limitExceededResponse } from '@/lib/licenseEngine'

function generatePassword() {
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '@#$!'
  const all = upper + lower + digits + special
  const buf = randomBytes(12)
  const required = [upper[buf[0]%upper.length], lower[buf[1]%lower.length], digits[buf[2]%digits.length], special[buf[3]%special.length]]
  const rest = Array.from({ length: 6 }, (_, i) => all[buf[4+i] % all.length])
  const combined = [...required, ...rest]
  const shuffle = randomBytes(combined.length)
  return combined.map((c, i) => ({ c, r: shuffle[i] })).sort((a, b) => a.r - b.r).map(x => x.c).join('')
}

const FACULTY_ROLES = [
  'teacher','faculty','trainer','hod','academic_coordinator',
  'librarian','counsellor','hr','admission_officer','receptionist',
  'transport_manager','hostel_manager','vice_principal','principal',
  // broader fallbacks in case approval assigned a non-standard role
  'staff','coordinator','tutor','instructor','professor','dean',
]

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const branchFilter = searchParams.get('branch') || ''
    const deptFilter   = searchParams.get('dept')   || ''
    const search       = searchParams.get('q')      || ''
    const page         = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const pageSize     = Math.min(500, parseInt(searchParams.get('limit') || '500'))

    // Resolve institution
    const { data: callerProfile } = await admin
      .from('user_profiles')
      .select('institution_id')
      .eq('id', user.id)
      .single()
    const institutionId = callerProfile?.institution_id || null

    // ── PRIMARY: faculty table ────────────────────────────────────────────────
    // We do NOT use PostgREST join syntax for user_profiles because the FK in
    // the faculty table typically points to auth.users (not user_profiles), so
    // the implicit join returns null. Instead we do two queries and merge.
    let facQ = admin
      .from('faculty')
      .select('id, designation, status, department_id, branch_id, institution_id, user_id, subjects_teaching, departments(name)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)
    if (institutionId) facQ = facQ.eq('institution_id', institutionId)

    let { data: facRows, error: facError } = await facQ

    // If status enum check fails (different enum values), try without status filter
    if (facError) {
      let retryQ = admin
        .from('faculty')
        .select('id, designation, status, department_id, branch_id, institution_id, user_id, subjects_teaching, departments(name)')
        .order('created_at', { ascending: false })
      if (institutionId) retryQ = retryQ.eq('institution_id', institutionId)
      const r2 = await retryQ
      if (!r2.error) { facRows = r2.data; facError = null }
    }

    if (!facError && facRows && facRows.length > 0) {
      // Pre-compute all ID arrays synchronously so all 4 lookups can run in parallel
      const userIds      = [...new Set(facRows.map(f => f.user_id).filter(Boolean))]
      const facIds       = facRows.map(r => r.id)
      const branchIds    = [...new Set(facRows.map(f => f.branch_id).filter(Boolean))]
      const since        = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      let attQ = userIds.length > 0
        ? admin.from('attendance').select('faculty_id, status').in('faculty_id', userIds).gte('date', since)
        : null
      if (attQ && institutionId) attQ = attQ.eq('institution_id', institutionId)

      // Parallel: 4 independent lookups (was 4 sequential awaits)
      const [profilesResult, extResult, branchResult, attResult] = await Promise.all([
        userIds.length > 0
          ? admin.from('user_profiles').select('id, email, first_name, last_name, phone, role, metadata').in('id', userIds)
          : Promise.resolve({ data: [] }),
        admin.from('faculty').select('id, employment_type, joining_date, experience_years, employee_code, salary').in('id', facIds),
        branchIds.length > 0
          ? admin.from('branches').select('id, name').in('id', branchIds)
          : Promise.resolve({ data: [] }),
        attQ || Promise.resolve({ data: null }),
      ])

      const profileMap = Object.fromEntries((profilesResult.data || []).map(p => [p.id, p]))
      const extMap     = {}
      ;(extResult.data || []).forEach(r => { extMap[r.id] = r })
      const branchMap  = {}
      ;(branchResult.data || []).forEach(b => { branchMap[b.id] = b.name })
      const attPctMap  = {}
      if (attResult.data) {
        const totals  = {}
        const present = {}
        attResult.data.forEach(r => {
          totals[r.faculty_id]  = (totals[r.faculty_id]  || 0) + 1
          if (r.status === 'present') present[r.faculty_id] = (present[r.faculty_id] || 0) + 1
        })
        userIds.forEach(id => {
          if (totals[id]) attPctMap[id] = Math.round((present[id] || 0) / totals[id] * 100)
        })
      }

      let faculty = facRows.map((f, i) => {
        const up   = profileMap[f.user_id] || {}
        const meta = up.metadata || {}
        const ext  = extMap[f.id] || {}
        return {
          id:           i + 1,
          supabaseId:   up.id || f.user_id,
          facultyRowId: f.id,
          name:         [up.first_name, up.last_name].filter(Boolean).join(' ') || up.email || '',
          code:         ext.employee_code || meta.employee_id || `FAC${String(i + 1).padStart(3, '0')}`,
          dept:         meta.department || f.departments?.name || '',
          deptId:       f.department_id || null,
          designation:  f.designation || meta.designation || up.role || 'Faculty',
          type:         ext.employment_type || 'full_time',
          subjects:     meta.subjects_teaching || f.subjects_teaching || [],
          exp:          ext.experience_years || 0,
          joiningDate:  ext.joining_date || null,
          email:        up.email || '',
          phone:        up.phone || '',
          attendance:   attPctMap[f.user_id] ?? null,
          rating:       0,
          branchId:     f.branch_id || null,
          branch:       branchMap[f.branch_id] || '',
          role:         up.role || 'teacher',
        }
      })

      if (branchFilter) faculty = faculty.filter(f => f.branch === branchFilter || f.branchId === branchFilter)
      if (deptFilter)   faculty = faculty.filter(f => f.dept.toLowerCase().includes(deptFilter.toLowerCase()))
      if (search) {
        const q = search.toLowerCase()
        faculty = faculty.filter(f => {
          const subjectsStr = Array.isArray(f.subjects) ? f.subjects.join(' ') : String(f.subjects || '')
          return (
            f.name.toLowerCase().includes(q)  ||
            f.email.toLowerCase().includes(q) ||
            f.dept.toLowerCase().includes(q)  ||
            f.designation?.toLowerCase().includes(q) ||
            subjectsStr.toLowerCase().includes(q)
          )
        })
      }

      return Response.json(faculty)
    }

    // ── FALLBACK: user_profiles only ────────────────────────────────────────
    // Minimal select — no branch join that might fail on older schemas
    const UP_SELECT = 'id, email, first_name, last_name, role, phone, metadata, created_at, institution_id'

    // Layer 1: known faculty roles + institution filter
    let upQuery = admin
      .from('user_profiles')
      .select(UP_SELECT)
      .in('role', FACULTY_ROLES)
      .order('created_at', { ascending: false })
    if (institutionId) upQuery = upQuery.eq('institution_id', institutionId)
    let { data, error } = await upQuery

    // Layer 2: any non-student user with institution filter (keep institution scope)
    if (!error && (!data || data.length === 0) && institutionId) {
      const r2 = await admin
        .from('user_profiles')
        .select(UP_SELECT)
        .neq('role', 'student').neq('role', 'super_admin')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false })
      if (!r2.error && r2.data?.length > 0) { data = r2.data; error = null }
    }

    if (error) return Response.json({ error: error.message }, { status: 400 })

    const mapProfile = (p, i) => ({
      id:           i + 1,
      supabaseId:   p.id,
      facultyRowId: null,
      name:         [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email,
      code:         p.metadata?.employee_id || `FAC${String(i + 1).padStart(3, '0')}`,
      dept:         p.metadata?.department  || '',
      designation:  p.metadata?.designation || p.role || 'Faculty',
      type:         'full_time',
      subjects:     p.metadata?.subjects_teaching || [],
      exp:          0,
      email:        p.email,
      phone:        p.phone || '',
      attendance:   100,
      rating:       0,
      branchId:     null,
      branch:       '',
      role:         p.role,
    })

    const all = (data || []).map(mapProfile)
    // Exclude the currently logged-in admin from the faculty list
    const faculty = all.filter(p => p.supabaseId !== user.id)
    return Response.json(faculty)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/faculty — directly create a new faculty/staff member (admin-initiated)
// Body: { name, email, phone, dept, designation, type, exp, subjects, code, salary, joiningDate }
export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: callerProfile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const ADMIN_ROLES_POST = ['owner','super_admin','principal','vice_principal','academic_coordinator','hr','administrator']
    if (!ADMIN_ROLES_POST.includes(callerProfile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    const institutionId = callerProfile?.institution_id || null

    const body = await req.json()
    const { name, email, phone, dept, designation, type, exp, subjects, code, salary, joiningDate } = body
    if (!name?.trim())  return Response.json({ error: 'Name is required' },  { status: 400 })
    if (!email?.trim()) return Response.json({ error: 'Email is required' }, { status: 400 })

    if (institutionId) {
      const limit = await checkFacultyLimit(institutionId)
      if (!limit.allowed) return limitExceededResponse('Faculty', limit.current, limit.max)
    }

    const password  = generatePassword()
    const nameParts = name.trim().split(/\s+/)
    const firstName = nameParts[0]
    const lastName  = nameParts.slice(1).join(' ') || null

    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email:         email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: name, first_name: firstName, last_name: lastName, role: 'teacher' },
    })
    if (authErr) {
      const msg = authErr.message.toLowerCase().includes('already registered')
        ? 'This email is already registered.'
        : authErr.message
      return Response.json({ error: msg }, { status: 400 })
    }
    const userId = authData.user.id

    // Resolve department ID
    let deptId = null
    if (dept && institutionId) {
      const { data: dRow } = await admin.from('departments').select('id')
        .eq('institution_id', institutionId).ilike('name', dept.trim()).limit(1).maybeSingle()
      deptId = dRow?.id || null
    }

    const subjectsArr = subjects
      ? (typeof subjects === 'string' ? subjects.split(',').map(s => s.trim()).filter(Boolean) : subjects)
      : []

    await admin.from('user_profiles').upsert({
      id:             userId,
      email:          email.trim(),
      first_name:     firstName,
      last_name:      lastName,
      role:           'teacher',
      phone:          phone || null,
      institution_id: institutionId,
      is_active:      true,
      metadata: {
        department:       dept        || null,
        designation:      designation || null,
        subjects_teaching: subjectsArr,
        employee_id:      code        || null,
        temp_password:    password,
      },
    }, { onConflict: 'id' })

    await admin.from('faculty').upsert({
      user_id:          userId,
      institution_id:   institutionId,
      department_id:    deptId,
      designation:      designation || null,
      employment_type:  type        || 'full_time',
      experience_years: parseInt(exp) || 0,
      salary:           parseFloat(salary) || 0,
      joining_date:     joiningDate || null,
      status:           'active',
    }, { onConflict: 'user_id' })

    await admin.from('audit_logs').insert({
      institution_id: institutionId,
      actor_id:       user.id,
      action:         'create',
      entity_type:    'faculty',
      new_value:      { user_id: userId, name, email: email.trim(), dept, designation },
    }).then(null, () => {})

    return Response.json({ success: true, userId, email: email.trim(), password })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/faculty — update faculty profile fields
// Body: { supabaseId, name, designation, dept, type, subjects, exp, phone }
export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { supabaseId, name, designation, dept, type, subjects, exp, phone } = body
    if (!supabaseId) return Response.json({ error: 'supabaseId is required' }, { status: 400 })

    const admin = createAdminClient()
    const { data: callerProfile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const adminRoles = ['owner','super_admin','principal','vice_principal','hr','academic_coordinator']
    if (!adminRoles.includes(callerProfile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    const institutionId = callerProfile?.institution_id || null

    // Verify target user belongs to the same institution as the caller
    const { data: targetUser } = await admin
      .from('user_profiles').select('institution_id').eq('id', supabaseId).single()
    if (!targetUser) return Response.json({ error: 'Faculty user not found.' }, { status: 404 })
    if (institutionId && targetUser.institution_id !== institutionId) {
      return Response.json({ error: 'Forbidden: faculty does not belong to your institution.' }, { status: 403 })
    }

    // Update user_profiles
    const nameParts = (name || '').trim().split(/\s+/)
    const profilePatch = {}
    if (name)  { profilePatch.first_name = nameParts[0]; profilePatch.last_name = nameParts.slice(1).join(' ') || null }
    if (phone) profilePatch.phone = phone
    if (Object.keys(profilePatch).length > 0) {
      await admin.from('user_profiles').update(profilePatch)
        .eq('id', supabaseId).eq('institution_id', institutionId)
    }

    // Update faculty row (match by user_id)
    const facPatch = {}
    if (designation) facPatch.designation = designation
    if (type)        facPatch.employment_type = type
    if (exp != null) facPatch.experience_years = parseInt(exp) || 0
    if (subjects)    facPatch.subjects_cache = Array.isArray(subjects) ? subjects : [subjects]

    if (Object.keys(facPatch).length > 0) {
      const { data: facRow } = await admin.from('faculty').select('id').eq('user_id', supabaseId).maybeSingle()
      if (facRow?.id) {
        await admin.from('faculty').update(facPatch).eq('id', facRow.id)
      }
    }

    // Also update metadata on user_profiles for subjects + dept
    const { data: up } = await admin.from('user_profiles').select('metadata').eq('id', supabaseId).single()
    const meta = up?.metadata || {}
    const metaUpdate = { ...meta }
    if (subjects) metaUpdate.subjects_teaching = Array.isArray(subjects) ? subjects : [subjects]
    if (designation) metaUpdate.designation = designation
    if (dept) metaUpdate.department = dept
    await admin.from('user_profiles').update({ metadata: metaUpdate }).eq('id', supabaseId)

    await admin.from('audit_logs').insert({
      institution_id: institutionId,
      actor_id:       user.id,
      action:         'update',
      entity_type:    'faculty_profile',
      entity_id:      supabaseId,
      new_value:      { name, designation, dept, type, exp, phone },
    }).then(null, () => {})

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/faculty?id=<faculty.id>  — soft delete
export async function DELETE(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const adminRoles = ['owner','super_admin','principal','vice_principal','hr']
    if (!adminRoles.includes(profile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data: fac } = await admin
      .from('faculty').select('id, institution_id, user_id').eq('id', id).single()
    if (!fac) return Response.json({ error: 'Faculty member not found' }, { status: 404 })
    if (fac.institution_id !== profile.institution_id) {
      return Response.json({ error: 'Faculty belongs to a different institution' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const { error } = await admin
      .from('faculty')
      .update({ deleted_at: now, deleted_by: user.id, status: 'inactive' })
      .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 400 })

    await admin.from('audit_logs').insert({
      institution_id: fac.institution_id,
      actor_id:       user.id,
      action:         'delete',
      entity_type:    'faculty',
      entity_id:      fac.id,
      new_value:      { deleted_at: now, reason: 'soft_delete' },
    }).then(null, () => {})

    return Response.json({ success: true, deleted_at: now })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
