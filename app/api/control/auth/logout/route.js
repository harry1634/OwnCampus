import { cookies } from 'next/headers'

// POST /api/control/auth/logout
export async function POST() {
  const store = await cookies()
  store.set('cc_uid', '', { maxAge: 0, path: '/' })
  return Response.json({ ok: true })
}
