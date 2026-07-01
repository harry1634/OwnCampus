'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Award, Building2, Briefcase, Users, TrendingUp, Plus, CheckCircle } from 'lucide-react'
import Link from 'next/link'

const companies = [
  { id: 1, name: 'Infosys', industry: 'Technology', role: 'Software Engineer', ctc: '4.5 LPA', date: '2025-11-10', slots: 20, applied: 45, shortlisted: 12, status: 'upcoming' },
  { id: 2, name: 'HDFC Bank', industry: 'Banking', role: 'Management Trainee', ctc: '6.0 LPA', date: '2025-11-15', slots: 10, applied: 38, shortlisted: 8, status: 'upcoming' },
  { id: 3, name: 'Wipro', industry: 'Technology', role: 'Project Engineer', ctc: '3.8 LPA', date: '2025-10-20', slots: 15, applied: 52, shortlisted: 18, status: 'completed' },
  { id: 4, name: 'Deloitte', industry: 'Consulting', role: 'Business Analyst', ctc: '8.5 LPA', date: '2025-11-20', slots: 5, applied: 28, shortlisted: 6, status: 'upcoming' },
]

const placementStats = [
  { batch: '2021', placed: 85, total: 120 }, { batch: '2022', placed: 92, total: 115 },
  { batch: '2023', placed: 108, total: 122 }, { batch: '2024', placed: 98, total: 118 },
]

const statusConfig = {
  upcoming:  { label: 'Upcoming',  color: '#2563EB', bg: '#EFF6FF' },
  completed: { label: 'Completed', color: '#16A34A', bg: '#F0FDF4' },
  ongoing:   { label: 'Ongoing',   color: '#D97706', bg: '#FFFBEB' },
}

const industryColors = { Technology: '#2563EB', Banking: '#16A34A', Consulting: '#D97706', Finance: '#0891B2' }

export default function PlacementPage() {
  const [companies, setCompanies] = useState([])
  const [search, setSearch] = useState('')

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Placement Cell</h1>
          <p className="page-header-sub">Manage companies, job drives &amp; placement tracking</p>
        </div>
        <div className="page-actions">
          <Link href="/placement/new">
            <motion.button whileHover={{ scale: 1.02 }} className="btn-primary">
              <Plus size={15} /> Add Company
            </motion.button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Placed Students',  value: '98',       icon: Award,      iconColor: '#10B981', iconBg: '#F0FDF4' },
          { label: 'Companies Visited',value: '34',       icon: Building2,  iconColor: '#2563EB', iconBg: '#EFF6FF' },
          { label: 'Highest Package',  value: '₹18 LPA',  icon: TrendingUp, iconColor: '#F59E0B', iconBg: '#FFFBEB' },
          { label: 'Avg. Package',     value: '₹5.8 LPA', icon: Briefcase,  iconColor: '#0891B2', iconBg: '#ECFEFF' },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          {companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map((comp, i) => {
            const status = statusConfig[comp.status]
            const indColor = industryColors[comp.industry] || '#64748B'
            return (
              <motion.div key={comp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: indColor }}>
                        {comp.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: '#0F172A' }}>{comp.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: `${indColor}15`, color: indColor }}>{comp.industry}</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: '#0F172A' }}>{comp.role}</p>
                    <div className="flex items-center gap-4 flex-wrap text-xs" style={{ color: '#94A3B8' }}>
                      <span>CTC: <span className="font-semibold" style={{ color: '#0F172A' }}>{comp.ctc}</span></span>
                      <span>Date: {comp.date}</span>
                      <span>Slots: {comp.slots}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: status.bg, color: status.color }}>{status.label}</span>
                    <button className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: '#EFF6FF', color: '#2563EB' }}>View Details</button>
                  </div>
                </div>
                <div className="mt-4 pt-3 flex items-center gap-6 text-xs" style={{ borderTop: '1px solid #F1F5F9' }}>
                  <div><span style={{ color: '#94A3B8' }}>Applied: </span><span className="font-semibold" style={{ color: '#0F172A' }}>{comp.applied}</span></div>
                  <div><span style={{ color: '#94A3B8' }}>Shortlisted: </span><span className="font-semibold" style={{ color: '#16A34A' }}>{comp.shortlisted}</span></div>
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                      <div className="h-full rounded-full" style={{ width: `${(comp.shortlisted / comp.applied) * 100}%`, background: '#2563EB' }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="space-y-4">
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Year-wise Placement</p>
            </div>
            <div style={{ padding: '8px 0' }}>
              {placementStats.map((row, i) => {
                const pct = Math.round((row.placed / row.total) * 100)
                return (
                  <div key={row.batch} style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < placementStats.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', width: 40, flexShrink: 0 }}>{row.batch}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: '#2563EB' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB', width: 36, textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                    <span style={{ fontSize: 11, color: '#94A3B8', width: 52, textAlign: 'right', flexShrink: 0 }}>{row.placed}/{row.total}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: '#0F172A' }}>Recent Offers</h3>
            <div className="space-y-3">
              {[
                { student: 'Ananya Singh', company: 'Wipro', ctc: '3.8 LPA', color: '#16A34A' },
                { student: 'Rohan Verma', company: 'HDFC', ctc: '6.0 LPA', color: '#2563EB' },
                { student: 'Sneha Jain', company: 'Deloitte', ctc: '8.5 LPA', color: '#D97706' },
              ].map((offer, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl"
                  style={{ background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                  <CheckCircle size={14} style={{ color: '#16A34A' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>{offer.student}</p>
                    <p className="text-xs" style={{ color: '#94A3B8' }}>{offer.company}</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: offer.color }}>{offer.ctc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

