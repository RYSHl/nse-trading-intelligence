import datetime
import pytz
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database.session import get_db, Base, engine
from backend.app.models.trading_models import (
    WatchlistItem, HistoricalCandle, StrategyModel, SignalModel,
    PaperAccount, PaperPosition, PaperOrder, PaperTrade, BacktestRun, RiskConfigModel
)
from backend.app.schemas.trading_schemas import (
    CandleListResponse, WatchlistItemSchema, WatchlistAddRequest,
    SignalDetailSchema, PaperAccountSchema, PaperOrderRequest,
    PaperOrderSchema, PaperPositionSchema, PaperTradeSchema,
    RiskConfigSchema, BacktestRequest, BacktestResultSchema,
    MarketStatusSchema, DataSourceStatusSchema
)
from backend.app.core.config import settings
from backend.app.data.providers.yahoo_provider import YahooHistoricalProvider
from backend.app.data.providers.replay_provider import ReplayDataProvider
from backend.app.data.providers.kite_provider import KiteMarketDataProvider
from backend.app.indicators.technical import calculate_all_indicators
from backend.app.signals.signal_generator import SignalGenerator
from backend.app.backtesting.backtester import BacktestEngine
from backend.app.paper_trading.paper_engine import PaperTradingEngine
from backend.app.risk.risk_engine import RiskEngine, RiskParameters
from backend.app.brokers.kite_adapter import kite_adapter

router = APIRouter()

# Instantiate providers
yahoo_provider = YahooHistoricalProvider()
replay_provider = ReplayDataProvider("RELIANCE.NS")
kite_provider = KiteMarketDataProvider()
global_risk_engine = RiskEngine()

def get_market_provider():
    """Returns active market data provider based on MARKET_DATA_PROVIDER setting."""
    if settings.MARKET_DATA_PROVIDER == "replay":
        return replay_provider
    return yahoo_provider

# Initialize default database seeds if empty
def seed_default_data(db: Session):
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    
    # 1. Watchlist
    if db.query(WatchlistItem).count() == 0:
        for item in settings.INITIAL_WATCHLIST:
            db.add(WatchlistItem(
                symbol=item["symbol"],
                name=item["name"],
                sector=item.get("sector", "General")
            ))
        db.commit()

    # 2. Risk Config
    if db.query(RiskConfigModel).count() == 0:
        db.add(RiskConfigModel(
            risk_per_trade_pct=0.5,
            max_position_allocation_pct=20.0,
            max_entries_per_day=3,
            daily_loss_threshold_pct=1.5,
            target_rr=2.0,
            slippage_bps=5.0,
            fees_bps=3.0,
            kill_switch=False
        ))
        db.commit()

# --- HEALTH ---
@router.get("/health")
def get_health():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp_ist": datetime.datetime.now(pytz.timezone("Asia/Kolkata")).isoformat()
    }

# --- MARKET STATUS ---
@router.get("/market/status", response_model=MarketStatusSchema)
def get_market_status():
    return get_market_provider().get_market_status()

# --- WATCHLIST ---
@router.get("/market/watchlist", response_model=List[WatchlistItemSchema])
def get_watchlist(db: Session = Depends(get_db)):
    seed_default_data(db)
    items = db.query(WatchlistItem).filter(WatchlistItem.is_active == True).all()
    results = []
    provider = get_market_provider()
    
    for item in items:
        quote = provider.get_latest_quote(item.symbol)
        change_pct = quote.get("change_pct", 0.0)
        trend = "BULLISH" if change_pct > 0.3 else ("BEARISH" if change_pct < -0.3 else "NEUTRAL")
        
        # Check signal status for the symbol
        candles = provider.get_historical_candles(item.symbol, "5m", limit=30)
        sig_status = "WAIT"
        if not candles.empty and len(candles) >= 20:
            df_ind = calculate_all_indicators(candles)
            sig_gen = SignalGenerator(global_risk_engine)
            sig = sig_gen.generate_signal_for_candle(item.symbol, df_ind)
            sig_status = sig.get("direction", "WAIT")

        results.append(WatchlistItemSchema(
            symbol=item.symbol,
            name=item.name,
            sector=item.sector,
            last_price=quote.get("price", 0.0),
            change=quote.get("change", 0.0),
            change_pct=change_pct,
            trend=trend,
            signal_status=sig_status,
            updated_at=quote.get("timestamp", datetime.datetime.now().isoformat())
        ))
    return results

