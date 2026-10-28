import os
from pydantic import BaseModel
from typing import List

class Settings(BaseModel):
    PROJECT_NAME: str = "NSE Trading Intelligence"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Server network settings
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8001"))
    
    # Market & Timezone
    TIMEZONE: str = os.getenv("TIMEZONE", "Asia/Kolkata")
    DEFAULT_MARKET: str = os.getenv("DEFAULT_MARKET", "NSE")
    
    # Market Data Provider: 'yahoo' (historical research) or 'replay' (deterministic simulation)
    MARKET_DATA_PROVIDER: str = os.getenv("MARKET_DATA_PROVIDER", "yahoo").lower()
    DATA_CACHE_TTL_SECONDS: int = int(os.getenv("DATA_CACHE_TTL_SECONDS", "300"))
    
    # NSE Trading Hours (IST)
    MARKET_OPEN_TIME: str = "09:15"
    MARKET_CLOSE_TIME: str = "15:30"
    ORB_END_TIME: str = "09:30"
    NO_ENTRY_AFTER_TIME: str = "14:30"
    INTRADAY_SQUARE_OFF_TIME: str = "15:15"
    
    # Database: SQLite for safe zero-config local development, PostgreSQL ready for production
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./nse_trading.db")
    
    # Risk Defaults
    STARTING_CAPITAL: float = 100000.0  # ₹100,000
    DEFAULT_RISK_PER_TRADE_PCT: float = 0.5  # 0.5%
    DEFAULT_MAX_POSITION_ALLOCATION_PCT: float = 20.0  # 20%
    DEFAULT_MAX_ENTRIES_PER_DAY: int = 3
    DEFAULT_DAILY_LOSS_THRESHOLD_PCT: float = 1.5  # 1.5%
    DEFAULT_TARGET_RR: float = 2.0  # 2R
    DEFAULT_SLIPPAGE_BPS: float = 5.0  # 5 bps (0.05%)
    DEFAULT_FEES_BPS: float = 3.0  # 3 bps (0.03%)
    
    # Initial Watchlist Universe
    INITIAL_WATCHLIST: List[dict] = [
        {"symbol": "RELIANCE.NS", "name": "Reliance Industries Ltd", "sector": "Energy"},
        {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Ltd", "sector": "Financial Services"},
        {"symbol": "ICICIBANK.NS", "name": "ICICI Bank Ltd", "sector": "Financial Services"},
        {"symbol": "SBIN.NS", "name": "State Bank of India", "sector": "Financial Services"},
        {"symbol": "INFY.NS", "name": "Infosys Ltd", "sector": "Technology"},
        {"symbol": "TCS.NS", "name": "Tata Consultancy Services Ltd", "sector": "Technology"},
        {"symbol": "ITC.NS", "name": "ITC Ltd", "sector": "Consumer Goods"},
        {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel Ltd", "sector": "Telecommunications"},
        {"symbol": "LT.NS", "name": "Larsen & Toubro Ltd", "sector": "Construction"},
        {"symbol": "AXISBANK.NS", "name": "Axis Bank Ltd", "sector": "Financial Services"},
    ]
    
    # Future Kite Connect Settings (Strictly disabled by default for local development)
    KITE_ENABLED: bool = os.getenv("KITE_ENABLED", "false").lower() == "true"
    KITE_API_KEY: str = os.getenv("KITE_API_KEY", "")

settings = Settings()
