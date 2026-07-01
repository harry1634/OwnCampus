'use client'

import { motion } from 'framer-motion'
import { formatRelativeTime } from '@/lib/utils'
import { ArrowUpRight, UserPlus, CreditCard, BookOpen, AlertCircle, CheckCircle, GraduationCap, Calendar, FileText } from 'lucide-react'

const activityDefs = [
  { icon: UserPlus,     color: '#10B981', bg: '#F0FDF4', title: 'New student enrolled',  desc: 'Rahul Sharma — Class 10-A',        ago: 2 },
  { icon: CreditCard,   color: '#4F46E5', bg: '#EEF2FF', title: 'Fee payment received',   desc: 'Rs.45,000 from Priya Patel',          ago: 15 },
  { icon: AlertCircle,  color: '#D97706', bg: '#FFFBEB', title: 'Low attendance alert',   desc: '3 students below 75%',              ago: 45 },
  { icon: BookOpen,     color: '#0891B2', bg: '#ECFEFF', title: 'Exam scheduled',          desc: 'Unit Test 2 — Oct 28',              ago: 120 },
  { icon: GraduationCap,color: '#7C3AED', bg: '#F5F3FF', title: 'New lead converted',     desc: 'Ananya Singh — B.Tech CSE',         ago: 180 },
  { icon: CheckCircle,  color: '#10B981', bg: '#F0FDF4', title: 'Leave approved',          desc: 'Dr. Mehta — 2 days',                ago: 300 },
  { icon: Calendar,     color: '#DB2777', bg: '#FDF2F8', title: 'Event created',           desc: 'Annual Sports Day — Nov 5',         ago: 360 },
  { icon: FileText,     color: '#EA580C', bg: '#FFF7ED', title: 'Report generated',        desc: 'Monthly attendance report',         ago: 480 },
]

export default function RecentActivity() {
  const now = Date.now()
  const activities = activityDefs.map(d => ({ ...d, time: new Date(now - d.ago * 60 * 1000) }))

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm" style={{ color: '#0F172A' }}>Recent Activity</h3>
          <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Live updates</p>
        </div>
        <button className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#4F46E5' }}>
          View All <ArrowUpRight size={12} />
        </button>
      </div>

      <div className="space-y-1">
        {activities.map((activity, i) => {
          const Icon = activity.icon
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
              whileHover={{ background: '#F8FAFC' }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: activity.bg }}>
                <Icon size={13} style={{ color: activity.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-tight" style={{ color: '#0F172A' }}>{activity.title}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: '#94A3B8' }}>{activity.desc}</p>
              </div>
              <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: '#CBD5E1', fontSize: '11px' }} suppressHydrationWarning>
                {formatRelativeTime(activity.time)}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