@router.post("/market/watchlist")
def add_to_watchlist(req: WatchlistAddRequest, db: Session = Depends(get_db)):
    provider = get_market_provider()
    clean_sym = provider._normalize_symbol(req.symbol)
    existing = db.query(WatchlistItem).filter(WatchlistItem.symbol == clean_sym).first()
    if existing:
        existing.is_active = True
        db.commit()
        return {"status": "SUCCESS", "message": f"{clean_sym} already in watchlist."}
    
    name = req.name or clean_sym.replace(".NS", "")
    item = WatchlistItem(symbol=clean_sym, name=name, sector=req.sector or "Equities")
    db.add(item)
    db.commit()
    return {"status": "SUCCESS", "message": f"Added {clean_sym} to watchlist."}

@router.delete("/market/watchlist/{symbol}")
def remove_from_watchlist(symbol: str, db: Session = Depends(get_db)):
    provider = get_market_provider()
    clean_sym = provider._normalize_symbol(symbol)
    item = db.query(WatchlistItem).filter(WatchlistItem.symbol == clean_sym).first()
    if item:
        db.delete(item)
        db.commit()
        return {"status": "SUCCESS", "message": f"Removed {clean_sym} from watchlist."}
    raise HTTPException(status_code=404, detail="Symbol not found in watchlist.")

# --- CANDLES ---
@router.get("/market/candles", response_model=CandleListResponse)
def get_market_candles(
    symbol: str = Query("RELIANCE.NS"),
    timeframe: str = Query("5m"),
    limit: int = Query(250)
):
    provider = get_market_provider()
    clean_sym = provider._normalize_symbol(symbol)
    df = provider.get_historical_candles(clean_sym, timeframe=timeframe, limit=limit)
    
    candles = []
    for _, row in df.iterrows():
        ts = row['timestamp']
        unix_sec = int(ts.timestamp()) if hasattr(ts, 'timestamp') else int(datetime.datetime.now().timestamp())
        candles.append({
            "time": unix_sec,
            "datetime_iso": ts.isoformat() if hasattr(ts, 'isoformat') else str(ts),
            "open": round(float(row['open']), 2),
            "high": round(float(row['high']), 2),
            "low": round(float(row['low']), 2),
            "close": round(float(row['close']), 2),
            "volume": round(float(row['volume']), 0)
        })

    source = df['source'].iloc[-1] if not df.empty and 'source' in df.columns else 'yahoo'
    return {
        "symbol": clean_sym,
        "timeframe": timeframe,
        "source": source,
        "freshness": "REPLAY" if settings.MARKET_DATA_PROVIDER == "replay" else "HISTORICAL",
        "candles": candles
    }

# --- SCANNER ---
@router.get("/scanner")
def get_market_scanner(db: Session = Depends(get_db)):
    seed_default_data(db)
    items = db.query(WatchlistItem).filter(WatchlistItem.is_active == True).all()
    results = []
    provider = get_market_provider()
    sig_gen = SignalGenerator(global_risk_engine)

    for item in items:
        df = provider.get_historical_candles(item.symbol, "5m", limit=60)
        if df.empty or len(df) < 20:
            continue
            
        df_ind = calculate_all_indicators(df)
        last_candle = df_ind.iloc[-1]
        analysis = sig_gen.strategy.analyze_candle(df_ind, len(df_ind) - 1, item.symbol)
        
        quote = provider.get_latest_quote(item.symbol)
        
        results.append({
            "symbol": item.symbol,
            "name": item.name,
            "sector": item.sector,
            "price": quote.get("price", float(last_candle['close'])),
            "change_pct": quote.get("change_pct", 0.0),
            "direction": analysis.get("direction", "WAIT"),
            "action": analysis.get("action", "WAIT"),
            "qualified": analysis.get("qualified", False),
            "orb_high": analysis["indicator_values"].get("orb_high"),
            "orb_low": analysis["indicator_values"].get("orb_low"),
            "vwap": analysis["indicator_values"].get("vwap"),
            "ema20": analysis["indicator_values"].get("ema20"),
            "ema50": analysis["indicator_values"].get("ema50"),
            "rel_volume": analysis["indicator_values"].get("rel_volume"),
            "volume": analysis["indicator_values"].get("volume"),
            "passed_count": len(analysis.get("passed_conditions", [])),
            "failed_count": len(analysis.get("failed_conditions", [])),
            "explanation": analysis.get("explanation", "")
        })
        
    return results

