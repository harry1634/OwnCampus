'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { eventBus } from '@/lib/services/eventBus'

// ─── useRealtime ─────────────────────────────────────────────────────────────
// Subscribe to Supabase Realtime for a table and emit domain events.
//
// Usage:
//   useRealtime({
//     table: 'attendance',
//     filter: `institution_id=eq.${institutionId}`,
//     event: '*',
//     onInsert: (row) => ...,
//     onUpdate: (row) => ...,
//     onDelete: (row) => ...,
//   })

export function useRealtime({ table, filter, event = '*', onInsert, onUpdate, onDelete, enabled = true }) {
  const channelRef = useRef(null)
  const supabase   = createClient()

  useEffect(() => {
    if (!enabled || !table) return

    const channelName = `rt-${table}-${filter || 'all'}-${Date.now()}`
    let sub = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event,
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload
        if (eventType === 'INSERT' && onInsert) onInsert(newRow)
        if (eventType === 'UPDATE' && onUpdate) onUpdate(newRow, oldRow)
        if (eventType === 'DELETE' && onDelete) onDelete(oldRow)
      })
      .subscribe()

    channelRef.current = sub

    return () => {
      supabase.removeChannel(sub)
    }
  }, [table, filter, event, enabled])
}

// ─── useTableRealtime ────────────────────────────────────────────────────────
// Higher-level hook: subscribe to a table and call a refetch function on any change.
// This is the pattern most pages use: just call refetch() when DB changes.
//
// Usage:
//   useTableRealtime('attendance', `institution_id=eq.${id}`, refetch)

export function useTableRealtime(table, filter, onRefresh) {
  useRealtime({
    table,
    filter,
    event: '*',
    onInsert: onRefresh,
    onUpdate: onRefresh,
    onDelete: onRefresh,
    enabled: !!(table && onRefresh),
  })
}

// ─── useNotificationRealtime ─────────────────────────────────────────────────
// Specialized hook for the notification bell.
// Listens for new notifications and increments unread count.

export function useNotificationRealtime(institutionId, onNewNotification) {
  useRealtime({
    table:    'notifications',
    filter:   institutionId ? `institution_id=eq.${institutionId}` : undefined,
    event:    'INSERT',
    onInsert: (row) => {
      if (onNewNotification) onNewNotification(row)
      eventBus.emit('NotificationReceived', row)
    },
    enabled: true,
  })
}

// ─── useDashboardRealtime ────────────────────────────────────────────────────
// Subscribes to all tables that affect dashboard KPIs.
// Call onRefresh to trigger a stats reload.

export function useDashboardRealtime(institutionId, onRefresh) {
  const filter = institutionId ? `institution_id=eq.${institutionId}` : undefined
  useTableRealtime('students',     filter, onRefresh)
  useTableRealtime('fee_payments', filter, onRefresh)
  useTableRealtime('access_requests', filter, onRefresh)
}

// ─── useAttendanceRealtime ───────────────────────────────────────────────────
export function useAttendanceRealtime(institutionId, onRefresh) {
  const filter = institutionId ? `institution_id=eq.${institutionId}` : undefined
  useTableRealtime('attendance', filter, onRefresh)
}

// ─── useFeeRealtime ──────────────────────────────────────────────────────────
export function useFeeRealtime(institutionId, onRefresh) {
  const filter = institutionId ? `institution_id=eq.${institutionId}` : undefined
  useTableRealtime('fee_payments', filter, onRefresh)
}
