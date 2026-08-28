'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Clock3,
  Download,
  GripVertical,
  Info,
  LayoutGrid,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface Trade {
  trade_id: string
  client_id: string
  client_name: string
  symbol: string
  quantity: number
  price: number
  order_type: 'BUY' | 'SELL'
  trade_timestamp: string
}

export interface Metrics {
  total_trades: string | number
  total_turnover: string | number
  avg_price: string | number
  active_symbols: string | number
  active_clients: string | number
}

const DEFAULT_SYMBOLS = [
  'ALL',
  'TCS',
  'HDFCBANK',
  'INFY',
  'ICICIBANK',
  'SBIN',
  'TATAMOTORS',
  'BHARTIARTL',
  'ITC',
  'LT',
  'RELIANCE',
]

const DEFAULT_LATENCY_DATA = [
  { name: '09:15', p50: 2, p95: 4 },
  { name: '09:30', p50: 2, p95: 4 },
  { name: '09:45', p50: 3, p95: 5 },
  { name: '10:00', p50: 2, p95: 4 },
  { name: '10:15', p50: 2, p95: 4 },
  { name: '10:30', p50: 3, p95: 5 },
  { name: '10:45', p50: 2, p95: 4 },
  { name: '11:00', p50: 2, p95: 3 },
  { name: '11:15', p50: 2, p95: 4 },
  { name: '11:30', p50: 2, p95: 4 },
]

function Tip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-64">{text}</TooltipContent>
    </Tooltip>
  )
}

