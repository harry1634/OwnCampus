import { createAdminClient }                                          from '@/lib/supabase/admin'
import { createClient }                                              from '@/lib/supabase/server'
import { checkTransportRouteLimit, checkVehicleLimit, limitExceededResponse, isModuleEnabled } from '@/lib/licenseEngine'

export const dynamic = 'force-dynamic'

// GET  /api/transport?type=routes|vehicles|assignments
// POST /api/transport  { action: 'add_route'|'add_vehicle'|'assign_student' }
// PATCH /api/transport { id, ...fields }
// DELETE /api/transport?id=...&type=route|vehicle

async function getInstitutionId(admin, userId) {
  const { data } = await admin.from('user_profiles').select('institution_id').eq('id', userId).single()
  return data?.institution_id || null
}

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'routes'

    const institutionId = await getInstitutionId(admin, user.id)

    // ── Routes (separate flat queries — no FK join ambiguity) ─────────────
    if (type === 'routes') {
      let q = admin
        .from('transport_routes')
        .select('id, name, route_number, stops, departure_time, arrival_time, monthly_fee, is_active, vehicle_id')
        .order('name', { ascending: true })
      if (institutionId) q = q.eq('institution_id', institutionId)

      const { data: routes, error } = await q
      if (error) return Response.json({ error: error.message }, { status: 400 })

      // Fetch vehicles separately
      const vehicleIds = [...new Set((routes || []).map(r => r.vehicle_id).filter(Boolean))]
      const vehicleMap = {}
      const driverMap  = {}
      if (vehicleIds.length > 0) {
        const { data: vehs } = await admin.from('vehicles')
          .select('id, registration_number, type, make, model, capacity, driver_id')
          .in('id', vehicleIds)
        const driverIds = [...new Set((vehs || []).map(v => v.driver_id).filter(Boolean))]
        if (driverIds.length > 0) {
          const { data: drvs } = await admin.from('user_profiles')
            .select('id, first_name, last_name, phone').in('id', driverIds)
          ;(drvs || []).forEach(d => { driverMap[d.id] = d })
        }
        ;(vehs || []).forEach(v => { vehicleMap[v.id] = v })
      }

      // Count assigned students per route
      const routeIds = (routes || []).map(r => r.id)
      const studentCounts = {}
      if (routeIds.length > 0) {
        const { data: asgn } = await admin.from('transport_assignments')
          .select('route_id').in('route_id', routeIds).eq('status', 'active')
        ;(asgn || []).forEach(a => { studentCounts[a.route_id] = (studentCounts[a.route_id] || 0) + 1 })
      }

      const result = (routes || []).map(r => {
        const v   = vehicleMap[r.vehicle_id] || {}
        const drv = driverMap[v.driver_id]   || {}
        const stops = Array.isArray(r.stops) ? r.stops : (typeof r.stops === 'string' ? JSON.parse(r.stops || '[]') : [])
        return {
          id:            r.id,
          name:          r.name,
          routeNumber:   r.route_number || '',
          stops,
          departureTime: r.departure_time || '',
          arrivalTime:   r.arrival_time   || '',
          monthlyFee:    Number(r.monthly_fee || 0),
          isActive:      r.is_active !== false,
          vehicleId:     v.id || null,
          vehicleReg:    v.registration_number || '',
          vehicleType:   v.type || 'bus',
          vehicleModel:  [v.make, v.model].filter(Boolean).join(' ') || '',
          capacity:      v.capacity || 0,
          driver:        [drv.first_name, drv.last_name].filter(Boolean).join(' ') || '',
          driverPhone:   drv.phone || '',
          studentsCount: studentCounts[r.id] || 0,
        }
      })

      return Response.json({ routes: result })
    }

    // ── Vehicles (separate flat queries) ──────────────────────────────────
    if (type === 'vehicles') {
      let q = admin
        .from('vehicles')
        .select('id, registration_number, type, make, model, year, capacity, fuel_type, insurance_expiry, permit_expiry, fitness_expiry, is_active, driver_id')
        .order('registration_number', { ascending: true })
      if (institutionId) q = q.eq('institution_id', institutionId)

      const { data, error } = await q
      if (error) return Response.json({ error: error.message }, { status: 400 })

      const driverIds = [...new Set((data || []).map(v => v.driver_id).filter(Boolean))]
      const driverMap = {}
      if (driverIds.length > 0) {
        const { data: drvs } = await admin.from('user_profiles')
          .select('id, first_name, last_name, phone, email').in('id', driverIds)
        ;(drvs || []).forEach(d => { driverMap[d.id] = d })
      }

      const vehicles = (data || []).map(v => {
        const drv = driverMap[v.driver_id] || {}
        return {
          id:                 v.id,
          registrationNumber: v.registration_number,
          type:               v.type || 'bus',
          make:               v.make || '',
          model:              v.model || '',
          year:               v.year || null,
          capacity:           v.capacity || 40,
          fuelType:           v.fuel_type || 'diesel',
          insuranceExpiry:    v.insurance_expiry || null,
          permitExpiry:       v.permit_expiry    || null,
          fitnessExpiry:      v.fitness_expiry   || null,
          isActive:           v.is_active !== false,
          driver:             [drv.first_name, drv.last_name].filter(Boolean).join(' ') || '',
          driverPhone:        drv.phone  || '',
          driverEmail:        drv.email  || '',
        }
      })

      return Response.json({ vehicles })
    }

    // ── Student Assignments (separate flat queries) ────────────────────────
    if (type === 'assignments') {
      const myOwn   = searchParams.get('my')       === 'true'
      const routeId = searchParams.get('route_id') || null

      let q = admin
        .from('transport_assignments')
        .select('id, route_id, student_id, stop_name, pickup_point, status, monthly_fee, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (institutionId) q = q.eq('institution_id', institutionId)
      if (routeId) q = q.eq('route_id', routeId)

      if (myOwn) {
        const { data: studentRow } = await admin.from('students').select('id').eq('user_id', user.id).single()
        if (studentRow) q = q.eq('student_id', studentRow.id)
        else return Response.json({ assignments: [] })
      }

      const { data: asgns, error } = await q
      if (error) return Response.json({ assignments: [] })
      if (!asgns?.length) return Response.json({ assignments: [] })

      const aRouteIds  = [...new Set(asgns.map(a => a.route_id).filter(Boolean))]
      const studentIds = [...new Set(asgns.map(a => a.student_id).filter(Boolean))]

      const [routesRes, studsRes] = await Promise.all([
        aRouteIds.length  > 0 ? admin.from('transport_routes').select('id, name, route_number, stops, departure_time, arrival_time, vehicle_id').in('id', aRouteIds) : Promise.resolve({ data: [] }),
        studentIds.length > 0 ? admin.from('students').select('id, roll_number, user_id, class_id').in('id', studentIds) : Promise.resolve({ data: [] }),
      ])

      const fetchedRoutes = routesRes?.data || []
      const studs         = studsRes?.data  || []

      const vIds    = [...new Set(fetchedRoutes.map(r => r.vehicle_id).filter(Boolean))]
      const userIds = [...new Set(studs.map(s => s.user_id).filter(Boolean))]
      const clsIds  = [...new Set(studs.map(s => s.class_id).filter(Boolean))]

      const [vehiclesRes, upsRes, clssRes] = await Promise.all([
        vIds.length    > 0 ? admin.from('vehicles').select('id, registration_number, type, make, model, driver_id').in('id', vIds) : Promise.resolve({ data: [] }),
        userIds.length > 0 ? admin.from('user_profiles').select('id, first_name, last_name, email, phone').in('id', userIds) : Promise.resolve({ data: [] }),
        clsIds.length  > 0 ? admin.from('classes').select('id, name, section').in('id', clsIds) : Promise.resolve({ data: [] }),
      ])

      const fetchedVehs = vehiclesRes?.data || []
      const drvIds      = [...new Set(fetchedVehs.map(v => v.driver_id).filter(Boolean))]
      const driverMap   = {}
      if (drvIds.length > 0) {
        const { data: drvs } = await admin.from('user_profiles')
          .select('id, first_name, last_name, phone').in('id', drvIds)
        ;(drvs || []).forEach(d => { driverMap[d.id] = d })
      }

      const routeMap = {}; fetchedRoutes.forEach(r => { routeMap[r.id] = r })
      const vehMap   = {}; fetchedVehs.forEach(v => { vehMap[v.id]   = v })
      const upMap    = {}; (upsRes?.data  || []).forEach(u => { upMap[u.id]   = u })
      const classMap = {}; (clssRes?.data || []).forEach(c => { classMap[c.id] = c })
      const studMap  = {}; studs.forEach(s => { studMap[s.id] = s })

      const assignments = asgns.map(a => {
        const rt  = routeMap[a.route_id]    || {}
        const veh = vehMap[rt.vehicle_id]   || {}
        const drv = driverMap[veh.driver_id]|| {}
        const st  = studMap[a.student_id]   || {}
        const up  = upMap[st.user_id]       || {}
        const cls = classMap[st.class_id]   || {}
        const stops = Array.isArray(rt.stops) ? rt.stops : (typeof rt.stops === 'string' ? JSON.parse(rt.stops || '[]') : [])
        return {
          id:            a.id,
          student:       [up.first_name, up.last_name].filter(Boolean).join(' ') || up.email || '',
          roll:          st.roll_number || '',
          class:         cls.name ? `${cls.name}${cls.section ? ' ' + cls.section : ''}` : '',
          phone:         up.phone || '',
          route:         rt.name  || '',
          routeId:       rt.id    || null,
          routeNumber:   rt.route_number || '',
          stop:          a.stop_name || a.pickup_point || '',
          monthlyFee:    Number(a.monthly_fee || 0),
          status:        a.status,
          stops,
          departureTime: rt.departure_time || '',
          arrivalTime:   rt.arrival_time   || '',
          vehicleReg:    veh.registration_number || '',
          vehicleType:   veh.type || 'bus',
          vehicleModel:  [veh.make, veh.model].filter(Boolean).join(' ') || '',
          driver:        [drv.first_name, drv.last_name].filter(Boolean).join(' ') || '',
          driverPhone:   drv.phone || '',
        }
      })

      return Response.json({ assignments })
    }

    return Response.json({ error: 'Invalid type. Use routes, vehicles, or assignments.' }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin         = createAdminClient()
    const institutionId = await getInstitutionId(admin, user.id)

    if (institutionId && !(await isModuleEnabled(institutionId, 'transport'))) {
      return Response.json({ error: 'Transport module is not enabled for your institution.' }, { status: 403 })
    }

    const body          = await req.json()
    const { action }    = body

    if (action === 'add_route') {
      const { name, route_number, stops, departure_time, arrival_time, monthly_fee, vehicle_id } = body
      if (!name) return Response.json({ error: 'name is required.' }, { status: 400 })

      if (institutionId) {
        const limit = await checkTransportRouteLimit(institutionId)
        if (!limit.allowed) return limitExceededResponse('Transport Route', limit.current, limit.max)
      }

      const { data, error } = await admin.from('transport_routes').insert({
        institution_id: institutionId,
        vehicle_id:     vehicle_id     || null,
        name,
        route_number:   route_number   || null,
        stops:          stops          || [],
        departure_time: departure_time || null,
        arrival_time:   arrival_time   || null,
        monthly_fee:    monthly_fee    || null,
        is_active:      true,
      }).select().single()

      if (error) return Response.json({ error: error.message }, { status: 400 })
      return Response.json({ success: true, route: data })
    }

    if (action === 'add_vehicle') {
      const { registration_number, type, make, model, year, capacity, fuel_type } = body
      if (!registration_number) return Response.json({ error: 'registration_number is required.' }, { status: 400 })

      if (institutionId) {
        const limit = await checkVehicleLimit(institutionId)
        if (!limit.allowed) return limitExceededResponse('Vehicle', limit.current, limit.max)
      }

      const { data, error } = await admin.from('vehicles').insert({
        institution_id:      institutionId,
        registration_number,
        type:                type       || 'bus',
        make:                make       || null,
        model:               model      || null,
        year:                year       || null,
        capacity:            capacity   || 40,
        fuel_type:           fuel_type  || 'diesel',
        is_active:           true,
      }).select().single()

      if (error) {
        // Duplicate registration — find and return the existing vehicle
        const { data: existing } = await admin.from('vehicles')
          .select('id, registration_number, type, capacity')
          .eq('registration_number', registration_number)
          .eq('institution_id', institutionId)
          .single()
        if (existing) return Response.json({ success: true, vehicle: existing })
        return Response.json({ error: error.message }, { status: 400 })
      }
      return Response.json({ success: true, vehicle: data })
    }

    if (action === 'assign_student') {
      const { student_name, route_id, stop_name, monthly_fee } = body

      // Find student by name
      let studentId = body.student_id || null
      if (!studentId && student_name) {
        const parts = student_name.trim().split(' ')
        const { data: ups } = await admin
          .from('user_profiles').select('id').ilike('first_name', parts[0] + '%').eq('institution_id', institutionId).limit(1)
        if (ups?.[0]) {
          const { data: stu } = await admin.from('students').select('id').eq('user_id', ups[0].id).single()
          studentId = stu?.id || null
        }
      }
      if (!studentId) return Response.json({ error: 'Student not found.' }, { status: 400 })
      if (!route_id)  return Response.json({ error: 'route_id is required.' }, { status: 400 })

      // Upsert assignment (deactivate old, create new)
      const { data, error } = await admin.from('transport_assignments').insert({
        institution_id: institutionId,
        student_id:     studentId,
        route_id,
        stop_name:      stop_name   || null,
        monthly_fee:    monthly_fee || null,
        status:         'active',
      }).select().single()

      if (error) return Response.json({ error: error.message }, { status: 400 })

      // Notify student of transport assignment
      const { data: stuRow } = await admin.from('students').select('user_id').eq('id', studentId).single()
      if (stuRow?.user_id) {
        const { data: route } = await admin.from('transport_routes').select('name, route_number').eq('id', route_id).single()
        await admin.from('notifications').insert({
          institution_id: institutionId,
          user_id:        stuRow.user_id,
          type:           'general',
          title:          'Transport Route Assigned',
          body:           `You have been assigned to Route ${route?.name || route_id}${stop_name ? ` — Stop: ${stop_name}` : ''}.`,
          is_broadcast:   false,
          is_read:        false,
          link:           '/student/transport',
        }).then(null, () => {})
      }

      await admin.from('audit_logs').insert({
        institution_id: institutionId,
        actor_id:       user.id,
        action:         'create',
        entity_type:    'transport_assignment',
        entity_id:      data.id,
        new_value:      { student_id: studentId, route_id, stop_name },
      }).then(null, () => {})

      return Response.json({ success: true, assignment: data })
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, type, ...updates } = body
    if (!id || !type) return Response.json({ error: 'id and type required.' }, { status: 400 })

    const admin = createAdminClient()
    const { data: callerP } = await admin.from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = callerP?.institution_id || null
    const table = type === 'vehicle' ? 'vehicles' : 'transport_routes'

    if (type === 'assignment') {
      const allowedAssignment = ['stop_name', 'pickup_point', 'monthly_fee', 'status']
      const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => allowedAssignment.includes(k)))
      let q = admin.from('transport_assignments').update(patch).eq('id', id)
      if (institutionId) q = q.eq('institution_id', institutionId)
      const { error } = await q
      if (error) return Response.json({ error: error.message }, { status: 400 })
      return Response.json({ success: true })
    }

    const allowed = type === 'vehicle'
      ? ['registration_number','make','model','year','capacity','fuel_type','is_active','insurance_expiry','permit_expiry','fitness_expiry']
      : ['name','route_number','stops','departure_time','arrival_time','monthly_fee','is_active','vehicle_id']

    const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))
    let q = admin.from(table).update(patch).eq('id', id)
    if (institutionId) q = q.eq('institution_id', institutionId)
    const { data, error } = await q.select().single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id   = searchParams.get('id')
    const type = searchParams.get('type') || 'route'
    if (!id) return Response.json({ error: 'id is required.' }, { status: 400 })

    const admin = createAdminClient()
    const { data: callerP } = await admin.from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const ADMIN_ROLES = ['owner','super_admin','principal','vice_principal','transport_manager']
    if (!ADMIN_ROLES.includes(callerP?.role || '')) return Response.json({ error: 'Insufficient permissions.' }, { status: 403 })

    const institutionId = callerP?.institution_id || null
    const table = type === 'vehicle' ? 'vehicles' : 'transport_routes'
    let q = admin.from(table).delete().eq('id', id)
    if (institutionId) q = q.eq('institution_id', institutionId)
    const { error } = await q
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
