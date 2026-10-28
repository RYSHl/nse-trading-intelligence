# NSE Trading Intelligence — System Architecture

## 1. System Overview

NSE Trading Intelligence is a quantitative market-analysis, technical screening, strategy backtesting, and paper execution platform engineered for the National Stock Exchange of India (NSE).

```
                      +---------------------------------------+
                      |       React 19 Frontend Terminal      |
                      |   (Vite + Tailwind + LightweightCh.)  |
                      +---------------------------------------+
                                          |
                                    REST API /api
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                            FastAPI Backend (Port 8001)                            |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  | Market Data Engine |-->| Indicator Engine      |-->| Strategy Engine        |  |
|  | (Yahoo/Replay/Kite)|   | (EMA, ATR, VWAP, ORB) |   | (ORB + VWAP + EMA+Vol) |  |
|  +--------------------+   +-----------------------+   +------------------------+  |
|            |                                                       |              |
|            v                                                       v              |
|  +--------------------+                           +----------------------------+  |
|  | SQLite Persistence |<--------------------------| Institutional Risk Engine  |  |
|  | (SQLAlchemy / WAL) |                           | (0.5% Risk, 20% Cap, Loss) |  |
|  +--------------------+                           +----------------------------+  |
|            |                                                       |              |
|            v                                                       v              |
|  +--------------------+                               +------------------------+  |
|  | Backtesting Engine |                               | Paper Trading Engine   |  |
|  | (Next-bar fills)   |                               | (Ledger & Journal)     |  |
|  +--------------------+                               +------------------------+  |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |   Zerodha Kite Connect (Future Phase) |
                      |    (Manual User Approval Required)    |
                      +---------------------------------------+
```

## 2. Core Subsystems

### 2.1 Market Data Engine (`backend/app/data/providers/`)
- **YahooHistoricalProvider**: Ingests historical 5-minute and daily candles using `yfinance`. Automatically normalizes datetime stamps to `Asia/Kolkata` (IST), deduplicates records, checks freshness, and maintains an in-memory & SQLite cache.
- **ReplayDataProvider**: Deterministic bar-by-bar market step simulator. Emits candles up to the current simulated playback point, preventing look-ahead bias during strategy testing.
- **KiteMarketDataProvider**: Disabled interface placeholder. Strictly enforces no fabricated live data and prevents live orders without explicit user approval.

### 2.2 Indicator Engine (`backend/app/indicators/technical.py`)
- **Exponential Moving Averages (EMA20, EMA50)**: Recursive exponential weighting without future leaks.
- **Session VWAP**: Cumulative Typical Price $\times$ Volume divided by Cumulative Volume, resetting at 09:15 IST daily.
- **Opening Range (ORB)**: High and Low levels calculated strictly over the 09:15–09:30 IST window (the first three completed 5-minute candles).
- **Average True Range (ATR14)**: Volatility measure using Wilder's smoothing.
- **Relative Volume**: Current candle volume divided by the 20-period moving average of previous completed candle volumes (`shift(1)`).

### 2.3 Institutional Risk Engine (`backend/app/risk/risk_engine.py`)
- **Risk Budget**: $\text{Equity} \times 0.5\%$.
- **Risk per Share**: $\text{Entry Price} - \text{Stop Loss Price}$.
- **Quantity by Risk**: $\lfloor \text{Risk Budget} / \text{Risk per Share} \rfloor$.
- **Quantity by Capital**: $\lfloor (\text{Equity} \times 20\%) / \text{Entry Price} \rfloor$.
- **Final Position Size**: $\min(\text{Qty by Risk}, \text{Qty by Capital})$.
- **Circuit Breaker**: Locks all new trade entries when cumulative daily loss (Realized + Unrealized) reaches $-1.5\%$ of starting equity.
- **Emergency Kill Switch**: One-click manual block on all execution.

### 2.4 Backtesting Simulator (`backend/app/backtesting/backtester.py`)
- Event-driven bar-by-bar progression.
- Signals generated on completed candle; fills executed at next candle's open with 5 bps slippage.
- Conservative same-candle conflict assumption: If both stop-loss and target are touched within the same candle, the stop-loss is assumed to have triggered first.
