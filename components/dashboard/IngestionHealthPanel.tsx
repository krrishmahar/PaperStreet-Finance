import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { GripVertical, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts'
import type { DynamicTelemetry } from '@/store/analytics'

export function IngestionHealthSkeleton() {
  return (
    <Card className="panel overflow-hidden border-border/80 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <Skeleton className="h-4 w-36 mb-2" />
          <Skeleton className="h-3 w-48" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-5">
          <Skeleton className="h-36 w-36 rounded-full" />
          <div className="flex flex-col gap-3 flex-1">
            <div>
              <Skeleton className="h-7 w-20 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        </div>
        <Separator className="my-4 bg-border/80" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

interface IngestionHealthPanelProps {
  telemetry: DynamicTelemetry
  lastPullTime: string
  isLoading?: boolean
}

export function IngestionHealthPanel({
  telemetry,
  lastPullTime,
  isLoading = false,
}: IngestionHealthPanelProps) {
  if (isLoading) {
    return <IngestionHealthSkeleton />
  }

  return (
    <Card className="panel overflow-hidden border-border/80 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <GripVertical className="size-4 text-muted-foreground/40" />
            Ingestion health
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                Real-time pull reliability and amendment ratios.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Current pull reliability</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-5">
          <ChartContainer
            config={{
              healthy: { label: 'Healthy', color: '#10b981' },
              retry: { label: 'Retry', color: '#f59e0b' },
            }}
            className="h-40 w-40"
          >
            <PieChart>
              <Pie
                data={[
                  { name: 'Healthy', value: Math.max(1, telemetry.ingestionHealth.healthyCount) },
                  { name: 'Retry', value: telemetry.ingestionHealth.retryCount },
                ]}
                dataKey="value"
                innerRadius={48}
                outerRadius={68}
                strokeWidth={3}
              >
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
              </Pie>
              <RechartsTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
          <div className="flex flex-col gap-3">
            <div>
              <p className="font-mono text-2xl font-bold text-white">
                {telemetry.ingestionHealth.availabilityFormatted}
              </p>
              <p className="text-xs text-muted-foreground">availability</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="size-2 rounded-full bg-emerald-500" />
              Healthy <span className="text-muted-foreground font-mono">{telemetry.ingestionHealth.healthyCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="size-2 rounded-full bg-amber-500" />
              Retries <span className="text-muted-foreground font-mono">{telemetry.ingestionHealth.retryCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <Separator className="my-4 bg-border/80" />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Last successful pull</span>
          <span className="font-mono text-emerald-400 font-semibold">{lastPullTime}</span>
        </div>
      </CardContent>
    </Card>
  )
}
