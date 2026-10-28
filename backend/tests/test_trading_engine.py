import math
import datetime
import pytest
import pytz
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database.session import Base
from backend.app.models.trading_models import PaperAccount, PaperPosition, PaperOrder, PaperTrade
from backend.app.indicators.technical import (
    calculate_sma,
    calculate_ema,
    calculate_rsi,
    calculate_atr,
    calculate_session_vwap,
    calculate_relative_volume,
    calculate_opening_range,
    calculate_all_indicators
)
from backend.app.strategies.orb_strategy import OpeningRangeBreakoutStrategy
from backend.app.risk.risk_engine import RiskEngine, RiskParameters
from backend.app.signals.signal_generator import SignalGenerator
from backend.app.backtesting.backtester import BacktestEngine
from backend.app.paper_trading.paper_engine import PaperTradingEngine
import zoneinfo

IST = zoneinfo.ZoneInfo("Asia/Kolkata")

def create_synthetic_intraday_candles(
    num_warmup_candles: int = 50,
    breakout_at_0930: bool = True,
    breakout_fails_condition: str = None
) -> pd.DataFrame:
    """
    Generates deterministic synthetic 5-minute candles with controlled OHLCV and timestamps.
    Includes warm-up history to ensure valid indicators (EMA50, EMA20, ATR14, 20-period volume).
    """
    base_date = datetime.date(2026, 10, 27)
    rows = []
    
    # 1. Warm-up candles (simulating preceding day session or earlier bars)
    # Using 50 candles to fully satisfy EMA50 and 20-bar rolling relative volume
    start_dt = datetime.datetime.combine(base_date - datetime.timedelta(days=1), datetime.time(9, 15), tzinfo=IST)
    for i in range(num_warmup_candles):
        t = start_dt + datetime.timedelta(minutes=i * 5)
        rows.append({
            "timestamp": t,
            "open": 1000.0,
            "high": 1005.0,
            "low": 995.0,
            "close": 1000.0,
            "volume": 10000.0
        })

    # 2. Target Trading Day: 2026-10-27
    day_dt = datetime.datetime.combine(base_date, datetime.time(9, 15), tzinfo=IST)
    
    # Candle 0: 09:15 - 09:20 (Opening range bar 1)
    rows.append({
        "timestamp": day_dt,
        "open": 1000.0,
        "high": 1010.0,
        "low": 995.0,
        "close": 1005.0,
        "volume": 10000.0
    })
    
    # Candle 1: 09:20 - 09:25 (Opening range bar 2)
    rows.append({
        "timestamp": day_dt + datetime.timedelta(minutes=5),
        "open": 1005.0,
        "high": 1015.0,
        "low": 1000.0,
        "close": 1010.0,
        "volume": 12000.0
    })
    
    # Candle 2: 09:25 - 09:30 (Opening range bar 3)
    # ORB High is established at 1020.0, ORB Low at 995.0
    rows.append({
        "timestamp": day_dt + datetime.timedelta(minutes=10),
        "open": 1010.0,
        "high": 1020.0,
        "low": 1005.0,
        "close": 1015.0,
        "volume": 11000.0
    })
    
    # Candle 3: 09:30 - 09:35 (First candle eligible to evaluate breakout of 09:15-09:30 range)
    c_open = 1015.0
    c_high = 1030.0
    c_low = 1012.0
    c_close = 1025.0  # Above ORB High (1020.0)
    c_vol = 25000.0   # >= 1.5x average (10000-11000)
    
    if breakout_fails_condition == "BELOW_ORB_HIGH":
        c_close = 1018.0  # Fails: does not close above 1020.0
        c_high = 1019.0
    elif breakout_fails_condition == "LOW_VOLUME":
        c_vol = 8000.0    # Fails: rel vol < 1.5x
    elif breakout_fails_condition == "BELOW_VWAP":
        # Force VWAP higher by manipulating prior volumes, or set close very low
        c_close = 1018.0
        c_open = 1015.0
    
    rows.append({
        "timestamp": day_dt + datetime.timedelta(minutes=15),
        "open": c_open,
        "high": c_high,
        "low": c_low,
        "close": c_close,
        "volume": c_vol
    })
    
    # Candle 4: 09:35 - 09:40 (Execution bar at next candle's open)
    rows.append({
        "timestamp": day_dt + datetime.timedelta(minutes=20),
        "open": 1026.0,
        "high": 1045.0,
        "low": 1020.0,
        "close": 1040.0,
        "volume": 20000.0
    })

    # Additional afternoon candles up to square-off (15:15)
    for m in range(25, 365, 5):
        t = day_dt + datetime.timedelta(minutes=m)
        rows.append({
            "timestamp": t,
            "open": 1040.0,
            "high": 1042.0,
            "low": 1038.0,
            "close": 1040.0,
            "volume": 10000.0
        })

    df = pd.DataFrame(rows)
    df.index = pd.to_datetime(df['timestamp'])
    return df


