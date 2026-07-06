import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

const BUCKET = 'homework-submissions'

// POST /api/upload/homework
// Multipart: file (PDF), homework_id (string)
// Returns { url, name }
export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Resolve student record
    const { data: stu } = await admin
      .from('students')
      .select('id, institution_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()
    if (!stu) return Response.json({ error: 'Student record not found' }, { status: 404 })

    // Ensure bucket exists
    const { data: buckets } = await admin.storage.listBuckets()
    if (!buckets?.some(b => b.id === BUCKET)) {
      const { error: cbErr } = await admin.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: 10485760, // 10 MB
        allowedMimeTypes: ['application/pdf'],
      })
      if (cbErr) return Response.json({ error: cbErr.message }, { status: 500 })
    }

    const formData  = await req.formData()
    const file      = formData.get('file')
    const homeworkId = formData.get('homework_id') || 'general'

    if (!file) return Response.json({ error: 'file is required' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return Response.json({ error: 'File must be under 10 MB' }, { status: 400 })
    if (file.type !== 'application/pdf') return Response.json({ error: 'Only PDF files are allowed' }, { status: 400 })

    const safeName = `${stu.institution_id}/${homeworkId}/${stu.id}/${Date.now()}.pdf`
    const buffer   = Buffer.from(await file.arrayBuffer())

    const { data, error } = await admin.storage
      .from(BUCKET)
      .upload(safeName, buffer, { upsert: true, contentType: 'application/pdf' })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Signed URL valid for 10 years (faculty needs permanent access)
    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(data.path, 60 * 60 * 24 * 3650)

    return Response.json({ url: signed?.signedUrl || data.path, name: file.name })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
