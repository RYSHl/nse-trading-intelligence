import {
  Candle,
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

export const mockMarketStatus: MarketStatus = {
  market: 'NSE',
  is_open: true,
  session_status: 'SIMULATED_REPLAY',
  freshness: 'HISTORICAL',
  current_time_ist: '10:30:00 IST',
  data_provider: 'Yahoo Historical Replay',
  warning: 'Running in simulated research mode. Real orders disabled.'
};

export const mockWatchlist: WatchlistItem[] = [
  {
    symbol: 'RELIANCE.NS',
    name: 'Reliance Industries Ltd',
    sector: 'Energy & Petrochemicals',
    last_price: 2985.40,
    change: 32.15,
    change_pct: 1.09,
    trend: 'BULLISH',
    signal_status: 'BUY',
    updated_at: new Date().toISOString()
  },
  {
    symbol: 'TCS.NS',
    name: 'Tata Consultancy Services Ltd',
    sector: 'Information Technology',
    last_price: 4120.50,
    change: -15.20,
    change_pct: -0.37,
    trend: 'NEUTRAL',
    signal_status: 'WAIT',
    updated_at: new Date().toISOString()
  },
  {
    symbol: 'INFY.NS',
    name: 'Infosys Ltd',
    sector: 'Information Technology',
    last_price: 1874.80,
    change: 22.40,
    change_pct: 1.21,
    trend: 'BULLISH',
    signal_status: 'BUY',
    updated_at: new Date().toISOString()
  },
  {
    symbol: 'HDFCBANK.NS',
    name: 'HDFC Bank Ltd',
    sector: 'Banking & Financial Services',
    last_price: 1682.30,
    change: 4.80,
    change_pct: 0.29,
    trend: 'NEUTRAL',
    signal_status: 'WAIT',
    updated_at: new Date().toISOString()
  },
  {
    symbol: 'ICICIBANK.NS',
    name: 'ICICI Bank Ltd',
    sector: 'Banking & Financial Services',
    last_price: 1255.60,
    change: 14.30,
    change_pct: 1.15,
    trend: 'BULLISH',
    signal_status: 'BUY',
    updated_at: new Date().toISOString()
  },
  {
    symbol: 'SBIN.NS',
    name: 'State Bank of India',
    sector: 'Banking & Financial Services',
    last_price: 812.45,
    change: -2.30,
    change_pct: -0.28,
    trend: 'NEUTRAL',
    signal_status: 'WAIT',
    updated_at: new Date().toISOString()
  },
  {
    symbol: 'BHARTIARTL.NS',
    name: 'Bharti Airtel Ltd',
    sector: 'Telecommunications',
    last_price: 1690.10,
    change: 18.90,
    change_pct: 1.13,
    trend: 'BULLISH',
    signal_status: 'BUY',
    updated_at: new Date().toISOString()
  },
  {
    symbol: 'ITC.NS',
    name: 'ITC Ltd',
    sector: 'FMCG & Consumer Goods',
    last_price: 492.60,
    change: 1.40,
    change_pct: 0.28,
    trend: 'NEUTRAL',
    signal_status: 'WAIT',
    updated_at: new Date().toISOString()
  },
  {
    symbol: 'LT.NS',
    name: 'Larsen & Toubro Ltd',
    sector: 'Capital Goods & Infrastructure',
    last_price: 3620.00,
    change: 45.50,
    change_pct: 1.27,
    trend: 'BULLISH',
    signal_status: 'BUY',
    updated_at: new Date().toISOString()
  },
  {
    symbol: 'TATAMOTORS.NS',
    name: 'Tata Motors Ltd',
    sector: 'Automotive',
    last_price: 945.30,
    change: -8.70,
    change_pct: -0.91,
    trend: 'BEARISH',
    signal_status: 'WAIT',
    updated_at: new Date().toISOString()
  }
];

export function generateMockCandles(symbol: string, count = 120): Candle[] {
  const candles: Candle[] = [];
  const basePrice = symbol.includes('RELIANCE') ? 2950 : symbol.includes('TCS') ? 4100 : 1800;
  let price = basePrice;
  const now = Math.floor(Date.now() / 1000);
  const fiveMin = 300;
  const start = now - count * fiveMin;

  for (let i = 0; i < count; i++) {
    const time = start + i * fiveMin;
    const delta = (Math.sin(i / 8) + (Math.random() - 0.48) * 1.5) * (basePrice * 0.003);
    const open = Number((price).toFixed(2));
    const close = Number((price + delta).toFixed(2));
    const high = Number((Math.max(open, close) + Math.random() * (basePrice * 0.002)).toFixed(2));
    const low = Number((Math.min(open, close) - Math.random() * (basePrice * 0.002)).toFixed(2));
    const volume = Math.floor(15000 + Math.random() * 25000);
    price = close;

    candles.push({
      time,
      datetime_iso: new Date(time * 1000).toISOString(),
      open,
      high,
      low,
      close,
      volume
    });
  }

  return candles;
}

export const mockScannerItems: ScannerItem[] = [
  {
    symbol: 'RELIANCE.NS',
    name: 'Reliance Industries Ltd',
    sector: 'Energy',
    price: 2985.40,
    change_pct: 1.09,
    direction: 'BUY',
    action: 'ENTER_LONG',
    qualified: true,
    orb_high: 2965.0,
    orb_low: 2938.0,
    vwap: 2952.10,
    ema20: 2968.40,
    ema50: 2945.20,
    rel_volume: 2.14,
    volume: 184500,
    passed_count: 6,
    failed_count: 0,
    explanation: 'RELIANCE.NS qualifies for a potential LONG entry. Price broke above ORB High (₹2965.00), confirmed above VWAP (₹2952.10), EMA20 > EMA50, and relative volume reached 2.14x.'
  },
  {
    symbol: 'INFY.NS',
    name: 'Infosys Ltd',
    sector: 'Information Technology',
    price: 1874.80,
    change_pct: 1.21,
    direction: 'BUY',
    action: 'ENTER_LONG',
    qualified: true,
    orb_high: 1860.0,
    orb_low: 1845.0,
    vwap: 1855.20,
    ema20: 1862.30,
    ema50: 1850.10,
    rel_volume: 1.85,
    volume: 98000,
    passed_count: 6,
    failed_count: 0,
    explanation: 'INFY.NS qualifies for a potential LONG entry. Price broke above ORB High (₹1860.00), confirmed above VWAP, EMA20 exceeds EMA50, and relative volume is 1.85x.'
  },
  {
    symbol: 'TCS.NS',
    name: 'Tata Consultancy Services Ltd',
    sector: 'Information Technology',
    price: 4120.50,
    change_pct: -0.37,
    direction: 'WAIT',
    action: 'WAIT_FOR_SETUP',
    qualified: false,
    orb_high: 4145.0,
    orb_low: 4100.0,
    vwap: 4132.0,
    ema20: 4122.0,
    ema50: 4135.0,
    rel_volume: 0.88,
    volume: 45000,
    passed_count: 2,
    failed_count: 4,
    explanation: 'TCS.NS setup is WAIT. Unmet conditions: Close did not exceed Opening Range High; Relative volume is below required 1.5x threshold; Fast EMA20 below Slow EMA50.'
  },
  {
    symbol: 'ICICIBANK.NS',
    name: 'ICICI Bank Ltd',
    sector: 'Banking',
    price: 1255.60,
    change_pct: 1.15,
    direction: 'BUY',
    action: 'ENTER_LONG',
    qualified: true,
    orb_high: 1248.0,
    orb_low: 1238.0,
    vwap: 1244.50,
    ema20: 1249.10,
    ema50: 1242.00,
    rel_volume: 1.72,
    volume: 112000,
    passed_count: 6,
    failed_count: 0,
    explanation: 'ICICIBANK.NS qualifies for a potential LONG entry on completed breakout above 09:15-09:30 ORB High with 1.72x relative volume confirmation.'
  }
];

export const mockSignals: TradeSignal[] = [
  {
    signal_id: 'SIG-RELIANCE-DEMO-001',
    symbol: 'RELIANCE.NS',
    strategy_id: 'orb_vwap_ema',
    direction: 'BUY',
    action: 'ENTER_LONG',
    signal_timestamp: new Date().toISOString(),
    data_timestamp: new Date().toISOString(),
    data_source: 'yahoo_replay',
    data_freshness: 'HISTORICAL',
    reference_price: 2985.40,
    proposed_entry: 2985.40,
    stop_loss: 2958.40,
    target_price: 3039.40,
    risk_reward_ratio: 2.0,
    suggested_quantity: 18,
    estimated_max_loss: 486.0,
    indicator_values: {
      close: 2985.40,
      orb_high: 2965.0,
      orb_low: 2938.0,
      vwap: 2952.10,
      ema20: 2968.40,
      ema50: 2945.20,
      atr14: 18.0,
      rel_volume: 2.14,
      volume: 184500
    },
    passed_conditions: [
      'Entry time 09:35 is within allowed window (09:30–14:30 IST)',
      'Candle close (₹2985.40) closed above Opening Range High (₹2965.00)',
      'Candle close (₹2985.40) is above Session VWAP (₹2952.10)',
      'Fast EMA20 (₹2968.40) is above Slow EMA50 (₹2945.20)',
      'Relative volume 2.14x meets/exceeds 1.5x threshold',
      'Valid ATR14 volatility metric (₹18.00)'
    ],
    failed_conditions: [],
    explanation: 'RELIANCE.NS qualifies for a potential LONG entry on completed 5-minute candle at 09:35 IST. Price broke above ORB High with 2.14x volume confirmation.',
    execution_eligibility: true,
    signal_status: 'CONFIRMED',
    risk_details: {
      equity: 100000.0,
      risk_budget: 500.0,
      risk_per_share: 27.0,
      max_capital_allocation: 20000.0,
      quantity_by_risk: 18,
      quantity_by_capital: 6,
      binding_constraint: 'CAPITAL_ALLOCATION',
      estimated_max_loss: 486.0,
      capital_required: 17912.40
    }
  },
  {
    signal_id: 'SIG-INFY-DEMO-002',
    symbol: 'INFY.NS',
    strategy_id: 'orb_vwap_ema',
    direction: 'BUY',
    action: 'ENTER_LONG',
    signal_timestamp: new Date().toISOString(),
    data_timestamp: new Date().toISOString(),
    data_source: 'yahoo_replay',
    data_freshness: 'HISTORICAL',
    reference_price: 1874.80,
    proposed_entry: 1874.80,
    stop_loss: 1858.30,
    target_price: 1907.80,
    risk_reward_ratio: 2.0,
    suggested_quantity: 10,
    estimated_max_loss: 165.0,
    indicator_values: {
      close: 1874.80,
      orb_high: 1860.0,
      orb_low: 1845.0,
      vwap: 1855.20,
      ema20: 1862.30,
      ema50: 1850.10,
      atr14: 11.0,
      rel_volume: 1.85,
      volume: 98000
    },
    passed_conditions: [
      'Entry time 09:40 is within allowed window (09:30–14:30 IST)',
      'Candle close (₹1874.80) closed above Opening Range High (₹1860.00)',
      'Candle close is above Session VWAP (₹1855.20)',
      'Fast EMA20 is above Slow EMA50',
      'Relative volume 1.85x meets/exceeds 1.5x threshold',
      'Valid ATR14 metric (₹11.00)'
    ],
    failed_conditions: [],
    explanation: 'INFY.NS qualifies for a potential LONG entry on completed breakout above ORB High with 1.85x volume.',
    execution_eligibility: true,
    signal_status: 'CONFIRMED'
  }
];

export const mockPaperAccount: PaperAccount = {
  id: 'default',
  currency: 'INR',
  initial_capital: 100000.0,
  cash_balance: 82087.60,
  equity: 101245.80,
  realized_pnl: 785.40,
  unrealized_pnl: 460.40,
  peak_equity: 101500.0,
  max_drawdown_pct: 0.25,
  daily_entries_count: 1,
  is_kill_switch_active: false,
  win_rate_pct: 75.0,
  total_trades: 4,
  open_positions_count: 1
};

export const mockPaperPositions: PaperPosition[] = [
  {
    id: 1,
    symbol: 'RELIANCE.NS',
    quantity: 6,
    average_entry_price: 2985.40,
    current_price: 3062.15,
    stop_loss: 2958.40,
    target_price: 3039.40,
    unrealized_pnl: 460.50,
    unrealized_pnl_pct: 2.57,
    opened_at: new Date().toISOString(),
    strategy_id: 'orb_vwap_ema'
  }
];

export const mockPaperOrders: PaperOrder[] = [
  {
    id: 'ORD-DEMO-001',
    symbol: 'RELIANCE.NS',
    side: 'BUY',
    order_type: 'MARKET',
    quantity: 6,
    requested_price: 2985.40,
    executed_price: 2985.40,
    stop_loss: 2958.40,
    target_price: 3039.40,
    status: 'FILLED',
    fees: 5.37,
    created_at: new Date().toISOString()
  }
];

export const mockPaperTrades: PaperTrade[] = [
  {
    id: 'TRD-DEMO-001',
    order_id: 'ORD-DEMO-001',
    symbol: 'INFY.NS',
    side: 'BUY',
    quantity: 10,
    entry_price: 1850.0,
    exit_price: 1928.54,
    realized_pnl: 785.40,
    realized_pnl_pct: 4.25,
    fees: 11.34,
    opened_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    closed_at: new Date(Date.now() - 3600000).toISOString(),
    exit_reason: 'TARGET_2R'
  }
];

export const mockBacktestResult: BacktestResult = {
  run_id: 'BT-RUN-NSE-DEMO',
  strategy_id: 'orb_vwap_ema',
  strategy_name: 'ORB + VWAP + EMA + Volume Confirmation',
  symbol: 'RELIANCE.NS',
  symbols: ['RELIANCE.NS'],
  start_date: '2026-10-01',
  end_date: '2026-10-28',
  initial_capital: 100000.0,
  final_equity: 114280.50,
  net_profit: 14280.50,
  total_return_pct: 14.28,
  total_trades: 28,
  winning_trades: 18,
  losing_trades: 10,
  win_rate_pct: 64.29,
  profit_factor: 2.18,
  max_drawdown_pct: 3.42,
  avg_win: 1250.40,
  avg_loss: 610.20,
  expectancy: 588.60,
  avg_holding_period_mins: 42.5,
  parameters: {
    ema_fast: 20,
    ema_slow: 50,
    volume_multiplier: 1.5,
    target_rr: 2.0,
    atr_stop_multiplier: 1.5,
    slippage_bps: 5.0,
    fees_bps: 3.0
  },
  equity_curve: [
    { time: '10:00', equity: 100000.0, drawdown_pct: 0.0 },
    { time: '10:30', equity: 101850.0, drawdown_pct: 0.0 },
    { time: '11:00', equity: 103200.0, drawdown_pct: 0.0 },
    { time: '11:30', equity: 102400.0, drawdown_pct: 0.77 },
    { time: '12:00', equity: 105600.0, drawdown_pct: 0.0 },
    { time: '12:30', equity: 107100.0, drawdown_pct: 0.0 },
    { time: '13:00', equity: 106200.0, drawdown_pct: 0.84 },
    { time: '13:30', equity: 109800.0, drawdown_pct: 0.0 },
    { time: '14:00', equity: 112400.0, drawdown_pct: 0.0 },
    { time: '14:30', equity: 114280.50, drawdown_pct: 0.0 }
  ],
  trades: [
    {
      trade_id: 'TRD-BT-001',
      symbol: 'RELIANCE.NS',
      entry_time: '2026-10-27 09:35',
      exit_time: '2026-10-27 10:45',
      entry_price: 2965.20,
      exit_price: 3020.40,
      quantity: 6,
      pnl: 331.20,
      pnl_pct: 1.86,
      exit_reason: 'TARGET_2R',
      fees: 3.59,
      duration_mins: 70
    },
    {
      trade_id: 'TRD-BT-002',
      symbol: 'RELIANCE.NS',
      entry_time: '2026-10-26 09:40',
      exit_time: '2026-10-26 10:15',
      entry_price: 2940.00,
      exit_price: 2915.00,
      quantity: 6,
      pnl: -150.00,
      pnl_pct: -0.85,
      exit_reason: 'STOP_LOSS',
      fees: 3.51,
      duration_mins: 35
    }
  ],
  diagnostics: {
    in_sample_coverage_pct: 100.0,
    overfitting_risk_rating: 'LOW',
    disclaimer: 'Past backtested performance is strictly hypothetical. Does not guarantee live market results.'
  }
};

export const mockRiskConfig: RiskConfig = {
  risk_per_trade_pct: 0.5,
  max_position_allocation_pct: 20.0,
  max_entries_per_day: 3,
  daily_loss_threshold_pct: 1.5,
  target_rr: 2.0,
  slippage_bps: 5.0,
  fees_bps: 3.0,
  kill_switch: false
};

export const mockDataSources: DataSourceStatus[] = [
  {
    provider_name: 'Yahoo Finance Historical',
    type: 'HISTORICAL_DATA',
    status: 'ACTIVE',
    is_live_allowed: false,
    description: 'Provides 5-minute historical candles for backtesting and analysis',
    last_ping_ms: 120,
    details: { market: 'NSE', timeframe: '5m' }
  },
  {
    provider_name: 'Simulated Replay Engine',
    type: 'MARKET_SIMULATOR',
    status: 'ACTIVE',
    is_live_allowed: false,
    description: 'Local deterministic step-by-step market simulator',
    last_ping_ms: 1,
    details: { mode: 'paper' }
  },
  {
    provider_name: 'Zerodha Kite Connect',
    type: 'BROKER_API',
    status: 'DISABLED',
    is_live_allowed: false,
    description: 'Target live broker adapter. Kept strictly disabled for safety.',
    last_ping_ms: null,
    details: { status: 'prepared' }
  }
];
