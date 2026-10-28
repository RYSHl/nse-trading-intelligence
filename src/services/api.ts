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

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
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
      if (errData.detail) errorMsg = errData.detail;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Market & Status
  getHealth: () => fetchJson<{ status: string; service: string; version: string; timestamp_ist: string }>('/health'),
  getMarketStatus: () => fetchJson<MarketStatus>('/market/status'),
  getWatchlist: () => fetchJson<WatchlistItem[]>('/market/watchlist'),
  addToWatchlist: (symbol: string, name?: string, sector?: string) =>
    fetchJson<{ status: string; message: string }>('/market/watchlist', {
      method: 'POST',
      body: JSON.stringify({ symbol, name, sector }),
    }),
  removeFromWatchlist: (symbol: string) =>
    fetchJson<{ status: string; message: string }>(`/market/watchlist/${encodeURIComponent(symbol)}`, {
      method: 'DELETE',
    }),
  getCandles: (symbol: string, timeframe = '5m', limit = 250) =>
    fetchJson<CandleResponse>(`/market/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}&limit=${limit}`),

  // Scanner & Signals
  getScanner: () => fetchJson<ScannerItem[]>('/scanner'),
  getSignals: () => fetchJson<TradeSignal[]>('/signals'),
  getSignalDetail: (id: string) => fetchJson<TradeSignal>(`/signals/${id}`),

  // Strategies & Backtests
  getStrategies: () => fetchJson<any[]>('/strategies'),
  runBacktest: (req: { strategy_id?: string; symbols?: string[]; initial_capital?: number; parameters?: any }) =>
    fetchJson<BacktestResult>('/backtests', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  // Paper Trading
  getPaperAccount: () => fetchJson<PaperAccount>('/paper/account'),
  getPaperPositions: () => fetchJson<PaperPosition[]>('/paper/positions'),
  getPaperOrders: () => fetchJson<PaperOrder[]>('/paper/orders'),
  getPaperTrades: () => fetchJson<PaperTrade[]>('/paper/trades'),
  submitPaperOrder: (order: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    requested_price?: number;
    stop_loss?: number;
    target_price?: number;
    signal_id?: string;
  }) =>
    fetchJson<{ status: string; order_id: string; symbol: string; executed_price: number }>('/paper/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    }),
  closePaperPosition: (symbol: string) =>
    fetchJson<{ status: string; realized_pnl: number }>(`/paper/positions/${encodeURIComponent(symbol)}/close`, {
      method: 'POST',
    }),
  resetPaperAccount: () => fetchJson<{ status: string; message: string }>('/paper/reset', { method: 'POST' }),

  // Risk Management
  getRiskConfig: () => fetchJson<RiskConfig>('/risk/config'),
  updateRiskConfig: (config: RiskConfig) =>
    fetchJson<RiskConfig>('/risk/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  toggleKillSwitch: () =>
    fetchJson<{ status: string; kill_switch: boolean; message: string }>('/risk/kill-switch', {
      method: 'POST',
    }),

  // Analytics & Data Sources
  getAnalytics: () => fetchJson<any>('/analytics'),
  getDataSourcesStatus: () => fetchJson<DataSourceStatus[]>('/data-sources/status'),
  stepReplay: (steps = 1) => fetchJson<{ status: string; quote: any }>(`/replay/step?steps=${steps}`, { method: 'POST' }),
};
