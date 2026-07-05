import { requireControlUser } from '@/lib/control/auth'
import { createAdminClient }  from '@/lib/supabase/admin'

export async function GET(req, { params }) {
  try {
    await requireControlUser()
    const { id } = await params
    const admin  = createAdminClient()

    const { data: emails, error } = await admin
      .from('email_queue')
      .select('id, to_email, to_name, subject, template_key, status, attempts, sent_at, error_message, body_html, created_at')
      .eq('institution_id', id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ emails: emails || [] })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
