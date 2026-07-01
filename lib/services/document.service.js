// ─── Document Service ─────────────────────────────────────────────────────────
// Server-side only. Centralized document management for all modules.
// Wraps Supabase Storage with metadata tracking in the 'documents' table.

import { createAdminClient } from '@/lib/supabase/admin'

export const DOCUMENT_CATEGORIES = {
  STUDENT:    'student',
  FACULTY:    'faculty',
  ADMISSION:  'admission',
  TRANSPORT:  'transport',
  HOSTEL:     'hostel',
  INVENTORY:  'inventory',
  HR:         'hr',
  FINANCE:    'finance',
  GENERAL:    'general',
}

export const DOCUMENT_TYPES = {
  ID_PROOF:       'id_proof',
  ADDRESS_PROOF:  'address_proof',
  MARKSHEET:      'marksheet',
  CERTIFICATE:    'certificate',
  PHOTO:          'photo',
  CONTRACT:       'contract',
  INVOICE:        'invoice',
  RECEIPT:        'receipt',
  REPORT:         'report',
  OTHER:          'other',
}

// ── Create Document Record ────────────────────────────────────────────────────

export async function createDocument({
  institutionId,
  entityType,
  entityId,
  category,
  documentType,
  name,
  filePath,
  fileSize,
  mimeType,
  expiryDate,
  uploadedBy,
  isPublic = false,
  metadata = {},
} = {}) {
  if (!institutionId || !entityId || !name || !filePath) {
    return { success: false, error: 'institutionId, entityId, name and filePath are required.' }
  }

  const admin = createAdminClient()

  const { data, error } = await admin.from('documents').insert({
    institution_id: institutionId,
    entity_type:    entityType     || DOCUMENT_CATEGORIES.GENERAL,
    entity_id:      entityId,
    category:       category       || DOCUMENT_CATEGORIES.GENERAL,
    document_type:  documentType   || DOCUMENT_TYPES.OTHER,
    name,
    file_path:      filePath,
    file_size:      fileSize       || null,
    mime_type:      mimeType       || null,
    expiry_date:    expiryDate     || null,
    uploaded_by:    uploadedBy     || null,
    is_public:      isPublic,
    version:        1,
    metadata,
  }).select().single()

  if (error) return { success: false, error: error.message }

  await admin.from('audit_logs').insert({
    institution_id: institutionId,
    actor_id:       uploadedBy || null,
    action:         'document.upload',
    entity_type:    entityType || 'document',
    entity_id:      entityId,
    new_value:      { document_id: data.id, name, category },
  }).catch(() => {})

  return { success: true, document: data }
}

// ── Get Documents for Entity ──────────────────────────────────────────────────

export async function getEntityDocuments(entityId, institutionId, { category } = {}) {
  const admin = createAdminClient()

  let query = admin
    .from('documents')
    .select('id, name, document_type, category, file_path, file_size, mime_type, expiry_date, version, created_at, uploaded_by, is_public, metadata')
    .eq('entity_id', entityId)
    .eq('institution_id', institutionId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) return []
  return data || []
}

// ── Generate Signed Download URL ──────────────────────────────────────────────

export async function getDocumentDownloadUrl(documentId, institutionId, requesterId) {
  const admin = createAdminClient()

  // Fetch document record
  const { data: doc } = await admin
    .from('documents')
    .select('file_path, is_public, institution_id, name')
    .eq('id', documentId)
    .single()

  if (!doc) return { success: false, error: 'Document not found.' }
  if (doc.institution_id !== institutionId && !doc.is_public) {
    return { success: false, error: 'Access denied.' }
  }

  // Generate signed URL (60 min expiry)
  const { data: urlData, error } = await admin.storage
    .from('documents')
    .createSignedUrl(doc.file_path, 3600)

  if (error) return { success: false, error: error.message }

  // Track download
  await admin.from('document_downloads').insert({
    document_id:     documentId,
    downloaded_by:   requesterId || null,
    institution_id:  institutionId,
  }).catch(() => {})

  return { success: true, url: urlData.signedUrl, name: doc.name }
}

// ── Soft Delete Document ──────────────────────────────────────────────────────

export async function deleteDocument(documentId, institutionId, actorId) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('documents')
    .update({ deleted_at: new Date().toISOString(), deleted_by: actorId || null })
    .eq('id', documentId)
    .eq('institution_id', institutionId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
