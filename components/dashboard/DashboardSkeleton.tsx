import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiMetricsSkeleton } from './KpiMetrics'
import { TurnoverChartSkeleton } from './TurnoverChartPanel'
import { IngestionHealthSkeleton } from './IngestionHealthPanel'
import { SymbolDistributionSkeleton } from './SymbolDistributionPanel'
import { ApiLatencySkeleton } from './ApiLatencyPanel'
import { LiveTradeTableSkeleton } from './LiveTradeTable'

export function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground md:px-7 lg:px-10">
      {/* Header Skeleton */}
      <header className="flex flex-col gap-5 border-b border-border/70 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-7 w-48 rounded" />
              <Skeleton className="h-5 w-36 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-96 mt-2" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-52 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </header>

      {/* KPI Metrics Skeleton */}
      <KpiMetricsSkeleton />

      {/* Row 1 Charts Skeleton */}
      <section className="mt-3 grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TurnoverChartSkeleton />
        </div>
        <IngestionHealthSkeleton />
      </section>

      {/* Row 2 Charts Skeleton */}
      <section className="mt-3 grid gap-3 lg:grid-cols-2">
        <SymbolDistributionSkeleton />
        <ApiLatencySkeleton />
      </section>

      {/* Table Skeleton */}
      <LiveTradeTableSkeleton />
    </main>
  )
}
