import { create } from 'zustand'

export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'STALE' | 'DISCONNECTED'

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

  // Connection & Watchdog Telemetry State
  connectionStatus: ConnectionStatus
  lastHeartbeat: number
  lastEventId: string | null

  // Ingestion & SSE Telemetry State
  statusMessage: string
  progress: number
  isPulling: boolean
  lastPullTime: string
  totalIngestedCount: number
  realtimeTrades: Trade[]

  // Actions
  setFilterSymbol: (symbol: string) => void
  setSearchQuery: (query: string) => void
  setTimeRange: (range: string) => void
  setIsLive: (live: boolean | ((prev: boolean) => boolean)) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  recordHeartbeat: () => void
  setLastEventId: (id: string | null) => void
  setStatusMessage: (msg: string) => void
  setProgress: (progress: number) => void
  setIsPulling: (pulling: boolean) => void
  setLastPullTime: (time: string) => void
  setTotalIngestedCount: (count: number) => void
  setRealtimeTrades: (trades: Trade[] | ((prev: Trade[]) => Trade[])) => void
  prependChunkTrades: (newTrades: Trade[]) => void
  flushStoreState: () => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  filterSymbol: 'ALL',
  searchQuery: '',
  timeRange: '15m',
  isLive: true,

  connectionStatus: 'CONNECTING',
  lastHeartbeat: Date.now(),
  lastEventId: null,

  statusMessage: 'Connecting to SSE Stream...',
  progress: 0,
  isPulling: false,
  lastPullTime: '11:33:35 am',
  totalIngestedCount: 0,
  realtimeTrades: [],

  setFilterSymbol: (filterSymbol) => set({ filterSymbol }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setTimeRange: (timeRange) => set({ timeRange }),
  setIsLive: (isLive) =>
    set((state) => ({
      isLive: typeof isLive === 'function' ? isLive(state.isLive) : isLive,
    })),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  recordHeartbeat: () => set({ lastHeartbeat: Date.now(), connectionStatus: 'CONNECTED' }),
  setLastEventId: (lastEventId) => set({ lastEventId }),

  setStatusMessage: (statusMessage) => set({ statusMessage }),
  setProgress: (progress) => set({ progress }),
  setIsPulling: (isPulling) => set({ isPulling }),
  setLastPullTime: (lastPullTime) => set({ lastPullTime }),
  setTotalIngestedCount: (totalIngestedCount) => set({ totalIngestedCount }),
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
  flushStoreState: () =>
    set({
      realtimeTrades: [],
      progress: 0,
      isPulling: false,
      totalIngestedCount: 0,
      lastEventId: null,
      statusMessage: 'System Flushed (Clean Initial State)',
    }),
}))
