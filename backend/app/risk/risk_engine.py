import math
from typing import Dict, Any, Tuple, Optional
from pydantic import BaseModel

class RiskParameters(BaseModel):
    equity: float = 100000.0
    starting_daily_equity: float = 100000.0
    risk_per_trade_pct: float = 0.5  # 0.5%
    max_position_allocation_pct: float = 20.0  # 20%
    max_entries_per_day: int = 3
    daily_loss_threshold_pct: float = 1.5  # 1.5%
    target_rr: float = 2.0  # 2R
    slippage_bps: float = 5.0  # 5 bps
    fees_bps: float = 3.0  # 3 bps
    kill_switch: bool = False

class RiskEngine:
    """
    Centralized Institutional Risk Management Engine.
    Enforces capital protection, position sizing, daily trade limits,
    loss circuit breakers, and fee/slippage modeling.
    """
    
    def __init__(self, params: Optional[RiskParameters] = None):
        self.params = params or RiskParameters()

    def update_parameters(self, **kwargs):
        for k, v in kwargs.items():
            if hasattr(self.params, k):
                setattr(self.params, k, v)

    def calculate_position_size(
        self, 
        entry_price: float, 
        stop_loss_price: float,
        current_equity: Optional[float] = None
    ) -> Tuple[int, float, Dict[str, Any]]:
        """
        Calculates position size strictly adhering to:
        Risk budget = Equity * (Risk % / 100)
        Risk per share = Entry - Stop
        Quantity by risk = Floor(Risk budget / Risk per share)
        Quantity by capital = Floor(Max position allocation / Entry)
        Final quantity = Minimum of permitted quantities.
        
        Returns: (final_quantity, estimated_max_loss, details_dict)
        """
        equity = current_equity if current_equity is not None else self.params.equity
        if equity <= 0:
            return 0, 0.0, {"error": "Account equity must be positive"}
        if math.isnan(entry_price) or math.isnan(stop_loss_price):
            return 0, 0.0, {"error": "Price parameters cannot be NaN"}
        if entry_price <= 0 or stop_loss_price <= 0:
            return 0, 0.0, {"error": "Invalid price parameters"}
            
        risk_per_share = entry_price - stop_loss_price
        if risk_per_share <= 0:
            return 0, 0.0, {"error": "Stop loss must be below entry price for long trades"}

        # 1. Quantity by Risk Budget
        risk_budget = equity * (self.params.risk_per_trade_pct / 100.0)
        qty_by_risk = math.floor(risk_budget / risk_per_share)
        
        # 2. Quantity by Capital Allocation Limit (e.g. 20% of equity)
        max_capital_allocation = equity * (self.params.max_position_allocation_pct / 100.0)
        qty_by_capital = math.floor(max_capital_allocation / entry_price)
        
        # 3. Final permitted quantity
        final_qty = max(0, min(qty_by_risk, qty_by_capital))
        estimated_max_loss = round(final_qty * risk_per_share, 2)
        
        details = {
            "equity": equity,
            "risk_budget": round(risk_budget, 2),
            "risk_per_share": round(risk_per_share, 2),
            "max_capital_allocation": round(max_capital_allocation, 2),
            "quantity_by_risk": qty_by_risk,
            "quantity_by_capital": qty_by_capital,
            "binding_constraint": "RISK_BUDGET" if qty_by_risk <= qty_by_capital else "CAPITAL_ALLOCATION",
            "estimated_max_loss": estimated_max_loss,
            "capital_required": round(final_qty * entry_price, 2)
        }
        
        return final_qty, estimated_max_loss, details

    def check_trade_eligibility(
        self, 
        current_daily_entries: int,
        realized_daily_pnl: float,
        unrealized_daily_pnl: float,
        has_open_position_for_symbol: bool,
        current_cash: float,
        required_capital: float
    ) -> Tuple[bool, str]:
        """
        Evaluates institutional circuit breakers before allowing a new entry.
        """
        # 1. Kill switch check
        if self.params.kill_switch:
            return False, "Emergency kill switch is active. All new entries locked."
            
        # 2. Daily entries limit
        if current_daily_entries >= self.params.max_entries_per_day:
            return False, f"Maximum daily entries reached ({current_daily_entries}/{self.params.max_entries_per_day})."
            
        # 3. Daily loss circuit breaker
        total_pnl_today = realized_daily_pnl + unrealized_daily_pnl
        max_allowed_loss = self.params.starting_daily_equity * (self.params.daily_loss_threshold_pct / 100.0)
        if total_pnl_today <= -max_allowed_loss:
            return False, (
                f"Daily loss circuit breaker triggered: Total P&L ₹{total_pnl_today:.2f} "
                f"exceeds allowed daily loss of ₹{-max_allowed_loss:.2f} ({self.params.daily_loss_threshold_pct}%)."
            )
            
        # 4. Duplicate position check
        if has_open_position_for_symbol:
            return False, "An open position already exists for this symbol. Duplicate entries prevented."
            
        # 5. Sufficient cash check
        if current_cash < required_capital:
            return False, f"Insufficient cash balance. Required: ₹{required_capital:.2f}, Available: ₹{current_cash:.2f}."
            
        return True, "Passed all risk and capital checks."

    def calculate_execution_price_with_slippage(self, base_price: float, side: str = "BUY") -> float:
        """Applies configured basis-point slippage."""
        slippage_factor = (self.params.slippage_bps / 10000.0)
        if side.upper() == "BUY":
            return round(base_price * (1.0 + slippage_factor), 2)
        else:
            return round(base_price * (1.0 - slippage_factor), 2)

    def calculate_fees(self, trade_value: float) -> float:
        """Applies configured exchange/brokerage fee rate."""
        return round(trade_value * (self.params.fees_bps / 10000.0), 2)
