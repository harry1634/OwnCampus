import { createAdminClient }                                    from '@/lib/supabase/admin'
import { createClient }                                        from '@/lib/supabase/server'
import { checkLibraryBookLimit, limitExceededResponse }        from '@/lib/licenseEngine'

// GET  /api/library?type=catalog|issued|overdue&q=...&category=...
// POST /api/library  { action: 'add_book'|'issue'|'return' }
// PATCH /api/library { id, ...fields }  → update book details
// DELETE /api/library?id=...            → deactivate book

async function getInstitutionId(admin, userId) {
  const { data } = await admin.from('user_profiles').select('institution_id').eq('id', userId).single()
  return data?.institution_id || null
}

const FINE_PER_DAY = 2 // ₹2 per day overdue

function calcFine(dueDate) {
  if (!dueDate) return 0
  const today    = new Date()
  const due      = new Date(dueDate)
  if (today <= due) return 0
  const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24))
  return diffDays * FINE_PER_DAY
}

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const type     = searchParams.get('type')     || 'catalog'
    const search   = searchParams.get('q')        || ''
    const category = searchParams.get('category') || ''
    const limit    = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    // ── Book Catalog ───────────────────────────────────────────────────────
    if (type === 'catalog') {
      let q = admin
        .from('books')
        .select('id, isbn, title, author, publisher, edition, category, subject, total_copies, available_copies, rack_number, price, is_active, created_at')
        .eq('is_active', true)
        .order('title', { ascending: true })
        .limit(limit)

      if (institutionId) q = q.eq('institution_id', institutionId)
      if (category)      q = q.eq('category', category)
      if (search)        q = q.or(`title.ilike.%${search}%,author.ilike.%${search}%,isbn.ilike.%${search}%`)

      const { data, error } = await q
      if (error) return Response.json({ error: error.message }, { status: 400 })

      const books = (data || []).map(b => ({
        id:          b.id,
        isbn:        b.isbn        || '',
        title:       b.title,
        author:      b.author      || '',
        publisher:   b.publisher   || '',
        edition:     b.edition     || '',
        category:    b.category    || 'Other',
        subject:     b.subject     || '',
        total:       b.total_copies     || 0,
        available:   b.available_copies || 0,
        rack:        b.rack_number      || '',
        price:       Number(b.price     || 0),
      }))

      return Response.json({ books })
    }

    // ── Issued Books ───────────────────────────────────────────────────────
    if (type === 'issued' || type === 'overdue' || type === 'all') {
      const myOwn = searchParams.get('my') === 'true'

      // Step 1: fetch book_issues + books join only (avoid FK ambiguity on user_profiles
      // because book_issues has two FKs to user_profiles: user_id and issued_by)
      let q = admin
        .from('book_issues')
        .select(`
          id, issued_date, due_date, returned_date, fine_amount, fine_paid, status, created_at, user_id,
          books ( id, title, author, isbn, category, rack_number )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (myOwn) {
        q = q.eq('user_id', user.id)
      } else if (type === 'overdue') {
        q = q.eq('status', 'issued').lt('due_date', new Date().toISOString().slice(0, 10))
      } else if (type === 'issued') {
        q = q.eq('status', 'issued')
      }

      if (institutionId) q = q.eq('institution_id', institutionId)
      if (search) q = q.ilike('books.title', `%${search}%`)

      const { data, error } = await q
      if (error) return Response.json({ error: error.message }, { status: 400 })

      // Step 2: batch-fetch user profiles for all borrower IDs
      const userIds = [...new Set((data || []).map(i => i.user_id).filter(Boolean))]
      let userMap = {}
      if (userIds.length > 0) {
        const { data: users } = await admin
          .from('user_profiles')
          .select('id, first_name, last_name, email, role')
          .in('id', userIds)
        ;(users || []).forEach(u => { userMap[u.id] = u })
      }

      const issues = (data || []).map(i => {
        const up   = userMap[i.user_id] || {}
        const bk   = i.books            || {}
        const fine = i.fine_amount > 0 ? Number(i.fine_amount) : calcFine(i.due_date)

        return {
          id:           i.id,
          bookId:       bk.id || null,
          bookTitle:    bk.title        || '',
          bookAuthor:   bk.author       || '',
          isbn:         bk.isbn         || '',
          category:     bk.category     || '',
          rack:         bk.rack_number  || '',
          borrower:     [up.first_name, up.last_name].filter(Boolean).join(' ') || up.email || '',
          role:         up.role         || '',
          issuedDate:   i.issued_date   || '',
          dueDate:      i.due_date      || '',
          returnedDate: i.returned_date || null,
          fine,
          finePaid:     i.fine_paid || false,
          status:       i.status || 'issued',
          isOverdue:    !i.returned_date && i.due_date < new Date().toISOString().slice(0, 10),
        }
      })

      return Response.json({ issues })
    }

    return Response.json({ error: 'Invalid type. Use catalog, issued, or overdue.' }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin         = createAdminClient()
    const institutionId = await getInstitutionId(admin, user.id)
    const body          = await req.json()
    const { action }    = body

    // ── Add Book ────────────────────────────────────────────────────────
    if (action === 'add_book') {
      const { title, author, isbn, publisher, category, total, rack } = body
      if (!title) return Response.json({ error: 'title is required.' }, { status: 400 })
      const copies = parseInt(total) || 1

      if (institutionId) {
        const limit = await checkLibraryBookLimit(institutionId)
        if (!limit.allowed) return limitExceededResponse('Library Book', limit.current, limit.max)
      }

      const { data, error } = await admin.from('books').insert({
        institution_id:  institutionId,
        title,
        author:          author    || null,
        isbn:            isbn      || null,
        publisher:       publisher || null,
        category:        category  || 'Other',
        rack_number:     rack      || null,
        total_copies:    copies,
        available_copies: copies,
        is_active:       true,
      }).select().single()

      if (error) return Response.json({ error: error.message }, { status: 400 })
      return Response.json({ success: true, book: data })
    }

    // ── Issue Book ──────────────────────────────────────────────────────
    if (action === 'issue') {
      const { book_id, user_id: borrowerId, days, due_date: dueDateStr } = body
      if (!book_id || !borrowerId) return Response.json({ error: 'book_id and user_id are required.' }, { status: 400 })

      // Check availability
      const { data: bk } = await admin.from('books').select('available_copies, title').eq('id', book_id).single()
      if (!bk || bk.available_copies < 1) {
        return Response.json({ error: `"${bk?.title || 'Book'}" has no available copies.` }, { status: 400 })
      }

      const today   = new Date()
      const dueDate = dueDateStr
        ? new Date(dueDateStr)
        : new Date(today.getTime() + (days || 14) * 24 * 60 * 60 * 1000)

      const { data, error } = await admin.from('book_issues').insert({
        institution_id: institutionId,
        book_id,
        user_id:        borrowerId,
        issued_date:    today.toISOString().slice(0, 10),
        due_date:       dueDate.toISOString().slice(0, 10),
        status:         'issued',
        issued_by:      user.id,
      }).select().single()

      if (error) return Response.json({ error: error.message }, { status: 400 })

      // Decrement available copies
      await admin.from('books').update({ available_copies: bk.available_copies - 1 }).eq('id', book_id)

      // Notify borrower of due date
      await admin.from('notifications').insert({
        institution_id: institutionId,
        user_id:        borrowerId,
        type:           'general',
        title:          'Book Issued',
        body:           `"${bk.title}" issued. Due: ${dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.`,
        is_broadcast:   false,
        is_read:        false,
        link:           '/student/library',
      }).then(null, () => {})

      // Audit log
      await admin.from('audit_logs').insert({
        institution_id: institutionId,
        actor_id:       user.id,
        action:         'issue',
        entity_type:    'book_issue',
        entity_id:      data.id,
        new_value:      { book_id, borrower_id: borrowerId, due_date: dueDate.toISOString().slice(0, 10) },
      }).then(null, () => {})

      return Response.json({ success: true, issue: data })
    }

    // ── Return Book ─────────────────────────────────────────────────────
    if (action === 'return') {
      const { issue_id } = body
      if (!issue_id) return Response.json({ error: 'issue_id is required.' }, { status: 400 })

      const { data: issue } = await admin.from('book_issues').select('book_id, due_date, status').eq('id', issue_id).single()
      if (!issue) return Response.json({ error: 'Issue record not found.' }, { status: 404 })
      if (issue.status === 'returned') return Response.json({ error: 'Book already returned.' }, { status: 400 })

      const today    = new Date().toISOString().slice(0, 10)
      const fine     = calcFine(issue.due_date)

      const { error: retErr } = await admin.from('book_issues').update({
        returned_date: today,
        fine_amount:   fine,
        status:        'returned',
      }).eq('id', issue_id)
      if (retErr) return Response.json({ error: retErr.message }, { status: 400 })

      // Atomic increment via SQL to avoid race conditions
      await admin.rpc('increment_book_copies', { p_book_id: issue.book_id }).catch(async () => {
        // Fallback: read-then-write (acceptable; DB trigger is the final guard)
        const { data: bk } = await admin.from('books').select('available_copies').eq('id', issue.book_id).single()
        if (bk) await admin.from('books').update({ available_copies: (bk.available_copies || 0) + 1 }).eq('id', issue.book_id)
      })

      await admin.from('audit_logs').insert({
        institution_id: institutionId,
        actor_id:       user.id,
        action:         'return',
        entity_type:    'book_issue',
        entity_id:      issue_id,
        new_value:      { returned_date: today, fine },
      }).then(null, () => {})

      return Response.json({ success: true, fine, returned_date: today })
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return Response.json({ error: 'id is required.' }, { status: 400 })

    const admin   = createAdminClient()
    const { data: callerP } = await admin.from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = callerP?.institution_id || null

    const allowed = ['title','author','isbn','publisher','category','rack_number','total_copies','available_copies','price','is_active']
    const patch   = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))

    // When total_copies changes, adjust available_copies by the same delta so
    // issued count (total - available) stays correct.
    if ('total_copies' in patch && !('available_copies' in patch)) {
      const { data: cur } = await admin.from('books').select('total_copies, available_copies').eq('id', id).single()
      if (cur) {
        const delta = patch.total_copies - cur.total_copies
        patch.available_copies = Math.max(0, (cur.available_copies || 0) + delta)
      }
    }

    let q = admin.from('books').update(patch).eq('id', id)
    if (institutionId) q = q.eq('institution_id', institutionId)
    const { data, error } = await q.select().single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, book: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id is required.' }, { status: 400 })

    const admin = createAdminClient()
    const { data: callerP } = await admin.from('user_profiles').select('institution_id').eq('id', user.id).single()
    const institutionId = callerP?.institution_id || null

    let q = admin.from('books').update({ is_active: false }).eq('id', id)
    if (institutionId) q = q.eq('institution_id', institutionId)
    const { error } = await q
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
