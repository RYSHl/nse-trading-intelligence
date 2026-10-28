import pandas as pd
import numpy as np
from typing import Dict, Any, Optional

def calculate_sma(series: pd.Series, period: int) -> pd.Series:
    """Calculates Simple Moving Average without look-ahead bias."""
    return series.rolling(window=period, min_periods=period).mean()

def calculate_ema(series: pd.Series, period: int) -> pd.Series:
    """Calculates Exponential Moving Average without look-ahead bias."""
    return series.ewm(span=period, adjust=False).mean()

def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Calculates Relative Strength Index (RSI14) using Wilder's smoothing."""
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    
    avg_gain = gain.ewm(alpha=1/period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/period, adjust=False).mean()
    
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50.0)

def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Calculates Average True Range (ATR14) without look-ahead bias."""
    high = df['high']
    low = df['low']
    close = df['close']
    
    prev_close = close.shift(1)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.ewm(alpha=1/period, adjust=False).mean()
    return atr

def calculate_session_vwap(df: pd.DataFrame) -> pd.Series:
    """
    Calculates intraday Session VWAP resetting at the start of each trading session.
    Using Asia/Kolkata timezone.
    VWAP = Cumulative(Typical Price * Volume) / Cumulative(Volume)
    """
    df = df.copy()
    if 'timestamp' in df.columns and not isinstance(df.index, pd.DatetimeIndex):
        df['datetime'] = pd.to_datetime(df['timestamp'])
        df = df.set_index('datetime')
    
    if df.index.tz is None:
        dt_index_ist = df.index.tz_localize("Asia/Kolkata")
    else:
        dt_index_ist = df.index.tz_convert("Asia/Kolkata")
    
    typical_price = (df['high'] + df['low'] + df['close']) / 3.0
    pv = typical_price * df['volume']
    
    # Group by trading date in IST
    date_group = dt_index_ist.normalize()
    cum_pv = pv.groupby(date_group).cumsum()
    cum_vol = df['volume'].groupby(date_group).cumsum()
    
    vwap = cum_pv / cum_vol.replace(0, np.nan)
    return vwap.ffill().fillna(typical_price)

def calculate_relative_volume(df: pd.DataFrame, period: int = 20) -> pd.Series:
    """
    Relative volume = current candle volume / 20-period completed SMA volume.
    Uses shift(1) so current candle's own volume doesn't bias the baseline!
    Requires full 20 completed periods without look-ahead bias.
    """
    prev_avg_vol = df['volume'].shift(1).rolling(window=period, min_periods=period).mean()
    rel_vol = df['volume'] / prev_avg_vol.replace(0, np.nan)
    return rel_vol

def calculate_opening_range(df: pd.DataFrame, orb_start="09:15", orb_end="09:30") -> pd.DataFrame:
    """
    Identifies Opening Range High and Low for each day from 09:15 to 09:30 IST.
    To avoid look-ahead bias, orb_high and orb_low are strictly set to NaN for candles
    prior to orb_end (09:30 IST). Only candles at or after 09:30 can access the completed ORB.
    """
    df = df.copy()
    if 'timestamp' in df.columns and not isinstance(df.index, pd.DatetimeIndex):
        df['datetime'] = pd.to_datetime(df['timestamp'])
        df = df.set_index('datetime')
        
    if df.index.tz is None:
        dt_index_ist = df.index.tz_localize("Asia/Kolkata")
    else:
        dt_index_ist = df.index.tz_convert("Asia/Kolkata")
        
    date_series = dt_index_ist.normalize()
    time_series = dt_index_ist.strftime("%H:%M")
    
    # Filter opening range candles (e.g. 09:15, 09:20, 09:25 candles completing by 09:30)
    orb_mask = (time_series >= orb_start) & (time_series < orb_end)
    orb_candles = df[orb_mask]
    
    daily_orb_high = orb_candles.groupby(date_series[orb_mask])['high'].max()
    daily_orb_low = orb_candles.groupby(date_series[orb_mask])['low'].min()
    
    mapped_high = date_series.map(daily_orb_high)
    mapped_low = date_series.map(daily_orb_low)
    
    # Mask out candles before orb_end to eliminate look-ahead bias
    after_orb_mask = time_series >= orb_end
    df['orb_high'] = np.where(after_orb_mask, mapped_high, np.nan)
    df['orb_low'] = np.where(after_orb_mask, mapped_low, np.nan)
    
    return df

def calculate_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes all standard indicators on the DataFrame in place.
    Requires columns: open, high, low, close, volume, timestamp/datetime.
    """
    df = df.copy()
    if 'timestamp' in df.columns and not isinstance(df.index, pd.DatetimeIndex):
        df['datetime'] = pd.to_datetime(df['timestamp'])
        df = df.set_index('datetime')
        
    df['ema20'] = calculate_ema(df['close'], 20)
    df['ema50'] = calculate_ema(df['close'], 50)
    df['sma20'] = calculate_sma(df['close'], 20)
    df['sma50'] = calculate_sma(df['close'], 50)
    df['rsi14'] = calculate_rsi(df['close'], 14)
    df['atr14'] = calculate_atr(df, 14)
    df['vwap'] = calculate_session_vwap(df)
    df['rel_volume'] = calculate_relative_volume(df, 20)
    
    df = calculate_opening_range(df, "09:15", "09:30")
    
    # Previous day high, low, close
    if df.index.tz is None:
        dt_index_ist = df.index.tz_localize("Asia/Kolkata")
    else:
        dt_index_ist = df.index.tz_convert("Asia/Kolkata")
    dates = dt_index_ist.normalize()
    daily_summary = df.groupby(dates).agg(
        day_high=('high', 'max'),
        day_low=('low', 'min'),
        day_close=('close', 'last')
    )
    prev_daily = daily_summary.shift(1)
    
    df['prev_day_high'] = dates.map(prev_daily['day_high'])
    df['prev_day_low'] = dates.map(prev_daily['day_low'])
    df['prev_day_close'] = dates.map(prev_daily['day_close'])
    
    return df
