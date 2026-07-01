import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET /api/dashboard
// Returns every KPI in one call via get_institution_dashboard() RPC.
// Replaces individual round-trips from the dashboard page.
export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null
    if (!institutionId) return Response.json({ error: 'No institution linked to this account' }, { status: 400 })

    // Single RPC call – runs all sub-queries inside one Postgres transaction
    const { data, error } = await admin.rpc('get_institution_dashboard', {
      p_institution_id: institutionId,
    })

    if (error) {
      // RPC not yet available (migration not run); return empty scaffold
      console.error('Dashboard RPC error:', error.message)
      return Response.json({
        _fallback: true,
        students:   { total: 0, fee_paid: 0, fee_partial: 0, fee_pending: 0, receivable: 0, collected: 0, collection_pct: 0 },
        faculty:    { total: 0 },
        attendance: { pct: 0, records: 0 },
        exams:      { upcoming: 0, completed: 0, drafts: 0 },
        leaves:     { pending: 0, approved: 0 },
        hostel:     { buildings: 0, rooms: 0, capacity: 0, occupied: 0, occupancy_pct: 0 },
        library:    { titles: 0, copies: 0, available: 0, overdue: 0 },
        transport:  { routes: 0, vehicles: 0, assigned: 0 },
        calendar:   { events_next_7_days: 0 },
      })
    }

    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
