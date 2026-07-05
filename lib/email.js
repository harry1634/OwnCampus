/**
 * lib/email.js
 * Transactional email via Resend.
 * email_queue is an audit log — every call also updates the row status.
 */

import { createAdminClient } from '@/lib/supabase/admin'

const FROM = process.env.RESEND_FROM_EMAIL || 'OwnCampus <onboarding@resend.dev>'

async function getResend() {
  const { Resend } = await import('resend')
  return new Resend(process.env.RESEND_API_KEY)
}

/**
 * sendEmail — deliver one email via Resend.
 * If queueId is provided, updates the email_queue row to sent/failed.
 */
async function sendEmail({ to, subject, html, queueId }) {
  const admin = createAdminClient()
  let sendError = null

  try {
    const resend = await getResend()
    const { error } = await resend.emails.send({
      from:    FROM,
      to:      [to],
      subject,
      html,
    })
    if (error) sendError = error.message || JSON.stringify(error)
  } catch (err) {
    sendError = err.message || String(err)
  }

  if (queueId) {
    if (sendError) {
      await admin.from('email_queue').update({
        status:        'failed',
        error_message: sendError,
        attempts:      1,
      }).eq('id', queueId)
    } else {
      await admin.from('email_queue').update({
        status:   'sent',
        sent_at:  new Date().toISOString(),
        attempts: 1,
      }).eq('id', queueId)
    }
  }

  return sendError ? { ok: false, error: sendError } : { ok: true }
}

/**
 * queueAndSend — insert into email_queue (audit log) and send immediately.
 * Returns { queueId, sent, error? }.
 */
export async function queueAndSend({
  to_email, to_name, subject, template_key,
  body_html, variables, institution_id,
}) {
  const admin = createAdminClient()

  const { data: row, error: insertErr } = await admin
    .from('email_queue')
    .insert({
      to_email,
      to_name:        to_name   || null,
      subject,
      template_key:   template_key || null,
      body_html:      body_html || null,
      variables:      variables || {},
      institution_id: institution_id || null,
      status:         'pending',
    })
    .select('id')
    .single()

  if (insertErr || !row) {
    return { queueId: null, sent: false, error: insertErr?.message || 'Queue insert failed' }
  }

  const result = await sendEmail({ to: to_email, subject, html: body_html, queueId: row.id })
  return { queueId: row.id, sent: result.ok, error: result.error }
}
