# NSE Trading Intelligence — REST API Documentation

The FastAPI backend provides interactive OpenAPI documentation at `/docs` and ReDoc at `/redoc`.

## Base URL
- Local direct: `http://localhost:8001/api`
- Vite dev proxy: `http://localhost:5173/api` (or port 3000 in AI Studio)

## Core Endpoints

### 1. Market & Health
- `GET /api/health` — Platform status, environment, and Asia/Kolkata server timestamp.
- `GET /api/market/status` — Returns NSE session status (`REGULAR_OPEN`, `PRE_OPEN`, `POST_CLOSE`, `REPLAY`), data provider, and freshness tags.
- `GET /api/market/watchlist` — List of monitored instruments with price, daily change %, trend, and signal status.
- `POST /api/market/watchlist` — Add instrument to universe (`{"symbol": "WIPRO.NS", "name": "Wipro Ltd"}`).
- `DELETE /api/market/watchlist/{symbol}` — Remove symbol from active universe.
- `GET /api/market/candles?symbol=RELIANCE.NS&timeframe=5m&limit=250` — Normalized OHLCV historical candles with Unix timestamps.

### 2. Scanner & Signals
- `GET /api/scanner` — Multi-factor screener results evaluating ORB, VWAP, EMA, and volume for all universe instruments.
- `GET /api/signals` — Active quantitative trade signals with entry, stop loss, target, quantity, and risk breakdown.
- `GET /api/signals/{signal_id}` — Detailed trade rationale, verified conditions, and sizing constraints for a signal.

### 3. Strategy Lab & Backtesting
- `GET /api/strategies` — Configurable strategy registry.
- `POST /api/backtests` — Event-driven historical simulation over candle history.
  ```json
  {
    "strategy_id": "orb_vwap_ema",
    "symbols": ["RELIANCE.NS"],
    "initial_capital": 100000,
    "parameters": {
      "ema_fast": 20,
      "ema_slow": 50,
      "volume_multiplier": 1.5,
      "target_rr": 2.0
    }
  }
  ```

### 4. Paper Trading Virtual Broker
- `GET /api/paper/account` — Real-time virtual equity, cash balance, realized P&L, unrealized P&L, and drawdown.
- `GET /api/paper/positions` — Active open positions with live mark-to-market valuations.
- `GET /api/paper/orders` — Auditable order ledger with timestamps and fill prices.
- `GET /api/paper/trades` — Closed trade journal with net realized returns and fees.
- `POST /api/paper/orders` — Submit simulated order:
  ```json
  {
    "symbol": "RELIANCE.NS",
    "side": "BUY",
    "quantity": 10,
    "requested_price": 2940.0,
    "stop_loss": 2910.0,
    "target_price": 3000.0
  }
  ```
- `POST /api/paper/positions/{symbol}/close` — Square off an open position at current market price.
- `POST /api/paper/reset` — Reset virtual balance to ₹100,000.

### 5. Risk Management & Replay
- `GET /api/risk/config` — View active risk parameters and kill switch status.
- `POST /api/risk/config` — Update institutional parameters (0.5% risk, 20% cap, 1.5% loss breaker).
- `POST /api/risk/kill-switch` — Emergency toggle to immediately lock all new executions.
- `POST /api/replay/step?steps=1` — Advance deterministic market replay pointer by N candles.
- `GET /api/data-sources/status` — Health and connectivity status of market data feeds.
