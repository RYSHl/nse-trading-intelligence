import uuid
import datetime
import pytz
from typing import Dict, Any, Optional
from backend.app.strategies.orb_strategy import OpeningRangeBreakoutStrategy
from backend.app.risk.risk_engine import RiskEngine

class SignalGenerator:
    """
    Evaluates market indicators and strategies through institutional risk filters
    to produce structured, explainable, and actionable trade signals.
    """
    
    def __init__(self, risk_engine: Optional[RiskEngine] = None):
        self.risk_engine = risk_engine or RiskEngine()
        self.strategy = OpeningRangeBreakoutStrategy()
        self.ist = pytz.timezone("Asia/Kolkata")

    def generate_signal_for_candle(
        self,
        symbol: str,
        df_indicators,
        candle_idx: int = -1,
        source: str = "yahoo",
        freshness: str = "HISTORICAL",
        open_positions: int = 0,
        daily_entries: int = 0,
        daily_pnl: float = 0.0,
        unrealized_pnl: float = 0.0
    ) -> Dict[str, Any]:
        """
        Processes strategy rules, checks risk limits, computes position size,
        and outputs the standardized signal structure.
        """
        if candle_idx == -1:
            candle_idx = len(df_indicators) - 1
            
        strat_result = self.strategy.analyze_candle(df_indicators, candle_idx, symbol)
        candle = df_indicators.iloc[candle_idx]
        candle_time = candle['timestamp'] if 'timestamp' in candle else df_indicators.index[candle_idx]
        now_ist = datetime.datetime.now(self.ist)

        signal_id = f"SIG-{symbol.replace('.NS', '')}-{int(now_ist.timestamp())}-{uuid.uuid4().hex[:4].upper()}"
        
        # Risk & Sizing calculations
        proposed_entry = strat_result.get("proposed_entry", float(candle['close']))
        stop_loss = strat_result.get("stop_loss", proposed_entry * 0.99)
        target_price = strat_result.get("target_price", proposed_entry * 1.02)
        
        suggested_qty, estimated_max_loss, sizing_details = self.risk_engine.calculate_position_size(
            entry_price=proposed_entry,
            stop_loss_price=stop_loss
        )
        
        capital_required = suggested_qty * proposed_entry
        is_risk_eligible, risk_reason = self.risk_engine.check_trade_eligibility(
            current_daily_entries=daily_entries,
            realized_daily_pnl=daily_pnl,
            unrealized_daily_pnl=unrealized_pnl,
            has_open_position_for_symbol=open_positions > 0,
            current_cash=self.risk_engine.params.equity,
            required_capital=capital_required
        )

        qualified = strat_result.get("qualified", False)
        execution_eligibility = qualified and is_risk_eligible and suggested_qty > 0
        
        if execution_eligibility:
            signal_status = "CONFIRMED"
        elif qualified and not is_risk_eligible:
            signal_status = "REJECTED"
            strat_result["failed_conditions"].append(f"Risk Circuit Breaker: {risk_reason}")
        else:
            signal_status = "CANDIDATE" if strat_result.get("direction") == "BUY" else "WAIT"

        explanation = strat_result.get("explanation", "")
        if not is_risk_eligible and qualified:
            explanation += f" However, order execution is barred by risk limit: {risk_reason}"

        return {
            "signal_id": signal_id,
            "symbol": symbol,
            "strategy_id": self.strategy.strategy_id,
            "direction": strat_result.get("direction", "WAIT"),
            "action": strat_result.get("action", "WAIT"),
            "signal_timestamp": now_ist.isoformat(),
            "data_timestamp": candle_time.isoformat() if hasattr(candle_time, 'isoformat') else str(candle_time),
            "data_source": source,
            "data_freshness": freshness,
            "reference_price": round(float(candle['close']), 2),
            "proposed_entry": proposed_entry,
            "stop_loss": stop_loss,
            "target_price": target_price,
            "risk_reward_ratio": strat_result.get("risk_reward_ratio", 2.0),
            "suggested_quantity": suggested_qty,
            "estimated_max_loss": estimated_max_loss,
            "indicator_values": strat_result.get("indicator_values", {}),
            "passed_conditions": strat_result.get("passed_conditions", []),
            "failed_conditions": strat_result.get("failed_conditions", []),
            "explanation": explanation,
            "execution_eligibility": execution_eligibility,
            "signal_status": signal_status,
            "risk_details": sizing_details
        }
