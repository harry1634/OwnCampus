import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// POST /api/students/import
// Body: { students: [{ name, email, roll, class, parent, phone }] }
// Creates auth accounts for rows with email; skips rows without email.
// Returns: { success, created, skipped, errors }

export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Only admin roles can bulk-import
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const adminRoles = ['owner', 'super_admin', 'principal', 'vice_principal', 'academic_coordinator']
    if (!adminRoles.includes(profile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    const institutionId = profile?.institution_id
    if (!institutionId) return Response.json({ error: 'No institution found' }, { status: 400 })

    const { students: rows } = await req.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'students[] is required and must not be empty' }, { status: 400 })
    }

    const results = { created: [], skipped: [], errors: [] }

    for (const row of rows) {
      const email = (row.email || '').trim().toLowerCase()
      const name  = (row.name  || '').trim()
      if (!email) { results.skipped.push(row.name || '(no name)'); continue }
      if (!name)  { results.skipped.push(email); continue }

      try {
        const nameParts   = name.split(/\s+/)
        const firstName   = nameParts[0]
        const lastName    = nameParts.slice(1).join(' ') || ''

        // Check if user already exists
        const { data: existing } = await admin
          .from('user_profiles').select('id').eq('email', email).maybeSingle()

        let userId
        if (existing) {
          userId = existing.id
        } else {
          // Create auth user (no email confirmation required for admin import)
          const tempPassword = `OC${Math.random().toString(36).slice(2, 10)}!`
          const { data: newUser, error: authErr } = await admin.auth.admin.createUser({
            email,
            password:      tempPassword,
            email_confirm: true,
          })
          if (authErr) { results.errors.push({ name, error: authErr.message }); continue }
          userId = newUser.user.id

          // Create user_profiles row
          await admin.from('user_profiles').upsert({
            id:             userId,
            email,
            first_name:     firstName,
            last_name:      lastName || null,
            role:           'student',
            institution_id: institutionId,
            phone:          row.phone || null,
            metadata: {
              roll_number:  row.roll  || null,
              class_section: row.class || null,
              parent_name:  row.parent || null,
              import_source: 'csv',
            },
          }, { onConflict: 'id' })
        }

        // Resolve class_id if class name provided
        let classId = null
        if (row.class) {
          const raw     = row.class.replace(/^class\s+/i, '').trim()
          const dashIdx = raw.lastIndexOf('-')
          const clsName = dashIdx > -1 ? raw.slice(0, dashIdx).trim() : raw
          const section = dashIdx > -1 ? raw.slice(dashIdx + 1).trim() : null
          let cq = admin.from('classes').select('id').eq('institution_id', institutionId).ilike('name', clsName)
          if (section) cq = cq.ilike('section', section)
          const { data: cls } = await cq.maybeSingle()
          classId = cls?.id || null
        }

        // Upsert students row
        await admin.from('students').upsert({
          user_id:        userId,
          institution_id: institutionId,
          roll_number:    row.roll   || null,
          parent_name:    row.parent || null,
          parent_phone:   row.phone  || null,
          class_id:       classId,
          status:         'active',
        }, { onConflict: 'user_id' })

        results.created.push(name)
      } catch (err) {
        results.errors.push({ name: row.name || email, error: err.message })
      }
    }

    return Response.json({
      success:  results.errors.length === 0,
      created:  results.created.length,
      skipped:  results.skipped.length,
      errors:   results.errors.length,
      details:  results,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
