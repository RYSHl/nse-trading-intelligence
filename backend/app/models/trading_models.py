import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(32), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    sector = Column(String(64), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class HistoricalCandle(Base):
    __tablename__ = "historical_candles"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(32), index=True, nullable=False)
    timeframe = Column(String(16), default="5m", index=True)
    timestamp = Column(DateTime, index=True, nullable=False)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)
    source = Column(String(32), default="yahoo")

class StrategyModel(Base):
    __tablename__ = "strategies"
    
    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    parameters = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class SignalModel(Base):
    __tablename__ = "signals"
    
    id = Column(String(64), primary_key=True)
    symbol = Column(String(32), index=True, nullable=False)
    strategy_id = Column(String(64), nullable=False)
    direction = Column(String(16), default="BUY")  # BUY, SELL, EXIT, WAIT
    action = Column(String(16), default="ENTER_LONG")
    signal_timestamp = Column(DateTime, index=True, nullable=False)
    data_timestamp = Column(DateTime, nullable=False)
    data_source = Column(String(32), default="yahoo")
    data_freshness = Column(String(32), default="HISTORICAL")  # HISTORICAL, DELAYED, REPLAY, PAPER
    reference_price = Column(Float, nullable=False)
    proposed_entry = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=False)
    target_price = Column(Float, nullable=False)
    risk_reward_ratio = Column(Float, default=2.0)
    suggested_quantity = Column(Integer, default=0)
    estimated_max_loss = Column(Float, default=0.0)
    indicator_values = Column(JSON, nullable=True)
    passed_conditions = Column(JSON, nullable=True)
    failed_conditions = Column(JSON, nullable=True)
    explanation = Column(Text, nullable=False)
    execution_eligibility = Column(Boolean, default=False)
    signal_status = Column(String(32), default="CANDIDATE")  # CANDIDATE, CONFIRMED, REJECTED, EXPIRED, PAPER_ORDER_CREATED, CLOSED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class PaperAccount(Base):
    __tablename__ = "paper_accounts"
    
    id = Column(String(32), primary_key=True, default="default")
    currency = Column(String(8), default="INR")
    initial_capital = Column(Float, default=100000.0)
    cash_balance = Column(Float, default=100000.0)
    equity = Column(Float, default=100000.0)
    realized_pnl = Column(Float, default=0.0)
    unrealized_pnl = Column(Float, default=0.0)
    peak_equity = Column(Float, default=100000.0)
    max_drawdown_pct = Column(Float, default=0.0)
    daily_entries_count = Column(Integer, default=0)
    last_trading_day = Column(String(16), default="")
    is_kill_switch_active = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class PaperPosition(Base):
    __tablename__ = "paper_positions"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String(32), default="default")
    symbol = Column(String(32), index=True, nullable=False)
    quantity = Column(Integer, nullable=False)
    average_entry_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=False)
    target_price = Column(Float, nullable=False)
    unrealized_pnl = Column(Float, default=0.0)
    unrealized_pnl_pct = Column(Float, default=0.0)
    entry_fees = Column(Float, default=0.0)
    opened_at = Column(DateTime, default=datetime.datetime.utcnow)
    strategy_id = Column(String(64), default="orb_vwap_ema")
    signal_id = Column(String(64), nullable=True)

class PaperOrder(Base):
    __tablename__ = "paper_orders"
    
    id = Column(String(64), primary_key=True)
    account_id = Column(String(32), default="default")
    symbol = Column(String(32), index=True, nullable=False)
    side = Column(String(8), nullable=False)  # BUY, SELL
    order_type = Column(String(16), default="MARKET")  # MARKET, LIMIT
    quantity = Column(Integer, nullable=False)
    requested_price = Column(Float, nullable=False)
    executed_price = Column(Float, nullable=True)
    stop_loss = Column(Float, nullable=True)
    target_price = Column(Float, nullable=True)
    status = Column(String(24), default="PENDING")  # PENDING, FILLED, REJECTED, CANCELLED
    slippage_bps = Column(Float, default=5.0)
    fees = Column(Float, default=0.0)
    rejection_reason = Column(String(256), nullable=True)
    signal_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    executed_at = Column(DateTime, nullable=True)

class PaperTrade(Base):
    __tablename__ = "paper_trades"
    
    id = Column(String(64), primary_key=True)
    account_id = Column(String(32), default="default")
    order_id = Column(String(64), nullable=False)
    symbol = Column(String(32), index=True, nullable=False)
    side = Column(String(8), nullable=False)
    quantity = Column(Integer, nullable=False)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=True)
    realized_pnl = Column(Float, default=0.0)
    realized_pnl_pct = Column(Float, default=0.0)
    fees = Column(Float, default=0.0)
    opened_at = Column(DateTime, nullable=False)
    closed_at = Column(DateTime, nullable=True)
    exit_reason = Column(String(64), nullable=True)  # TARGET, STOP_LOSS, VWAP_CROSS, SQUARE_OFF, MANUAL
    strategy_id = Column(String(64), default="orb_vwap_ema")

class BacktestRun(Base):
    __tablename__ = "backtest_runs"
    
    id = Column(String(64), primary_key=True)
    strategy_id = Column(String(64), nullable=False)
    symbols = Column(JSON, nullable=False)
    start_date = Column(String(32), nullable=False)
    end_date = Column(String(32), nullable=False)
    initial_capital = Column(Float, default=100000.0)
    final_equity = Column(Float, nullable=False)
    net_profit = Column(Float, nullable=False)
    total_return_pct = Column(Float, nullable=False)
    total_trades = Column(Integer, nullable=False)
    winning_trades = Column(Integer, nullable=False)
    losing_trades = Column(Integer, nullable=False)
    win_rate_pct = Column(Float, nullable=False)
    profit_factor = Column(Float, nullable=False)
    max_drawdown_pct = Column(Float, nullable=False)
    avg_win = Column(Float, default=0.0)
    avg_loss = Column(Float, default=0.0)
    expectancy = Column(Float, default=0.0)
    avg_holding_period_mins = Column(Float, default=0.0)
    parameters = Column(JSON, nullable=False)
    equity_curve = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class BacktestTrade(Base):
    __tablename__ = "backtest_trades"
    
    id = Column(String(64), primary_key=True)
    backtest_id = Column(String(64), ForeignKey("backtest_runs.id"), nullable=False)
    symbol = Column(String(32), index=True, nullable=False)
    entry_time = Column(DateTime, nullable=False)
    exit_time = Column(DateTime, nullable=False)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    stop_loss = Column(Float, nullable=False)
    target_price = Column(Float, nullable=False)
    pnl = Column(Float, nullable=False)
    pnl_pct = Column(Float, nullable=False)
    exit_reason = Column(String(64), nullable=False)
    fees = Column(Float, default=0.0)
    slippage = Column(Float, default=0.0)

class RiskConfigModel(Base):
    __tablename__ = "risk_configs"
    
    id = Column(Integer, primary_key=True)
    risk_per_trade_pct = Column(Float, default=0.5)
    max_position_allocation_pct = Column(Float, default=20.0)
    max_entries_per_day = Column(Integer, default=3)
    daily_loss_threshold_pct = Column(Float, default=1.5)
    target_rr = Column(Float, default=2.0)
    slippage_bps = Column(Float, default=5.0)
    fees_bps = Column(Float, default=3.0)
    kill_switch = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
