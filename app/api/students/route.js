import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { computeFeeStatus }  from '@/lib/feeUtils'

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const branchFilter  = searchParams.get('branch')   || ''
    const classFilter   = searchParams.get('class')    || ''
    const classIdFilter = searchParams.get('class_id') || null
    const search        = searchParams.get('q')        || ''

    // Resolve caller's institution
    const { data: callerProfile } = await admin
      .from('user_profiles')
      .select('institution_id')
      .eq('id', user.id)
      .single()
    const institutionId = callerProfile?.institution_id || null

    // ── PRIMARY: students table (no PostgREST join for user_profiles — FK goes through auth.users) ──
    const page     = Math.max(1, parseInt(searchParams.get('page')  || '1'))
    const pageSize = Math.min(200, parseInt(searchParams.get('limit') || '200'))

    let stuQuery = admin
      .from('students')
      .select(`
        id, roll_number, admission_number, status,
        total_fee, paid_amount, fee_status,
        parent_name, parent_phone,
        class_id, branch_id, institution_id, user_id,
        created_at,
        classes  ( id, name, section ),
        branches ( id, name )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (institutionId) stuQuery = stuQuery.eq('institution_id', institutionId)
    if (classIdFilter) stuQuery = stuQuery.eq('class_id', classIdFilter)

    const { data: stuRows, error: stuError } = await stuQuery

    // Build from students table (may be empty)
    const tableRows = (!stuError && stuRows) ? stuRows : []

    // Manual user_profiles lookup for all student user_ids (PostgREST join unreliable)
    const tableUserIdsArr = [...new Set(tableRows.map(s => s.user_id).filter(Boolean))]
    let profileMap = {}
    if (tableUserIdsArr.length > 0) {
      const { data: profiles } = await admin
        .from('user_profiles')
        .select('id, email, first_name, last_name, phone, metadata')
        .in('id', tableUserIdsArr)
      ;(profiles || []).forEach(p => { profileMap[p.id] = p })
    }

    // Fetch attendance percentages — keyed by both students.id and user_id
    // so the lookup works regardless of which ID was stored in attendance.student_id
    const studentTableIds = tableRows.map(s => s.id).filter(Boolean)
    const studentUserIds  = tableRows.map(s => s.user_id).filter(Boolean)
    const allLookupIds    = [...new Set([...studentTableIds, ...studentUserIds])]
    const attPctMap       = {}  // id → percentage
    if (allLookupIds.length > 0) {
      let attQ = admin
        .from('attendance')
        .select('student_id, status')
        .in('student_id', allLookupIds)
        .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      if (institutionId) attQ = attQ.eq('institution_id', institutionId)
      const { data: attRows } = await attQ
      if (attRows) {
        const totals  = {}
        const present = {}
        attRows.forEach(r => {
          totals[r.student_id]  = (totals[r.student_id]  || 0) + 1
          if (r.status === 'present') present[r.student_id] = (present[r.student_id] || 0) + 1
        })
        allLookupIds.forEach(id => {
          if (totals[id]) attPctMap[id] = Math.round((present[id] || 0) / totals[id] * 100)
        })
      }
    }

    // Map students-table rows using manually fetched profiles
    const fromTable = tableRows.map(s => {
      const up      = (s.user_id ? profileMap[s.user_id] : null) || {}
      const meta    = up.metadata || {}
      const totalFee   = Number(s.total_fee   ?? meta.total_fee   ?? 0)
      const paidAmount = Number(s.paid_amount  ?? meta.paid_amount  ?? 0)
      const feeStatus  = s.fee_status || meta.fee_status || computeFeeStatus(totalFee, paidAmount)
      return {
        supabaseId:   up.id || s.user_id || null,
        studentRowId: s.id,
        name:         [up.first_name, up.last_name].filter(Boolean).join(' ') || up.email || '',
        roll:         s.roll_number || meta.roll_number || s.admission_number || '',
        admNo:        s.admission_number || '',
        class:        s.classes
          ? `${s.classes.name}${s.classes.section ? '-' + s.classes.section : ''}`
          : meta.class_section || '',
        classId:      s.class_id || null,
        parent:       s.parent_name || meta.parent_name || '',
        parentPhone:  s.parent_phone || meta.parent_phone || '',
        phone:        up.phone || '',
        email:        up.email || '',
        attendance:   attPctMap[s.id] ?? attPctMap[s.user_id] ?? null,
        totalFee,
        paidAmount,
        fees:         feeStatus,
        status:       s.status || 'active',
        branchId:     s.branch_id || null,
        branch:       s.branches?.name || '',
        tempPassword: meta.temp_password || null,
      }
    })

    // Supplement: user_profiles with student role not yet in the students table.
    // Skip when class_id filter is active — profile-only students have no class_id so they
    // cannot belong to the requested class.
    const tableUserIds = new Set(tableRows.map(s => s.user_id).filter(Boolean))
    // Also track supabaseId to avoid duplication when user_profiles.id = user_id
    const tableSupabaseIds = new Set(fromTable.map(s => s.supabaseId).filter(Boolean))
    let fromProfiles = []
    if (!classIdFilter) {
      const STUDENT_ROLES = ['student']
      let pq = admin
        .from('user_profiles')
        .select('id, email, first_name, last_name, phone, metadata, branch_id, branches(id, name)')
        .in('role', STUDENT_ROLES)
      if (institutionId) pq = pq.eq('institution_id', institutionId)
      const { data: profileRows } = await pq
      // Also fetch attendance for profile-only students by their user_id
      const profileOnlyIds = (profileRows || [])
        .filter(p => !tableUserIds.has(p.id) && !tableSupabaseIds.has(p.id))
        .map(p => p.id)
      if (profileOnlyIds.length > 0) {
        let pAttQ = admin
          .from('attendance')
          .select('student_id, status')
          .in('student_id', profileOnlyIds)
          .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
        if (institutionId) pAttQ = pAttQ.eq('institution_id', institutionId)
        const { data: pAttRows } = await pAttQ
        if (pAttRows) {
          const totals  = {}
          const present = {}
          pAttRows.forEach(r => {
            totals[r.student_id]  = (totals[r.student_id]  || 0) + 1
            if (r.status === 'present') present[r.student_id] = (present[r.student_id] || 0) + 1
          })
          profileOnlyIds.forEach(id => {
            if (totals[id]) attPctMap[id] = Math.round((present[id] || 0) / totals[id] * 100)
          })
        }
      }

      fromProfiles = (profileRows || [])
        .filter(p => !tableUserIds.has(p.id) && !tableSupabaseIds.has(p.id))
        .map(p => {
          const meta       = p.metadata  || {}
          const totalFee   = Number(meta.total_fee   || 0)
          const paidAmount = Number(meta.paid_amount || 0)
          const fees       = meta.fee_status || (
            totalFee === 0 ? 'pending' :
            paidAmount >= totalFee ? 'paid' :
            paidAmount > 0 ? 'partial' : 'pending'
          )
          return {
            supabaseId:   p.id,
            studentRowId: null,
            name:         [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email,
            roll:         meta.roll_number   || '',
            admNo:        '',
            class:        meta.class_section || '',
            classId:      null,
            parent:       meta.parent_name   || '',
            parentPhone:  '',
            phone:        p.phone || '',
            email:        p.email,
            attendance:   attPctMap[p.id] ?? null,
            totalFee,
            paidAmount,
            fees,
            status:       'active',
            branchId:     p.branch_id   || null,
            branch:       p.branches?.name || '',
            tempPassword: meta.temp_password || null,
          }
        })
    }

    // Merge and assign sequential numeric IDs
    let students = [...fromTable, ...fromProfiles].map((s, i) => ({ ...s, id: i + 1 }))

    if (branchFilter) students = students.filter(s => s.branch === branchFilter)
    if (search)       students = students.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.roll || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(search.toLowerCase())
    )
    return Response.json(students)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/students?id=<students.id>  — update fee/roll fields + optionally link user_id
export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: caller } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const ADMIN_ROLES = ['owner','super_admin','principal','vice_principal','academic_coordinator','administrator','chairman','director']
    if (!ADMIN_ROLES.includes(caller?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const body   = await req.json()
    const update = {}
    if ('total_fee'   in body) update.total_fee   = Number(body.total_fee)   || 0
    if ('paid_amount' in body) update.paid_amount  = Number(body.paid_amount) || 0
    if ('fee_status'  in body) update.fee_status   = body.fee_status          || null
    if ('roll_number' in body) update.roll_number  = body.roll_number         || null
    // Link the student to their auth user so student-side queries work
    if (body.user_id)          update.user_id      = body.user_id

    const { error } = await admin
      .from('students').update(update)
      .eq('id', id).eq('institution_id', caller.institution_id)

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/students?id=<students.id>  — soft delete (never hard-deletes)
export async function DELETE(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')   // students.id (UUID)
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

    const admin = createAdminClient()

    // Permission: only institution admins can delete
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const adminRoles = ['owner','super_admin','principal','vice_principal','academic_coordinator']
    if (!adminRoles.includes(profile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Fetch the student for audit + scoping
    const { data: student } = await admin
      .from('students').select('id, institution_id, user_id').eq('id', id).single()
    if (!student) return Response.json({ error: 'Student not found' }, { status: 404 })
    if (student.institution_id !== profile.institution_id) {
      return Response.json({ error: 'Student belongs to a different institution' }, { status: 403 })
    }

    // Soft delete: set deleted_at + deleted_by + status → inactive
    const now = new Date().toISOString()
    const { error } = await admin
      .from('students')
      .update({ deleted_at: now, deleted_by: user.id, status: 'inactive' })
      .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Audit log
    await admin.from('audit_logs').insert({
      institution_id: student.institution_id,
      actor_id:       user.id,
      action:         'delete',
      entity_type:    'student',
      entity_id:      student.id,
      new_value:      { deleted_at: now, reason: 'soft_delete' },
    }).then(null, () => {})

    return Response.json({ success: true, deleted_at: now })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
