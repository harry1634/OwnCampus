'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Package, AlertCircle, TrendingDown, Plus, Search, Edit } from 'lucide-react'
import Link from 'next/link'


const items = [
  { id: 1, name: 'Whiteboard Marker (Pack of 10)', category: 'Stationery', quantity: 45, unit: 'Packs', minStock: 20, value: 18000, status: 'ok' },
  { id: 2, name: 'A4 Paper Ream', category: 'Stationery', quantity: 8, unit: 'Reams', minStock: 20, value: 4000, status: 'low' },
  { id: 3, name: 'Projector — Epson', category: 'Electronics', quantity: 12, unit: 'Units', minStock: 2, value: 360000, status: 'ok' },
  { id: 4, name: 'Laptop — Dell Inspiron', category: 'Electronics', quantity: 2, unit: 'Units', minStock: 5, value: 80000, status: 'critical' },
  { id: 5, name: 'Chemistry Lab Glassware Set', category: 'Lab Equipment', quantity: 15, unit: 'Sets', minStock: 10, value: 75000, status: 'ok' },
  { id: 6, name: 'Science Textbook Grade 9', category: 'Books', quantity: 0, unit: 'Books', minStock: 40, value: 0, status: 'out' },
]

const statusConfig = {
  ok:       { label: 'In Stock',     color: '#16A34A', bg: '#F0FDF4' },
  low:      { label: 'Low Stock',    color: '#D97706', bg: '#FFFBEB' },
  critical: { label: 'Critical',     color: '#DC2626', bg: '#FEF2F2' },
  out:      { label: 'Out of Stock', color: '#DC2626', bg: '#FEF2F2' },
}

const categoryColors = { Stationery: '#2563EB', Electronics: '#0891B2', 'Lab Equipment': '#10B981', Books: '#D97706' }

export default function InventoryPage() {
  const [allItems, setAllItems] = useState([])
  const [search, setSearch] = useState('')
  const items = search.trim()
    ? allItems.filter(it =>
        it.name.toLowerCase().includes(search.toLowerCase()) ||
        it.category.toLowerCase().includes(search.toLowerCase())
      )
    : allItems
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Inventory Management</h1>
          <p className="page-header-sub">Assets, consumables, repairs &amp; warranty tracking</p>
        </div>
        <div className="page-actions">
          <Link href="/inventory/new">
            <motion.button whileHover={{ scale: 1.02 }} className="btn-primary">
              <Plus size={15} /> Add Item
            </motion.button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Total Items',   value: '284',     icon: Package,    iconColor: '#2563EB', iconBg: '#EFF6FF' },
          { label: 'Low Stock',     value: '12',      icon: TrendingDown,iconColor: '#F59E0B', iconBg: '#FFFBEB' },
          { label: 'Out of Stock',  value: '4',       icon: AlertCircle,iconColor: '#EF4444', iconBg: '#FEF2F2' },
          { label: 'Total Value',   value: '₹28.4L',  icon: Package,    iconColor: '#10B981', iconBg: '#F0FDF4' },
        ].map((stat, i) => {
          const StatIcon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileHover={{ translateY: -2, boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}
              transition={{ duration: 0.15 }}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <StatIcon size={18} style={{ color: stat.iconColor }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#64748B', marginBottom: 6 }}>{stat.label}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 30, fontWeight: 700, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.03em' }}>{stat.value}</p>
            </motion.div>
          )
        })}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-3" style={{ padding: '16px 16px 20px', borderBottom: '1px solid #F1F5F9' }}>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#CBD5E1' }} />
            <input type="text" placeholder="Search inventory…" className="input-premium pl-9 py-2 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Item Name</th><th>Category</th><th>Quantity</th>
                <th>Min Stock</th><th>Value</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const status = statusConfig[item.status]
                const catColor = categoryColors[item.category] || '#64748B'
                return (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                    <td><p className="text-xs font-semibold" style={{ color: '#0F172A' }}>{item.name}</p></td>
                    <td><span className="text-xs px-2 py-1 rounded-lg" style={{ background: `${catColor}15`, color: catColor }}>{item.category}</span></td>
                    <td>
                      <span className="text-sm font-bold" style={{ color: item.quantity === 0 ? '#DC2626' : item.quantity < item.minStock ? '#D97706' : '#16A34A' }}>
                        {item.quantity} <span className="text-xs font-normal" style={{ color: '#94A3B8' }}>{item.unit}</span>
                      </span>
                    </td>
                    <td><span className="text-xs" style={{ color: '#94A3B8' }}>{item.minStock}</span></td>
                    <td><span className="text-xs font-semibold" style={{ color: '#0F172A' }}>₹{item.value.toLocaleString('en-IN')}</span></td>
                    <td><span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: status.bg, color: status.color }}>{status.label}</span></td>
                    <td><div className="action-group"><button title="Edit" className="action-btn action-btn-edit"><Edit size={13} /></button></div></td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

