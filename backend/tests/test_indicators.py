import pytest
import pandas as pd
import numpy as np
import datetime
import pytz
from backend.app.indicators.technical import (
    calculate_ema, calculate_sma, calculate_rsi, calculate_atr,
    calculate_session_vwap, calculate_relative_volume, calculate_opening_range,
    calculate_all_indicators
)

def create_sample_candle_df():
    ist = pytz.timezone("Asia/Kolkata")
    base_time = datetime.datetime(2026, 10, 26, 9, 15, tzinfo=ist)
    data = []
    
    # Generate 50 5-minute candles
    price = 1000.0
    for i in range(50):
        t = base_time + datetime.timedelta(minutes=i * 5)
        o = price
        c = price * (1 + 0.001 * (1 if i % 2 == 0 else -0.8))
        h = max(o, c) + 2.0
        l = min(o, c) - 2.0
        v = 10000 + (5000 if i % 3 == 0 else 0)
        price = c
        data.append({"timestamp": t, "open": o, "high": h, "low": l, "close": c, "volume": v})
        
    df = pd.DataFrame(data)
    df['datetime'] = df['timestamp']
    df = df.set_index('datetime')
    return df

def test_ema_calculation():
    df = create_sample_candle_df()
    ema20 = calculate_ema(df['close'], 20)
    assert len(ema20) == len(df)
    assert not ema20.isna().all()
    # Check that EMA smooths values
    assert abs(ema20.iloc[-1] - df['close'].iloc[-1]) < 50.0

def test_rsi_calculation():
    df = create_sample_candle_df()
    rsi = calculate_rsi(df['close'], 14)
    assert len(rsi) == len(df)
    assert (rsi >= 0.0).all() and (rsi <= 100.0).all()

def test_atr_calculation():
    df = create_sample_candle_df()
    atr = calculate_atr(df, 14)
    assert len(atr) == len(df)
    assert (atr > 0.0).all()

def test_vwap_calculation():
    df = create_sample_candle_df()
    vwap = calculate_session_vwap(df)
    assert len(vwap) == len(df)
    assert (vwap > 0.0).all()
    # VWAP should be close to close price
    assert abs(vwap.iloc[-1] - df['close'].iloc[-1]) < 30.0

def test_opening_range_calculation():
    df = create_sample_candle_df()
    df_orb = calculate_opening_range(df, "09:15", "09:30")
    assert 'orb_high' in df_orb.columns
    assert 'orb_low' in df_orb.columns
    # Check that high >= low
    assert (df_orb['orb_high'].dropna() >= df_orb['orb_low'].dropna()).all()

def test_all_indicators_pipeline():
    df = create_sample_candle_df()
    df_result = calculate_all_indicators(df)
    expected_cols = ['ema20', 'ema50', 'sma20', 'sma50', 'rsi14', 'atr14', 'vwap', 'rel_volume', 'orb_high', 'orb_low']
    for col in expected_cols:
        assert col in df_result.columns
