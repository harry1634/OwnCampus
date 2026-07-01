import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/institutions/lookup?code=ABC123
// Public — no auth required. Returns institution name/type for display during signup.

function deriveCode(inst) {
  const nameChars = (inst.name || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X')
  const slugTail  = (inst.slug || inst.id || '').replace(/-/g, '').toUpperCase().slice(-4)
  return nameChars + slugTail
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')?.trim().toUpperCase()

    if (!code || code.length < 3) {
      return Response.json({ error: 'Institution code must be at least 3 characters.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // ── Pass 1: exact code column match ─────────────────────────────────────
    const { data, error } = await supabase
      .from('institutions')
      .select('id, name, type, code, slug, is_active')
      .ilike('code', code)
      .maybeSingle()

    if (error && !error.message?.includes('column') && !error.message?.includes('does not exist')) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (data) {
      if (data.is_active === false) {
        return Response.json({ error: 'This institution account is inactive. Contact support.' }, { status: 403 })
      }
      return Response.json({ id: data.id, name: data.name, type: data.type, code: data.code || code })
    }

    // ── Pass 2: scan all institutions and derive code from name+slug ─────────
    // Handles the case where migration 005 hasn't run (code column is NULL),
    // but my-code API showed the admin a deterministically derived code.
    const { data: allInsts } = await supabase
      .from('institutions')
      .select('id, name, type, slug, code, is_active')
      .eq('is_active', true)

    const match = (allInsts || []).find(inst => {
      // Match against stored code (if set)
      if (inst.code && inst.code.toUpperCase() === code) return true
      // Match against derived code (name + slug tail)
      return deriveCode(inst) === code
    })

    if (!match) {
      return Response.json({ error: 'No institution found with that code. Check with your admin.' }, { status: 404 })
    }

    if (match.is_active === false) {
      return Response.json({ error: 'This institution account is inactive. Contact support.' }, { status: 403 })
    }

    // Persist the code so future lookups use the fast path
    try {
      await supabase.from('institutions').update({ code }).eq('id', match.id)
    } catch (_) {}

    return Response.json({ id: match.id, name: match.name, type: match.type, code })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
