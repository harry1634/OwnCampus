'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { OfflineBanner, SkeletonStyles } from '@/components/ui/SkeletonLoader'

export function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <SkeletonStyles />
      <OfflineBanner />
      {children}
    </QueryClientProvider>
  )
}
