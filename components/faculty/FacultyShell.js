'use client'

import { useState, useEffect } from 'react'
import FacultySidebar from './FacultySidebar'
import FacultyHeader from './FacultyHeader'
import FacultyMobileNav from './FacultyMobileNav'

export default function FacultyShell({ user, profile, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const marginLeft = isMobile ? 0 : (sidebarCollapsed ? 68 : 260)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F0FDF4' }}>
      <FacultySidebar
        profile={profile}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: mounted ? marginLeft : 260, transition: 'margin-left 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
        <FacultyHeader
          user={user} profile={profile}
          collapsed={sidebarCollapsed}
          isMobile={isMobile}
          onHamburger={() => isMobile ? setMobileSidebarOpen(true) : setSidebarCollapsed(c => !c)}
        />
        <main style={{ flex: 1, overflowY: 'auto', marginTop: 64 }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: isMobile ? '16px 14px 88px' : '28px 40px 40px' }}>
            {children}
          </div>
        </main>
      </div>

      <FacultyMobileNav />
    </div>
  )
}
