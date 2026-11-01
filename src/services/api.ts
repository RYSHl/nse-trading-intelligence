import {
  CandleResponse,
  WatchlistItem,
  ScannerItem,
  TradeSignal,
  PaperAccount,
  PaperPosition,
  PaperOrder,
  PaperTrade,
  BacktestResult,
  MarketStatus,
  RiskConfig,
  DataSourceStatus
} from '../types';
import {
  mockMarketStatus,
  mockWatchlist,
  mockScannerItems,
  mockSignals,
  mockPaperAccount,
  mockPaperPositions,
  mockPaperOrders,
  mockPaperTrades,
  mockBacktestResult,
  mockRiskConfig,
  mockDataSources,
  generateMockCandles
} from './mockData';

const API_BASE = '/api';

let backendOnline: boolean = true;
const statusListeners = new Set<(online: boolean) => void>();

export function getBackendOnline(): boolean {
  return backendOnline;
}

export function subscribeBackendStatus(fn: (online: boolean) => void) {
  statusListeners.add(fn);
  fn(backendOnline);
  return () => {
    statusListeners.delete(fn);
  };
}

function updateBackendStatus(online: boolean) {
  if (backendOnline !== online) {
    backendOnline = online;
    statusListeners.forEach((fn) => fn(online));
  }
}

async function fetchJson<T>(url: string, options?: RequestInit, fallback?: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!res.ok) {
      let errorMsg = `API Error ${res.status}: ${res.statusText}`;
      try {
        const errData = await res.json();
        if (errData && errData.detail) errorMsg = errData.detail;
      } catch {
        // response might be 404 HTML from static host (e.g. GitHub Pages)
      }
      throw new Error(errorMsg);
    }

    const data = await res.json();
    updateBackendStatus(true);
    return data as T;
  } catch (err: any) {
    // If backend is unreachable or returns 404 HTML, mark offline and use fallback if provided
    updateBackendStatus(false);
    if (fallback !== undefined) {
      return fallback;
    }
    throw err;
  }
}

