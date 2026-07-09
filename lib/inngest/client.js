/**
 * lib/inngest/client.js
 * Inngest client singleton.
 *
 * In development: events are dispatched to the Inngest Dev Server
 *   (run: npx inngest-cli@latest dev)
 * In production: requires INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY
 *   set in Vercel environment variables.
 */

import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id:     'owncampus',
  name:   'OwnCampus ERP',
  // Event key is picked up from INNGEST_EVENT_KEY env var automatically
})
