'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { UserProvider } from '@/lib/UserContext'

export default function LayoutShell({ profile, children }) {
  const { sidebarCollapsed: _sidebarCollapsed } = useAppStore()
  const [mounted,  setMounted ] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const sidebarCollapsed = mounted ? _sidebarCollapsed : false
  const marginLeft = isMobile ? 0 : (sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)')

  return (
    <UserProvider profile={profile}>
      <div
        className="flex-1 flex flex-col min-w-0"
        style={{ marginLeft, transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        {children}
      </div>
    </UserProvider>
  )
}
