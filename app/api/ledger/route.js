import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'

// GET  /api/ledger?student_id=...&type=receivable|cash|revenue&from=...&to=...
//      Returns ledger entries + running balance + summary
// POST /api/ledger  { account_type, transaction_type, debit|credit, narration, reference_type, reference_id, student_id? }
//      Manual ledger entry (admin only)

export async function GET(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const studentId  = searchParams.get('student_id') || null
    const acctType   = searchParams.get('type')       || null
    const txType     = searchParams.get('tx_type')    || null
    const fiscalYear = searchParams.get('fiscal_year')|| null
    const from       = searchParams.get('from')       || null
    const to         = searchParams.get('to')         || null
    const summary    = searchParams.get('summary') === 'true'

    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()
    const institutionId = profile?.institution_id || null

    let query = admin
      .from('ledger_entries')
      .select(`
        id, account_type, transaction_type, debit, credit, narration,
        reference_type, reference_id, transaction_date, fiscal_year,
        student_id,
        created_by_profile:created_by ( first_name, last_name )
      `)
      .order('transaction_date', { ascending: false })
      .order('created_at',       { ascending: false })

    if (institutionId) query = query.eq('institution_id', institutionId)
    if (studentId)     query = query.eq('student_id', studentId)
    if (acctType)      query = query.eq('account_type', acctType)
    if (txType)        query = query.eq('transaction_type', txType)
    if (fiscalYear)    query = query.eq('fiscal_year', fiscalYear)
    if (from)          query = query.gte('transaction_date', from)
    if (to)            query = query.lte('transaction_date', to)

    query = query.limit(500)

    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 400 })

    const entries = data || []

    if (summary) {
      // Aggregate by account type
      const totals = {}
      entries.forEach(e => {
        if (!totals[e.account_type]) totals[e.account_type] = { debit: 0, credit: 0 }
        totals[e.account_type].debit  += Number(e.debit  || 0)
        totals[e.account_type].credit += Number(e.credit || 0)
      })

      const totalRevenue    = entries.filter(e => e.account_type === 'cash').reduce((s, e) => s + Number(e.credit || 0), 0)
      const totalReceivable = entries.filter(e => e.account_type === 'receivable').reduce((s, e) => s + Number(e.debit || 0), 0)

      return Response.json({
        summary: totals,
        total_revenue:    totalRevenue,
        total_receivable: totalReceivable,
        balance:          totalRevenue - totalReceivable,
        entries_count:    entries.length,
      })
    }

    // Compute running balance (chronological, oldest first)
    let balance = 0
    const withBalance = [...entries].reverse().map(e => {
      balance += Number(e.credit || 0) - Number(e.debit || 0)
      return { ...e, running_balance: balance }
    }).reverse()

    return Response.json({ entries: withBalance, count: entries.length })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const serverClient = await createClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      account_type, transaction_type, debit = 0, credit = 0,
      narration, reference_type, reference_id, student_id,
      transaction_date,
    } = body

    if (!account_type || !transaction_type) {
      return Response.json({ error: 'account_type and transaction_type are required' }, { status: 400 })
    }
    if (Number(debit) === 0 && Number(credit) === 0) {
      return Response.json({ error: 'Either debit or credit must be non-zero' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('user_profiles').select('institution_id, role').eq('id', user.id).single()

    const adminRoles = ['owner','super_admin','principal','vice_principal','academic_coordinator','hr']
    if (!adminRoles.includes(profile?.role || '')) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const txDate = transaction_date || new Date().toISOString().slice(0, 10)
    const fiscalYear = (() => {
      const d = new Date(txDate)
      const m = d.getMonth() // 0-based
      const y = d.getFullYear()
      return m >= 3 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`
    })()

    const { data, error } = await admin
      .from('ledger_entries')
      .insert({
        institution_id:  profile.institution_id,
        student_id:      student_id      || null,
        account_type,
        transaction_type,
        debit:           Number(debit),
        credit:          Number(credit),
        narration:       narration        || null,
        reference_type:  reference_type  || null,
        reference_id:    reference_id    || null,
        transaction_date: txDate,
        fiscal_year:     fiscalYear,
        created_by:      user.id,
      })
      .select().single()

    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ success: true, entry: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
