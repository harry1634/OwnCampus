import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const BUCKET     = 'photos'
const ALLOWED_MT = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// POST /api/upload/photo
// Accepts multipart form: file (File), path (string — ignored, safe path is enforced server-side)
// Uploads to avatars/{userId}/avatar.{ext}, updates user_profiles.avatar_url, returns { url }
export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Ensure bucket exists (idempotent)
    const { data: buckets } = await admin.storage.listBuckets()
    if (!buckets?.some(b => b.id === BUCKET)) {
      const { error: cbErr } = await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 5242880,
        allowedMimeTypes: ALLOWED_MT,
      })
      if (cbErr) return Response.json({ error: cbErr.message }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('file')

    if (!file) return Response.json({ error: 'file is required' }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) return Response.json({ error: 'File must be under 5MB' }, { status: 400 })
    if (!ALLOWED_MT.includes(file.type)) {
      return Response.json({ error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 })
    }

    // Enforce safe path: always avatars/{userId}/avatar.{ext}
    const ext      = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const safePath = `avatars/${user.id}/avatar.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { data, error } = await admin.storage
      .from(BUCKET)
      .upload(safePath, buffer, { upsert: true, contentType: file.type })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(data.path)
    // Append a cache-buster so every upload produces a distinct URL in the DB.
    // This prevents browsers and CDNs from serving stale images when the same
    // storage path is overwritten (upsert). The timestamp is permanent — it travels
    // through the DB into UserContext and survives navigation.
    const urlWithBuster = publicUrl + '?t=' + Date.now()

    // Update avatar_url in user_profiles; select back to confirm the write
    const { data: updatedRows, error: dbErr } = await admin
      .from('user_profiles')
      .update({ avatar_url: urlWithBuster })
      .eq('id', user.id)
      .select('id')

    if (dbErr) {
      console.error('[upload/photo] DB update failed:', dbErr.message, dbErr)
      return Response.json({ error: 'Saved to storage but failed to update profile: ' + dbErr.message }, { status: 500 })
    }
    if (!updatedRows || updatedRows.length === 0) {
      console.error('[upload/photo] DB update matched 0 rows. user.id =', user.id)
      return Response.json({ error: 'Profile row not found — avatar saved to storage but not linked to your account' }, { status: 404 })
    }

    return Response.json({ url: urlWithBuster })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
