import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/faculty/classes
// Returns the classes and subjects assigned to the current faculty
// from live timetable_slots — no name matching, uses faculty_user_id.
export async function GET() {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Fetch all timetable slots assigned to this faculty user
    const { data: slots, error } = await admin
      .from('timetable_slots')
      .select('class_id, subjects(name), classes(id, name, section)')
      .eq('faculty_user_id', user.id)

    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Aggregate unique classes + subjects
    const classMap = {}
    ;(slots || []).forEach(slot => {
      const cls = slot.classes
      if (!cls) return
      const displayName = cls.section ? `${cls.name} - ${cls.section}` : cls.name
      if (!classMap[displayName]) classMap[displayName] = new Set()
      const subj = slot.subjects?.name
      if (subj) classMap[displayName].add(subj)
    })

    const classes = Object.entries(classMap).map(([name, subjects]) => ({
      name,
      subjects: [...subjects],
    }))

    return Response.json({ classes })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
