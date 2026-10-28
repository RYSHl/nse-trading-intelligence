from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import pandas as pd

class BaseStrategy(ABC):
    """Abstract Base Class for Algorithmic Trading Strategies."""
    
    @property
    @abstractmethod
    def strategy_id(self) -> str:
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        pass

    @abstractmethod
    def analyze_candle(
        self, 
        df_indicators: pd.DataFrame, 
        candle_idx: int,
        symbol: str
    ) -> Dict[str, Any]:
        """
        Evaluates strategy conditions on the completed candle at candle_idx.
        Must return structured signal evaluation details.
        """
        pass
