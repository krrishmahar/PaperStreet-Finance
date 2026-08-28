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
  initialData?: Array<{ time: number; turnover: number; buys: number }>
  height?: number
}

// Baseline market hours flow data (09:15 AM - 11:30 AM in ₹ Crores)
const DEFAULT_FLOW_POINTS = [
  { time: 1724816700, turnover: 1.8, buys: 1.1 },
  { time: 1724817600, turnover: 2.28, buys: 1.46 },
  { time: 1724818500, turnover: 2.76, buys: 1.82 },
  { time: 1724819400, turnover: 3.24, buys: 2.18 },
  { time: 1724820300, turnover: 3.72, buys: 2.54 },
  { time: 1724821200, turnover: 4.2, buys: 2.9 },
  { time: 1724822100, turnover: 4.68, buys: 3.26 },
  { time: 1724823000, turnover: 5.16, buys: 3.62 },
  { time: 1724823900, turnover: 5.64, buys: 3.98 },
  { time: 1724824800, turnover: 6.12, buys: 4.34 },
]

export const TradingViewChart = forwardRef<TradingViewChartRef, TradingViewChartProps>(
  ({ initialData, height = 290 }, ref) => {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartInstanceRef = useRef<IChartApi | null>(null)
    const turnoverSeriesRef = useRef<ISeriesApi<'Area'> | null>(null)
    const buyFlowSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

    // Expose imperative update handles (bypasses React state for 60FPS real-time rendering)
    useImperativeHandle(ref, () => ({
      updateTurnover: (timestampSec: number, turnoverCr: number) => {
        if (turnoverSeriesRef.current) {
          turnoverSeriesRef.current.update({
            time: timestampSec as UTCTimestamp,
            value: turnoverCr,
          })
        }
      },
      updateBuyFlow: (timestampSec: number, buyCr: number) => {
        if (buyFlowSeriesRef.current) {
          buyFlowSeriesRef.current.update({
            time: timestampSec as UTCTimestamp,
            value: buyCr,
          })
        }
      },
      getChart: () => chartInstanceRef.current,
    }))

    useEffect(() => {
      if (!chartContainerRef.current) return

      const container = chartContainerRef.current
      const width = container.clientWidth || 600

      // 1. Initialize Lightweight-Charts Engine
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

      // 2. Add Turnover Area Series (Emerald Gradient)
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

      // 3. Add Buy Flow Line Series (Sky Blue)
      const buyFlowSeries = chart.addSeries(LineSeries, {
        color: '#38bdf8',
        lineWidth: 2,
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => `₹${price.toFixed(2)} Cr (Buy)`,
        },
      })
      buyFlowSeriesRef.current = buyFlowSeries

      // 4. Hydrate Initial Series Data
      const dataset = initialData && initialData.length > 0 ? initialData : DEFAULT_FLOW_POINTS
      turnoverSeries.setData(
        dataset.map((d) => ({
          time: d.time as UTCTimestamp,
          value: d.turnover,
        }))
      )
      buyFlowSeries.setData(
        dataset.map((d) => ({
          time: d.time as UTCTimestamp,
          value: d.buys,
        }))
      )

      chart.timeScale().fitContent()

      // 5. Responsive Resize Observer
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
    }, [initialData, height])

    return (
      <div className="relative w-full">
        <div ref={chartContainerRef} className="w-full" style={{ height }} />
      </div>
    )
  }
)

TradingViewChart.displayName = 'TradingViewChart'
