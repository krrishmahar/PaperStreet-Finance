import { useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDashboardStore, type Trade, type Metrics } from './useDashboardStore'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export async function fetchTrades(limit = 200): Promise<Trade[]> {
  const res = await fetch(`${API_BASE_URL}/api/trades?limit=${limit}`)
  if (!res.ok) throw new Error(`Failed to fetch trades: HTTP ${res.status}`)
  const json = await res.json()
  return json.success && Array.isArray(json.data) ? json.data : []
}

export async function fetchMetrics(): Promise<Metrics> {
  const res = await fetch(`${API_BASE_URL}/api/metrics`)
  if (!res.ok) throw new Error(`Failed to fetch metrics: HTTP ${res.status}`)
  const json = await res.json()
  return json.success && json.data ? json.data : {
    total_trades: 0,
    total_turnover: 0,
    avg_price: 0,
    active_symbols: 0,
    active_clients: 0,
  }
}

export async function triggerBseIngestion(chunkSize = 500): Promise<{ success: boolean; jobId: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/trigger-pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chunkSize }),
  })
  if (!res.ok) throw new Error(`Failed to dispatch pull: HTTP ${res.status}`)
  return res.json()
}

/**
 * TanStack Query Hook: Trades Initial Hydration Layer
 */
export function useTradeHistory(limit = 200) {
  return useQuery({
    queryKey: ['trades', limit],
    queryFn: () => fetchTrades(limit),
    staleTime: 1000 * 30, // 30s cache freshness
    refetchOnWindowFocus: false,
  })
}

// Alias for backwards compatibility
export const useTradesQuery = useTradeHistory

/**
 * TanStack Query Hook: Trade Metrics Query
 */
export function useMetricsQuery() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
    staleTime: 1000 * 10,
    refetchOnWindowFocus: false,
  })
}

/**
 * TanStack Mutation Hook: Trigger Background BSE Pull
 */
export function useTriggerBsePullMutation() {
  const queryClient = useQueryClient()
  const { setProgress, setIsPulling, setStatusMessage } = useDashboardStore()

  return useMutation({
    mutationFn: (chunkSize?: number) => triggerBseIngestion(chunkSize || 500),
    onMutate: () => {
      setIsPulling(true)
      setProgress(0)
      setStatusMessage('Dispatched Ingestion Job...')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
      queryClient.invalidateQueries({ queryKey: ['trades'] })
    },
    onError: (err: any) => {
      setIsPulling(false)
      setStatusMessage(`Error: ${err.message || 'Failed to trigger pull'}`)
    },
  })
}

/**
 * Custom Hook: Real-Time SSE Stream with Client-Side Watchdog & Redis Stream Replay
 * - Employs a 25-second watchdog timer against silent connection freeze
 * - Reconnects with Last-Event-ID for zero data drops
 */
