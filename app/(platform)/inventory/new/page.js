'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Package, Save, CheckCircle, AlertCircle } from 'lucide-react'

const CATEGORIES = ['Stationery','Electronics','Lab Equipment','Furniture','Books','Sports','Cleaning','Kitchen','Security','Other']
const UNITS = ['Units','Packs','Reams','Sets','Boxes','Litres','Kg','Pieces']

function Field({ label, error, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>{error}</p>}
    </div>
  )
}
function Input({ error, ...props }) {
  return <input className="input-premium" style={{ width: '100%', boxSizing: 'border-box', borderColor: error ? '#FCA5A5' : undefined }} {...props} />
}
function Select({ error, children, ...props }) {
  return (
    <select className="input-premium" style={{ width: '100%', boxSizing: 'border-box', borderColor: error ? '#FCA5A5' : undefined }} {...props}>
      {children}
    </select>
  )
}

export default function NewItemPage() {
  const router   = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    name: '', category: '', quantity: '', unit: 'Units', minStock: '', value: '',
  })

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Item name is required'
    if (!form.category)    e.category = 'Select a category'
    if (!form.quantity)    e.quantity = 'Quantity is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setSaving(false); setSaved(true)
    await new Promise(r => setTimeout(r, 700))
    router.push('/inventory')
  }

  const qty = parseInt(form.quantity) || 0
  const min = parseInt(form.minStock) || 0
  const stockStatus = qty === 0 ? { label:'Out of Stock', color:'#DC2626', bg:'#FEF2F2' }
    : qty < min / 2 ? { label:'Critical', color:'#DC2626', bg:'#FEF2F2' }
    : qty < min ? { label:'Low Stock', color:'#D97706', bg:'#FFFBEB' }
    : { label:'In Stock', color:'#16A34A', bg:'#F0FDF4' }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/inventory" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}>
          <ArrowLeft size={15} /> Back to Inventory
        </Link>
        <span style={{ color: '#CBD5E1' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Add Inventory Item</span>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={14} style={{ color: '#2563EB' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Item Details</p>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Item Name *" error={errors.name} style={{ gridColumn: '1 / -1' }}>
                <Input placeholder="e.g. Whiteboard Marker (Pack of 10)" value={form.name} onChange={set('name')} error={errors.name} />
              </Field>
              <Field label="Category *" error={errors.category}>
                <Select value={form.category} onChange={set('category')} error={errors.category}>
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Unit">
                <Select value={form.unit} onChange={set('unit')}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </Select>
              </Field>
              <Field label="Current Quantity *" error={errors.quantity}>
                <Input type="number" min="0" placeholder="0" value={form.quantity} onChange={set('quantity')} error={errors.quantity} />
              </Field>
              <Field label="Minimum Stock Level">
                <Input type="number" min="0" placeholder="0" value={form.minStock} onChange={set('minStock')} />
              </Field>
              <Field label="Total Value (₹)">
                <Input type="number" min="0" placeholder="0" value={form.value} onChange={set('value')} />
              </Field>
            </div>
          </div>

          <button type="submit" style={{ display: 'none' }} />
        </form>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 24 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Package size={20} style={{ color: '#2563EB' }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', textAlign: 'center' }}>{form.name || 'Item Name'}</p>
            <p style={{ fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' }}>{form.category || 'Category'}</p>
            {form.quantity !== '' && (
              <div style={{ marginTop: 12, textAlign: 'center', padding: '8px 12px', borderRadius: 10, background: stockStatus.bg }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: stockStatus.color }}>{stockStatus.label}</p>
                <p style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{qty} {form.unit || 'Units'} available</p>
              </div>
            )}
          </div>

          <AnimatePresence>
            {Object.keys(errors).length > 0 && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <AlertCircle size={14} style={{ color: '#DC2626' }} />
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#DC2626' }}>Fix the following</p>
                </div>
                {Object.values(errors).map((e, i) => <p key={i} style={{ fontSize: 11, color: '#991B1B', marginTop: 3 }}>• {e}</p>)}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit}
            style={{ width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none', background: saved ? '#16A34A' : '#2563EB', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}>
            <AnimatePresence mode="wait">
              {saved ? <motion.span key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display:'flex',alignItems:'center',gap:8 }}><CheckCircle size={16} /> Saved!</motion.span>
                : saving ? <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Saving…</motion.span>
                : <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display:'flex',alignItems:'center',gap:8 }}><Save size={15} /> Add Item</motion.span>}
            </AnimatePresence>
          </motion.button>
          <Link href="/inventory" style={{ fontSize: 13, color: '#64748B', textAlign: 'center', textDecoration: 'none' }}>Cancel</Link>
        </div>
      </div>
    </div>
  )
}
