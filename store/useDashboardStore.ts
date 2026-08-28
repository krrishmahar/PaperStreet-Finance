import { create } from 'zustand'

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

interface DashboardState {
  // Filter & Search State
  filterSymbol: string
  searchQuery: string
  timeRange: string
  isLive: boolean

  // Ingestion & SSE Telemetry State
  statusMessage: string
  progress: number
  isPulling: boolean
  lastPullTime: string
  realtimeTrades: Trade[]

  // Actions
  setFilterSymbol: (symbol: string) => void
  setSearchQuery: (query: string) => void
  setTimeRange: (range: string) => void
  setIsLive: (live: boolean | ((prev: boolean) => boolean)) => void
  setStatusMessage: (msg: string) => void
  setProgress: (progress: number) => void
  setIsPulling: (pulling: boolean) => void
  setLastPullTime: (time: string) => void
  setRealtimeTrades: (trades: Trade[] | ((prev: Trade[]) => Trade[])) => void
  prependChunkTrades: (newTrades: Trade[]) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  filterSymbol: 'ALL',
  searchQuery: '',
  timeRange: '15m',
  isLive: true,
  statusMessage: 'Connecting to SSE Stream...',
  progress: 0,
  isPulling: false,
  lastPullTime: '11:33:35 am',
  realtimeTrades: [],

  setFilterSymbol: (filterSymbol) => set({ filterSymbol }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTimeRange: (timeRange) => set({ timeRange }),
  setIsLive: (isLive) =>
    set((state) => ({
      isLive: typeof isLive === 'function' ? isLive(state.isLive) : isLive,
    })),
  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setProgress: (progress) => set({ progress }),
  setIsPulling: (isPulling) => set({ isPulling }),
  setLastPullTime: (lastPullTime) => set({ lastPullTime }),
  setRealtimeTrades: (trades) =>
    set((state) => ({
      realtimeTrades: typeof trades === 'function' ? trades(state.realtimeTrades) : trades,
    })),
  prependChunkTrades: (newTrades) =>
    set((state) => {
      const map = new Map<string, Trade>()
      newTrades.forEach((t) => map.set(t.trade_id, t))
      state.realtimeTrades.forEach((t) => map.set(t.trade_id, t))
      return { realtimeTrades: Array.from(map.values()).slice(0, 500) }
    }),
}))
