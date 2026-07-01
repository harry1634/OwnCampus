'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RoleGate({ requiredRole, children }) {
  const router = useRouter()
  const [status, setStatus] = useState('checking') // 'checking' | 'ok' | 'denied'

  useEffect(() => {
    const role = localStorage.getItem('oc_role')
    if (role === requiredRole || role === 'admin') {
      setStatus('ok')
    } else {
      setStatus('denied')
      router.replace('/auth/login')
    }
  }, [requiredRole])

  if (status === 'checking') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ width: 28, height: 28, border: '3px solid #E2E8F0', borderTop: `3px solid ${requiredRole === 'faculty' ? '#059669' : '#7C3AED'}`, borderRadius: '50%' }} className="animate-spin" />
      </div>
    )
  }

  if (status === 'denied') return null

  return children
}
