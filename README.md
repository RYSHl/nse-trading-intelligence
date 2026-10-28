# NSE Trading Intelligence — Algorithmic Market Platform

A high-performance algorithmic trading intelligence, technical scanning, strategy backtesting, and persistent paper execution workstation engineered for the **National Stock Exchange of India (NSE)**.

---

## Key Features

1. **Intraday Strategy Engine:**
   - **ORB + VWAP + EMA + Volume Confirmation**: 09:15–09:30 Opening Range High breakout, Session VWAP confirmation, EMA20 > EMA50 trend alignment, relative volume $\ge 1.5\times$, ATR14 volatility sizing, and 09:30–14:30 entry window.
2. **Institutional Risk Engine:**
   - Standard 0.5% risk budget per trade, 20% max single-stock capital cap, 3 max daily entries, and $-1.5\%$ daily loss circuit breaker with one-click emergency kill switch.
3. **Interactive Financial Terminal:**
   - High-density dark workstation built with React 19, Tailwind CSS, and `lightweight-charts`.
   - Real-time technical overlays: EMA20, EMA50, Session VWAP, Opening Range markers, and Entry/Stop/Target price lines.
4. **Market Scanner:**
   - Scans NSE large-cap universe with multi-condition rules verification, pass/fail counts, and sector filtering.
5. **Event-Driven Backtester:**
   - Simulates bar-by-bar historical performance with next-candle open fills, 5 bps slippage, 3 bps exchange fees, and conservative same-candle stop/target resolution.
6. **Persistent Paper Trading Virtual Broker:**
   - SQLite-backed account with realistic order execution ledger, open position mark-to-market tracking, and trade journal.
7. **Future Zerodha Kite Connect Prepared Architecture:**
   - Dedicated server-side broker adapter with mandatory manual user approval gates (strictly offline in this phase).

---

## Directory Layout

```
.
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI endpoints & routes
│   │   ├── core/              # Global settings, NSE market hours, timezone
│   │   ├── data/providers/    # MarketDataProvider: Yahoo, Replay, Kite
│   │   ├── indicators/        # Technical indicators (EMA, ATR, VWAP, ORB)
│   │   ├── strategies/        # ORB + VWAP + EMA intraday strategy
│   │   ├── signals/           # Structured signal generator
│   │   ├── risk/              # RiskEngine (position sizing & circuit breakers)
│   │   ├── backtesting/       # Event-driven backtesting engine
│   │   ├── paper_trading/     # Persistent paper broker simulator
│   │   ├── brokers/           # Prepared Zerodha Kite Connect adapter
│   │   ├── database/          # SQLAlchemy session & SQLite engine
│   │   ├── models/            # Database schema models
│   │   ├── schemas/           # Pydantic request/response models
│   │   └── main.py            # FastAPI application entry point
│   ├── tests/                 # Automated pytest suite (18 unit/integration tests)
│   └── requirements.txt
├── src/
│   ├── components/            # Header, Sidebar, Charts, Modals, Panels
│   ├── pages/                 # All 11 platform views
│   ├── services/api.ts        # Type-safe API client
│   ├── store/                 # Zustand global trading store
│   └── types/                 # TypeScript interfaces
├── scripts/
│   ├── setup.sh               # One-step local development setup
│   ├── start-dev.sh           # Starts backend and frontend
│   └── stop-dev.sh            # Clean process shutdown
├── docs/                      # Architectural & integration specifications
└── README.md
```

---

## Quick Start (macOS & Linux)

### 1. Setup
```bash
./scripts/setup.sh
```

### 2. Launch
```bash
./scripts/start-dev.sh
```
- **Web Terminal:** `http://localhost:5173` (or `http://localhost:3000`)
- **FastAPI Backend:** `http://127.0.0.1:8001`
- **Interactive Swagger Docs:** `http://127.0.0.1:8001/docs`

### 3. Run Automated Tests
```bash
PYTHONPATH=. pytest backend/tests -v
```

### 4. Stop Services
```bash
./scripts/stop-dev.sh
```

---

## Risk & Compliance Notice
This software is provided exclusively for research, algorithmic testing, and paper simulation. It does not provide financial advice, make guarantees of future performance, or execute live exchange transactions without explicit human approval.
