import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  IChartApi,
  ISeriesApi,
  Time
} from 'lightweight-charts';
import { Candle } from '../../types';

interface TradingViewChartProps {
  candles: Candle[];
  symbol: string;
  timeframe?: string;
  orbHigh?: number | null;
  orbLow?: number | null;
  entryPrice?: number | null;
  stopLossPrice?: number | null;
  targetPrice?: number | null;
  onTimeframeChange?: (tf: string) => void;
}

// Indicator calculation helpers for the chart lines
function computeEMA(data: { time: Time; value: number }[], period: number) {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  let ema = data[0].value;
  const result: { time: Time; value: number }[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const val = data[i].value;
    ema = i === 0 ? val : val * k + ema * (1 - k);
    if (i >= period - 1) {
      result.push({ time: data[i].time, value: Number(ema.toFixed(2)) });
    }
  }
  return result;
}

function computeVWAP(candles: Candle[]) {
  const result: { time: Time; value: number }[] = [];
  let cumPV = 0;
  let cumVol = 0;
  let lastDay = '';

  for (const c of candles) {
    const dateStr = new Date(c.time * 1000).toDateString();
    if (dateStr !== lastDay) {
      cumPV = 0;
      cumVol = 0;
      lastDay = dateStr;
    }
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumPV += typicalPrice * c.volume;
    cumVol += c.volume;
    const vwap = cumVol > 0 ? cumPV / cumVol : typicalPrice;
    result.push({ time: c.time as Time, value: Number(vwap.toFixed(2)) });
  }
  return result;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  candles,
  symbol,
  timeframe = '5m',
  orbHigh,
  orbLow,
  entryPrice,
  stopLossPrice,
  targetPrice,
  onTimeframeChange,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [hoveredData, setHoveredData] = useState<{
    time?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
  } | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0b0f17' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#475569', width: 1, style: LineStyle.Dotted },
        horzLine: { color: '#475569', width: 1, style: LineStyle.Dotted },
      },
      rightPriceScale: {
        borderColor: 'rgba(30, 41, 59, 0.8)',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: 'rgba(30, 41, 59, 0.8)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    // Candlestick Series (Restrained Institutional Palette)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });
    candleSeriesRef.current = candleSeries;

    // Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#334155',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Separate price scale overlay
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // EMA 20 Series (Cyan)
    const ema20Series = chart.addSeries(LineSeries, {
      color: '#38bdf8',
      lineWidth: 1,
      title: 'EMA 20',
      priceLineVisible: false,
    });

    // EMA 50 Series (Amber)
    const ema50Series = chart.addSeries(LineSeries, {
      color: '#fbbf24',
      lineWidth: 1,
      title: 'EMA 50',
      priceLineVisible: false,
    });

    // VWAP Series (Purple)
    const vwapSeries = chart.addSeries(LineSeries, {
      color: '#c084fc',
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      title: 'VWAP',
      priceLineVisible: false,
    });

    // Prepare data
    if (candles && candles.length > 0) {
      // Sort and deduplicate by time
      const sortedCandles = [...candles].sort((a, b) => a.time - b.time);
      const uniqueCandles: Candle[] = [];
      const seenTimes = new Set<number>();
      for (const c of sortedCandles) {
        if (!seenTimes.has(c.time)) {
          seenTimes.add(c.time);
          uniqueCandles.push(c);
        }
      }

      const formattedCandles = uniqueCandles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      candleSeries.setData(formattedCandles);

      // Volume histogram
      const volumeData = uniqueCandles.map((c) => ({
        time: c.time as Time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)',
      }));
      volumeSeries.setData(volumeData);

      // Close series for indicators
      const closeData = uniqueCandles.map((c) => ({ time: c.time as Time, value: c.close }));
      ema20Series.setData(computeEMA(closeData, 20));
      ema50Series.setData(computeEMA(closeData, 50));
      vwapSeries.setData(computeVWAP(uniqueCandles));

      // Fit chart content
      chart.timeScale().fitContent();

      // Default legend to last candle
      const last = uniqueCandles[uniqueCandles.length - 1];
      setHoveredData({
        time: last.datetime_iso,
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
        volume: last.volume,
      });
    }

    // Dynamic Price Lines (ORB, Entry, Stop Loss, Target)
    if (orbHigh) {
      candleSeries.createPriceLine({
        price: orbHigh,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'ORB HIGH',
      });
    }
    if (orbLow) {
      candleSeries.createPriceLine({
        price: orbLow,
        color: '#f59e0b',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'ORB LOW',
      });
    }
    if (entryPrice) {
      candleSeries.createPriceLine({
        price: entryPrice,
        color: '#38bdf8',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: 'ENTRY',
      });
    }
    if (stopLossPrice) {
      candleSeries.createPriceLine({
        price: stopLossPrice,
        color: '#f43f5e',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'STOP LOSS',
      });
    }
    if (targetPrice) {
      candleSeries.createPriceLine({
        price: targetPrice,
        color: '#10b981',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'TARGET (2R)',
      });
    }

    // Crosshair tooltip listener
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) return;
      const data = param.seriesData.get(candleSeries) as any;
      const vol = param.seriesData.get(volumeSeries) as any;
      if (data) {
        setHoveredData({
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: vol?.value,
        });
      }
    });

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles, symbol, orbHigh, orbLow, entryPrice, stopLossPrice, targetPrice]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0b0f17] border border-slate-800/80 rounded-lg overflow-hidden select-none">
      {/* Chart Top Bar Controls & Legend */}
      <div className="h-10 px-4 bg-[#0d121d] border-b border-slate-800/80 flex items-center justify-between shrink-0 text-xs font-mono">
        {/* Symbol & Timeframe */}
        <div className="flex items-center gap-3">
          <span className="font-bold text-white tracking-wide">{symbol}</span>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 bg-slate-900 rounded p-0.5 border border-slate-800">
            {['5m', '15m', '1d'].map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange?.(tf)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicator Badges */}
          <div className="hidden md:flex items-center gap-2 text-[11px] ml-2">
            <span className="text-[#38bdf8]">EMA20</span>
            <span className="text-[#fbbf24]">EMA50</span>
            <span className="text-[#c084fc]">VWAP</span>
            <span className="text-[#f59e0b]">ORB (09:15-09:30)</span>
          </div>
        </div>

        {/* OHLCV Crosshair Details */}
        {hoveredData && (
          <div className="flex items-center gap-3 text-[11px] tabular-nums text-slate-400">
            <span>
              O: <strong className="text-slate-200 font-medium">{hoveredData.open?.toFixed(2)}</strong>
            </span>
            <span>
              H: <strong className="text-slate-200 font-medium">{hoveredData.high?.toFixed(2)}</strong>
            </span>
            <span>
              L: <strong className="text-slate-200 font-medium">{hoveredData.low?.toFixed(2)}</strong>
            </span>
            <span>
              C:{' '}
              <strong
                className={`font-medium ${
                  (hoveredData.close ?? 0) >= (hoveredData.open ?? 0) ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {hoveredData.close?.toFixed(2)}
              </strong>
            </span>
            {hoveredData.volume !== undefined && (
              <span className="hidden xl:inline">
                Vol: <strong className="text-slate-300 font-medium">{hoveredData.volume.toLocaleString('en-IN')}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chart Canvas Area */}
      <div ref={chartContainerRef} className="flex-1 w-full min-h-[360px]" />
    </div>
  );
};
