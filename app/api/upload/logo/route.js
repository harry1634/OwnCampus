import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const BUCKET     = 'photos'
const ALLOWED_MT = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// POST /api/upload/logo
// Uploads an institution logo to logos/{institutionId}/logo.{ext}
// Does NOT touch user_profiles.avatar_url — completely separate from profile photos.
export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('user_profiles').select('institution_id').eq('id', user.id).single()
    if (!profile?.institution_id) {
      return Response.json({ error: 'Institution not linked to your account' }, { status: 400 })
    }
    const institutionId = profile.institution_id

    // Ensure bucket exists (idempotent)
    const { data: buckets } = await admin.storage.listBuckets()
    if (!buckets?.some(b => b.id === BUCKET)) {
      await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 5242880,
        allowedMimeTypes: ALLOWED_MT,
      })
    }

    const formData = await req.formData()
    const file = formData.get('file')

    if (!file) return Response.json({ error: 'file is required' }, { status: 400 })
    if (file.size > 2 * 1024 * 1024) return Response.json({ error: 'File must be under 2MB' }, { status: 400 })
    if (!ALLOWED_MT.includes(file.type)) {
      return Response.json({ error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 })
    }

    const ext      = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const safePath = `logos/${institutionId}/logo.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { data, error } = await admin.storage
      .from(BUCKET)
      .upload(safePath, buffer, { upsert: true, contentType: file.type })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(data.path)
    const urlWithBuster = publicUrl + '?t=' + Date.now()

    return Response.json({ url: urlWithBuster })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
