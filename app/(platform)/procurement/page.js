'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, CheckCircle, Clock, AlertCircle, Plus, FileText, Check, X, Package, Users } from 'lucide-react'
import { toast } from 'sonner'

const PO_STATUS = {
  pending:   { label: 'Pending Approval', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Clock        },
  approved:  { label: 'Approved',         color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: CheckCircle  },
  delivered: { label: 'Delivered',        color: '#16A34A', bg: '#F0FDF4', border: '#A7F3D0', icon: CheckCircle  },
  rejected:  { label: 'Rejected',         color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: AlertCircle  },
}

const REQ_STATUS = {
  approved: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Approved' },
  pending:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Pending'  },
  rejected: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Rejected' },
}

const URGENCY_CONF = {
  low:    { color: '#64748B', bg: '#F8FAFC', label: 'Low'    },
  medium: { color: '#D97706', bg: '#FFFBEB', label: 'Medium' },
  high:   { color: '#DC2626', bg: '#FEF2F2', label: 'Urgent' },
}

const PO_CATEGORIES = ['Stationery','Electronics','Lab Equipment','Books','Furniture','Sports','Other']

export default function ProcurementPage() {
  const [tab,         setTab        ] = useState('orders')
  const [orders,      setOrders     ] = useState([])
  const [reqs,        setReqs       ] = useState([])
  const [loading,     setLoading    ] = useState(true)
  const [showForm,    setShowForm   ] = useState(false)
  const [confirming,  setConfirming ] = useState({})
  const [form, setForm] = useState({ vendor: '', items: '', amount: '', category: PO_CATEGORIES[0] })

  const fetchAll = async () => {
    try {
      const [ordRes, reqRes] = await Promise.all([
        fetch('/api/procurement/orders'),
        fetch('/api/procurement/requests'),
      ])
      const [ordData, reqData] = await Promise.all([ordRes.json(), reqRes.json()])
      setOrders(ordData.orders || [])
      setReqs(reqData.requests || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const setPOStatus = async (id, newStatus) => {
    setConfirming(prev => ({ ...prev, [id]: newStatus }))
    try {
      await fetch('/api/procurement/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
      toast.success(`Order ${newStatus}`)
    } catch { toast.error('Update failed') }
    setConfirming(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const setReqStatus = async (id, newStatus) => {
    setConfirming(prev => ({ ...prev, [`r_${id}`]: newStatus }))
    try {
      await fetch('/api/procurement/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      setReqs(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
      toast.success(`Request ${newStatus}`)
    } catch { toast.error('Update failed') }
    setConfirming(prev => { const n = { ...prev }; delete n[`r_${id}`]; return n })
  }

  const handleNewPO = async (e) => {
    e.preventDefault()
    if (!form.vendor.trim() || !form.items.trim() || !form.amount) { toast.error('Fill all required fields'); return }
    try {
      const res  = await fetch('/api/procurement/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor: form.vendor, items: form.items, amount: form.amount, category: form.category }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to create order'); return }
      setOrders(prev => [data.order, ...prev])
      setShowForm(false)
      setForm({ vendor: '', items: '', amount: '', category: PO_CATEGORIES[0] })
      toast.success('Purchase order created!')
    } catch { toast.error('Network error') }
  }

  const pendingPOs   = orders.filter(o => o.status === 'pending').length
  const pendingReqs  = reqs.filter(r => r.status === 'pending').length
  const totalSpend   = orders.filter(o => o.status !== 'rejected').reduce((s, o) => s + (o.amount || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Procurement</h1>
          <p className="page-header-sub">Purchase orders, approvals &amp; faculty equipment requests</p>
        </div>
        <div className="page-actions">
          {tab === 'orders' && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={15} /> New Purchase Order
            </motion.button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Total Orders',        value: orders.length,                           icon: ShoppingCart, iconColor: '#2563EB', iconBg: '#EFF6FF' },
          { label: 'Pending Approval',    value: pendingPOs,                              icon: Clock,        iconColor: '#F59E0B', iconBg: '#FFFBEB' },
          { label: 'Total Spend',         value: `₹${(totalSpend/100000).toFixed(1)}L`,  icon: FileText,     iconColor: '#10B981', iconBg: '#F0FDF4' },
          { label: 'Faculty Requests',    value: pendingReqs,                             icon: Users,        iconColor: '#7C3AED', iconBg: '#F5F3FF' },
        ].map((stat, i) => {
          const StatIcon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px 22px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <StatIcon size={18} style={{ color: stat.iconColor }} />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#64748B', margin: '0 0 4px' }}>{stat.label}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.03em', margin: 0 }}>{stat.value}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 12, padding: 5, alignSelf: 'flex-start' }}>
        {[
          { key: 'orders',   label: 'Purchase Orders', icon: ShoppingCart, count: orders.length    },
          { key: 'requests', label: 'Faculty Requests', icon: Package,     count: reqs.length, badge: pendingReqs },
        ].map(t => {
          const Icon   = t.icon
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', background: active ? '#FFFFFF' : 'transparent', color: active ? '#0F172A' : '#64748B', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : 'none', transition: 'all 0.15s', fontFamily: 'inherit' }}>
              <Icon size={14} />
              {t.label}
              {t.badge > 0 && <span style={{ padding: '1px 6px', borderRadius: 99, background: '#DC2626', color: '#FFFFFF', fontSize: 10, fontWeight: 800 }}>{t.badge}</span>}
            </button>
          )
        })}
      </div>

      {/* ── Purchase Orders tab ─────────────────────────────────────────── */}
      {tab === 'orders' && (
        <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Purchase Orders</h3>
          </div>
          {orders.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <ShoppingCart size={36} style={{ color: '#CBD5E1', margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>No purchase orders yet</p>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Click "New Purchase Order" to create one.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table-premium" style={{ minWidth: 700 }}>
                <thead>
                  <tr><th>PO Number</th><th>Vendor</th><th>Items</th><th>Amount</th><th>Date</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {orders.map((po, i) => {
                    const st       = PO_STATUS[po.status] || PO_STATUS.pending
                    const StatusIcon = st.icon
                    const ck       = confirming[po.id]
                    return (
                      <motion.tr key={po.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                        <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#2563EB', fontWeight: 600 }}>{po.po_number}</span></td>
                        <td><p style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', margin: 0 }}>{po.vendor}</p></td>
                        <td><p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{po.items}</p></td>
                        <td><span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>₹{(po.amount||0).toLocaleString('en-IN')}</span></td>
                        <td><span style={{ fontSize: 12, color: '#94A3B8' }}>{po.raised_at || po.raised}</span></td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                            <StatusIcon size={10} /> {st.label}
                          </span>
                        </td>
                        <td>
                          <AnimatePresence mode="wait">
                            {ck ? (
                              <motion.div key="ck" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: ck === 'approved' ? '#F0FDF4' : '#FEF2F2', color: ck === 'approved' ? '#16A34A' : '#DC2626' }}>
                                <Check size={12} /> {ck === 'approved' ? 'Approved!' : 'Rejected!'}
                              </motion.div>
                            ) : (
                              <motion.div key="act" style={{ display: 'flex', gap: 6 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {po.status === 'pending' && (
                                  <>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => setPOStatus(po.id, 'approved')}
                                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#16A34A', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(22,163,74,0.30)' }}>
                                      <Check size={12} /> Approve
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => setPOStatus(po.id, 'rejected')}
                                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                      <X size={12} /> Reject
                                    </motion.button>
                                  </>
                                )}
                                {po.status === 'approved' && (
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => setPOStatus(po.id, 'delivered')}
                                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#EFF6FF', color: '#2563EB', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid #BFDBFE' }}>
                                    <CheckCircle size={12} /> Mark Delivered
                                  </motion.button>
                                )}
                                {(po.status === 'delivered' || po.status === 'rejected') && (
                                  <span style={{ fontSize: 12, color: '#CBD5E1' }}>—</span>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Faculty Requests tab ────────────────────────────────────────── */}
      {tab === 'requests' && (
        <div style={{ background: '#FFFFFF', borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Faculty Equipment Requests</h3>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{pendingReqs} pending approval</p>
          </div>
          {reqs.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <Package size={36} style={{ color: '#CBD5E1', margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#64748B', margin: 0 }}>No faculty requests yet</p>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Faculty submit requests from their Equipment Requests page.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {reqs.map((req, i) => {
                const st     = REQ_STATUS[req.status]  || REQ_STATUS.pending
                const uc     = URGENCY_CONF[req.urgency] || URGENCY_CONF.medium
                const ck     = confirming[`r_${req.id}`]
                return (
                  <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    style={{ padding: '16px 20px', borderBottom: i < reqs.length - 1 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: st.bg, border: `1px solid ${st.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
                      <Package size={17} style={{ color: st.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', margin: 0 }}>{req.item}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color, border: `1px solid ${st.border}`, textTransform: 'uppercase' }}>{st.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: uc.bg, color: uc.color }}>{uc.label}</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 4px' }}>{req.reason}</p>
                      <p style={{ fontSize: 11, color: '#94A3B8' }}>
                        By <strong style={{ color: '#475569' }}>{req.faculty_name || req.facultyName}</strong> · {(req.created_at || req.date || '').split('T')[0]}
                      </p>
                    </div>
                    <AnimatePresence mode="wait">
                      {ck ? (
                        <motion.div key="ck" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700, background: ck === 'approved' ? '#F0FDF4' : '#FEF2F2', color: ck === 'approved' ? '#16A34A' : '#DC2626', flexShrink: 0 }}>
                          <Check size={12} /> {ck === 'approved' ? 'Approved!' : 'Rejected!'}
                        </motion.div>
                      ) : req.status === 'pending' ? (
                        <motion.div key="act" style={{ display: 'flex', gap: 6, flexShrink: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => setReqStatus(req.id, 'approved')}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: 'none', background: '#16A34A', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(22,163,74,0.28)' }}>
                            <Check size={12} /> Approve
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => setReqStatus(req.id, 'rejected')}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            <X size={12} /> Reject
                          </motion.button>
                        </motion.div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#CBD5E1', flexShrink: 0 }}>—</span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* New PO modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.50)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: 'calc(var(--header-height) + 24px) 20px 40px' }}
            onClick={() => setShowForm(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#FFFFFF', borderRadius: 22, width: '100%', maxWidth: 460, boxShadow: '0 32px 80px rgba(0,0,0,0.22)', overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(100vh - var(--header-height) - 64px)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EFF6FF' }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>New Purchase Order</p>
                <button onClick={() => setShowForm(false)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} color="#64748B" />
                </button>
              </div>
              <form onSubmit={handleNewPO} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  ['Vendor Name *', 'vendor', 'text', 'e.g. Vijay Stationers'],
                  ['Items Description *', 'items', 'text', 'e.g. Office Stationery (Q4)'],
                  ['Amount (₹) *', 'amount', 'number', 'e.g. 45000'],
                ].map(([label, field, type, ph]) => (
                  <div key={field}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{label}</label>
                    <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} required={label.endsWith('*')}
                      placeholder={ph} min={type === 'number' ? '0' : undefined}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', background: '#F8FAFC' }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#0F172A', outline: 'none', fontFamily: 'inherit', background: '#F8FAFC' }}>
                    {PO_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button type="button" onClick={() => setShowForm(false)}
                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: 13, fontWeight: 600, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                  <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    style={{ flex: 2, padding: '12px', borderRadius: 12, background: '#2563EB', color: '#FFFFFF', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(37,99,235,0.25)' }}>
                    Create PO
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
