import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET /api/search?q=...&type=all|student|faculty|book|vehicle|route|hostel|announcement
// Universal cross-module search. Tries v_universal_search view first; falls back to
// direct table queries + user_profiles so results always appear even before migration 007.

const ENTITY_HREF = {
  student:      '/students',
  faculty:      '/faculty',
  book:         '/library',
  vehicle:      '/transport',
  route:        '/transport',
  hostel_room:  '/hostel',
  room:         '/rooms',
  announcement: '/communication',
  user:         '/students',
}

function fuzzy(str, q) {
  if (!str || !q) return false
  const s = str.toLowerCase()
  const p = q.toLowerCase()
  if (s.includes(p)) return true
  let si = 0
  for (let pi = 0; pi < p.length; pi++) {
    const idx = s.indexOf(p[pi], si)
    if (idx === -1) return false
    si = idx + 1
  }
  return true
}

function matchesAny(fields, q) {
  return fields.some(f => fuzzy(f, q))
}

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const q    = (searchParams.get('q') || '').trim()
    const type = searchParams.get('type') || 'all'

    if (q.length < 2) return Response.json({ results: [], total: 0 })

    const admin = createAdminClient()

    // Resolve institution — but do NOT exit early if null (super_admin case)
    const { data: profile } = await admin
      .from('user_profiles')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    const institutionId = profile?.institution_id || null
    const results = []

    // ── 1. Try v_universal_search view (available after migration 007) ────────
    if (institutionId) {
      const { data: viewData, error: viewErr } = await admin
        .from('v_universal_search')
        .select('entity_type, id, title, code, email, phone, category, extra, href_prefix')
        .eq('institution_id', institutionId)
        .limit(300)

      if (!viewErr && viewData) {
        const matched = viewData.filter(r => {
          if (type !== 'all' && r.entity_type !== type) return false
          return matchesAny([r.title, r.code, r.email, r.phone, r.category, r.extra], q)
        })

        if (matched.length > 0) {
          matched.slice(0, 20).forEach(r => {
            results.push({
              type:     r.entity_type,
              id:       r.id,
              title:    r.title || '',
              subtitle: [r.category, r.code].filter(Boolean).join(' · '),
              meta:     r.email || r.phone || r.extra || '',
              href:     ENTITY_HREF[r.entity_type] || '/',
              icon:     r.entity_type,
            })
          })
          return Response.json({ results, total: results.length })
        }
      }
    }

    // ── 2. Fallback: direct table queries ─────────────────────────────────────
    // Runs when: view doesn't exist, view returned 0, or no institution_id.

    // ── 2a. user_profiles (catch-all — finds admins, teachers, anyone) ────────
    if (type === 'all' || type === 'student' || type === 'faculty') {
      let upQuery = admin
        .from('user_profiles')
        .select('id, email, first_name, last_name, role, phone, institution_id')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(30)

      if (institutionId) upQuery = upQuery.eq('institution_id', institutionId)

      const { data: upRows } = await upQuery

      ;(upRows || []).filter(p =>
        matchesAny([p.first_name, p.last_name, p.email, p.phone], q)
      ).slice(0, 8).forEach(p => {
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ')
        const isStudent = p.role === 'student'
        results.push({
          type:     isStudent ? 'student' : 'faculty',
          id:       p.id,
          title:    name || p.email,
          subtitle: p.role ? p.role.replace(/_/g, ' ') : '',
          meta:     p.phone || p.email || '',
          href:     isStudent ? '/students' : '/faculty',
          icon:     isStudent ? 'student' : 'faculty',
        })
      })
    }

    // ── 2b. students table (roll number, admission number, class) ─────────────
    if (type === 'all' || type === 'student') {
      let sQuery = admin
        .from('students')
        .select(`
          id, roll_number, admission_number, status, fee_status,
          user_profiles(id, first_name, last_name, email, phone),
          classes(name, section)
        `)
        .eq('status', 'active')
        .limit(40)

      if (institutionId) sQuery = sQuery.eq('institution_id', institutionId)

      const { data: stuRows } = await sQuery

      ;(stuRows || []).filter(s => {
        const up   = s.user_profiles || {}
        const name = [up.first_name, up.last_name].filter(Boolean).join(' ')
        const cls  = s.classes ? `${s.classes.name || ''} ${s.classes.section || ''}` : ''
        return matchesAny([name, up.email, up.phone, s.roll_number, s.admission_number, cls], q)
      }).slice(0, 6).forEach(s => {
        const up   = s.user_profiles || {}
        const name = [up.first_name, up.last_name].filter(Boolean).join(' ') || up.email || ''
        const cls  = s.classes
          ? `${s.classes.name}${s.classes.section ? ' ' + s.classes.section : ''}`
          : ''
        // Avoid duplicates from user_profiles search above
        if (!results.find(r => r.id === (up.id || s.id))) {
          results.push({
            type:     'student',
            id:       up.id || s.id,
            title:    name,
            subtitle: [cls, s.roll_number || s.admission_number].filter(Boolean).join(' · '),
            meta:     up.phone || up.email || '',
            href:     '/students',
            icon:     'student',
          })
        }
      })
    }

    // ── 2c. faculty table ─────────────────────────────────────────────────────
    if (type === 'all' || type === 'faculty') {
      let fQuery = admin
        .from('faculty')
        .select(`
          id, designation, employee_code,
          user_profiles(id, first_name, last_name, email, phone),
          departments(name)
        `)
        .eq('status', 'active')
        .limit(30)

      if (institutionId) fQuery = fQuery.eq('institution_id', institutionId)

      const { data: facRows } = await fQuery

      ;(facRows || []).filter(f => {
        const up   = f.user_profiles || {}
        const name = [up.first_name, up.last_name].filter(Boolean).join(' ')
        return matchesAny([name, up.email, up.phone, f.employee_code, f.designation, f.departments?.name], q)
      }).slice(0, 5).forEach(f => {
        const up   = f.user_profiles || {}
        const name = [up.first_name, up.last_name].filter(Boolean).join(' ') || up.email || ''
        if (!results.find(r => r.id === (up.id || f.id))) {
          results.push({
            type:     'faculty',
            id:       up.id || f.id,
            title:    name,
            subtitle: [f.departments?.name, f.designation].filter(Boolean).join(' · '),
            meta:     up.phone || up.email || '',
            href:     '/faculty',
            icon:     'faculty',
          })
        }
      })
    }

    // ── 2d. books ─────────────────────────────────────────────────────────────
    if (type === 'all' || type === 'book') {
      let bQuery = admin
        .from('books')
        .select('id, title, author, isbn, category, available_copies, rack_number')
        .eq('is_active', true)
        .or(`title.ilike.%${q}%,author.ilike.%${q}%,isbn.ilike.%${q}%`)
        .limit(6)

      if (institutionId) bQuery = bQuery.eq('institution_id', institutionId)

      const { data: bkRows } = await bQuery
      ;(bkRows || []).forEach(b => results.push({
        type:     'book',
        id:       b.id,
        title:    b.title,
        subtitle: [b.author, b.category].filter(Boolean).join(' · '),
        meta:     `${b.available_copies ?? 0} available · Rack ${b.rack_number || 'N/A'}`,
        href:     '/library',
        icon:     'book',
      }))
    }

    // ── 2e. vehicles ──────────────────────────────────────────────────────────
    if (type === 'all' || type === 'vehicle') {
      let vQuery = admin
        .from('vehicles')
        .select('id, registration_number, type, make, model, capacity')
        .ilike('registration_number', `%${q}%`)
        .limit(3)

      if (institutionId) vQuery = vQuery.eq('institution_id', institutionId)

      const { data: vRows } = await vQuery
      ;(vRows || []).forEach(v => results.push({
        type:     'vehicle',
        id:       v.id,
        title:    v.registration_number,
        subtitle: [v.type, v.make, v.model].filter(Boolean).join(' '),
        meta:     `Capacity: ${v.capacity || '?'}`,
        href:     '/transport',
        icon:     'vehicle',
      }))
    }

    // ── 2f. transport routes ──────────────────────────────────────────────────
    if (type === 'all') {
      let rQuery = admin
        .from('transport_routes')
        .select('id, name, route_number')
        .ilike('name', `%${q}%`)
        .limit(3)

      if (institutionId) rQuery = rQuery.eq('institution_id', institutionId)

      const { data: rtRows } = await rQuery
      ;(rtRows || []).forEach(r => results.push({
        type:     'route',
        id:       r.id,
        title:    r.name,
        subtitle: `Route #${r.route_number || r.id?.slice(0, 6) || ''}`,
        meta:     '',
        href:     '/transport',
        icon:     'vehicle',
      }))
    }

    // ── 2g. hostel rooms ──────────────────────────────────────────────────────
    if (type === 'all') {
      const { data: hrRows } = await admin
        .from('hostel_rooms')
        .select('id, room_number, floor, capacity, hostel_buildings(name, institution_id)')
        .ilike('room_number', `%${q}%`)
        .limit(3)

      ;(hrRows || [])
        .filter(r => !institutionId || r.hostel_buildings?.institution_id === institutionId)
        .forEach(r => results.push({
          type:     'hostel_room',
          id:       r.id,
          title:    `${r.hostel_buildings?.name || 'Hostel'} – ${r.room_number}`,
          subtitle: `Floor ${r.floor || 0} · Capacity ${r.capacity || '?'}`,
          meta:     '',
          href:     '/hostel',
          icon:     'hostel_room',
        }))
    }

    // ── 2h. announcements ─────────────────────────────────────────────────────
    if (type === 'all' || type === 'announcement') {
      let aQuery = admin
        .from('announcements')
        .select('id, title, type, created_at')
        .ilike('title', `%${q}%`)
        .limit(4)

      if (institutionId) aQuery = aQuery.eq('institution_id', institutionId)

      const { data: anRows } = await aQuery
      ;(anRows || []).forEach(a => results.push({
        type:     'announcement',
        id:       a.id,
        title:    a.title,
        subtitle: a.type || 'General',
        meta:     new Date(a.created_at).toLocaleDateString('en-IN'),
        href:     '/communication',
        icon:     'announcement',
      }))
    }

    return Response.json({ results: results.slice(0, 25), total: results.length })
  } catch (err) {
    return Response.json({ error: err.message, results: [], total: 0 }, { status: 500 })
  }
}