@pytest.fixture
def in_memory_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


# ==============================================================================
# REQUIREMENT A: Valid breakout generates exactly one eligible long signal
# ==============================================================================
def test_requirement_a_valid_breakout_generates_exactly_one_eligible_long_signal():
    df_raw = create_synthetic_intraday_candles(num_warmup_candles=50)
    df = calculate_all_indicators(df_raw)
    strategy = OpeningRangeBreakoutStrategy()
    
    # Index of the completed 09:30 candle is warmup (50) + 3 = 53
    signal_candle_idx = 53
    candle_0930 = df.iloc[signal_candle_idx]
    time_str = candle_0930['timestamp'].strftime("%H:%M")
    assert time_str == "09:30"
    
    result = strategy.analyze_candle(df, signal_candle_idx, "RELIANCE.NS")
    
    assert result["qualified"] is True
    assert result["direction"] == "BUY"
    assert result["action"] == "ENTER_LONG"
    assert len(result["failed_conditions"]) == 0
    assert len(result["passed_conditions"]) == 6
    
    # Test SignalGenerator packaging
    sig_gen = SignalGenerator()
    signal = sig_gen.generate_signal_for_candle(
        symbol="RELIANCE.NS",
        df_indicators=df,
        candle_idx=signal_candle_idx,
        open_positions=0,
        daily_entries=0,
        daily_pnl=0.0
    )
    assert signal["execution_eligibility"] is True
    assert signal["signal_status"] == "CONFIRMED"
    assert signal["direction"] == "BUY"
    assert signal["proposed_entry"] == 1025.0


# ==============================================================================
# REQUIREMENT B: Each individual entry condition failure prevents signal
# ==============================================================================
def test_requirement_b_each_individual_failed_condition_prevents_signal():
    strategy = OpeningRangeBreakoutStrategy()
    
    # 1. Close did not exceed ORB High
    df1 = calculate_all_indicators(create_synthetic_intraday_candles(breakout_fails_condition="BELOW_ORB_HIGH"))
    res1 = strategy.analyze_candle(df1, 53, "INFY.NS")
    assert res1["qualified"] is False
    assert res1["direction"] == "WAIT"
    assert any("Opening Range High" in cond for cond in res1["failed_conditions"])
    
    # 2. Volume threshold failed (< 1.5x)
    df2 = calculate_all_indicators(create_synthetic_intraday_candles(breakout_fails_condition="LOW_VOLUME"))
    res2 = strategy.analyze_candle(df2, 53, "TCS.NS")
    assert res2["qualified"] is False
    assert res2["direction"] == "WAIT"
    assert any("Relative volume" in cond for cond in res2["failed_conditions"])
    
    # 3. EMA20 <= EMA50 (Inverted moving averages)
    df3 = calculate_all_indicators(create_synthetic_intraday_candles())
    df3.loc[df3.index[53], 'ema20'] = 980.0
    df3.loc[df3.index[53], 'ema50'] = 1000.0
    res3 = strategy.analyze_candle(df3, 53, "HDFCBANK.NS")
    assert res3["qualified"] is False
    assert any("Slow EMA50" in cond for cond in res3["failed_conditions"])

    # 4. Close below VWAP
    df4 = calculate_all_indicators(create_synthetic_intraday_candles())
    df4.loc[df4.index[53], 'vwap'] = 1050.0  # VWAP above close of 1025
    res4 = strategy.analyze_candle(df4, 53, "ICICIBANK.NS")
    assert res4["qualified"] is False
    assert any("Session VWAP" in cond for cond in res4["failed_conditions"])

    # 5. Invalid / Non-positive ATR14
    df5 = calculate_all_indicators(create_synthetic_intraday_candles())
    df5.loc[df5.index[53], 'atr14'] = 0.0
    res5 = strategy.analyze_candle(df5, 53, "SBIN.NS")
    assert res5["qualified"] is False
    assert any("ATR14" in cond for cond in res5["failed_conditions"])