export const api = {
  // Connection Status Helper
  isBackendOnline: () => backendOnline,
  subscribeStatus: subscribeBackendStatus,

  // Market & Status
  getHealth: () =>
    fetchJson<{ status: string; service: string; version: string; timestamp_ist: string }>(
      '/health',
      undefined,
      {
        status: 'OFFLINE_PREVIEW',
        service: 'NSE Trading Intelligence (Static Preview)',
        version: '1.0.0',
        timestamp_ist: new Date().toISOString()
      }
    ),

  getMarketStatus: () => fetchJson<MarketStatus>('/market/status', undefined, mockMarketStatus),

  getWatchlist: () => fetchJson<WatchlistItem[]>('/market/watchlist', undefined, mockWatchlist),

  addToWatchlist: async (symbol: string, name?: string, sector?: string) => {
    return fetchJson<{ status: string; message: string }>(
      '/market/watchlist',
      {
        method: 'POST',
        body: JSON.stringify({ symbol, name, sector }),
      },
      { status: 'SUCCESS', message: `Added ${symbol} to watchlist (simulated)` }
    );
  },

  removeFromWatchlist: async (symbol: string) => {
    return fetchJson<{ status: string; message: string }>(
      `/market/watchlist/${encodeURIComponent(symbol)}`,
      { method: 'DELETE' },
      { status: 'SUCCESS', message: `Removed ${symbol} from watchlist (simulated)` }
    );
  },

  getCandles: async (symbol: string, timeframe = '5m', limit = 250) => {
    const fallbackResponse: CandleResponse = {
      symbol,
      timeframe,
      source: 'simulated_historical',
      freshness: 'HISTORICAL',
      candles: generateMockCandles(symbol, Math.min(limit, 120))
    };

    return fetchJson<CandleResponse>(
      `/market/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=${limit}`,
      undefined,
      fallbackResponse
    );
  },

  // Scanner & Signals
  getScanner: () => fetchJson<ScannerItem[]>('/scanner', undefined, mockScannerItems),

  getSignals: () => fetchJson<TradeSignal[]>('/signals', undefined, mockSignals),

  getSignalDetail: async (id: string) => {
    const found = mockSignals.find((s) => s.signal_id === id) || mockSignals[0];
    return fetchJson<TradeSignal>(`/signals/${id}`, undefined, found);
  },

  // Strategies & Backtests
  getStrategies: () =>
    fetchJson<any[]>('/strategies', undefined, [
      {
        id: 'orb_vwap_ema',
        name: 'ORB + VWAP + EMA + Volume Confirmation',
        description: 'Institutional breakout system requiring close above 09:15-09:30 ORB High, above VWAP, EMA20 > EMA50, and 1.5x relative volume.',
        is_active: true,
        parameters: {
          ema_fast: 20,
          ema_slow: 50,
          atr_period: 14,
          atr_stop_multiplier: 1.5,
          target_rr: 2.0,
          volume_multiplier: 1.5,
          entry_window_start: '09:30',
          entry_window_end: '14:30',
          square_off_time: '15:15'
        }
      }
    ]),

  runBacktest: async (req: { strategy_id?: string; symbols?: string[]; initial_capital?: number; parameters?: any }) => {
    return fetchJson<BacktestResult>(
      '/backtests',
      {
        method: 'POST',
        body: JSON.stringify(req),
      },
      mockBacktestResult
    );
  },

  // Paper Trading
  getPaperAccount: () => fetchJson<PaperAccount>('/paper/account', undefined, mockPaperAccount),

  getPaperPositions: () => fetchJson<PaperPosition[]>('/paper/positions', undefined, mockPaperPositions),

  getPaperOrders: () => fetchJson<PaperOrder[]>('/paper/orders', undefined, mockPaperOrders),

  getPaperTrades: () => fetchJson<PaperTrade[]>('/paper/trades', undefined, mockPaperTrades),

  submitPaperOrder: async (order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    requested_price?: number;
    stop_loss?: number;
    target_price?: number;
    signal_id?: string;
  }) => {
    const executedPrice = order.requested_price ?? 2985.40;
    return fetchJson<{ status: string; order_id: string; symbol: string; executed_price: number }>(
      '/paper/orders',
      {
        method: 'POST',
        body: JSON.stringify(order),
      },
      {
        status: 'FILLED',
        order_id: `ORD-SIM-${Math.floor(Math.random() * 9000 + 1000)}`,
        symbol: order.symbol,
        executed_price: executedPrice
      }
    );
  },

  closePaperPosition: async (symbol: string) => {
    return fetchJson<{ status: string; realized_pnl: number }>(
      `/paper/positions/${encodeURIComponent(symbol)}/close`,
      { method: 'POST' },
      { status: 'FILLED', realized_pnl: 460.50 }
    );
  },

  resetPaperAccount: async () => {
    return fetchJson<{ status: string; message: string }>(
      '/paper/reset',
      { method: 'POST' },
      { status: 'SUCCESS', message: 'Paper trading account reset to initial ₹100,000 capital.' }
    );
  },

  // Risk Management
  getRiskConfig: () => fetchJson<RiskConfig>('/risk/config', undefined, mockRiskConfig),

  updateRiskConfig: async (config: RiskConfig) => {
    return fetchJson<RiskConfig>(
      '/risk/config',
      {
        method: 'POST',
        body: JSON.stringify(config),
      },
      config
    );
  },

  toggleKillSwitch: async () => {
    return fetchJson<{ status: string; kill_switch: boolean; message: string }>(
      '/risk/kill-switch',
      { method: 'POST' },
      {
        status: 'SUCCESS',
        kill_switch: false,
        message: 'Institutional kill switch toggled.'
      }
    );
  },

  // Analytics & Data Sources
  getAnalytics: () =>
    fetchJson<any>('/analytics', undefined, {
      total_pnl: 785.40,
      win_rate_pct: 75.0,
      profit_factor: 2.18,
      sharpe_ratio: 1.84,
      max_drawdown_pct: 0.25,
      total_trades: 4
    }),

  getDataSourcesStatus: () => fetchJson<DataSourceStatus[]>('/data-sources/status', undefined, mockDataSources),

  stepReplay: async (steps = 1) => {
    return fetchJson<{ status: string; quote: any }>(
      `/replay/step?steps=${steps}`,
      { method: 'POST' },
      { status: 'SUCCESS', quote: { price: 2985.40, step: steps } }
    );
  },
};
