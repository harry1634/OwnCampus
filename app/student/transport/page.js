'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, MapPin, Clock, Home, X, Send, CheckCircle } from 'lucide-react'
import { useCurrentUser } from '@/lib/useCurrentUser'

function fmt12(t) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  if (isNaN(h)) return t
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function Spinner() {
  return (
    <div style={{ padding: '48px', textAlign: 'center' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', margin: '0 auto 10px', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Loading…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function StudentTransport() {
  const cu = useCurrentUser()
  const [loading,         setLoading        ] = useState(true)
  const [assignment,      setAssignment     ] = useState(null)
  const [showApply,       setShowApply      ] = useState(false)
  const [applyMsg,        setApplyMsg       ] = useState('')
  const [submitted,       setSubmitted      ] = useState(false)
  const [submitting,      setSubmitting     ] = useState(false)
  const [submitError,     setSubmitError    ] = useState('')
  const [hostelRequest,   setHostelRequest  ] = useState(null)  // existing request
  const [hostelAllocation,setHostelAllocation] = useState(null) // active allocation

  useEffect(() => {
    if (!cu.mounted) return
    setLoading(true)
    Promise.all([
      fetch('/api/transport?type=assignments&my=true').then(r => r.json()).catch(() => ({})),
      fetch('/api/hostel/requests?my=true').then(r => r.json()).catch(() => ({})),
      fetch('/api/hostel/allocations?my=true').then(r => r.json()).catch(() => ({})),
    ]).then(([transportData, requestsData, allocData]) => {
      const list = transportData.assignments || []
      setAssignment(list[0] || null)

      const reqs = requestsData.requests || []
      // Most recent request
      if (reqs.length > 0) {
        setHostelRequest(reqs[0])
        if (['pending', 'waitlisted', 'approved'].includes(reqs[0].status)) {
          setSubmitted(true)
        }
      }

      const allocs = allocData.allocations || []
      if (allocs.length > 0) setHostelAllocation(allocs[0])
    }).catch(() => setAssignment(null))
      .finally(() => setLoading(false))
  }, [cu.mounted])

  if (!cu.mounted) return null

  const myRoute = assignment
  const myStop  = assignment?.stop

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>Transport & Hostel</h1>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>Your transport route and accommodation details</p>
      </div>

      {loading ? (
        <Spinner />
      ) : myRoute ? (
        <>
          {/* Hero card */}
          <div style={{ background: '#2563EB', borderRadius: 20, padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bus size={22} color="white" />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>{myRoute.route}</h2>
                {myRoute.vehicleModel && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: 0 }}>{myRoute.vehicleModel}</p>}
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(74,222,128,0.25)', color: '#4ADE80' }}>
                Active
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { icon: MapPin, label: 'Your Boarding Stop', val: myStop || '—'                        },
                { icon: Clock,  label: 'Departure Time',     val: fmt12(myRoute.departureTime)           },
                { icon: MapPin, label: 'Arrival Time',       val: fmt12(myRoute.arrivalTime)             },
                { icon: Bus,    label: 'Driver',             val: myRoute.driver || '—'                  },
              ].map(({ icon: Icon, label, val }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.11)', borderRadius: 11, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.14)' }}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', margin: '0 0 3px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Route stops */}
          {myRoute.stops && myRoute.stops.length > 0 && (
            <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Route Stops (Morning)</h2>
              </div>
              <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 30, top: 24, bottom: 24, width: 2, background: '#E2E8F0', zIndex: 0 }} />
                {myRoute.stops.map((stop, i) => {
                  const isMyStop = stop === myStop
                  const isLast   = i === myRoute.stops.length - 1
                  return (
                    <div key={stop} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', position: 'relative', zIndex: 1 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: isMyStop ? '#2563EB' : (i === 0 || isLast) ? '#0F172A' : '#E2E8F0', border: `3px solid ${isMyStop ? '#BFDBFE' : 'transparent'}`, flexShrink: 0, boxSizing: 'border-box' }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: isMyStop ? 700 : 500, color: isMyStop ? '#1E40AF' : isLast ? '#0F172A' : '#475569', margin: 0 }}>
                          {stop}
                          {isMyStop && <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 8, padding: '1px 7px', borderRadius: 99, background: '#EFF6FF', color: '#2563EB' }}>Your Stop</span>}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '28px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Bus size={26} color="#CBD5E1" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#64748B', margin: '0 0 6px' }}>No Transport Assigned</p>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Contact admin to request transport assignment</p>
        </div>
      )}

      {/* Hostel Section */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: hostelAllocation ? '#ECFDF5' : '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Home size={20} color={hostelAllocation ? '#059669' : '#94A3B8'} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Hostel Accommodation</h3>
          {hostelAllocation ? (
            <p style={{ fontSize: 12, color: '#059669', margin: 0, fontWeight: 500 }}>
              {hostelAllocation.building ? `${hostelAllocation.building} · ` : ''}Room {hostelAllocation.room}{hostelAllocation.bed ? ` · ${hostelAllocation.bed}` : ''}
            </p>
          ) : hostelRequest?.status === 'pending' || hostelRequest?.status === 'waitlisted' ? (
            <p style={{ fontSize: 12, color: '#D97706', margin: 0, fontWeight: 500 }}>
              Application submitted — {hostelRequest.status === 'waitlisted' ? 'waitlisted' : 'pending admin review'}
            </p>
          ) : hostelRequest?.status === 'approved' ? (
            <p style={{ fontSize: 12, color: '#059669', margin: 0, fontWeight: 500 }}>Request approved — awaiting room allocation</p>
          ) : (
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>No hostel allocated yet. Apply below to request accommodation.</p>
          )}
        </div>
        {hostelAllocation ? (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', whiteSpace: 'nowrap' }}>
            Allocated
          </span>
        ) : hostelRequest?.status === 'approved' ? (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', whiteSpace: 'nowrap' }}>
            Approved
          </span>
        ) : hostelRequest?.status === 'waitlisted' ? (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE', whiteSpace: 'nowrap' }}>
            Waitlisted
          </span>
        ) : hostelRequest?.status === 'pending' ? (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', whiteSpace: 'nowrap' }}>
            Under Review
          </span>
        ) : (
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setSubmitError(''); setShowApply(true) }}
            style={{ padding: '8px 16px', borderRadius: 9, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: 12, fontWeight: 600, color: '#2563EB', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Apply
          </motion.button>
        )}
      </div>

      {/* Apply Modal */}
      <AnimatePresence>
        {showApply && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={() => setShowApply(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: '#FFF', borderRadius: 20, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(15,23,42,0.22)', overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Home size={15} style={{ color: '#2563EB' }} />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>Apply for Hostel</p>
                </div>
                <button onClick={() => setShowApply(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
                  <X size={13} />
                </button>
              </div>
              <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 3 }}>Applicant</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>{cu.name || '—'}</p>
                  <p style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>{cu.classSection ? `Class ${cu.classSection}` : ''}</p>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>Message / Reason (optional)</label>
                  <textarea value={applyMsg} onChange={e => setApplyMsg(e.target.value)} placeholder="Any specific preference or reason..."
                    rows={3} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Your request will be sent to the admin for review.</p>
              </div>
              {submitError && (
                <div style={{ padding: '0 22px 14px' }}>
                  <div style={{ padding: '10px 14px', borderRadius: 9, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 13, color: '#DC2626' }}>{submitError}</div>
                </div>
              )}
              <div style={{ padding: '14px 22px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowApply(false)} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#FFF', fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={submitting}
                  onClick={async () => {
                    setSubmitting(true)
                    setSubmitError('')
                    try {
                      const res = await fetch('/api/hostel/requests', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ preferred_type: 'shared', message: applyMsg }),
                      })
                      const json = await res.json()
                      if (!res.ok || json.error) {
                        setSubmitError(json.error || 'Failed to submit request. Please try again.')
                        setSubmitting(false)
                        return
                      }
                      setHostelRequest({ ...json.request, status: 'pending' })
                      setSubmitted(true)
                      setShowApply(false)
                    } catch {
                      setSubmitError('Network error. Please try again.')
                    }
                    setSubmitting(false)
                  }}
                  style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#2563EB', color: '#FFF', fontSize: 13, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, opacity: submitting ? 0.7 : 1 }}>
                  <Send size={13} /> {submitting ? 'Submitting…' : 'Submit Request'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