# ==============================================================================
# REQUIREMENT C: Entry uses next candle's open, not signal candle's close
# ==============================================================================
def test_requirement_c_entry_uses_next_candle_open_not_signal_close():
    df_raw = create_synthetic_intraday_candles()
    # Signal candle at index 53 closes at 1025.0
    # Next candle at index 54 opens at 1035.0 (gap up)
    df_raw.iloc[54, df_raw.columns.get_loc('open')] = 1035.0
    
    backtester = BacktestEngine(initial_capital=100000.0)
    result = backtester.run_backtest(df_raw, "RELIANCE.NS")
    
    assert len(result["trades"]) > 0
    trade = result["trades"][0]
    # Slippage at 5 bps on 1035.0 = round(1035 * 1.0005, 2) = 1035.52
    expected_fill_from_open = round(1035.0 * 1.0005, 2)
    assert trade["entry_price"] == expected_fill_from_open
    # Verify it did NOT enter at signal candle close (1025)
    close_based_price = round(1025.0 * 1.0005, 2)
    assert trade["entry_price"] != close_based_price


# ==============================================================================
# REQUIREMENT D: Stop-loss and target are calculated correctly
# ==============================================================================
def test_requirement_d_stop_loss_and_target_calculated_correctly():
    strategy = OpeningRangeBreakoutStrategy(atr_stop_multiplier=1.5, target_rr=2.0)
    df_raw = create_synthetic_intraday_candles()
    df = calculate_all_indicators(df_raw)
    
    analysis = strategy.analyze_candle(df, 53, "TCS.NS")
    entry = analysis["proposed_entry"]  # 1025.0
    atr14 = analysis["indicator_values"]["atr14"]
    
    expected_stop = round(max(0.05, entry - (1.5 * atr14)), 2)
    expected_risk = entry - expected_stop
    expected_target = round(entry + (2.0 * expected_risk), 2)
    
    assert analysis["stop_loss"] == expected_stop
    assert analysis["target_price"] == expected_target
    assert analysis["risk_reward_ratio"] == 2.0


# ==============================================================================
# REQUIREMENT E: Position sizing respects risk budget and maximum allocation
# ==============================================================================
def test_requirement_e_position_sizing_respects_risk_budget_and_max_allocation():
    risk_engine = RiskEngine(RiskParameters(
        equity=100000.0,
        risk_per_trade_pct=0.5,           # ₹500 risk budget
        max_position_allocation_pct=20.0   # ₹20,000 maximum capital allocation
    ))
    
    # Case 1: Tight stop where Capital Allocation binds
    # Entry: 1000, Stop: 995 -> Risk/share = 5
    # Qty by risk = 500 / 5 = 100 shares -> Capital = 100,000 > 20,000
    # Qty by capital = 20,000 / 1000 = 20 shares
    qty1, max_loss1, details1 = risk_engine.calculate_position_size(1000.0, 995.0)
    assert qty1 == 20
    assert details1["binding_constraint"] == "CAPITAL_ALLOCATION"
    assert qty1 * 1000.0 <= 20000.0
    assert max_loss1 <= 500.0

    # Case 2: Wide stop where Risk Budget binds
    # Entry: 1000, Stop: 950 -> Risk/share = 50
    # Qty by risk = 500 / 50 = 10 shares -> Capital = 10,000 <= 20,000
    # Qty by capital = 20,000 / 1000 = 20 shares
    qty2, max_loss2, details2 = risk_engine.calculate_position_size(1000.0, 950.0)
    assert qty2 == 10
    assert details2["binding_constraint"] == "RISK_BUDGET"
    assert max_loss2 == 500.0
    assert qty2 * 1000.0 <= 20000.0

    # Case 3: Invalid prices
    qty3, _, _ = risk_engine.calculate_position_size(1000.0, 1005.0)  # Stop > Entry
    assert qty3 == 0
    qty4, _, _ = risk_engine.calculate_position_size(-100.0, 90.0)    # Negative price
    assert qty4 == 0
    qty5, _, _ = risk_engine.calculate_position_size(float('nan'), 90.0)
    assert qty5 == 0


