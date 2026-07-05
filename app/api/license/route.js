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
      admin.from('institution_licenses').select('*').eq('institution_id', institutionId).single()
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
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
