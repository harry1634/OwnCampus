'use client'

import { useState, useEffect } from 'react'
import StudentSidebar from './StudentSidebar'
import StudentHeader from './StudentHeader'
import StudentMobileNav from './StudentMobileNav'
import { UserProvider } from '@/lib/UserContext'

export default function StudentShell({ user, profile, children }) {
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
    <UserProvider profile={profile}>
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden', background: '#F5F3FF' }}>
      <StudentSidebar
        profile={profile}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: mounted ? marginLeft : 260, transition: 'margin-left 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
        <StudentHeader
          user={user} profile={profile}
          collapsed={sidebarCollapsed}
          isMobile={isMobile}
          onHamburger={() => isMobile ? setMobileSidebarOpen(true) : setSidebarCollapsed(c => !c)}
        />
        <main style={{ flex: 1, overflowY: 'auto', marginTop: 64, minHeight: 0 }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: isMobile ? '16px 14px calc(80px + env(safe-area-inset-bottom, 0px))' : '28px 40px 48px' }}>
            {children}
          </div>
        </main>
      </div>

      <StudentMobileNav />
    </div>
    </UserProvider>
  )
}