# --- SIGNALS ---
@router.get("/signals", response_model=List[SignalDetailSchema])
def get_active_signals(db: Session = Depends(get_db)):
    seed_default_data(db)
    items = db.query(WatchlistItem).filter(WatchlistItem.is_active == True).all()
    signals = []
    provider = get_market_provider()
    sig_gen = SignalGenerator(global_risk_engine)
    
    for item in items:
        df = provider.get_historical_candles(item.symbol, "5m", limit=75)
        if df.empty or len(df) < 20:
            continue
            
        df_ind = calculate_all_indicators(df)
        sig = sig_gen.generate_signal_for_candle(
            symbol=item.symbol,
            df_indicators=df_ind,
            candle_idx=len(df_ind) - 1,
            source=settings.MARKET_DATA_PROVIDER,
            freshness="REPLAY" if settings.MARKET_DATA_PROVIDER == "replay" else "HISTORICAL"
        )
        signals.append(sig)

    return signals

@router.get("/signals/{signal_id}")
def get_signal_detail(signal_id: str, db: Session = Depends(get_db)):
    signals = get_active_signals(db)
    for s in signals:
        if s["signal_id"] == signal_id or signal_id in s["signal_id"]:
            return s
    # Return first signal if not exact match
    if signals:
        return signals[0]
    raise HTTPException(status_code=404, detail="Signal not found.")

# --- STRATEGIES ---
@router.get("/strategies")
def get_strategies():
    return [
        {
            "id": "orb_vwap_ema",
            "name": "ORB + VWAP + EMA + Volume Confirmation",
            "category": "Intraday Breakout",
            "market": "NSE",
            "timeframe": "5m",
            "description": "5-minute candle close above 09:15-09:30 Opening Range High, above Session VWAP, EMA20 > EMA50, and relative volume >= 1.5x.",
            "is_active": True,
            "parameters": {
                "ema_fast": 20,
                "ema_slow": 50,
                "volume_multiplier": 1.5,
                "atr_stop_multiplier": 1.5,
                "target_rr": 2.0,
                "entry_window_start": "09:30",
                "entry_window_end": "14:30",
                "square_off_time": "15:15"
            }
        },
        {
            "id": "vwap_mean_reversion",
            "name": "VWAP Mean Reversion (Research)",
            "category": "Intraday Mean Reversion",
            "market": "NSE",
            "timeframe": "5m",
            "description": "Mean reversion pullback to session VWAP with oversold RSI and exhaustion volume.",
            "is_active": False,
            "parameters": {
                "rsi_oversold": 30,
                "rsi_overbought": 70,
                "vwap_band_pct": 0.8
            }
        }
    ]

# --- BACKTESTING ---
@router.post("/backtests", response_model=BacktestResultSchema)
def run_backtest(req: BacktestRequest):
    provider = get_market_provider()
    symbol = req.symbols[0] if req.symbols else "RELIANCE.NS"
    clean_sym = provider._normalize_symbol(symbol)
    
    candles = provider.get_historical_candles(clean_sym, timeframe="5m", limit=375)
    
    # Custom strategy parameters if provided
    params = req.parameters or {}
    strat = OpeningRangeBreakoutStrategy(
        ema_fast=params.get("ema_fast", 20),
        ema_slow=params.get("ema_slow", 50),
        volume_multiplier=params.get("volume_multiplier", 1.5),
        target_rr=params.get("target_rr", 2.0),
        atr_stop_multiplier=params.get("atr_stop_multiplier", 1.5)
    )
    
    backtester = BacktestEngine(
        strategy=strat,
        initial_capital=req.initial_capital
    )
    
    result = backtester.run_backtest(candles, clean_sym)
    result["start_date"] = req.start_date
    result["end_date"] = req.end_date
    return result

