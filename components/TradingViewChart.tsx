'use client'

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  AreaSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'

export interface TradingViewChartRef {
  updateTurnover: (timestampSec: number, turnoverCr: number) => void
  updateBuyFlow: (timestampSec: number, buyCr: number) => void
  getChart: () => IChartApi | null
}

interface TradingViewChartProps {
  data?: Array<{ time: number; turnover: number; buys: number }>
  height?: number
}

function sanitizeAndSortSeriesData(
  data: Array<{ time: number; value: number }>
): Array<{ time: UTCTimestamp; value: number }> {
  if (!data || data.length === 0) return []
  const sorted = [...data].sort((a, b) => a.time - b.time)
  const deduped: Array<{ time: UTCTimestamp; value: number }> = []

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]
    if (!item || isNaN(item.time) || isNaN(item.value)) continue
    if (deduped.length > 0 && (deduped[deduped.length - 1].time as number) === item.time) {
      deduped[deduped.length - 1].value = item.value
    } else {
      deduped.push({ time: item.time as UTCTimestamp, value: item.value })
    }
  }
  return deduped
}

export const TradingViewChart = forwardRef<TradingViewChartRef, TradingViewChartProps>(
  ({ data = [], height = 260 }, ref) => {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartInstanceRef = useRef<IChartApi | null>(null)
    const turnoverSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)
    const buyFlowSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
    const lastTurnoverTimeRef = useRef<number>(0)
    const lastBuyTimeRef = useRef<number>(0)

    // Expose imperative update handles
    useImperativeHandle(ref, () => ({
      updateTurnover: (timestampSec: number, turnoverCr: number) => {
        if (!turnoverSeriesRef.current || isNaN(timestampSec) || isNaN(turnoverCr)) return
        if (timestampSec >= lastTurnoverTimeRef.current) {
          try {
            turnoverSeriesRef.current.update({
              time: timestampSec as UTCTimestamp,
              value: turnoverCr,
            })
            lastTurnoverTimeRef.current = timestampSec
          } catch (err) {
            console.warn('[TradingViewChart] Suppressed turnover tick:', err)
          }
        }
      },
      updateBuyFlow: (timestampSec: number, buyCr: number) => {
        if (!buyFlowSeriesRef.current || isNaN(timestampSec) || isNaN(buyCr)) return
        if (timestampSec >= lastBuyTimeRef.current) {
          try {
            buyFlowSeriesRef.current.update({
              time: timestampSec as UTCTimestamp,
              value: buyCr,
            })
            lastBuyTimeRef.current = timestampSec
          } catch (err) {
            console.warn('[TradingViewChart] Suppressed buy flow tick:', err)
          }
        }
      },
      getChart: () => chartInstanceRef.current,
    }))

    // Initialize Chart Canvas Engine
    useEffect(() => {
      if (!chartContainerRef.current) return

      const container = chartContainerRef.current
      const width = container.clientWidth || 600

      const chart = createChart(container, {
        width,
        height,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#94a3b8',
          fontSize: 11,
          fontFamily: 'var(--font-geist-mono, monospace)',
        },
        grid: {
          vertLines: { color: 'rgba(51, 65, 85, 0.2)' },
          horzLines: { color: 'rgba(51, 65, 85, 0.2)' },
        },
        crosshair: {
          mode: CrosshairMode.Magnet,
          vertLine: {
            color: 'rgba(16, 185, 129, 0.4)',
            width: 1,
            style: 2,
            labelBackgroundColor: '#064e3b',
          },
          horzLine: {
            color: 'rgba(16, 185, 129, 0.4)',
            width: 1,
            style: 2,
            labelBackgroundColor: '#064e3b',
          },
        },
        timeScale: {
          borderColor: 'rgba(51, 65, 85, 0.5)',
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: 'rgba(51, 65, 85, 0.5)',
          scaleMargins: {
            top: 0.15,
            bottom: 0.15,
          },
        },
      })

      chartInstanceRef.current = chart

      // Turnover Area Series (Emerald Gradient)
      const turnoverSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(16, 185, 129, 0.45)',
        bottomColor: 'rgba(16, 185, 129, 0.02)',
        lineColor: '#10b981',
        lineWidth: 2,
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => `₹${price.toFixed(2)} Cr`,
        },
      })
      turnoverSeriesRef.current = turnoverSeries

      // Buy Flow Line Series (Sky Blue)
      const buyFlowSeries = chart.addSeries(LineSeries, {
        color: '#38bdf8',
        lineWidth: 2,
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => `₹${price.toFixed(2)} Cr (Buy)`,
        },
      })
      buyFlowSeriesRef.current = buyFlowSeries

      // Responsive Resize Observer
      const resizeObserver = new ResizeObserver((entries) => {
        if (!entries || entries.length === 0 || !entries[0].contentRect) return
        const newWidth = entries[0].contentRect.width
        if (newWidth > 0) {
          chart.applyOptions({ width: newWidth })
        }
      })
      resizeObserver.observe(container)

      return () => {
        resizeObserver.disconnect()
        chart.remove()
        chartInstanceRef.current = null
        turnoverSeriesRef.current = null
        buyFlowSeriesRef.current = null
      }
    }, [height])

    // Reactively update series when data prop changes
    useEffect(() => {
      if (!turnoverSeriesRef.current || !buyFlowSeriesRef.current || !chartInstanceRef.current) return

      if (!data || data.length === 0) {
        turnoverSeriesRef.current.setData([])
        buyFlowSeriesRef.current.setData([])
        return
      }

      const sanitizedTurnover = sanitizeAndSortSeriesData(
        data.map((d) => ({ time: d.time, value: d.turnover }))
      )
      const sanitizedBuys = sanitizeAndSortSeriesData(
        data.map((d) => ({ time: d.time, value: d.buys }))
      )

      turnoverSeriesRef.current.setData(sanitizedTurnover)
      buyFlowSeriesRef.current.setData(sanitizedBuys)

      if (sanitizedTurnover.length > 0) {
        lastTurnoverTimeRef.current = sanitizedTurnover[sanitizedTurnover.length - 1].time as number
      }
      if (sanitizedBuys.length > 0) {
        lastBuyTimeRef.current = sanitizedBuys[sanitizedBuys.length - 1].time as number
      }

      chartInstanceRef.current.timeScale().fitContent()
    }, [data])

    return (
      <div className="relative w-full">
        <div ref={chartContainerRef} className="w-full" style={{ height }} />
      </div>
    )
  }
)

TradingViewChart.displayName = 'TradingViewChart'
