// Pure fee calculation utilities — safe for both server and client import.
// No Supabase or server-only dependencies.

/**
 * Determines fee payment status from totals.
 * @param {number} totalFee
 * @param {number} paidAmount
 * @returns {'pending'|'partial'|'paid'}
 */
export function computeFeeStatus(totalFee, paidAmount) {
  const total = Number(totalFee  || 0)
  const paid  = Number(paidAmount || 0)
  if (total <= 0) return paid > 0 ? 'paid' : 'pending'
  if (paid <= 0)  return 'pending'
  if (paid >= total) return 'paid'
  return 'partial'
}

/**
 * Returns the outstanding balance (never negative).
 */
export function computeBalance(totalFee, paidAmount) {
  return Math.max(0, Number(totalFee || 0) - Number(paidAmount || 0))
}

/**
 * Returns fee collection percentage (0–100).
 */
export function computeFeeCollection(totalFee, paidAmount) {
  const total = Number(totalFee || 0)
  if (total <= 0) return 0
  return Math.round((Math.min(Number(paidAmount || 0), total) / total) * 100)
}

/**
 * Aggregates an array of student fee rows into summary totals.
 * Each row must have { total_fee, paid_amount, fee_status }.
 */
export function aggregateFeeSummary(rows) {
  const arr = rows || []
  const totalFee    = arr.reduce((s, r) => s + Number(r.total_fee   || 0), 0)
  const totalPaid   = arr.reduce((s, r) => s + Number(r.paid_amount || 0), 0)
  const outstanding = Math.max(totalFee - totalPaid, 0)
  const feePct      = totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 0
  return {
    totalFee,
    totalPaid,
    outstanding,
    feePct,
    pending: arr.filter(r => r.fee_status === 'pending').length,
    partial: arr.filter(r => r.fee_status === 'partial').length,
    paid:    arr.filter(r => r.fee_status === 'paid').length,
  }
}

/** Visual badge config for fee status values. */
export const FEE_STATUS_STYLE = {
  paid:    { label: 'Paid',    color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  partial: { label: 'Partial', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  pending: { label: 'Pending', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
}