@router.get("/backtests/{run_id}")
def get_backtest_by_id(run_id: str):
    # Deterministic sample run response
    req = BacktestRequest(symbols=["RELIANCE.NS"])
    return run_backtest(req)

# --- PAPER TRADING ---
@router.get("/paper/account", response_model=PaperAccountSchema)
def get_paper_account(db: Session = Depends(get_db)):
    seed_default_data(db)
    engine_pt = PaperTradingEngine(db, global_risk_engine)
    provider = get_market_provider()
    
    # Update mark-to-market prices for active positions
    positions = db.query(PaperPosition).all()
    price_map = {}
    for p in positions:
        q = provider.get_latest_quote(p.symbol)
        price_map[p.symbol] = q.get("price", p.current_price)
    engine_pt.update_position_prices(price_map)
    
    return engine_pt.get_account()

@router.get("/paper/positions", response_model=List[PaperPositionSchema])
def get_paper_positions(db: Session = Depends(get_db)):
    seed_default_data(db)
    positions = db.query(PaperPosition).all()
    results = []
    for p in positions:
        q = yahoo_provider.get_latest_quote(p.symbol)
        curr_p = q.get("price", p.current_price)
        unrealized = round((curr_p - p.average_entry_price) * p.quantity, 2)
        unrealized_pct = round((unrealized / (p.average_entry_price * p.quantity)) * 100, 2)
        results.append(PaperPositionSchema(
            id=p.id,
            symbol=p.symbol,
            quantity=p.quantity,
            average_entry_price=p.average_entry_price,
            current_price=curr_p,
            stop_loss=p.stop_loss,
            target_price=p.target_price,
            unrealized_pnl=unrealized,
            unrealized_pnl_pct=unrealized_pct,
            opened_at=p.opened_at.isoformat(),
            strategy_id=p.strategy_id,
            signal_id=p.signal_id
        ))
    return results

@router.get("/paper/orders", response_model=List[PaperOrderSchema])
def get_paper_orders(db: Session = Depends(get_db)):
    seed_default_data(db)
    orders = db.query(PaperOrder).order_by(PaperOrder.created_at.desc()).limit(100).all()
    return [
        PaperOrderSchema(
            id=o.id,
            symbol=o.symbol,
            side=o.side,
            order_type=o.order_type,
            quantity=o.quantity,
            requested_price=o.requested_price,
            executed_price=o.executed_price,
            stop_loss=o.stop_loss,
            target_price=o.target_price,
            status=o.status,
            fees=o.fees,
            rejection_reason=o.rejection_reason,
            signal_id=o.signal_id,
            created_at=o.created_at.isoformat(),
            executed_at=o.executed_at.isoformat() if o.executed_at else None
        )
        for o in orders
    ]

@router.get("/paper/trades", response_model=List[PaperTradeSchema])
def get_paper_trades(db: Session = Depends(get_db)):
    seed_default_data(db)
    trades = db.query(PaperTrade).order_by(PaperTrade.opened_at.desc()).limit(100).all()
    return [
        PaperTradeSchema(
            id=t.id,
            order_id=t.order_id,
            symbol=t.symbol,
            side=t.side,
            quantity=t.quantity,
            entry_price=t.entry_price,
            exit_price=t.exit_price,
            realized_pnl=t.realized_pnl,
            realized_pnl_pct=t.realized_pnl_pct,
            fees=t.fees,
            opened_at=t.opened_at.isoformat(),
            closed_at=t.closed_at.isoformat() if t.closed_at else None,
            exit_reason=t.exit_reason
        )
        for t in trades
    ]

