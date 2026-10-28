from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class CandleSchema(BaseModel):
    time: int  # Unix timestamp in seconds for lightweight-charts
    datetime_iso: str
    open: float
    high: float
    low: float
    close: float
    volume: float

class CandleListResponse(BaseModel):
    symbol: str
    timeframe: str
    source: str
    freshness: str
    candles: List[CandleSchema]

class WatchlistItemSchema(BaseModel):
    symbol: str
    name: str
    sector: Optional[str] = None
    last_price: float = 0.0
    change: float = 0.0
    change_pct: float = 0.0
    trend: str = "NEUTRAL"
    signal_status: str = "WAIT"
    updated_at: str

class WatchlistAddRequest(BaseModel):
    symbol: str
    name: Optional[str] = None
    sector: Optional[str] = None

class SignalDetailSchema(BaseModel):
    signal_id: str
    symbol: str
    strategy_id: str
    direction: str  # BUY, SELL, EXIT, WAIT
    action: str
    signal_timestamp: str
    data_timestamp: str
    data_source: str
    data_freshness: str
    reference_price: float
    proposed_entry: float
    stop_loss: float
    target_price: float
    risk_reward_ratio: float
    suggested_quantity: int
    estimated_max_loss: float
    indicator_values: Dict[str, Any]
    passed_conditions: List[str]
    failed_conditions: List[str]
    explanation: str
    execution_eligibility: bool
    signal_status: str

class PaperAccountSchema(BaseModel):
    id: str
    currency: str
    initial_capital: float
    cash_balance: float
    equity: float
    realized_pnl: float
    unrealized_pnl: float
    peak_equity: float
    max_drawdown_pct: float
    daily_entries_count: int
    is_kill_switch_active: bool
    win_rate_pct: float
    total_trades: int
    open_positions_count: int

class PaperOrderRequest(BaseModel):
    symbol: str
    side: str = "BUY"  # BUY or SELL
    order_type: str = "MARKET"
    quantity: int
    requested_price: Optional[float] = None
    stop_loss: Optional[float] = None
    target_price: Optional[float] = None
    signal_id: Optional[str] = None

class PaperOrderSchema(BaseModel):
    id: str
    symbol: str
    side: str
    order_type: str
    quantity: int
    requested_price: float
    executed_price: Optional[float] = None
    stop_loss: Optional[float] = None
    target_price: Optional[float] = None
    status: str
    fees: float
    rejection_reason: Optional[str] = None
    signal_id: Optional[str] = None
    created_at: str
    executed_at: Optional[str] = None

class PaperPositionSchema(BaseModel):
    id: int
    symbol: str
    quantity: int
    average_entry_price: float
    current_price: float
    stop_loss: float
    target_price: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    opened_at: str
    strategy_id: str
    signal_id: Optional[str] = None

class PaperTradeSchema(BaseModel):
    id: str
    order_id: str
    symbol: str
    side: str
    quantity: int
    entry_price: float
    exit_price: Optional[float] = None
    realized_pnl: float
    realized_pnl_pct: float
    fees: float
    opened_at: str
    closed_at: Optional[str] = None
    exit_reason: Optional[str] = None

class RiskConfigSchema(BaseModel):
    risk_per_trade_pct: float = Field(0.5, ge=0.1, le=5.0)
    max_position_allocation_pct: float = Field(20.0, ge=1.0, le=100.0)
    max_entries_per_day: int = Field(3, ge=1, le=20)
    daily_loss_threshold_pct: float = Field(1.5, ge=0.5, le=10.0)
    target_rr: float = Field(2.0, ge=1.0, le=10.0)
    slippage_bps: float = Field(5.0, ge=0.0, le=50.0)
    fees_bps: float = Field(3.0, ge=0.0, le=50.0)
    kill_switch: bool = False

class BacktestRequest(BaseModel):
    strategy_id: str = "orb_vwap_ema"
    symbols: List[str] = ["RELIANCE.NS", "HDFCBANK.NS", "INFY.NS", "TCS.NS", "ICICIBANK.NS"]
    start_date: str = "2024-01-01"
    end_date: str = "2024-03-31"
    initial_capital: float = 100000.0
    parameters: Optional[Dict[str, Any]] = None

class BacktestResultSchema(BaseModel):
    run_id: str
    strategy_id: str
    symbols: List[str]
    start_date: str
    end_date: str
    initial_capital: float
    final_equity: float
    net_profit: float
    total_return_pct: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate_pct: float
    profit_factor: float
    max_drawdown_pct: float
    avg_win: float
    avg_loss: float
    expectancy: float
    avg_holding_period_mins: float
    parameters: Dict[str, Any]
    equity_curve: List[Dict[str, Any]]
    trades: List[Dict[str, Any]]

class StrategyConfigSchema(BaseModel):
    id: str
    name: str
    description: str
    is_active: bool
    parameters: Dict[str, Any]

class MarketStatusSchema(BaseModel):
    market: str
    is_open: bool
    session_status: str  # PRE_OPEN, REGULAR_OPEN, CLOSED, POST_CLOSE, REPLAY
    current_time_ist: str
    data_provider: str
    freshness: str
    warning: Optional[str] = None

class DataSourceStatusSchema(BaseModel):
    provider_name: str
    status: str  # ACTIVE, IDLE, ERROR, DISABLED
    type: str
    is_live_allowed: bool
    description: str
    last_ping_ms: Optional[float] = None
    details: Dict[str, Any]
