import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const BUCKET = 'photos'

// POST /api/upload/photo
// Accepts multipart form: file (File), path (string)
// Auto-creates the bucket if missing, uploads the file, returns { url }
export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Ensure bucket exists (idempotent)
    const { data: buckets } = await admin.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.id === BUCKET)
    if (!bucketExists) {
      const { error: cbErr } = await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 5242880,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      })
      if (cbErr) return Response.json({ error: cbErr.message }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('file')
    const path = formData.get('path')

    if (!file || !path) return Response.json({ error: 'file and path are required' }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) return Response.json({ error: 'File must be under 5MB' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const { data, error } = await admin.storage
      .from(BUCKET)
      .upload(path, buffer, { upsert: true, contentType: file.type })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(data.path)
    return Response.json({ url: publicUrl })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
