# Zerodha Kite Connect Integration Plan (Future Phase)

## 1. Scope & Security Directives
This document establishes the architecture for future live market data ingestion and order execution through Zerodha's Kite Connect API v3.

**MANDATORY SAFETY CONSTRAINTS:**
1. **Explicit Manual User Approval**: The system must NEVER auto-submit a live order merely because a BUY or SELL signal was triggered. The pipeline mandates explicit user confirmation in the UI.
2. **Strict Server-Side Isolation**: Real credentials (API Key, API Secret, Request Token, Access Token) must NEVER be exposed in frontend bundles or committed to source control.
3. **No Fabricated Live Data**: During development, paper trading, and backtesting, all market feeds must be clearly labeled as `HISTORICAL`, `DELAYED`, or `REPLAY`.

## 2. End-to-End Live Processing Pipeline

```
Zerodha Kite Ticker (WebSocket)
               |
               v
      Tick Validation (LTP, Volume, Bad Tick Filtering)
               |
               v
      5-Minute Candle Aggregator (09:15 - 15:30 IST)
               |
               v
      Indicator Engine (EMA, ATR, VWAP, ORB)
               |
               v
      Strategy Engine (Rule Evaluation on Completed Bar)
               |
               v
      Institutional Risk Engine (0.5% Sizing, Daily Loss Breaker)
               |
               v
      Signal Dashboard (Visual Alert with Calculated Levels)
               |
               v
      [MANUAL USER CONFIRMATION MODAL]
               |
               v
      Kite Connect REST API (Order Execution Adapter)
```

## 3. Dedicated Broker Adapter Interface (`backend/app/brokers/kite_adapter.py`)
- Authentication session exchange (`generate_login_url`, `authenticate_session`)
- Instrument master synchronization (`NSE:RELIANCE-EQ`, etc.)
- WebSocket tick streaming with reconnection backoff
- Rate limit handling (3 requests/second order limits; 10 requests/second quote limits)
- Order status reconciliation & audit logging.

## 4. Activation Steps (When Ready for Live Integration)
1. Obtain Kite Connect developer app subscription from Zerodha.
2. Configure `KITE_API_KEY` and `KITE_API_SECRET` in local `.env` (never commit).
3. Set `KITE_ENABLED=true`.
4. Perform daily morning login to refresh OAuth access token before market open (09:00 IST).
