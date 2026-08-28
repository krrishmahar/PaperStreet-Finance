import { useEffect, useRef } from 'react'
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
 * TanStack Query Hook: Trades Query
 */
export function useTradesQuery(limit = 200) {
  return useQuery({
    queryKey: ['trades', limit],
    queryFn: () => fetchTrades(limit),
    staleTime: 1000 * 30, // 30s cache freshness
    refetchOnWindowFocus: false,
  })
}

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
      // Invalidate queries so TanStack Query refreshes caches
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
 * Custom Hook: Real-Time SSE Stream with Redis Pub/Sub integration
 * Synchronizes incoming chunk events with TanStack Query Cache & Zustand Store
 */
export function useSseStream() {
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)

  const {
    setIsPulling,
    setProgress,
    setStatusMessage,
    setLastPullTime,
    prependChunkTrades,
  } = useDashboardStore()

  useEffect(() => {
    const sse = new EventSource(`${API_BASE_URL}/api/stream`)
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
          setLastPullTime(
            new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          )

          if (Array.isArray(data.trades) && data.trades.length > 0) {
            prependChunkTrades(data.trades)
          }

          // Invalidate metrics query to update KPI tiles in real-time
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
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err)
      }
    }

    sse.onerror = () => {
      setStatusMessage('Stream Reconnecting...')
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [
    queryClient,
    setIsPulling,
    setProgress,
    setStatusMessage,
    setLastPullTime,
    prependChunkTrades,
  ])
}