# ==============================================================================
# REQUIREMENT F: Stop-loss execution closes position and records net P&L after fees/slippage
# ==============================================================================
def test_requirement_f_stop_loss_execution_and_net_pnl_after_fees(in_memory_db):
    engine = PaperTradingEngine(in_memory_db)
    # Buy order at 1000.0, stop loss at 980.0
    res = engine.place_order(
        symbol="RELIANCE.NS",
        side="BUY",
        quantity=10,
        requested_price=1000.0,
        stop_loss=980.0,
        target_price=1040.0
    )
    assert res["status"] == "FILLED"
    fill_buy = res["executed_price"]  # 1000.50 (with 5 bps slippage)
    buy_fees = res["fees"]            # 3.00 (3 bps)
    
    # Simulate a candle that hits stop loss
    candle_stop = {
        "open": 985.0,
        "high": 988.0,
        "low": 975.0,  # Touches 980.0 stop loss
        "close": 978.0,
        "time_str": "10:15"
    }
    sim_res = engine.simulate_candle_bar("RELIANCE.NS", candle_stop)
    assert sim_res is not None
    assert sim_res["status"] == "FILLED"
    assert sim_res["exit_reason"] == "STOP_LOSS"
    
    # Verify trade record in DB
    trade = in_memory_db.query(PaperTrade).filter(PaperTrade.symbol == "RELIANCE.NS").first()
    assert trade is not None
    assert trade.exit_price == round(980.0 * 0.9995, 2)  # Sell slippage applied
    assert trade.realized_pnl < 0
    
    # Net P&L = (Sell Fill - Buy Fill) * 10 - Total Fees
    expected_gross = (trade.exit_price - fill_buy) * 10
    assert abs(trade.realized_pnl - round(expected_gross - trade.fees, 2)) < 0.02


# ==============================================================================
# REQUIREMENT G: Target execution closes position correctly
# ==============================================================================
def test_requirement_g_target_execution_and_net_pnl(in_memory_db):
    engine = PaperTradingEngine(in_memory_db)
    engine.reset_account(100000.0)
    
    # Buy order at 1000.0, target at 1030.0
    engine.place_order(
        symbol="TCS.NS",
        side="BUY",
        quantity=10,
        requested_price=1000.0,
        stop_loss=985.0,
        target_price=1030.0
    )
    
    # Candle that hits target without touching stop
    candle_target = {
        "open": 1010.0,
        "high": 1035.0,  # Touches target 1030.0
        "low": 1005.0,   # Well above stop 985.0
        "close": 1032.0,
        "time_str": "11:00"
    }
    sim_res = engine.simulate_candle_bar("TCS.NS", candle_target)
    assert sim_res is not None
    assert sim_res["exit_reason"] == "TARGET_2R"
    
    trade = in_memory_db.query(PaperTrade).filter(PaperTrade.symbol == "TCS.NS").first()
    assert trade is not None
    assert trade.realized_pnl > 0
    assert trade.exit_price == round(1030.0 * 0.9995, 2)


# ==============================================================================
# REQUIREMENT H: Conservative conflict resolution (both stop and target touched)
# ==============================================================================
def test_requirement_h_same_candle_stop_and_target_conflict_follows_conservative_rule(in_memory_db):
    engine = PaperTradingEngine(in_memory_db)
    engine.reset_account(100000.0)
    
    # Position: Stop = 985.0, Target = 1030.0
    engine.place_order(
        symbol="INFY.NS",
        side="BUY",
        quantity=10,
        requested_price=1000.0,
        stop_loss=985.0,
        target_price=1030.0
    )
    
    # Candle touches BOTH target (high=1040) and stop (low=980)
    candle_conflict = {
        "open": 1000.0,
        "high": 1040.0,  # >= 1030.0
        "low": 980.0,    # <= 985.0
        "close": 1010.0,
        "time_str": "11:30"
    }
    sim_res = engine.simulate_candle_bar("INFY.NS", candle_conflict)
    assert sim_res is not None
    # Conservative principle: MUST assume stop-loss was touched first!
    assert sim_res["exit_reason"] == "STOP_LOSS_CONSERVATIVE_CONFLICT"
    
    trade = in_memory_db.query(PaperTrade).filter(PaperTrade.symbol == "INFY.NS").first()
    assert trade.exit_reason == "STOP_LOSS_CONSERVATIVE_CONFLICT"
    assert trade.exit_price == round(985.0 * 0.9995, 2)
    assert trade.realized_pnl < 0


