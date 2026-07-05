import { getControlUser } from '@/lib/control/auth'

// GET /api/control/auth/me
export async function GET() {
  const cu = await getControlUser()
  if (!cu) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({ user: cu })
}
