import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req) {
  try {
    const { supabaseId, password } = await req.json()
    if (!supabaseId || !password) {
      return Response.json({ error: 'supabaseId and password are required' }, { status: 400 })
    }
    if (password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    const supabase = createAdminClient()
    const { error } = await supabase.auth.admin.updateUserById(supabaseId, { password })
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
