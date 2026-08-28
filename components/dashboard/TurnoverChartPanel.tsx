import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { GripVertical, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TradingViewChart, type TradingViewChartRef } from '@/components/TradingViewChart'

export function TurnoverChartSkeleton() {
  return (
    <Card className="panel overflow-hidden border-border/80 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <Skeleton className="h-4 w-52 mb-2" />
          <Skeleton className="h-3 w-80" />
        </div>
        <Skeleton className="h-5 w-24 rounded" />
      </CardHeader>
      <CardContent>
        <div className="pt-2 flex flex-col justify-end h-65 gap-2">
          <Skeleton className="w-full h-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

interface TurnoverChartPanelProps {
  chartRef: React.RefObject<TradingViewChartRef | null>
  data?: Array<{ time: number; turnover: number; buys: number }>
  height?: number
  isLoading?: boolean
}

export function TurnoverChartPanel({
  chartRef,
  data,
  height = 260,
  isLoading = false,
}: TurnoverChartPanelProps) {
  if (isLoading) {
    return <TurnoverChartSkeleton />
  }

  return (
    <Card className="panel overflow-hidden border-border/80 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <GripVertical className="size-4 text-muted-foreground/40" />
            Turnover & trade flow (TradingView Canvas)
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                Live turnover area and buy flow line rendered via 60FPS canvas engine.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            ₹ Crores · Imperative 60FPS canvas engine · Real-time market flow
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono"
        >
          Canvas 60FPS
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="pt-2">
          <TradingViewChart ref={chartRef} data={data} height={height} />
        </div>
      </CardContent>
    </Card>
  )
}
