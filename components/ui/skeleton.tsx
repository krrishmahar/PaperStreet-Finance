import React from 'react'
import { cn } from '@/lib/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-800/60 border border-slate-700/20 backdrop-blur', className)}
      {...props}
    />
  )
}

export { Skeleton }
