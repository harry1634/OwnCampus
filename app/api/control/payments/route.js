import { requireControlUser, writeAuditLog } from '@/lib/control/auth'
import { createAdminClient }                 from '@/lib/supabase/admin'

// GET /api/control/payments?month=&status=&page=
export async function GET(req) {
  try {
    await requireControlUser()
    const admin = createAdminClient()
    const { searchParams } = new URL(req.url)
    const month   = searchParams.get('month')  || '' // YYYY-MM
    const status  = searchParams.get('status') || ''
    const page    = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit   = 30
    const offset  = (page - 1) * limit

    let query = admin
      .from('institution_payments')
      .select(`
        *,
        institutions ( id, name, type, control_status )
      `, { count: 'exact' })
      .order('billing_month', { ascending: false })
      .range(offset, offset + limit - 1)

    if (month)  query = query.like('billing_month', `${month}%`)
    if (status) query = query.eq('payment_status', status)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    return Response.json({ payments: data || [], total: count || 0, page, limit })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}

// POST /api/control/payments
// Creates or updates a payment record.
export async function POST(req) {
  try {
    const cu   = await requireControlUser()
    const body = await req.json()
    const admin = createAdminClient()

    const { institution_id, billing_month, amount, gst_percent, payment_status, payment_method, payment_date, notes } = body
    if (!institution_id || !billing_month) {
      return Response.json({ error: 'institution_id and billing_month are required.' }, { status: 400 })
    }

    const fee       = parseFloat(amount || 0)
    const gstPct    = parseFloat(gst_percent ?? 18)
    const gstAmt    = parseFloat((fee * gstPct / 100).toFixed(2))
    const total     = parseFloat((fee + gstAmt).toFixed(2))

    // Generate invoice number if marking as paid
    let invoiceNumber = null
    if (payment_status === 'paid') {
      // OC-YYYYMMDD-XXXXX
      const { data: settings } = await admin
        .from('company_settings')
        .select('value')
        .eq('key', 'invoice_prefix')
        .single()
      const prefix = (settings?.value || '"OC"').replace(/"/g, '')
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const rand = Math.floor(Math.random() * 90000 + 10000)
      invoiceNumber = `${prefix}-${datePart}-${rand}`
    }

    const payload = {
      institution_id,
      billing_month: billing_month + '-01', // ensure DATE format
      amount:         fee,
      gst_percent:    gstPct,
      gst_amount:     gstAmt,
      total_amount:   total,
      payment_status: payment_status || 'pending',
      payment_method: payment_method || null,
      payment_date:   payment_date   || null,
      invoice_number: invoiceNumber,
      notes:          notes || null,
      updated_by:     cu.id,
      updated_at:     new Date().toISOString(),
    }

    const { data, error } = await admin
      .from('institution_payments')
      .upsert(payload, { onConflict: 'institution_id,billing_month' })
      .select('id, invoice_number')
      .single()

    if (error) throw new Error(error.message)

    await writeAuditLog(cu, `payment.${payment_status}`, 'payment', data?.id, institution_id, { billing_month, total })
    return Response.json({ ok: true, invoiceNumber: data?.invoice_number })
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 500 })
  }
}