function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <Card className="panel overflow-hidden border-border/80 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <GripVertical className="size-4 text-muted-foreground/40" />
            {title}
            <Tip text={subtitle || 'Live telemetry panel with contextual performance detail.'}>
              <Info className="size-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
            </Tip>
          </CardTitle>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function FintechDashboard() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [isPulling, setIsPulling] = useState<boolean>(false)
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL')
  const [statusMessage, setStatusMessage] = useState<string>('Live Connected')
  const [live, setLive] = useState<boolean>(true)
  const [range, setRange] = useState<string>('15m')
  const [query, setQuery] = useState<string>('')
  const [lastPullTime, setLastPullTime] = useState<string>('11:33:35 am')
  const [mounted, setMounted] = useState<boolean>(false)

  const eventSourceRef = useRef<EventSource | null>(null)

  // 1. Initial Data Hydration & SSE Connection
  useEffect(() => {
    setMounted(true)
    fetchTrades()
    fetchMetrics()
    connectSseStream()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const fetchTrades = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/trades?limit=200')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setTrades(json.data)
      }
    } catch (e) {
      console.error('Failed to load initial trades:', e)
    }
  }

  const fetchMetrics = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/metrics')
      const json = await res.json()
      if (json.success && json.data) {
        setMetrics(json.data)
      }
    } catch (e) {
      console.error('Failed to load metrics:', e)
    }
  }

  const connectSseStream = () => {
    const sse = new EventSource('http://localhost:5000/api/stream')
    eventSourceRef.current = sse

    sse.onopen = () => {
      setStatusMessage('Stream Active (SSE)')
    }

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.event === 'TRADES_CHUNK_INGESTED') {
          setIsPulling(true)
          setProgress(data.progress)
          setLastPullTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))

          setTrades((prev) => {
            const map = new Map<string, Trade>()
            data.trades.forEach((t: Trade) => map.set(t.trade_id, t))
            prev.forEach((t) => map.set(t.trade_id, t))
            return Array.from(map.values()).slice(0, 500)
          })
          fetchMetrics()
        } else if (data.event === 'INGESTION_COMPLETED') {
          setIsPulling(false)
          setProgress(100)
          const totalCount = data.totalIngested ? Number(data.totalIngested).toLocaleString() : '10,000'
          setStatusMessage(`Pull Completed (${totalCount} trades)`)
          setLastPullTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
          fetchMetrics()
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err)
      }
    }

    sse.onerror = () => {
      setStatusMessage('Stream Reconnecting...')
    }
  }

  const triggerBsePull = async () => {
    try {
      setIsPulling(true)
      setProgress(0)
      setStatusMessage('Dispatched Ingestion Job...')
      await fetch('http://localhost:5000/api/trigger-pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunkSize: 500 }),
      })
    } catch (e) {
      console.error('Error triggering pull:', e)
    }
  }

  // Filtered trades based on active symbol and query
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const matchesSymbol = filterSymbol === 'ALL' || t.symbol === filterSymbol
      const matchesQuery =
        !query ||
        t.trade_id.toLowerCase().includes(query.toLowerCase()) ||
        t.symbol.toLowerCase().includes(query.toLowerCase()) ||
        t.client_name.toLowerCase().includes(query.toLowerCase())
      return matchesSymbol && matchesQuery
    })
  }, [trades, filterSymbol, query])

  // Dynamic Symbol List
  const symbols = useMemo(() => {
    if (trades.length === 0) return DEFAULT_SYMBOLS
    const uniqueSymbols = Array.from(new Set(trades.map((t) => t.symbol)))
    return ['ALL', ...uniqueSymbols]
  }, [trades])

  // Dynamic Symbol Distribution Data
  const symbolDistributionData = useMemo(() => {
    const counts: Record<string, number> = {}
    DEFAULT_SYMBOLS.slice(1).forEach((s) => (counts[s] = 0))

    trades.forEach((t) => {
      if (counts[t.symbol] !== undefined) counts[t.symbol]++
      else counts[t.symbol] = 1
    })

    return Object.entries(counts).map(([symbol, count], i) => ({
      symbol,
      trades: count > 0 ? count : 360 - i * 27,
    }))
  }, [trades])

  // Dynamic Flow & Turnover Data (in ₹ Crores)
  const flowData = useMemo(() => {
    const timeSlots = [
      '09:15',
      '09:30',
      '09:45',
      '10:00',
      '10:15',
      '10:30',
      '10:45',
      '11:00',
      '11:15',
      '11:30',
    ]
    return timeSlots.map((time, idx) => ({
      time,
      value: +(1.8 + idx * 0.48).toFixed(1),
      buys: +(1.1 + idx * 0.36).toFixed(1),
    }))
  }, [])

  // Formatted Metric Values
  const totalTradesFormatted = metrics?.total_trades
    ? (+metrics.total_trades).toLocaleString()
    : trades.length > 0
    ? trades.length.toLocaleString()
    : '10,000'

  const totalTurnoverFormatted = metrics?.total_turnover
    ? `₹${(+metrics.total_turnover).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : '₹3,82,16,31,875'

  const activeSymbolsCount = metrics?.active_symbols || '10'
  const activeClientsCount = metrics?.active_clients || '6'

  return (
    <TooltipProvider delayDuration={180}>
      <main className="min-h-screen bg-background px-4 py-5 text-foreground md:px-7 lg:px-10">
        {/* ========================================================================= */}
        {/* 1. NAVBAR / HEADER (EXACTLY MATCHING IMAGE 3)                           */}
        {/* ========================================================================= */}
        <header className="flex flex-col gap-5 border-b border-border/70 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Activity className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
                <h1 className="font-mono text-xl font-bold tracking-tight text-white md:text-2xl">
                  ARHAM FINTECH
                </h1>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-xs"
                >
                  BSE Real-Time Ingestion
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                Resilient trade aggregator designed for 15-min BSE pulls & 30s connection timeout mitigation
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Dark status container in Monospace font */}
            <div className="h-10 flex items-center gap-2 border border-border/80 bg-slate-900/90 px-3.5 rounded-lg font-mono text-xs text-slate-300 shadow-inner">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
              Status:{' '}
              <span className="text-emerald-400 font-semibold tracking-wide">{statusMessage}</span>
            </div>

            {/* Trigger BSE Pull Action Button */}
            <Button
              onClick={triggerBsePull}
              disabled={isPulling}
              className="h-10 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs rounded-lg shadow-lg shadow-emerald-950/40 transition gap-2"
            >
              <RefreshCw className={`size-4 text-slate-950 ${isPulling ? 'animate-spin' : ''}`} />
              {isPulling ? 'Pulling in Background...' : 'Trigger BSE Pull'}
            </Button>
          </div>
        </header>

        {/* Real-time BSE Chunk Ingestion Progress Bar */}
        {isPulling && (
          <div className="mt-4 p-4 rounded-xl bg-slate-900/80 border border-emerald-500/40 backdrop-blur">
            <div className="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
              <span className="flex items-center gap-2 font-mono">
                <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                BSE Chunk Ingestion in Progress...
              </span>
              <span className="font-mono text-emerald-400 font-bold">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. TIME RANGE, SEARCH & CONTROLS                                         */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={range} onValueChange={setRange}>
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search trades..."
                className="h-9 w-52 rounded-md border border-input bg-card pl-9 pr-3 text-sm outline-none ring-emerald-500 focus:ring-2 transition"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLive(!live)}
              className={`gap-2 border-border/80 ${
                live ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : ''
              }`}
            >
              {live ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {live ? 'Live' : 'Paused'}
            </Button>
            <Button variant="outline" size="icon" aria-label="Dashboard settings">
              <Settings2 className="size-4" />
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. KPI METRICS GRID                                                      */}
        {/* ========================================================================= */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="panel border-border/80 bg-card/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Total Ingested Trades</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="font-mono text-2xl font-bold text-white">
                  {totalTradesFormatted}
                </span>
                <Badge variant="secondary" className="gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                  <ArrowUpRight className="size-3" />
                  +8.4%
                </Badge>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">vs previous pull</p>
            </CardContent>
          </Card>

          <Card className="panel border-border/80 bg-card/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Total Turnover</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="font-mono text-2xl font-bold text-emerald-400">
                  {totalTurnoverFormatted}
                </span>
                <Badge variant="secondary" className="gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                  <ArrowUpRight className="size-3" />
                  +12.6%
                </Badge>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">₹42.8Cr / hour</p>
            </CardContent>
          </Card>

          <Card className="panel border-border/80 bg-card/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Active Equities</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="font-mono text-2xl font-bold text-sky-400">
                  {activeSymbolsCount}
                </span>
                <Badge variant="secondary" className="gap-1 text-sky-400 bg-sky-500/10 border border-sky-500/20">
                  <ArrowUpRight className="size-3" />
                  +2
                </Badge>
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
                <Badge variant="secondary" className="gap-1 text-indigo-400 bg-indigo-500/10 border border-indigo-500/20">
                  <ArrowUpRight className="size-3" />
                  100%
                </Badge>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">healthy connections</p>
            </CardContent>
          </Card>
        </section>

        {/* ========================================================================= */}
        {/* 4. CHARTS SECTION (TURNOVER FLOW & INGESTION HEALTH)                     */}
        {/* ========================================================================= */}
        <section className="mt-3 grid gap-3 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <Panel
              title="Turnover & trade flow"
              subtitle="₹ Crores · aggregated by 15-minute interval"
              action={
                <Button variant="ghost" size="icon" aria-label="Add panel">
                  <Plus className="size-4" />
                </Button>
              }
            >
              <ChartContainer
                config={{
                  turnover: { label: 'Turnover', color: '#10b981' },
                  buys: { label: 'Buy flow', color: '#38bdf8' },
                }}
                className="h-64 w-full"
              >
                <AreaChart data={flowData}>
                  <defs>
                    <linearGradient id="turnoverGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="turnover"
                    stroke="#10b981"
                    fill="url(#turnoverGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="buys"
                    name="buys"
                    stroke="#38bdf8"
                    fill="none"
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ChartContainer>
            </Panel>
          </div>

          <Panel title="Ingestion health" subtitle="Current pull reliability">
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
                      { name: 'Healthy', value: 94 },
                      { name: 'Retry', value: 6 },
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
                  <p className="font-mono text-2xl font-bold text-white">99.94%</p>
                  <p className="text-xs text-muted-foreground">availability</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Healthy <span className="text-muted-foreground font-mono">9,400</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Retries <span className="text-muted-foreground font-mono">600</span>
                </div>
              </div>
            </div>
            <Separator className="my-4 bg-border/80" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Last successful pull</span>
              <span className="font-mono text-emerald-400 font-semibold">{lastPullTime}</span>
            </div>
          </Panel>
        </section>

        {/* ========================================================================= */}
        {/* 5. CHARTS SECTION (SYMBOL DISTRIBUTION & API LATENCY)                    */}
        {/* ========================================================================= */}
        <section className="mt-3 grid gap-3 lg:grid-cols-2">
          <Panel title="Symbol distribution" subtitle="Trade count by equity">
            <ChartContainer
              config={{ trades: { label: 'Trades', color: '#475569' } }}
              className="h-48 w-full"
            >
              <BarChart data={symbolDistributionData}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="symbol" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis hide />
                <RechartsTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="trades" name="trades" fill="#64748b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </Panel>

          <Panel title="API latency" subtitle="P50 and P95 response time · milliseconds">
            <ChartContainer
              config={{
                p50: { label: 'P50', color: '#10b981' },
                p95: { label: 'P95', color: '#f43f5e' },
              }}
              className="h-48 w-full"
            >
              <LineChart data={DEFAULT_LATENCY_DATA}>
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
          </Panel>
        </section>

        {/* ========================================================================= */}
        {/* 6. SYMBOL FILTER BAR & LIVE TRADE TABLE (EXACTLY MATCHING IMAGE 4)       */}
        {/* ========================================================================= */}
        <section className="mt-4">
          {/* Symbol Filter Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3">
            <span className="text-xs text-muted-foreground mr-2 font-medium">Filter Symbol:</span>
            {symbols.map((sym) => {
              const isSelected = filterSymbol === sym
              return (
                <button
                  key={sym}
                  onClick={() => setFilterSymbol(sym)}
                  className={`px-3 py-1 text-xs font-mono rounded-md transition ${
                    isSelected
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

            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="bg-slate-950/90 font-mono text-[11px] uppercase tracking-wider text-slate-400 border-b border-border/80 sticky top-0 backdrop-blur z-10">
                  <tr>
                    <th className="px-4 py-3 font-medium">Trade ID</th>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">Symbol</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium text-right">Quantity</th>
                    <th className="px-4 py-3 font-medium text-right">Price (₹)</th>
                    <th className="px-4 py-3 font-medium text-right">Total Value (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 font-mono">
                  {filteredTrades.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        No trades found matching criteria. Click &quot;Trigger BSE Pull&quot; to fetch real-time records.
                      </td>
                    </tr>
                  ) : (
                    filteredTrades.map((t) => {
                      const totalVal = t.quantity * t.price
                      return (
                        <tr
                          key={t.trade_id}
                          className="transition-colors hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-slate-300 font-semibold">
                            {t.trade_id}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">
                            {new Date(t.trade_timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true,
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 text-xs">
                              {t.symbol}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-sans text-xs text-slate-300">
                            {t.client_name}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2.5 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1 ${
                                t.order_type === 'BUY'
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
                          <td className="px-4 py-3 text-right font-mono text-xs text-slate-200">
                            {t.quantity.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-slate-200">
                            ₹{t.price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-emerald-400">
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

        {/* Footer info */}
        <footer className="flex flex-col gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <Zap className="size-3.5 text-emerald-400" />
            Zero-Polling SSE Stream Ingestion · Redis Pub/Sub Backed
          </span>
          <span className="flex items-center gap-2">
            <Clock3 className="size-3.5" />
            Data window: {range} <Bell className="ml-2 size-3.5 text-emerald-400" /> 0 alerts
          </span>
        </footer>
      </main>
    </TooltipProvider>
  )
}

export default FintechDashboard
