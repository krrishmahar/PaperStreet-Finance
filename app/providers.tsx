'use client'

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LenisScrollProvider } from '@/lib/lenis-provider'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <LenisScrollProvider>
        <TooltipProvider delayDuration={180}>{children}</TooltipProvider>
      </LenisScrollProvider>
    </QueryClientProvider>
  )
}