# ==============================================================================
# REQUIREMENT I: Time window restriction and 15:15 IST square-off
# ==============================================================================
def test_requirement_i_time_window_restrictions_and_square_off():
    strategy = OpeningRangeBreakoutStrategy()
    
    # 1. Early candle at 09:20 IST (during opening range)
    df_early = calculate_all_indicators(create_synthetic_intraday_candles())
    res_early = strategy.analyze_candle(df_early, 51, "HDFCBANK.NS")  # 09:20 candle
    assert res_early["qualified"] is False
    assert any("outside permitted entry window" in cond for cond in res_early["failed_conditions"])

    # 2. Late candle at 14:35 IST (after 14:30 entry cutoff)
    df_late = df_early.copy()
    late_idx = len(df_late) - 5
    res_late = strategy.analyze_candle(df_late, late_idx, "HDFCBANK.NS")
    assert res_late["qualified"] is False
    assert any("outside permitted entry window" in cond for cond in res_late["failed_conditions"])

    # 3. Square-off at 15:15 IST in backtester
    backtester = BacktestEngine(initial_capital=100000.0)
    # Generate data where trade enters at 09:35 and stays flat without hitting stop or target
    df_raw = create_synthetic_intraday_candles()
    # Ensure price stays flat within stop and target until 15:15
    for i in range(54, len(df_raw)):
        df_raw.iloc[i, df_raw.columns.get_loc('open')] = 1025.0
        df_raw.iloc[i, df_raw.columns.get_loc('high')] = 1027.0
        df_raw.iloc[i, df_raw.columns.get_loc('low')] = 1023.0
        df_raw.iloc[i, df_raw.columns.get_loc('close')] = 1025.0
        df_raw.iloc[i, df_raw.columns.get_loc('volume')] = 10000.0
    
    result = backtester.run_backtest(df_raw, "RELIANCE.NS")
    assert len(result["trades"]) > 0
    trade = result["trades"][0]
    # Trade must have exited due to intraday square-off or vwap break
    assert trade["exit_reason"] in ["INTRADAY_SQUARE_OFF", "VWAP_BREAK_EXIT"]


# ==============================================================================
# REQUIREMENT J: Daily loss breaker considers realized + unrealized losses
# ==============================================================================
def test_requirement_j_daily_loss_breaker_with_unrealized_losses():
    risk_engine = RiskEngine(RiskParameters(
        starting_daily_equity=100000.0,
        daily_loss_threshold_pct=1.5  # ₹1,500 threshold
    ))
    
    # Subtest J1: Realized loss alone exceeds threshold
    ok1, reason1 = risk_engine.check_trade_eligibility(
        current_daily_entries=1,
        realized_daily_pnl=-1600.0,
        unrealized_daily_pnl=0.0,
        has_open_position_for_symbol=False,
        current_cash=80000.0,
        required_capital=10000.0
    )
    assert ok1 is False
    assert "Daily loss circuit breaker triggered" in reason1

    # Subtest J2: Unrealized loss alone exceeds threshold
    ok2, reason2 = risk_engine.check_trade_eligibility(
        current_daily_entries=1,
        realized_daily_pnl=0.0,
        unrealized_daily_pnl=-1600.0,
        has_open_position_for_symbol=False,
        current_cash=80000.0,
        required_capital=10000.0
    )
    assert ok2 is False
    assert "Daily loss circuit breaker triggered" in reason2

    # Subtest J3: Combined realized (-800) + unrealized (-800) = -1600 <= -1500
    ok3, reason3 = risk_engine.check_trade_eligibility(
        current_daily_entries=1,
        realized_daily_pnl=-800.0,
        unrealized_daily_pnl=-800.0,
        has_open_position_for_symbol=False,
        current_cash=80000.0,
        required_capital=10000.0
    )
    assert ok3 is False
    assert "Daily loss circuit breaker triggered" in reason3

    # Subtest J4: Combined within threshold (-1000 > -1500)
    ok4, reason4 = risk_engine.check_trade_eligibility(
        current_daily_entries=1,
        realized_daily_pnl=-500.0,
        unrealized_daily_pnl=-500.0,
        has_open_position_for_symbol=False,
        current_cash=80000.0,
        required_capital=10000.0
    )
    assert ok4 is True


