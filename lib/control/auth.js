import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import logger from '@/lib/logger'

// Returns the authenticated company_user row or null.
// Always validates against DB — the cc_uid cookie is just a pointer.
export async function getControlUser() {
  const store = await cookies()
  const ccUid = store.get('cc_uid')?.value
  if (!ccUid) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('company_users')
    .select('id, name, email, role, is_active')
    .eq('id', ccUid)
    .single()

  if (!data || !data.is_active) return null
  return data
}

// Writes an audit log entry. Call from API routes after any mutation.
export async function writeAuditLog(companyUser, action, targetType, targetId, targetName, details = {}) {
  try {
    const admin = createAdminClient()
    await admin.from('company_audit_logs').insert({
      company_user_id:   companyUser.id,
      company_user_name: companyUser.name,
      action,
      target_type:  targetType  || null,
      target_id:    targetId    ? String(targetId) : null,
      target_name:  targetName  || null,
      details,
    })
  } catch (err) {
    logger.error({ err, action, targetId }, 'Failed to write audit log')
  }
}

// Convenience: throw if not authed (use in API routes)
export async function requireControlUser() {
  const cu = await getControlUser()
  if (!cu) throw Object.assign(new Error('Unauthorized'), { status: 401 })
  return cu
}
