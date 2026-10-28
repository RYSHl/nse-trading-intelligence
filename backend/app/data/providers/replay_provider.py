import datetime
import pytz
import pandas as pd
from typing import List, Dict, Any, Optional
from backend.app.data.providers.base import MarketDataProvider
from backend.app.data.providers.synthetic_feed import generate_synthetic_nse_candles, NSE_BASE_PRICES

class ReplayDataProvider(MarketDataProvider):
    """
    Deterministic historical replay provider that advances through stored historical candles.
    Simulates real-time market arrivals candle-by-candle without lookahead bias.
    """
    
    def __init__(self, default_symbol: str = "RELIANCE.NS"):
        self.ist = pytz.timezone("Asia/Kolkata")
        self.symbol = self._normalize_symbol(default_symbol)
        self._candles_by_symbol: Dict[str, pd.DataFrame] = {
            self.symbol: generate_synthetic_nse_candles(self.symbol, days=5, timeframe="5m")
        }
        self._current_index: int = min(40, len(self._candles_by_symbol[self.symbol]) - 1)
        self._is_playing: bool = False

    def _normalize_symbol(self, symbol: str) -> str:
        symbol = symbol.strip().upper()
        if not symbol.endswith(".NS") and not symbol.endswith(".BO"):
            symbol = f"{symbol}.NS"
        return symbol

    def _get_symbol_candles(self, symbol: str) -> pd.DataFrame:
        clean = self._normalize_symbol(symbol)
        if clean not in self._candles_by_symbol:
            self._candles_by_symbol[clean] = generate_synthetic_nse_candles(clean, days=5, timeframe="5m")
        return self._candles_by_symbol[clean]

    def step(self, steps: int = 1) -> Optional[Dict[str, Any]]:
        """Advances replay pointer by N candles."""
        candles = self._get_symbol_candles(self.symbol)
        if self._current_index + steps < len(candles):
            self._current_index += steps
            return self.get_latest_quote(self.symbol)
        return None

    def reset(self, start_index: int = 40):
        candles = self._get_symbol_candles(self.symbol)
        self._current_index = min(start_index, len(candles) - 1)

    def get_historical_candles(
        self, 
        symbol: str, 
        timeframe: str = "5m", 
        start_date: Optional[str] = None, 
        end_date: Optional[str] = None,
        limit: int = 500
    ) -> pd.DataFrame:
        candles = self._get_symbol_candles(symbol)
        idx = min(self._current_index, len(candles) - 1)
        visible = candles.iloc[:idx + 1].copy()
        visible['source'] = 'replay'
        return visible.tail(limit)

    def get_latest_quote(self, symbol: str) -> Dict[str, Any]:
        candles = self._get_symbol_candles(symbol)
        idx = min(self._current_index, len(candles) - 1)
        curr = candles.iloc[idx]
        prev = candles.iloc[idx - 1] if idx > 0 else curr
        change = round(float(curr['close'] - prev['close']), 2)
        change_pct = round(float((change / prev['close']) * 100) if prev['close'] else 0.0, 2)
        
        return {
            "symbol": self._normalize_symbol(symbol),
            "price": round(float(curr['close']), 2),
            "open": round(float(curr['open']), 2),
            "high": round(float(curr['high']), 2),
            "low": round(float(curr['low']), 2),
            "close": round(float(curr['close']), 2),
            "volume": int(curr['volume']),
            "change": change,
            "change_pct": change_pct,
            "timestamp": curr['timestamp'].isoformat() if hasattr(curr['timestamp'], 'isoformat') else str(curr['timestamp']),
            "source": "replay",
            "freshness": "REPLAY",
            "replay_index": self._current_index,
            "total_candles": len(candles)
        }

    def get_market_status(self) -> Dict[str, Any]:
        candles = self._get_symbol_candles(self.symbol)
        idx = min(self._current_index, len(candles) - 1)
        curr = candles.iloc[idx]
        return {
            "market": "NSE",
            "is_open": True,
            "session_status": "REPLAY_SIMULATION",
            "current_time_ist": str(curr['timestamp']),
            "data_provider": "Deterministic Historical Replay",
            "freshness": "REPLAY",
            "warning": "Deterministic replay active. Candle data advances without live exchange connection."
        }

    def get_instruments(self) -> List[Dict[str, Any]]:
        return [
            {"symbol": sym, "name": sym.replace(".NS", ""), "exchange": "NSE", "base_price": price}
            for sym, price in NSE_BASE_PRICES.items()
        ]

    def subscribe(self, symbols: List[str]) -> bool:
        return True

    def unsubscribe(self, symbols: List[str]) -> bool:
        return True

    def health_check(self) -> Dict[str, Any]:
        candles = self._get_symbol_candles(self.symbol)
        return {
            "status": "HEALTHY",
            "provider": "ReplayDataProvider",
            "current_index": self._current_index,
            "total_candles": len(candles),
            "freshness": "REPLAY"
        }
