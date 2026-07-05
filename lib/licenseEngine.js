/**
 * lib/licenseEngine.js
 * License enforcement: limit checks, module access, dashboard access,
 * and institution status checks.
 *
 * ALL functions use the admin client (bypasses RLS).
 * Call these from server-side API routes only — never client-side.
 */

import { createAdminClient } from '@/lib/supabase/admin'

// Statuses that allow normal platform access
export const ACTIVE_STATUSES = new Set(['trial', 'active', 'grace_period'])
// Statuses that block all logins
export const BLOCKED_STATUSES = new Set(['suspended', 'cancelled'])
// Statuses that show an expiry wall
export const EXPIRED_STATUSES = new Set(['expired'])

// ─── Institution Status ──────────────────────────────────────────

/**
 * Returns the institution's control_status.
 * @returns {'pending'|'trial'|'active'|'grace_period'|'suspended'|'expired'|'cancelled'|null}
 */
export async function getInstitutionStatus(institutionId) {
  if (!institutionId) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('institutions')
    .select('control_status')
    .eq('id', institutionId)
    .single()
  return data?.control_status || null
}

/**
 * Full institution guard — returns an object with flags used by layout / login.
 * { isBlocked, isExpired, isPending, isActive, status }
 */
export async function checkInstitutionAccess(institutionId) {
  const status = await getInstitutionStatus(institutionId)
  return {
    status,
    isBlocked:  BLOCKED_STATUSES.has(status),
    isExpired:  EXPIRED_STATUSES.has(status),
    isPending:  status === 'pending',
    isActive:   ACTIVE_STATUSES.has(status),
  }
}

// ─── License Limits ──────────────────────────────────────────────

/**
 * Fetch the institution license row.
 * Returns null if no license exists (treat as unlimited during trial bootstrap).
 */
export async function getInstitutionLicense(institutionId) {
  if (!institutionId) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('institution_licenses')
    .select('*')
    .eq('institution_id', institutionId)
    .single()
  return data || null
}

/**
 * Generic limit checker.
 * @param institutionId
 * @param countQuery  — async fn that returns { count }
 * @param maxField    — field name in institution_licenses, e.g. 'max_students'
 * @returns {{ allowed: boolean, current: number, max: number }}
 */
async function checkLimit(institutionId, countQuery, maxField) {
  const [license, { count }] = await Promise.all([
    getInstitutionLicense(institutionId),
    countQuery(),
  ])
  const current = count ?? 0
  const max     = license?.[maxField] ?? Infinity
  return { allowed: current < max, current, max }
}

// ── Specific limit checks ────────────────────────────────────────

export async function checkStudentLimit(institutionId) {
  const admin = createAdminClient()
  return checkLimit(
    institutionId,
    () => admin.from('students').select('id', { count: 'exact', head: true })
            .eq('institution_id', institutionId).is('deleted_at', null),
    'max_students'
  )
}

export async function checkFacultyLimit(institutionId) {
  const admin = createAdminClient()
  const FACULTY_ROLES = [
    'teacher','faculty','trainer','hod','staff','librarian','counsellor','hr',
    'admission_officer','transport_manager','hostel_manager','coordinator','tutor',
    'instructor','professor','dean','vice_principal','principal','receptionist',
  ]
  return checkLimit(
    institutionId,
    () => admin.from('user_profiles').select('id', { count: 'exact', head: true })
            .eq('institution_id', institutionId).in('role', FACULTY_ROLES),
    'max_faculty'
  )
}

export async function checkAdminLimit(institutionId) {
  const admin = createAdminClient()
  const ADMIN_ROLES = ['owner','super_admin','principal','vice_principal','academic_coordinator','chairman','director','administrator']
  return checkLimit(
    institutionId,
    () => admin.from('user_profiles').select('id', { count: 'exact', head: true })
            .eq('institution_id', institutionId).in('role', ADMIN_ROLES),
    'max_admins'
  )
}

export async function checkBranchLimit(institutionId) {
  const admin = createAdminClient()
  return checkLimit(
    institutionId,
    () => admin.from('branches').select('id', { count: 'exact', head: true })
            .eq('institution_id', institutionId).is('deleted_at', null),
    'max_branches'
  )
}

export async function checkDepartmentLimit(institutionId) {
  const admin = createAdminClient()
  return checkLimit(
    institutionId,
    () => admin.from('departments').select('id', { count: 'exact', head: true })
            .eq('institution_id', institutionId),
    'max_departments'
  )
}

export async function checkClassLimit(institutionId) {
  const admin = createAdminClient()
  return checkLimit(
    institutionId,
    () => admin.from('classes').select('id', { count: 'exact', head: true })
            .eq('institution_id', institutionId),
    'max_classes'
  )
}

