'use client'

import ErrorBoundary from '@/components/ErrorBoundary'

export default function PlatformErrorShell({ children }) {
  return (
    <ErrorBoundary title="Page failed to load">
      {children}
    </ErrorBoundary>
  )
}
