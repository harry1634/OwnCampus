/**
 * GET /api/license
 *
 * Returns the current institution's license, module access, dashboard access,
 * and live usage counts. Used by the admin dashboard and enforcement hooks.
 *
 * Requires institution user auth (Supabase session).
 */

import { createClient }       from '@/lib/supabase/server'
import { createAdminClient }  from '@/lib/supabase/admin'
import {
  getEnabledModules,
  getDashboardAccess,
  getInstitutionUsage,
} from '@/lib/licenseEngine'

export const dynamic = 'force-dynamic'

// License and module configuration rarely changes — serve from cache for 5 minutes.
const LICENSE_TTL = 300 // seconds

export async function GET() {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles')
      .select('institution_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.institution_id) {
      return Response.json({ error: 'No institution linked to this account.' }, { status: 404 })
    }

    const institutionId = profile.institution_id

    const [license, modules, dashboards, usage] = await Promise.all([
      admin.from('institution_licenses')
        .select('institution_id, valid_from, valid_until, billing_cycle, monthly_fee, currency, grace_period_days, max_students, max_faculty, max_admins, max_branches, max_departments, max_courses, max_classes, max_library_books, max_hostel_rooms, max_vehicles, max_transport_routes, max_api_requests, max_realtime_connections, max_storage_gb, discount_percent')
        .eq('institution_id', institutionId).single()
        .then(r => r.data || null),
      getEnabledModules(institutionId),
      getDashboardAccess(institutionId),
      getInstitutionUsage(institutionId),
    ])

    return Response.json({
      institution_id: institutionId,
      license:        license   || null,
      modules:        modules   || {},
      dashboards,
      usage,
    }, {
      headers: {
        'Cache-Control': `private, max-age=${LICENSE_TTL}, stale-while-revalidate=60`,
      },
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
