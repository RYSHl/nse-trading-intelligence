export interface Candle {
  time: number;
  datetime_iso: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandleResponse {
  symbol: string;
  timeframe: string;
  source: string;
  freshness: string;
  candles: Candle[];
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  sector?: string;
  last_price: number;
  change: number;
  change_pct: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  signal_status: 'BUY' | 'SELL' | 'EXIT' | 'WAIT';
  updated_at: string;
}

export interface ScannerItem {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change_pct: number;
  direction: 'BUY' | 'SELL' | 'EXIT' | 'WAIT';
  action: string;
  qualified: boolean;
  orb_high?: number | null;
  orb_low?: number | null;
  vwap?: number | null;
  ema20?: number | null;
  ema50?: number | null;
  rel_volume?: number | null;
  volume?: number | null;
  passed_count: number;
  failed_count: number;
  explanation: string;
}

export interface TradeSignal {
  signal_id: string;
  symbol: string;
  strategy_id: string;
  direction: 'BUY' | 'SELL' | 'EXIT' | 'WAIT';
  action: string;
  signal_timestamp: string;
  data_timestamp: string;
  data_source: string;
  data_freshness: string;
  reference_price: number;
  proposed_entry: number;
  stop_loss: number;
  target_price: number;
  risk_reward_ratio: number;
  suggested_quantity: number;
  estimated_max_loss: number;
  indicator_values: {
    close?: number;
    orb_high?: number | null;
    orb_low?: number | null;
    vwap?: number;
    ema20?: number;
    ema50?: number;
    atr14?: number;
    rel_volume?: number;
    volume?: number;
  };
  passed_conditions: string[];
  failed_conditions: string[];
  explanation: string;
  execution_eligibility: boolean;
  signal_status: 'CANDIDATE' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED' | 'PAPER_ORDER_CREATED' | 'CLOSED' | string;
  risk_details?: {
    equity: number;
    risk_budget: number;
    risk_per_share: number;
    max_capital_allocation: number;
    quantity_by_risk: number;
    quantity_by_capital: number;
    binding_constraint: string;
    estimated_max_loss: number;
    capital_required: number;
  };
}

export interface PaperAccount {
  id: string;
  currency: string;
  initial_capital: number;
  cash_balance: number;
  equity: number;
  realized_pnl: number;
  unrealized_pnl: number;
  peak_equity: number;
  max_drawdown_pct: number;
  daily_entries_count: number;
  is_kill_switch_active: boolean;
  win_rate_pct: number;
  total_trades: number;
  open_positions_count: number;
}

export interface PaperPosition {
  id: number;
  symbol: string;
  quantity: number;
  average_entry_price: number;
  current_price: number;
  stop_loss: number;
  target_price: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  opened_at: string;
  strategy_id: string;
  signal_id?: string;
}

export interface PaperOrder {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  order_type: string;
  quantity: number;
  requested_price: number;
  executed_price?: number;
  stop_loss?: number;
  target_price?: number;
  status: 'PENDING' | 'FILLED' | 'REJECTED' | 'CANCELLED';
  fees: number;
  rejection_reason?: string;
  signal_id?: string;
  created_at: string;
  executed_at?: string;
}

export interface PaperTrade {
  id: string;
  order_id: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  exit_price?: number;
  realized_pnl: number;
  realized_pnl_pct: number;
  fees: number;
  opened_at: string;
  closed_at?: string;
  exit_reason?: string;
}

export interface BacktestTradeItem {
  trade_id: string;
  symbol: string;
  entry_time: string;
  exit_time: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  pnl: number;
  pnl_pct: number;
  exit_reason: string;
  fees: number;
  duration_mins: number;
}

export interface BacktestResult {
  run_id: string;
  strategy_id: string;
  strategy_name: string;
  symbol: string;
  symbols: string[];
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_equity: number;
  net_profit: number;
  total_return_pct: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  profit_factor: number;
  max_drawdown_pct: number;
  avg_win: number;
  avg_loss: number;
  expectancy: number;
  avg_holding_period_mins: number;
  parameters: Record<string, any>;
  equity_curve: Array<{ time: string; equity: number; drawdown_pct: number }>;
  trades: BacktestTradeItem[];
  diagnostics?: {
    in_sample_coverage_pct: number;
    overfitting_risk_rating: string;
    disclaimer: string;
  };
}

export interface MarketStatus {
  market: string;
  is_open: boolean;
  session_status: string;
  current_time_ist: string;
  data_provider: string;
  freshness: string;
  warning?: string;
}

export interface RiskConfig {
  risk_per_trade_pct: number;
  max_position_allocation_pct: number;
  max_entries_per_day: number;
  daily_loss_threshold_pct: number;
  target_rr: number;
  slippage_bps: number;
  fees_bps: number;
  kill_switch: boolean;
}

export interface DataSourceStatus {
  provider_name: string;
  status: 'ACTIVE' | 'IDLE' | 'ERROR' | 'DISABLED';
  type: string;
  is_live_allowed: boolean;
  description: string;
  last_ping_ms?: number | null;
  details: Record<string, any>;
}
