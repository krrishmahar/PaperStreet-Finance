import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { GripVertical, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts'

export function ApiLatencySkeleton() {
  return (
    <Card className="panel overflow-hidden border-border/80 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <Skeleton className="h-4 w-28 mb-2" />
          <Skeleton className="h-3 w-56" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full flex flex-col justify-between py-2">
          <Skeleton className="w-full h-1 bg-slate-700/40" />
          <Skeleton className="w-full h-1 bg-slate-700/40" />
          <Skeleton className="w-full h-1 bg-slate-700/40" />
          <Skeleton className="w-full h-1 bg-slate-700/40" />
        </div>
      </CardContent>
    </Card>
  )
}

interface ApiLatencyPanelProps {
  data: Array<{ name: string; p50: number; p95: number }>
  isLoading?: boolean
}

export function ApiLatencyPanel({
  data,
  isLoading = false,
}: ApiLatencyPanelProps) {
  if (isLoading) {
    return <ApiLatencySkeleton />
  }

  return (
    <Card className="panel overflow-hidden border-border/80 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <GripVertical className="size-4 text-muted-foreground/40" />
            API latency
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                Rolling P50 (green) and P95 (dashed) network response percentiles in milliseconds.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            P50 and P95 response time · milliseconds
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            p50: { label: 'P50', color: '#10b981' },
            p95: { label: 'P95', color: '#f43f5e' },
          }}
          className="h-48 w-full"
        >
          <LineChart data={data}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <RechartsTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="p95"
              stroke="#94a3b8"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 4"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
