import { requireControlUser } from '@/lib/control/auth'
import { createAdminClient }  from '@/lib/supabase/admin'

// GET /api/control/audit?action=&user_id=&page=
export async function GET(req) {
  try {
    await requireControlUser()
    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const action  = searchParams.get('action')  || ''
    const userId  = searchParams.get('user_id') || ''
    const page    = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit   = 30
    const offset  = (page - 1) * limit

    let query = admin
      .from('company_audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (action) query = query.ilike('action', `%${action}%`)
    if (userId) query = query.eq('company_user_id', userId)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    return Response.json({ logs: data || [], total: count || 0, page, limit })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