# ==============================================================================
# REQUIREMENT K: Max daily entries and duplicate-order protections
# ==============================================================================
def test_requirement_k_max_daily_entries_and_duplicate_order_protections(in_memory_db):
    engine = PaperTradingEngine(in_memory_db)
    engine.reset_account(100000.0)
    
    # 1. Duplicate position protection
    res1 = engine.place_order("SBIN.NS", "BUY", 10, 500.0)
    assert res1["status"] == "FILLED"
    
    # Second BUY for SBIN.NS must be rejected
    res2 = engine.place_order("SBIN.NS", "BUY", 10, 500.0)
    assert res2["status"] == "REJECTED"
    assert "already exists" in res2["error"]
    
    # 2. Maximum daily entries (max 3 entries)
    res3 = engine.place_order("ITC.NS", "BUY", 10, 400.0)
    assert res3["status"] == "FILLED"
    res4 = engine.place_order("AXISBANK.NS", "BUY", 10, 900.0)
    assert res4["status"] == "FILLED"
    
    # 4th entry attempt for a new symbol must be rejected by daily entry limit
    res5 = engine.place_order("LT.NS", "BUY", 5, 2000.0)
    assert res5["status"] == "REJECTED"
    assert "Maximum daily entries reached (3/3)" in res5["error"]


# ==============================================================================
# REQUIREMENT L: Paper orders update cash, positions, ledger, and equity consistently
# ==============================================================================
def test_requirement_l_paper_orders_ledger_and_equity_consistency(in_memory_db):
    engine = PaperTradingEngine(in_memory_db)
    engine.reset_account(100000.0)
    
    initial_acc = engine.get_account()
    assert initial_acc["cash_balance"] == 100000.0
    assert initial_acc["equity"] == 100000.0
    assert initial_acc["realized_pnl"] == 0.0
    
    # 1. Place BUY order: 20 shares @ ₹1000.0
    buy_res = engine.place_order("WIPRO.NS", "BUY", 20, 1000.0)
    assert buy_res["status"] == "FILLED"
    fill_buy = buy_res["executed_price"]  # 1000.50 with 5 bps slippage
    buy_fees = buy_res["fees"]            # 6.00 (3 bps on 20010.0)
    total_spent = (20 * fill_buy) + buy_fees
    
    acc_after_buy = engine.get_account()
    # Cash must be exactly deducted
    expected_cash = round(100000.0 - total_spent, 2)
    assert acc_after_buy["cash_balance"] == expected_cash
    # Equity = Cash + Position value (20 * 1000.50) = 100000.0 - buy_fees
    expected_equity = round(expected_cash + (20 * fill_buy), 2)
    assert acc_after_buy["equity"] == expected_equity
    assert abs(acc_after_buy["equity"] - (100000.0 - buy_fees)) < 0.02
    
    # 2. Place SELL order: 20 shares @ ₹1050.0
    sell_res = engine.place_order("WIPRO.NS", "SELL", 20, 1050.0)
    assert sell_res["status"] == "FILLED"
    fill_sell = sell_res["executed_price"]  # 1049.48 with 5 bps slippage
    
    acc_after_sell = engine.get_account()
    # Position must be gone
    assert acc_after_sell["open_positions_count"] == 0
    # Final cash balance must equal final equity exactly
    assert acc_after_sell["cash_balance"] == acc_after_sell["equity"]
    # Final equity must equal initial_capital + realized_pnl exactly
    expected_final_equity = round(100000.0 + acc_after_sell["realized_pnl"], 2)
    assert acc_after_sell["equity"] == expected_final_equity
    
    # Verify order ledger entries
    orders = in_memory_db.query(PaperOrder).all()
    assert len(orders) == 2
    assert orders[0].side == "BUY" and orders[0].status == "FILLED"
    assert orders[1].side == "SELL" and orders[1].status == "FILLED"
    
    # Verify trade journal
    trades = in_memory_db.query(PaperTrade).all()
    assert len(trades) == 1
    assert trades[0].realized_pnl == acc_after_sell["realized_pnl"]
