import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

export async function GET(req) {
  try {
    // Require authentication — the pending page reads this with the user's own email
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    // Allow unauthenticated only for the pending-approval flow (no active session yet)
    // Restrict: email param must match the authenticated user's email if logged in
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')?.toLowerCase().trim()

    if (!email) {
      return Response.json({ error: 'Email is required.' }, { status: 400 })
    }

    // If caller is authenticated, ensure they can only check their own email
    if (user && user.email?.toLowerCase() !== email) {
      return Response.json({ error: 'Unauthorized.' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('access_requests')
      .select('id, status, role, name, class_section, department')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    if (!data)  return Response.json({ status: 'not_found' })

    return Response.json({
      status:       data.status,
      role:         data.role,
      name:         data.name,
      classSection: data.class_section,
      department:   data.department,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
