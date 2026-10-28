import pytest
from backend.app.risk.risk_engine import RiskEngine, RiskParameters

def test_position_sizing_calculation():
    params = RiskParameters(
        equity=100000.0,
        risk_per_trade_pct=0.5,  # ₹500 risk budget
        max_position_allocation_pct=20.0,  # ₹20,000 capital limit
    )
    engine = RiskEngine(params)
    
    # Entry = 1000, Stop = 990 (Risk per share = 10)
    # Qty by risk = 500 / 10 = 50 shares
    # Qty by capital = 20000 / 1000 = 20 shares
    # Final qty should be min(50, 20) = 20 shares
    qty, max_loss, details = engine.calculate_position_size(entry_price=1000.0, stop_loss_price=990.0)
    assert qty == 20
    assert details["binding_constraint"] == "CAPITAL_ALLOCATION"
    assert max_loss == 20 * 10.0

def test_risk_eligibility_daily_loss_circuit_breaker():
    params = RiskParameters(
        equity=100000.0,
        starting_daily_equity=100000.0,
        daily_loss_threshold_pct=1.5,  # Max allowed daily loss = ₹1,500
    )
    engine = RiskEngine(params)
    
    # Allowed when PnL is positive or mild loss
    eligible, reason = engine.check_trade_eligibility(
        current_daily_entries=1,
        realized_daily_pnl=-500.0,
        unrealized_daily_pnl=0.0,
        has_open_position_for_symbol=False,
        current_cash=80000.0,
        required_capital=20000.0
    )
    assert eligible is True
    
    # Blocked when loss reaches or exceeds -₹1,500
    blocked, block_reason = engine.check_trade_eligibility(
        current_daily_entries=1,
        realized_daily_pnl=-1600.0,
        unrealized_daily_pnl=0.0,
        has_open_position_for_symbol=False,
        current_cash=80000.0,
        required_capital=20000.0
    )
    assert blocked is False
    assert "circuit breaker" in block_reason.lower()

def test_kill_switch():
    params = RiskParameters(kill_switch=True)
    engine = RiskEngine(params)
    eligible, reason = engine.check_trade_eligibility(
        current_daily_entries=0,
        realized_daily_pnl=0.0,
        unrealized_daily_pnl=0.0,
        has_open_position_for_symbol=False,
        current_cash=100000.0,
        required_capital=10000.0
    )
    assert eligible is False
    assert "kill switch" in reason.lower()
