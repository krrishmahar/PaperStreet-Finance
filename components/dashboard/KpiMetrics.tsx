import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { DynamicTelemetry, DeltaMetric } from '@/store/analytics'

function renderDeltaBadge(delta: DeltaMetric, isCount = false) {
  if (delta.isZero) {
    return (
      <Badge
        variant="secondary"
        className="gap-1 text-slate-400 bg-slate-500/10 border border-slate-500/20 font-mono text-[10px]"
      >
        {isCount ? '+0' : '0.0%'}
      </Badge>
    )
  }

  if (delta.isPositive) {
    return (
      <Badge
        variant="secondary"
        className="gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-mono text-[10px]"
      >
        <ArrowUpRight className="size-3 text-emerald-400" />
        {delta.formatted}
      </Badge>
    )
  }

  return (
    <Badge
      variant="secondary"
      className="gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/20 font-mono text-[10px]"
    >
      <ArrowDownRight className="size-3 text-rose-400" />
      {delta.formatted}
    </Badge>
  )
}

export function KpiMetricsSkeleton() {
  return (
    <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="panel border-border/80 bg-card/60">
          <CardContent className="p-4">
            <Skeleton className="h-3 w-28 mb-3" />
            <div className="flex items-end justify-between gap-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-5 w-14 rounded" />
            </div>
            <Skeleton className="h-2.5 w-24 mt-3" />
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

interface KpiMetricsProps {
  totalTradesFormatted: string
  totalTurnoverFormatted: string
  activeSymbolsCount: string | number
  activeClientsCount: string | number
  telemetry: DynamicTelemetry
  isLoading?: boolean
}

export function KpiMetrics({
  totalTradesFormatted,
  totalTurnoverFormatted,
  activeSymbolsCount,
  activeClientsCount,
  telemetry,
  isLoading = false,
}: KpiMetricsProps) {
  if (isLoading) {
    return <KpiMetricsSkeleton />
  }

  return (
    <section className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="panel border-border/80 bg-card/60">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Ingested Trades</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <span className="font-mono text-2xl font-bold text-white">
              {totalTradesFormatted}
            </span>
            {renderDeltaBadge(telemetry.tradesDelta)}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">vs previous half-window</p>
        </CardContent>
      </Card>

      <Card className="panel border-border/80 bg-card/60">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Total Turnover</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <span className="font-mono text-2xl font-bold text-emerald-400">
              {totalTurnoverFormatted}
            </span>
            {renderDeltaBadge(telemetry.turnoverDelta)}
          </div>
          <p className="mt-2 text-[11px] font-mono text-muted-foreground">
            {telemetry.turnoverVelocityFormatted}
          </p>
        </CardContent>
      </Card>

      <Card className="panel border-border/80 bg-card/60">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Active Equities</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <span className="font-mono text-2xl font-bold text-sky-400">
              {activeSymbolsCount}
            </span>
            {renderDeltaBadge(telemetry.activeEquitiesDelta, true)}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">symbols in stream</p>
        </CardContent>
      </Card>

      <Card className="panel border-border/80 bg-card/60">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground font-medium">Institutional Clients</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <span className="font-mono text-2xl font-bold text-indigo-400">
              {activeClientsCount}
            </span>
            <Badge
              variant="secondary"
              className="gap-1 text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 font-mono text-[10px]"
            >
              <ArrowUpRight className="size-3" />
              100%
            </Badge>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">healthy connections</p>
        </CardContent>
      </Card>
    </section>
  )
}
