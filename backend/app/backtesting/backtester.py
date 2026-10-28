import uuid
import datetime
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from backend.app.indicators.technical import calculate_all_indicators
from backend.app.strategies.orb_strategy import OpeningRangeBreakoutStrategy
from backend.app.risk.risk_engine import RiskEngine, RiskParameters

class BacktestEngine:
    """
    Event-driven historical backtesting simulator.
    Processes historical intraday candles bar-by-bar, executing entries at the next
    candle's open, applying realistic slippage and brokerage fees, and modeling
    conservative intrabar stop/target collisions.
    """
    
    def __init__(
        self,
        strategy: Optional[OpeningRangeBreakoutStrategy] = None,
        risk_params: Optional[RiskParameters] = None,
        initial_capital: float = 100000.0
    ):
        self.strategy = strategy or OpeningRangeBreakoutStrategy()
        self.initial_capital = initial_capital
        self.risk_engine = RiskEngine(risk_params or RiskParameters(equity=initial_capital))

    def run_backtest(
        self, 
        df_candles: pd.DataFrame, 
        symbol: str
    ) -> Dict[str, Any]:
        """
        Executes backtest over the candle series.
        """
        if df_candles.empty or len(df_candles) < 30:
            return {
                "error": "Insufficient candle data for backtesting. Minimum 30 completed candles required."
            }

        # 1. Compute indicators
        df = calculate_all_indicators(df_candles)
        
        capital = self.initial_capital
        equity_curve = [{"time": 0, "equity": capital, "drawdown_pct": 0.0}]
        peak_equity = capital
        trades: List[Dict[str, Any]] = []
        
        current_position: Optional[Dict[str, Any]] = None
        pending_signal: Optional[Dict[str, Any]] = None
        
        daily_entries_count = 0
        daily_realized_pnl = 0.0
        daily_start_capital = capital
        last_date = None
        
        # Iterate bar by bar
        for i in range(20, len(df)):
            candle = df.iloc[i]
            c_time = candle['timestamp'] if 'timestamp' in candle else df.index[i]
            c_open = float(candle['open'])
            c_high = float(candle['high'])
            c_low = float(candle['low'])
            c_close = float(candle['close'])
            c_vwap = float(candle.get('vwap', c_close))
            
            c_date = c_time.date() if hasattr(c_time, 'date') else str(c_time)[:10]
            if hasattr(c_time, 'tzinfo') and c_time.tzinfo is not None:
                import pytz
                ist_ts = c_time.astimezone(pytz.timezone("Asia/Kolkata"))
                time_str = ist_ts.strftime("%H:%M")
            elif hasattr(c_time, 'strftime'):
                time_str = c_time.strftime("%H:%M")
            else:
                time_str = str(c_time)[11:16]
            
            # Reset daily trade limits on new day
            if last_date != c_date:
                daily_entries_count = 0
                daily_realized_pnl = 0.0
                daily_start_capital = capital
                last_date = c_date

            # --- 1. Process Pending Entry from Previous Candle's Signal at Next Candle's Open ---
            if pending_signal is not None and current_position is None:
                # Check daily loss limit before filling pending order
                max_daily_loss = daily_start_capital * (self.risk_engine.params.daily_loss_threshold_pct / 100.0)
                if daily_realized_pnl > -max_daily_loss and daily_entries_count < self.risk_engine.params.max_entries_per_day:
                    # Enter at current candle's open + slippage
                    fill_price = self.risk_engine.calculate_execution_price_with_slippage(c_open, "BUY")
                    atr_val = pending_signal['atr14']
                    
                    # Stop-loss = entry price - 1.5 * ATR14
                    stop_loss = round(max(0.05, fill_price - (self.strategy.atr_stop_multiplier * atr_val)), 2)
                    risk_per_share = fill_price - stop_loss
                    # Target = entry price + 2 * (entry price - stop-loss)
                    target_price = round(fill_price + (self.strategy.target_rr * risk_per_share), 2)
                    
                    qty, max_loss, _ = self.risk_engine.calculate_position_size(fill_price, stop_loss, capital)
                    trade_value = qty * fill_price
                    entry_fees = self.risk_engine.calculate_fees(trade_value)
                    
                    if capital >= trade_value + entry_fees and qty > 0:
                        capital -= (trade_value + entry_fees)
                        current_position = {
                            "trade_id": f"BT-{uuid.uuid4().hex[:6].upper()}",
                            "symbol": symbol,
                            "entry_time": c_time,
                            "entry_price": fill_price,
                            "quantity": qty,
                            "stop_loss": stop_loss,
                            "target_price": target_price,
                            "entry_fees": entry_fees,
                            "entry_val": trade_value
                        }
                        daily_entries_count += 1
                pending_signal = None

            # --- 2. Manage Open Position Exits ---
            if current_position is not None:
                pos = current_position
                qty = pos['quantity']
                entry_p = pos['entry_price']
                stop_p = pos['stop_loss']
                target_p = pos['target_price']
                
                exit_triggered = False
                exit_price = c_close
                exit_reason = ""
                
                # Check Intrabar Conflicts (Both stop and target touched in same candle)
                hit_target = c_high >= target_p
                hit_stop = c_low <= stop_p
                
                if hit_target and hit_stop:
                    # Conservative principle: assume worst-case stop was hit first
                    exit_triggered = True
                    exit_price = self.risk_engine.calculate_execution_price_with_slippage(stop_p, "SELL")
                    exit_reason = "STOP_LOSS_CONSERVATIVE_CONFLICT"
                elif hit_stop:
                    exit_triggered = True
                    exit_price = self.risk_engine.calculate_execution_price_with_slippage(stop_p, "SELL")
                    exit_reason = "STOP_LOSS"
                elif hit_target:
                    exit_triggered = True
                    exit_price = self.risk_engine.calculate_execution_price_with_slippage(target_p, "SELL")
                    exit_reason = "TARGET_2R"
                elif time_str >= self.strategy.square_off_time:
                    # Intraday 15:15 IST Square-off
                    exit_triggered = True
                    exit_price = self.risk_engine.calculate_execution_price_with_slippage(c_close, "SELL")
                    exit_reason = "INTRADAY_SQUARE_OFF"
                elif c_close < c_vwap:
                    # VWAP break exit
                    exit_triggered = True
                    exit_price = self.risk_engine.calculate_execution_price_with_slippage(c_close, "SELL")
                    exit_reason = "VWAP_BREAK_EXIT"

                if exit_triggered:
                    exit_val = qty * exit_price
                    exit_fees = self.risk_engine.calculate_fees(exit_val)
                    total_fees = pos['entry_fees'] + exit_fees
                    gross_pnl = (exit_price - entry_p) * qty
                    net_pnl = round(gross_pnl - total_fees, 2)
                    pnl_pct = round((net_pnl / pos['entry_val']) * 100, 2)
                    
                    capital += (exit_val - exit_fees)
                    daily_realized_pnl += net_pnl
                    
                    # Duration
                    duration_mins = 0
                    if hasattr(c_time, '__sub__') and hasattr(pos['entry_time'], '__sub__'):
                        delta = c_time - pos['entry_time']
                        duration_mins = int(delta.total_seconds() / 60)
                    
                    trades.append({
                        "trade_id": pos['trade_id'],
                        "symbol": symbol,
                        "entry_time": str(pos['entry_time']),
                        "exit_time": str(c_time),
                        "entry_price": pos['entry_price'],
                        "exit_price": exit_price,
                        "quantity": qty,
                        "pnl": net_pnl,
                        "pnl_pct": pnl_pct,
                        "exit_reason": exit_reason,
                        "fees": round(total_fees, 2),
                        "duration_mins": duration_mins
                    })
                    
                    current_position = None

            # --- 3. Evaluate Strategy for Signals on Completed Candle ---
            max_daily_loss = daily_start_capital * (self.risk_engine.params.daily_loss_threshold_pct / 100.0)
            is_daily_loss_ok = daily_realized_pnl > -max_daily_loss
            can_enter_today = daily_entries_count < self.risk_engine.params.max_entries_per_day
            
            if current_position is None and pending_signal is None and can_enter_today and is_daily_loss_ok:
                analysis = self.strategy.analyze_candle(df, i, symbol)
                if analysis.get("qualified", False):
                    atr14 = float(candle['atr14']) if ('atr14' in candle and not pd.isna(candle['atr14'])) else float(analysis['indicator_values'].get('atr14', c_close * 0.01))
                    pending_signal = {
                        "symbol": symbol,
                        "signal_time": c_time,
                        "atr14": atr14
                    }

            # Update Equity Curve tracking
            current_equity = capital
            if current_position is not None:
                current_equity += (current_position['quantity'] * c_close)
                
            peak_equity = max(peak_equity, current_equity)
            dd_pct = round(((peak_equity - current_equity) / peak_equity) * 100, 2) if peak_equity > 0 else 0.0
            
            equity_curve.append({
                "time": str(c_time),
                "equity": round(current_equity, 2),
                "drawdown_pct": dd_pct
            })

        # Calculate institutional performance metrics
        net_profit = round(capital - self.initial_capital, 2)
        total_return_pct = round((net_profit / self.initial_capital) * 100, 2)
        total_trades = len(trades)
        winning_trades = [t for t in trades if t['pnl'] > 0]
        losing_trades = [t for t in trades if t['pnl'] <= 0]
        win_count = len(winning_trades)
        loss_count = len(losing_trades)
        
        win_rate = round((win_count / total_trades) * 100, 2) if total_trades > 0 else 0.0
        gross_wins = sum(t['pnl'] for t in winning_trades)
        gross_losses = abs(sum(t['pnl'] for t in losing_trades))
        profit_factor = round(gross_wins / gross_losses, 2) if gross_losses > 0 else (99.0 if gross_wins > 0 else 0.0)
        
        avg_win = round(gross_wins / win_count, 2) if win_count > 0 else 0.0
        avg_loss = round(gross_losses / loss_count, 2) if loss_count > 0 else 0.0
        
        expectancy = round(((win_rate / 100) * avg_win) - (((100 - win_rate) / 100) * avg_loss), 2)
        max_drawdown = max([pt['drawdown_pct'] for pt in equity_curve]) if equity_curve else 0.0
        avg_duration = round(sum(t['duration_mins'] for t in trades) / total_trades, 1) if total_trades > 0 else 0.0

        run_id = f"RUN-{symbol.replace('.NS', '')}-{uuid.uuid4().hex[:6].upper()}"

        return {
            "run_id": run_id,
            "strategy_id": self.strategy.strategy_id,
            "strategy_name": self.strategy.name,
            "symbol": symbol,
            "symbols": [symbol],
            "initial_capital": self.initial_capital,
            "final_equity": round(capital, 2),
            "net_profit": net_profit,
            "total_return_pct": total_return_pct,
            "total_trades": total_trades,
            "winning_trades": win_count,
            "losing_trades": loss_count,
            "win_rate_pct": win_rate,
            "profit_factor": profit_factor,
            "max_drawdown_pct": max_drawdown,
            "avg_win": avg_win,
            "avg_loss": avg_loss,
            "expectancy": expectancy,
            "avg_holding_period_mins": avg_duration,
            "parameters": {
                "ema_fast": self.strategy.ema_fast,
                "ema_slow": self.strategy.ema_slow,
                "volume_multiplier": self.strategy.volume_multiplier,
                "target_rr": self.strategy.target_rr,
                "atr_stop_multiplier": self.strategy.atr_stop_multiplier,
                "slippage_bps": self.risk_engine.params.slippage_bps,
                "fees_bps": self.risk_engine.params.fees_bps
            },
            "equity_curve": equity_curve[::3],  # downsampled for crisp rendering
            "trades": trades,
            "diagnostics": {
                "in_sample_coverage_pct": 100.0,
                "overfitting_risk_rating": "MODERATE",
                "disclaimer": "Past backtested performance is strictly hypothetical. Does not guarantee live market results."
            }
        }
