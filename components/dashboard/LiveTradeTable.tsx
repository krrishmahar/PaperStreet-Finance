import React, { useRef } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LayoutGrid,
  Search,
  Pause,
  Play,
  Settings2,
  SlidersHorizontal,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Trade } from '@/store/useDashboardStore'

export function LiveTradeTableSkeleton() {
  return (
    <section className="mt-4">
      {/* Controls Skeleton */}
      <div className="flex flex-col gap-3 pb-3 mb-2 lg:flex-row lg:items-center lg:justify-between">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-60 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      {/* Symbol Filter Row Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3">
        <Skeleton className="h-4 w-20 mr-2" />
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <Skeleton key={i} className="h-6 w-16 rounded-md" />
        ))}
      </div>

      {/* Table Container Skeleton */}
      <Card className="panel overflow-hidden border-border/80 bg-card/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/70 py-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </CardHeader>

        <div className="p-4 flex flex-col gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border/30">
              <Skeleton className="h-4 w-[14%]" />
              <Skeleton className="h-4 w-[12%]" />
              <Skeleton className="h-4 w-[12%]" />
              <Skeleton className="h-4 w-[20%]" />
              <Skeleton className="h-4 w-[10%]" />
              <Skeleton className="h-4 w-[10%]" />
              <Skeleton className="h-4 w-[10%]" />
              <Skeleton className="h-4 w-[12%]" />
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}

interface LiveTradeTableProps {
  filteredTrades: Trade[]
  filterSymbol: string
  setFilterSymbol: (sym: string) => void
  symbols: string[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  timeRange: string
  setTimeRange: (t: string) => void
  isLive: boolean
  setIsLive: (l: boolean | ((p: boolean) => boolean)) => void
  isLoading?: boolean
}

export function LiveTradeTable({
  filteredTrades,
  filterSymbol,
  setFilterSymbol,
  symbols,
  searchQuery,
  setSearchQuery,
  timeRange,
  setTimeRange,
  isLive,
  setIsLive,
  isLoading = false,
}: LiveTradeTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // @tanstack/react-virtual: Virtualize table rendering for visible viewport items (60FPS)
  const rowVirtualizer = useVirtualizer({
    count: filteredTrades.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 10,
  })

  if (isLoading) {
    return <LiveTradeTableSkeleton />
  }

  return (
    <section className="mt-4">
      {/* Top Filter & Control Row (Time Range, Search & Stream Controls) */}
      <div className="flex flex-col gap-3 pb-3 mb-2 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={timeRange} onValueChange={setTimeRange}>
          <TabsList className="bg-card border border-border/70">
            <TabsTrigger value="5m">5m</TabsTrigger>
            <TabsTrigger value="15m">15m</TabsTrigger>
            <TabsTrigger value="1h">1h</TabsTrigger>
            <TabsTrigger value="1d">1d</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              aria-label="Search trades"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trades (e.g. BSE_20006041)..."
              className="h-9 w-60 rounded-md border border-input bg-card pl-9 pr-3 text-sm outline-none ring-emerald-500 focus:ring-2 transition"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLive(!isLive)}
            className={`gap-2 border-border/80 ${isLive ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : ''
              }`}
          >
            {isLive ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {isLive ? 'Live' : 'Paused'}
          </Button>
          <Button variant="outline" size="icon" aria-label="Dashboard settings">
            <Settings2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Symbol Filter Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3">
        <span className="text-xs text-muted-foreground mr-2 font-medium">Filter Symbol:</span>
        {symbols.map((sym) => {
          const isSelected = filterSymbol === sym
          return (
            <button
              key={sym}
              onClick={() => setFilterSymbol(sym)}
              className={`px-3 py-1 text-xs font-mono rounded-md transition ${isSelected
                ? 'bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/70 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
            >
              {sym}
            </button>
          )
        })}
      </div>

      {/* Trade Table Container */}
      <Card className="panel overflow-hidden border-border/80 bg-card/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/70 py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <LayoutGrid className="size-4 text-emerald-400" />
            Live trade stream
            <Badge variant="outline" className="ml-1 gap-1 text-[10px] border-emerald-500/30 text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {filteredTrades.length} visible
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-2 text-xs">
              <SlidersHorizontal className="size-3.5" />
              Columns
            </Button>
            <Button variant="ghost" size="icon" aria-label="Download trades">
              <Download className="size-4" />
            </Button>
          </div>
        </CardHeader>

        <div ref={tableContainerRef} data-lenis-prevent className="overflow-x-auto overflow-y-auto max-h-135">
          <table className="w-full min-w-212.5 text-left text-xs">
            <thead className="bg-slate-950/90 font-mono text-[11px] uppercase tracking-wider text-slate-400 border-b border-border/80 sticky top-0 backdrop-blur z-10 block w-full min-w-212.5">
              <tr className="flex items-center w-full">
                <th className="w-[14%] px-4 py-3 font-medium">Trade ID</th>
                <th className="w-[12%] px-4 py-3 font-medium">Timestamp</th>
                <th className="w-[12%] px-4 py-3 font-medium">Symbol</th>
                <th className="w-[20%] px-4 py-3 font-medium">Client</th>
                <th className="w-[10%] px-4 py-3 font-medium">Type</th>
                <th className="w-[10%] px-4 py-3 font-medium text-right">Quantity</th>
                <th className="w-[10%] px-4 py-3 font-medium text-right">Price (₹)</th>
                <th className="w-[12%] px-4 py-3 font-medium text-right">Total Value (₹)</th>
              </tr>
            </thead>
            <tbody
              className="font-mono block w-full min-w-212.5 relative"
              style={{
                height: `${Math.max(filteredTrades.length > 0 ? rowVirtualizer.getTotalSize() : 80, 80)}px`,
              }}
            >
              {filteredTrades.length === 0 ? (
                <tr className="flex w-full">
                  <td className="w-full text-center py-8 text-muted-foreground">
                    No trades found matching criteria. Click &quot;Trigger BSE Pull&quot; to fetch real-time records.
                  </td>
                </tr>
              ) : (
                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const t = filteredTrades[virtualRow.index]
                  if (!t) return null
                  const totalVal = t.quantity * t.price
                  return (
                    <tr
                      key={t.trade_id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="flex items-center border-b border-border/40 hover:bg-slate-900/60 transition-colors"
                    >
                      <td className="w-[14%] px-4 py-3 font-mono text-xs text-slate-300 font-semibold truncate">
                        {t.trade_id}
                      </td>
                      <td className="w-[12%] px-4 py-3 font-mono text-xs text-slate-400 truncate">
                        {new Date(t.trade_timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                        })}
                      </td>
                      <td className="w-[12%] px-4 py-3 truncate">
                        <span className="px-2 py-0.5 rounded font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 text-xs">
                          {t.symbol}
                        </span>
                      </td>
                      <td className="w-[20%] px-4 py-3 font-sans text-xs text-slate-300 truncate">
                        {t.client_name}
                      </td>
                      <td className="w-[10%] px-4 py-3 truncate">
                        <span
                          className={`px-2.5 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1 ${t.order_type === 'BUY'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/40'
                            }`}
                        >
                          {t.order_type === 'BUY' ? (
                            <ArrowUpRight className="size-3 text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="size-3 text-rose-400" />
                          )}
                          {t.order_type}
                        </span>
                      </td>
                      <td className="w-[10%] px-4 py-3 text-right font-mono text-xs text-slate-200">
                        {t.quantity.toLocaleString()}
                      </td>
                      <td className="w-[10%] px-4 py-3 text-right font-mono text-xs text-slate-200">
                        ₹{t.price.toFixed(2)}
                      </td>
                      <td className="w-[12%] px-4 py-3 text-right font-mono text-xs font-semibold text-emerald-400">
                        ₹{totalVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}
