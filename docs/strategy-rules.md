# Primary Intraday Strategy: ORB + VWAP + EMA + Volume Confirmation

## 1. Objective
A quantitative long-only breakout system designed for liquid NSE large-cap equities (e.g. RELIANCE, HDFCBANK, INFY, TCS, ICICIBANK).

## 2. Trading Session Rules (IST)
- **Regular NSE Cash Session**: 09:15 to 15:30 IST.
- **Opening Range Window**: 09:15 to 09:30 IST (the first three completed 5-minute candles: 09:15, 09:20, 09:25).
- **Opening Range High (ORB High)**: Maximum high recorded in the opening range window.
- **Opening Range Low (ORB Low)**: Minimum low recorded in the opening range window.
- **Allowed Entry Window**: 09:30 to 14:30 IST. No new trades may be opened after 14:30 IST.
- **Intraday Square-off**: 15:15 IST. All open intraday positions are squared off to avoid overnight cash margin risk.

## 3. Long Entry Conditions
A valid **BUY** signal candidate requires all of the following rules to be simultaneously satisfied on a completed 5-minute candle:

1. **ORB Breakout**: Completed candle close > Opening Range High (`close > orb_high`).
2. **VWAP Confirmation**: Completed candle close > Session VWAP (`close > vwap`).
3. **EMA Trend Alignment**: Fast EMA20 > Slow EMA50 (`ema20 > ema50`).
4. **Volume Confirmation**: Current candle volume $\ge 1.5 \times$ the 20-period completed candle average.
5. **Volatility Validity**: ATR14 is valid, positive, and non-zero.
6. **Time-of-Day Window**: Signal timestamp is between 09:30 and 14:30 IST.
7. **Risk Governance**:
   - Daily loss circuit breaker not triggered ($\text{Daily P&L} > -1.5\%$).
   - Daily entry limit not exceeded ($\text{Trades today} < 3$).
   - No duplicate open position exists for the symbol.
   - Emergency kill switch is inactive.
   - Account has sufficient cash margin.

## 4. Exit Rules
1. **Profit Target (2R)**:
   $$\text{Stop Loss} = \text{Entry} - (1.5 \times \text{ATR14})$$
   $$\text{Target Price} = \text{Entry} + 2 \times (\text{Entry} - \text{Stop Loss})$$
2. **Stop Loss Hit**: Intraday candle touches or drops below the calculated Stop Loss level.
3. **VWAP Reversal**: Completed candle closes below Session VWAP (`close < vwap`).
4. **Time Square-off**: Time reaches 15:15 IST.
5. **Intrabar Same-Candle Resolution**: If both stop-loss and target are touched within the exact same candle, the conservative principle applies: the stop-loss fill is assumed to have occurred first.