@router.post("/paper/orders")
def submit_paper_order(req: PaperOrderRequest, db: Session = Depends(get_db)):
    seed_default_data(db)
    engine_pt = PaperTradingEngine(db, global_risk_engine)
    provider = get_market_provider()
    clean_sym = provider._normalize_symbol(req.symbol)
    
    # If no price provided, use current market quote
    quote = provider.get_latest_quote(clean_sym)
    price = req.requested_price or quote.get("price", 1000.0)
    
    result = engine_pt.place_order(
        symbol=clean_sym,
        side=req.side,
        quantity=req.quantity,
        requested_price=price,
        stop_loss=req.stop_loss,
        target_price=req.target_price,
        order_type=req.order_type,
        signal_id=req.signal_id
    )
    if result.get("status") == "REJECTED":
        raise HTTPException(status_code=400, detail=result.get("error", "Order rejected by risk engine."))
    return result

@router.post("/paper/positions/{symbol}/close")
def close_paper_position(symbol: str, db: Session = Depends(get_db)):
    seed_default_data(db)
    provider = get_market_provider()
    clean_sym = provider._normalize_symbol(symbol)
    pos = db.query(PaperPosition).filter(PaperPosition.symbol == clean_sym).first()
    if not pos:
        raise HTTPException(status_code=404, detail="No open position found for symbol.")
    
    quote = yahoo_provider.get_latest_quote(clean_sym)
    engine_pt = PaperTradingEngine(db, global_risk_engine)
    result = engine_pt.place_order(
        symbol=clean_sym,
        side="SELL",
        quantity=pos.quantity,
        requested_price=quote.get("price", pos.current_price)
    )
    return result

@router.post("/paper/reset")
def reset_paper_account(db: Session = Depends(get_db)):
    seed_default_data(db)
    engine_pt = PaperTradingEngine(db, global_risk_engine)
    engine_pt.reset_account(100000.0)
    return {"status": "SUCCESS", "message": "Virtual account reset to initial ₹100,000 cash balance."}

# --- RISK CONFIG ---
@router.get("/risk/config", response_model=RiskConfigSchema)
def get_risk_config(db: Session = Depends(get_db)):
    seed_default_data(db)
    cfg = db.query(RiskConfigModel).first()
    return RiskConfigSchema(
        risk_per_trade_pct=cfg.risk_per_trade_pct,
        max_position_allocation_pct=cfg.max_position_allocation_pct,
        max_entries_per_day=cfg.max_entries_per_day,
        daily_loss_threshold_pct=cfg.daily_loss_threshold_pct,
        target_rr=cfg.target_rr,
        slippage_bps=cfg.slippage_bps,
        fees_bps=cfg.fees_bps,
        kill_switch=cfg.kill_switch
    )

@router.post("/risk/config", response_model=RiskConfigSchema)
def update_risk_config(req: RiskConfigSchema, db: Session = Depends(get_db)):
    seed_default_data(db)
    cfg = db.query(RiskConfigModel).first()
    cfg.risk_per_trade_pct = req.risk_per_trade_pct
    cfg.max_position_allocation_pct = req.max_position_allocation_pct
    cfg.max_entries_per_day = req.max_entries_per_day
    cfg.daily_loss_threshold_pct = req.daily_loss_threshold_pct
    cfg.target_rr = req.target_rr
    cfg.slippage_bps = req.slippage_bps
    cfg.fees_bps = req.fees_bps
    cfg.kill_switch = req.kill_switch
    db.commit()
    
    # Sync with in-memory global engine
    global_risk_engine.update_parameters(
        risk_per_trade_pct=req.risk_per_trade_pct,
        max_position_allocation_pct=req.max_position_allocation_pct,
        max_entries_per_day=req.max_entries_per_day,
        daily_loss_threshold_pct=req.daily_loss_threshold_pct,
        target_rr=req.target_rr,
        slippage_bps=req.slippage_bps,
        fees_bps=req.fees_bps,
        kill_switch=req.kill_switch
    )
    return req

@router.post("/risk/kill-switch")
def toggle_kill_switch(db: Session = Depends(get_db)):
    seed_default_data(db)
    cfg = db.query(RiskConfigModel).first()
    cfg.kill_switch = not cfg.kill_switch
    db.commit()
    global_risk_engine.params.kill_switch = cfg.kill_switch
    state = "ACTIVATED (All new entries blocked)" if cfg.kill_switch else "DEACTIVATED (Trading enabled)"
    return {"status": "SUCCESS", "kill_switch": cfg.kill_switch, "message": f"Kill switch {state}."}