export async function checkLibraryBookLimit(institutionId) {
  const admin = createAdminClient()
  return checkLimit(
    institutionId,
    () => admin.from('books').select('id', { count: 'exact', head: true })
            .eq('institution_id', institutionId).eq('is_active', true),
    'max_library_books'
  )
}

export async function checkHostelRoomLimit(institutionId) {
  const admin = createAdminClient()
  return checkLimit(
    institutionId,
    () => admin.from('hostel_rooms').select('id', { count: 'exact', head: true })
            .eq('institution_id', institutionId),
    'max_hostel_rooms'
  )
}

export async function checkVehicleLimit(institutionId) {
  const admin = createAdminClient()
  return checkLimit(
    institutionId,
    () => admin.from('vehicles').select('id', { count: 'exact', head: true })
            .eq('institution_id', institutionId).eq('is_active', true),
    'max_vehicles'
  )
}

export async function checkTransportRouteLimit(institutionId) {
  const admin = createAdminClient()
  return checkLimit(
    institutionId,
    () => admin.from('transport_routes').select('id', { count: 'exact', head: true })
            .eq('institution_id', institutionId).eq('is_active', true),
    'max_transport_routes'
  )
}

// ─── Module Access ───────────────────────────────────────────────

/**
 * Returns a plain object { [moduleKey]: boolean } for the institution.
 * Keys absent from the table default to true (all modules enabled when no records exist).
 */
export async function getEnabledModules(institutionId) {
  if (!institutionId) return {}
  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('institution_modules')
    .select('module_key, is_enabled')
    .eq('institution_id', institutionId)

  if (!rows || rows.length === 0) return null  // null = no restrictions set yet
  const map = {}
  rows.forEach(r => { map[r.module_key] = r.is_enabled })
  return map
}

/**
 * Returns true if the given module is enabled.
 * Defaults to true if no module record exists (graceful degradation).
 */
export async function isModuleEnabled(institutionId, moduleKey) {
  const modules = await getEnabledModules(institutionId)
  if (modules === null) return true  // no restrictions configured
  return modules[moduleKey] !== false
}

// ─── Dashboard Access ────────────────────────────────────────────

/**
 * Returns { admin: bool, faculty: bool, student: bool }.
 * Defaults all to true if no dashboard records exist.
 */
export async function getDashboardAccess(institutionId) {
  if (!institutionId) return { admin: true, faculty: true, student: true }
  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('institution_dashboards')
    .select('dashboard_key, is_enabled')
    .eq('institution_id', institutionId)

  if (!rows || rows.length === 0) return { admin: true, faculty: true, student: true }
  const access = { admin: true, faculty: true, student: true }
  rows.forEach(r => { access[r.dashboard_key] = r.is_enabled })
  return access
}

// ─── Live Usage (for Control Center) ────────────────────────────

/**
 * Returns live usage counts for the given institution.
 * Used by the Control Center usage dashboard.
 */
export async function getInstitutionUsage(institutionId) {
  const admin = createAdminClient()
  const FACULTY_ROLES = [
    'teacher','faculty','trainer','hod','staff','librarian','counsellor','hr',
    'admission_officer','transport_manager','hostel_manager','coordinator','tutor',
    'instructor','professor','dean','vice_principal','principal','receptionist',
  ]
  const ADMIN_ROLES = ['owner','super_admin','principal','vice_principal','academic_coordinator','chairman','director','administrator']

  const [
    { count: students },
    { count: faculty },
    { count: admins },
    { count: branches },
    { count: libraryBooks },
    { count: hostelRooms },
    { count: transportRoutes },
    { count: vehicles },
  ] = await Promise.all([
    admin.from('students').select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId).is('deleted_at', null),
    admin.from('user_profiles').select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId).in('role', FACULTY_ROLES),
    admin.from('user_profiles').select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId).in('role', ADMIN_ROLES),
    admin.from('branches').select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId).is('deleted_at', null),
    admin.from('books').select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId).eq('is_active', true),
    admin.from('hostel_rooms').select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId),
    admin.from('transport_routes').select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId).eq('is_active', true),
    admin.from('vehicles').select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId).eq('is_active', true),
  ])

  return {
    students:        students        ?? 0,
    faculty:         faculty         ?? 0,
    admins:          admins          ?? 0,
    branches:        branches        ?? 0,
    libraryBooks:    libraryBooks    ?? 0,
    hostelRooms:     hostelRooms     ?? 0,
    transportRoutes: transportRoutes ?? 0,
    vehicles:        vehicles        ?? 0,
  }
}

/**
 * Build a standardised limit-exceeded response for API routes.
 */
export function limitExceededResponse(resourceLabel, current, max) {
  return Response.json({
    error:   `${resourceLabel} limit reached (${current}/${max}). Upgrade your subscription or contact OwnCampus to increase your license.`,
    code:    'LIMIT_EXCEEDED',
    current,
    max,
  }, { status: 403 })
}
