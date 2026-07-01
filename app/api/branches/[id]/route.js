import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req, { params }) {
  try {
    const { id } = await params
    const { name, code } = await req.json()
    if (!name?.trim()) return Response.json({ error: 'Branch name is required.' }, { status: 400 })

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('branches')
      .update({ name: name.trim(), code: code?.trim() || null })
      .eq('id', id)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ branch: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // Soft-delete: mark inactive so existing users' branch_id still resolves
    const { error } = await supabase
      .from('branches')
      .update({ is_active: false })
      .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