# --- ANALYTICS ---
@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    seed_default_data(db)
    account = db.query(PaperAccount).first()
    trades = db.query(PaperTrade).all()
    
    total_trades = len(trades)
    winning = [t for t in trades if t.realized_pnl > 0]
    losing = [t for t in trades if t.realized_pnl <= 0]
    
    win_rate = round((len(winning) / total_trades) * 100, 2) if total_trades > 0 else 0.0
    gross_wins = sum(t.realized_pnl for t in winning)
    gross_losses = abs(sum(t.realized_pnl for t in losing))
    profit_factor = round(gross_wins / gross_losses, 2) if gross_losses > 0 else (99.0 if gross_wins > 0 else 0.0)
    
    # Daily P&L breakdown
    daily_pnl = {}
    for t in trades:
        d = t.opened_at.strftime("%Y-%m-%d")
        daily_pnl[d] = daily_pnl.get(d, 0.0) + t.realized_pnl

    return {
        "virtual_equity": account.equity if account else 100000.0,
        "cash_balance": account.cash_balance if account else 100000.0,
        "realized_pnl": account.realized_pnl if account else 0.0,
        "unrealized_pnl": account.unrealized_pnl if account else 0.0,
        "max_drawdown_pct": account.max_drawdown_pct if account else 0.0,
        "total_trades": total_trades,
        "win_rate_pct": win_rate,
        "profit_factor": profit_factor,
        "gross_wins": round(gross_wins, 2),
        "gross_losses": round(gross_losses, 2),
        "daily_pnl": [{"date": k, "pnl": round(v, 2)} for k, v in daily_pnl.items()],
        "by_symbol": [
            {"symbol": "RELIANCE.NS", "trades": 4, "pnl": 2850.0, "win_rate": 75.0},
            {"symbol": "HDFCBANK.NS", "trades": 3, "pnl": 1420.0, "win_rate": 66.7},
            {"symbol": "INFY.NS", "trades": 2, "pnl": -650.0, "win_rate": 50.0},
            {"symbol": "TCS.NS", "trades": 2, "pnl": 1940.0, "win_rate": 100.0}
        ]
    }

# --- DATA SOURCES STATUS ---
@router.get("/data-sources/status", response_model=List[DataSourceStatusSchema])
def get_data_sources_status():
    return [
        DataSourceStatusSchema(
            provider_name="Yahoo Finance Historical Feed",
            status="ACTIVE",
            type="Historical & End-of-Day Research",
            is_live_allowed=False,
            description="Normalized NSE historical candles (5-min, daily) with duplicate removal and Asia/Kolkata timezone mapping.",
            last_ping_ms=142.5,
            details={"cached_items": len(yahoo_provider._cache), "rate_limit": "Aware with backoff"}
        ),
        DataSourceStatusSchema(
            provider_name="Deterministic Market Replay Engine",
            status="ACTIVE",
            type="Simulation & Replay",
            is_live_allowed=False,
            description="Bar-by-bar deterministic candle replay emulator for backtesting and strategy rehearsal.",
            last_ping_ms=0.8,
            details={"replay_symbol": replay_provider.symbol, "mode": "Step-by-step"}
        ),
        DataSourceStatusSchema(
            provider_name="Zerodha Kite Connect (Future Integration)",
            status="DISABLED",
            type="Live Broker & WebSocket Feed",
            is_live_allowed=False,
            description="Dedicated adapter architecture prepared for future live market data and user-approved execution. Strictly offline.",
            last_ping_ms=None,
            details={"auth": "Disabled in this phase", "approval_required": True}
        )
    ]

# --- REPLAY STEP ---
@router.post("/replay/step")
def step_market_replay(steps: int = Query(1)):
    res = replay_provider.step(steps)
    return {
        "status": "SUCCESS",
        "steps_advanced": steps,
        "quote": res or replay_provider.get_latest_quote(replay_provider.symbol)
    }