export function useSseStream() {
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // 60FPS Micro-Batching Buffer using requestAnimationFrame
  const pendingTradesBufferRef = useRef<Trade[]>([])
  const rafHandleRef = useRef<number | null>(null)

  const {
    setIsPulling,
    setProgress,
    setStatusMessage,
    setConnectionStatus,
    recordHeartbeat,
    setLastEventId,
    setLastPullTime,
    prependChunkTrades,
  } = useDashboardStore()

  // Flush buffered trades to React state synchronized with browser refresh rate (<= 16ms)
  const flushTradeBuffer = useCallback(() => {
    if (pendingTradesBufferRef.current.length > 0) {
      const tradesToFlush = pendingTradesBufferRef.current
      pendingTradesBufferRef.current = []
      prependChunkTrades(tradesToFlush)
    }
    rafHandleRef.current = null
  }, [prependChunkTrades])

  // Reset watchdog timer on any event or heartbeat
  const resetWatchdog = useCallback(() => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current)
    }

    recordHeartbeat()

    // If 25 seconds elapse with no event or ping comment, flag STALE and reconnect
    watchdogTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return
      console.warn('[Watchdog] ⚠️ No heartbeat/event received in 25s. Connection marked STALE. Reconnecting...');
      setConnectionStatus('STALE')
      setStatusMessage('Connection Stale (Reconnecting...)')
      
      // Close stalled connection and trigger reconnect
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setTimeout(() => {
        if (isMountedRef.current) {
          connectStream()
        }
      }, 1500)
    }, 25000)
  }, [recordHeartbeat, setConnectionStatus, setStatusMessage])

  const connectStream = useCallback(() => {
    if (!isMountedRef.current) return

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setConnectionStatus('CONNECTING')
    const currentLastEventId = useDashboardStore.getState().lastEventId
    const streamUrl = currentLastEventId
      ? `${API_BASE_URL}/api/stream?lastEventId=${encodeURIComponent(currentLastEventId)}`
      : `${API_BASE_URL}/api/stream`

    console.log(`[SSE Stream] Initiating connection to: ${streamUrl}`);
    const sse = new EventSource(streamUrl)
    eventSourceRef.current = sse

    sse.onopen = () => {
      if (!isMountedRef.current) return
      console.log('[SSE Stream] ✅ Connected successfully');
      setConnectionStatus('CONNECTED')
      setStatusMessage('Stream Active (SSE)')
      resetWatchdog()
    }

    sse.onmessage = (event) => {
      if (!isMountedRef.current) return
      resetWatchdog()

      if (event.lastEventId) {
        setLastEventId(event.lastEventId)
      }

      try {
        const data = JSON.parse(event.data)

        if (data.event === 'HEARTBEAT') {
          // Heartbeat keepalive confirmed
          return
        }

        if (data.event === 'TRADES_CHUNK_INGESTED') {
          setIsPulling(true)
          setProgress(data.progress)
          setLastPullTime(
            new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          )

          // Enqueue incoming trades into the RAF micro-batch buffer
          if (Array.isArray(data.trades) && data.trades.length > 0) {
            pendingTradesBufferRef.current.push(...data.trades)

            if (rafHandleRef.current === null) {
              rafHandleRef.current = requestAnimationFrame(flushTradeBuffer)
            }
          }

          // Refresh metrics in background
          queryClient.invalidateQueries({ queryKey: ['metrics'] })
        } else if (data.event === 'INGESTION_COMPLETED') {
          setIsPulling(false)
          setProgress(100)
          const totalCount = data.totalIngested
            ? Number(data.totalIngested).toLocaleString()
            : '10,000'
          setStatusMessage(`Pull Completed (${totalCount} trades)`)
          setLastPullTime(
            new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          )
          queryClient.invalidateQueries({ queryKey: ['metrics'] })
          queryClient.invalidateQueries({ queryKey: ['trades'] })
        } else if (data.event === 'FLUSH_ALL') {
          useDashboardStore.getState().flushStoreState()
          queryClient.setQueryData(['trades'], [])
          queryClient.invalidateQueries({ queryKey: ['trades'] })
          queryClient.invalidateQueries({ queryKey: ['metrics'] })
        }
      } catch (err) {
        // SSE comments (like : ping\n\n) or non-JSON payloads
      }
    }

    sse.onerror = () => {
      if (!isMountedRef.current) return
      console.warn('[SSE Stream] Connection error encountered. State: DISCONNECTED');
      setConnectionStatus('DISCONNECTED')
      setStatusMessage('Stream Reconnecting...')
    }
  }, [
    queryClient,
    resetWatchdog,
    flushTradeBuffer,
    setConnectionStatus,
    setLastEventId,
    setIsPulling,
    setProgress,
    setStatusMessage,
    setLastPullTime,
  ])

  useEffect(() => {
    isMountedRef.current = true
    connectStream()

    return () => {
      isMountedRef.current = false
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current)
      }
      if (rafHandleRef.current !== null) {
        cancelAnimationFrame(rafHandleRef.current)
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setConnectionStatus('DISCONNECTED')
    }
  }, [connectStream, setConnectionStatus])
}

export function useFlushMutation() {
  const queryClient = useQueryClient()
  const flushStoreState = useDashboardStore((s) => s.flushStoreState)

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/flush`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        throw new Error(`Flush request failed with status: ${res.status}`)
      }
      return res.json()
    },
    onSuccess: () => {
      flushStoreState()
      queryClient.setQueryData(['trades'], [])
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
    },
  })
}

