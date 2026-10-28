import pandas as pd
import numpy as np
from typing import Dict, Any, List
from backend.app.strategies.base import BaseStrategy

class OpeningRangeBreakoutStrategy(BaseStrategy):
    """
    Primary Intraday Strategy:
    ORB + VWAP + EMA + Volume Confirmation
    
    A rule-based, transparent quantitative intraday long-only breakout system
    tailored for liquid NSE large-cap equities.
    """
    
    def __init__(
        self,
        ema_fast: int = 20,
        ema_slow: int = 50,
        atr_period: int = 14,
        atr_stop_multiplier: float = 1.5,
        target_rr: float = 2.0,
        volume_multiplier: float = 1.5,
        entry_window_start: str = "09:30",
        entry_window_end: str = "14:30",
        square_off_time: str = "15:15"
    ):
        self.ema_fast = ema_fast
        self.ema_slow = ema_slow
        self.atr_period = atr_period
        self.atr_stop_multiplier = atr_stop_multiplier
        self.target_rr = target_rr
        self.volume_multiplier = volume_multiplier
        self.entry_window_start = entry_window_start
        self.entry_window_end = entry_window_end
        self.square_off_time = square_off_time

    @property
    def strategy_id(self) -> str:
        return "orb_vwap_ema"

    @property
    def name(self) -> str:
        return "ORB + VWAP + EMA + Volume Confirmation"

    @property
    def description(self) -> str:
        return (
            "Institutional intraday breakout system requiring 5-min candle close above 09:15-09:30 "
            "Opening Range High, above Session VWAP, EMA20 > EMA50, and relative volume >= 1.5x."
        )

    def analyze_candle(
        self, 
        df_indicators: pd.DataFrame, 
        candle_idx: int,
        symbol: str
    ) -> Dict[str, Any]:
        """
        Analyzes the completed candle at candle_idx.
        Returns detailed rule outcomes, indicator values, and proposed trade levels.
        """
        if candle_idx < 20 or candle_idx >= len(df_indicators):
            return {
                "qualified": False,
                "direction": "WAIT",
                "action": "INSUFFICIENT_DATA",
                "explanation": "Insufficient completed candles for indicator warm-up (minimum 20 completed bars required).",
                "passed_conditions": [],
                "failed_conditions": ["Insufficient candle history (< 20 bars)"]
            }

        candle = df_indicators.iloc[candle_idx]
        timestamp = candle['timestamp'] if 'timestamp' in candle else df_indicators.index[candle_idx]
        if hasattr(timestamp, 'tzinfo') and timestamp.tzinfo is not None:
            import pytz
            ist_ts = timestamp.astimezone(pytz.timezone("Asia/Kolkata"))
            time_str = ist_ts.strftime("%H:%M")
        elif hasattr(timestamp, 'strftime'):
            time_str = timestamp.strftime("%H:%M")
        else:
            time_str = str(timestamp)[11:16]

        # Extract indicator values
        close = float(candle['close'])
        orb_high = float(candle['orb_high']) if 'orb_high' in candle and not pd.isna(candle['orb_high']) else np.nan
        orb_low = float(candle['orb_low']) if 'orb_low' in candle and not pd.isna(candle['orb_low']) else np.nan
        vwap = float(candle['vwap']) if 'vwap' in candle and not pd.isna(candle['vwap']) else close
        ema20 = float(candle['ema20']) if 'ema20' in candle and not pd.isna(candle['ema20']) else np.nan
        ema50 = float(candle['ema50']) if 'ema50' in candle and not pd.isna(candle['ema50']) else np.nan
        atr14 = float(candle['atr14']) if 'atr14' in candle and not pd.isna(candle['atr14']) else np.nan
        rel_vol = float(candle['rel_volume']) if 'rel_volume' in candle and not pd.isna(candle['rel_volume']) else np.nan
        volume = float(candle.get('volume', 0.0))

        passed = []
        failed = []

        # Condition 1: Time Window (09:30 - 14:30 IST)
        if self.entry_window_start <= time_str <= self.entry_window_end:
            passed.append(f"Entry time {time_str} is within allowed window ({self.entry_window_start}–{self.entry_window_end} IST)")
        else:
            failed.append(f"Time {time_str} is outside permitted entry window ({self.entry_window_start}–{self.entry_window_end} IST)")

        # Condition 2: Close above Opening Range High
        if not np.isnan(orb_high) and close > orb_high:
            passed.append(f"Candle close (₹{close:.2f}) closed above Opening Range High (₹{orb_high:.2f})")
        else:
            orb_str = f"₹{orb_high:.2f}" if not np.isnan(orb_high) else "N/A"
            failed.append(f"Close (₹{close:.2f}) did not exceed Opening Range High ({orb_str})")

        # Condition 3: Close above Session VWAP
        if close > vwap:
            passed.append(f"Candle close (₹{close:.2f}) is above Session VWAP (₹{vwap:.2f})")
        else:
            failed.append(f"Close (₹{close:.2f}) is below Session VWAP (₹{vwap:.2f})")

        # Condition 4: EMA Alignment (EMA20 > EMA50)
        if not np.isnan(ema20) and not np.isnan(ema50):
            if ema20 > ema50:
                passed.append(f"Fast EMA20 (₹{ema20:.2f}) is above Slow EMA50 (₹{ema50:.2f})")
            else:
                failed.append(f"Fast EMA20 (₹{ema20:.2f}) is below Slow EMA50 (₹{ema50:.2f})")
        else:
            failed.append("EMA indicators not yet formed (insufficient warm-up history)")

        # Condition 5: Volume Confirmation (rel_vol >= 1.5x)
        if not np.isnan(rel_vol):
            if rel_vol >= self.volume_multiplier:
                passed.append(f"Relative volume {rel_vol:.2f}x meets/exceeds {self.volume_multiplier}x threshold")
            else:
                failed.append(f"Relative volume {rel_vol:.2f}x is below required {self.volume_multiplier}x threshold")
        else:
            failed.append("Relative volume not yet formed (requires 20 completed preceding candles)")

        # Condition 6: Valid ATR (positive and not NaN)
        if not np.isnan(atr14) and atr14 > 0:
            passed.append(f"Valid ATR14 volatility metric (₹{atr14:.2f})")
        else:
            failed.append("Invalid or non-positive ATR14 metric")

        qualified = len(failed) == 0

        # Trade calculation levels
        proposed_entry = round(close, 2)
        valid_atr = atr14 if (not np.isnan(atr14) and atr14 > 0) else (close * 0.01)
        stop_loss = round(max(0.05, proposed_entry - (self.atr_stop_multiplier * valid_atr)), 2)
        risk_per_share = proposed_entry - stop_loss
        target_price = round(proposed_entry + (self.target_rr * risk_per_share), 2)
        
        # Build transparent explanation
        if qualified:
            explanation = (
                f"{symbol} qualifies for a potential LONG entry on completed 5-minute candle at {time_str} IST. "
                f"Price (₹{close:.2f}) broke above ORB High (₹{orb_high:.2f}), confirmed above VWAP (₹{vwap:.2f}), "
                f"EMA20 exceeds EMA50, and relative volume reached {rel_vol:.2f}x."
            )
            direction = "BUY"
            action = "ENTER_LONG"
        else:
            failed_str = "; ".join(failed)
            explanation = f"{symbol} setup is WAIT at {time_str} IST. Unmet conditions: {failed_str}."
            direction = "WAIT"
            action = "WAIT_FOR_SETUP"

        return {
            "qualified": qualified,
            "direction": direction,
            "action": action,
            "time_str": time_str,
            "reference_price": round(close, 2),
            "proposed_entry": proposed_entry,
            "stop_loss": stop_loss,
            "target_price": target_price,
            "risk_reward_ratio": self.target_rr,
            "indicator_values": {
                "close": round(close, 2),
                "orb_high": round(orb_high, 2) if not np.isnan(orb_high) else None,
                "orb_low": round(orb_low, 2) if not np.isnan(orb_low) else None,
                "vwap": round(vwap, 2),
                "ema20": round(ema20, 2),
                "ema50": round(ema50, 2),
                "atr14": round(atr14, 2),
                "rel_volume": round(rel_vol, 2),
                "volume": int(volume)
            },
            "passed_conditions": passed,
            "failed_conditions": failed,
            "explanation": explanation
        }
