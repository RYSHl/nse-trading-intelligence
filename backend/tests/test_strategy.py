import pytest
import pandas as pd
import datetime
import pytz
from backend.app.strategies.orb_strategy import OpeningRangeBreakoutStrategy

def test_orb_strategy_long_qualification():
    strategy = OpeningRangeBreakoutStrategy()
    
    # Synthetic test row
    ist = pytz.timezone("Asia/Kolkata")
    timestamp = datetime.datetime(2026, 10, 26, 10, 0, tzinfo=ist)
    
    rows = []
    # 25 warm-up rows
    for i in range(25):
        t = timestamp - datetime.timedelta(minutes=(25 - i) * 5)
        rows.append({
            "timestamp": t,
            "open": 1000.0,
            "high": 1010.0,
            "low": 995.0,
            "close": 1005.0,
            "volume": 20000,
            "orb_high": 1008.0,
            "orb_low": 995.0,
            "vwap": 1002.0,
            "ema20": 1004.0,
            "ema50": 1001.0,
            "atr14": 5.0,
            "rel_volume": 1.8
        })
        
    df = pd.DataFrame(rows)
    df.index = df['timestamp']
    
    # Analyze candle at index 24 (close=1005 is less than orb_high=1008 -> should WAIT)
    res_wait = strategy.analyze_candle(df, 24, "RELIANCE.NS")
    assert res_wait["qualified"] is False
    assert res_wait["direction"] == "WAIT"
    
    # Now set candle 24 close above orb_high
    df.loc[df.index[24], 'close'] = 1015.0
    res_buy = strategy.analyze_candle(df, 24, "RELIANCE.NS")
    assert res_buy["qualified"] is True
    assert res_buy["direction"] == "BUY"
    assert res_buy["action"] == "ENTER_LONG"
    assert res_buy["proposed_entry"] == 1015.0
    # Stop = Entry - 1.5 * ATR (1015 - 1.5 * 5 = 1007.5)
    assert res_buy["stop_loss"] == 1007.5
    # Target = Entry + 2 * (1015 - 1007.5) = 1015 + 15 = 1030
    assert res_buy["target_price"] == 1030.0

def test_orb_strategy_time_restriction():
    strategy = OpeningRangeBreakoutStrategy()
    ist = pytz.timezone("Asia/Kolkata")
    
    # Pre-market / opening range candle at 09:20 (before 09:30)
    early_time = datetime.datetime(2026, 10, 26, 9, 20, tzinfo=ist)
    rows = []
    for i in range(25):
        rows.append({
            "timestamp": early_time,
            "open": 1000.0, "high": 1020.0, "low": 995.0, "close": 1015.0,
            "volume": 50000, "orb_high": 1000.0, "orb_low": 990.0,
            "vwap": 1005.0, "ema20": 1010.0, "ema50": 1000.0,
            "atr14": 4.0, "rel_volume": 2.0
        })
    df = pd.DataFrame(rows)
    res = strategy.analyze_candle(df, 24, "TCS.NS")
    # Must not qualify before 09:30
    assert res["qualified"] is False
    assert any("outside permitted entry window" in f for f in res["failed_conditions"])
