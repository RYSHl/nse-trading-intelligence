from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import pandas as pd

class MarketDataProvider(ABC):
    """Abstract Base Class for Market Data Providers."""
    
    @abstractmethod
    def get_historical_candles(
        self, 
        symbol: str, 
        timeframe: str = "5m", 
        start_date: Optional[str] = None, 
        end_date: Optional[str] = None,
        limit: int = 500
    ) -> pd.DataFrame:
        """
        Fetches historical candles.
        Returns DataFrame with columns: ['timestamp', 'open', 'high', 'low', 'close', 'volume']
        Timestamps must be timezone-aware or normalized to Asia/Kolkata.
        """
        pass

    @abstractmethod
    def get_latest_quote(self, symbol: str) -> Dict[str, Any]:
        """Returns the latest quote and metadata for the given symbol."""
        pass

    @abstractmethod
    def get_market_status(self) -> Dict[str, Any]:
        """Returns the current market session status (OPEN, CLOSED, PRE_OPEN, etc.)."""
        pass

    @abstractmethod
    def get_instruments(self) -> List[Dict[str, Any]]:
        """Returns a list of supported tradeable instruments."""
        pass

    @abstractmethod
    def subscribe(self, symbols: List[str]) -> bool:
        """Subscribes to market updates for the symbols."""
        pass

    @abstractmethod
    def unsubscribe(self, symbols: List[str]) -> bool:
        """Unsubscribes from market updates."""
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Performs a provider connectivity and health verification check."""
        pass
