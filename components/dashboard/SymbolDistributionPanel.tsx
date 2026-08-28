import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { GripVertical, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts'

export function SymbolDistributionSkeleton() {
  return (
    <Card className="panel overflow-hidden border-border/80 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <Skeleton className="h-4 w-40 mb-2" />
          <Skeleton className="h-3 w-48" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full flex items-end justify-between gap-2 pt-4">
          {[40, 65, 30, 80, 55, 70, 45, 90, 60, 50].map((height, i) => (
            <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${height}%` }} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface SymbolDistributionPanelProps {
  data: Array<{ symbol: string; trades: number }>
  isLoading?: boolean
}

export function SymbolDistributionPanel({
  data,
  isLoading = false,
}: SymbolDistributionPanelProps) {
  if (isLoading) {
    return <SymbolDistributionSkeleton />
  }

  return (
    <Card className="panel overflow-hidden border-border/80 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <GripVertical className="size-4 text-muted-foreground/40" />
            Symbol distribution
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                Trade volume and order frequency grouped by individual stock ticker.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Trade count by equity</p>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{ trades: { label: 'Trades', color: '#10b981' } }}
          className="h-48 w-full"
        >
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="symbol" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis hide />
            <RechartsTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="trades" name="trades" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
