import datetime
import pytz
import numpy as np
import pandas as pd
from typing import Dict

NSE_BASE_PRICES: Dict[str, float] = {
    "RELIANCE.NS": 2940.50,
    "HDFCBANK.NS": 1680.20,
    "ICICIBANK.NS": 1150.80,
    "SBIN.NS": 810.40,
    "INFY.NS": 1640.10,
    "TCS.NS": 3980.00,
    "ITC.NS": 485.60,
    "BHARTIARTL.NS": 1540.30,
    "LT.NS": 3620.50,
    "AXISBANK.NS": 1210.00,
}

def generate_synthetic_nse_candles(
    symbol: str, 
    days: int = 5, 
    timeframe: str = "5m", 
    seed: int = 42
) -> pd.DataFrame:
    """
    Generates realistic, deterministic 5-minute candles strictly during NSE trading hours
    (09:15 to 15:30 IST) for the past N trading days.
    Includes realistic opening range formation, volatility, volume clustering,
    and trending behavior for testing and simulation.
    """
    np.random.seed(seed + hash(symbol) % 1000)
    ist = pytz.timezone("Asia/Kolkata")
    base_price = NSE_BASE_PRICES.get(symbol, 1000.0)
    
    # Generate past trading days (skipping weekends)
    today = datetime.datetime.now(ist).date()
    trading_dates = []
    curr = today
    while len(trading_dates) < days:
        if curr.weekday() < 5:  # Monday to Friday
            trading_dates.append(curr)
        curr -= datetime.timedelta(days=1)
    trading_dates.reverse()
    
    records = []
    current_price = base_price * (1.0 + np.random.uniform(-0.02, 0.02))
    
    for day in trading_dates:
        # Market open at 09:15 IST
        day_open_time = datetime.datetime.combine(day, datetime.time(9, 15))
        day_open_time = ist.localize(day_open_time)
        
        # Gap up or gap down on open
        gap_pct = np.random.normal(0.001, 0.004)
        current_price = current_price * (1 + gap_pct)
        day_open = current_price
        
        # 5-minute candles: 75 candles per 09:15 - 15:30 session (375 minutes / 5 = 75 bars)
        for i in range(75):
            candle_time = day_open_time + datetime.timedelta(minutes=i * 5)
            time_str = candle_time.strftime("%H:%M")
            
            # Opening 15 minutes (9:15 - 9:30) have higher volatility & volume
            is_orb = time_str in ["09:15", "09:20", "09:25"]
            vol_mult = 2.5 if is_orb else 1.0
            volatility = 0.0025 if is_orb else 0.0012
            
            # Generate drift and shock
            shock = np.random.normal(0.0003, volatility)
            c_open = current_price
            c_close = c_open * (1 + shock)
            c_high = max(c_open, c_close) * (1 + abs(np.random.normal(0, volatility * 0.8)))
            c_low = min(c_open, c_close) * (1 - abs(np.random.normal(0, volatility * 0.8)))
            
            base_vol = 80000.0 if "RELIANCE" in symbol or "HDFC" in symbol else 45000.0
            volume = float(np.random.gamma(shape=3.0, scale=base_vol / 3.0) * vol_mult)
            
            # Specifically inject a clean ORB breakout setup on recent day to illustrate the strategy
            if day == trading_dates[-1] and i == 4:  # 09:35 candle
                # Strong breakout candle above opening range
                c_close = c_high * 1.002
                c_high = c_close * 1.001
                volume = volume * 2.8
                
            current_price = c_close
            
            records.append({
                "timestamp": candle_time,
                "open": round(float(c_open), 2),
                "high": round(float(c_high), 2),
                "low": round(float(c_low), 2),
                "close": round(float(c_close), 2),
                "volume": round(float(volume), 0)
            })
            
    df = pd.DataFrame(records)
    return df
