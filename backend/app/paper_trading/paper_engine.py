import uuid
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.models.trading_models import PaperAccount, PaperPosition, PaperOrder, PaperTrade
from backend.app.risk.risk_engine import RiskEngine, RiskParameters

class PaperTradingEngine:
    """
    Persistent Paper Trading and Virtual Broker Simulation.
    Stores and manages account equity, order execution, position tracking,
    and trade journals in SQLite.
    """
    
    def __init__(self, db: Session, risk_engine: Optional[RiskEngine] = None):
        self.db = db
        self.risk_engine = risk_engine or RiskEngine()
        self._ensure_account()

    def _ensure_account(self) -> PaperAccount:
        account = self.db.query(PaperAccount).filter(PaperAccount.id == "default").first()
        if not account:
            account = PaperAccount(
                id="default",
                currency="INR",
                initial_capital=100000.0,
                cash_balance=100000.0,
                equity=100000.0,
                realized_pnl=0.0,
                unrealized_pnl=0.0,
                peak_equity=100000.0,
                max_drawdown_pct=0.0,
                daily_entries_count=0
            )
            self.db.add(account)
            self.db.commit()
            self.db.refresh(account)
        return account

    def get_account(self) -> Dict[str, Any]:
        account = self._ensure_account()
        
        # Calculate real-time open positions & unrealized P&L
        positions = self.db.query(PaperPosition).filter(PaperPosition.account_id == account.id).all()
        total_unrealized = sum(p.unrealized_pnl for p in positions)
        total_equity = account.cash_balance + sum(p.quantity * p.current_price for p in positions)
        
        # Peak equity & Drawdown
        if total_equity > account.peak_equity:
            account.peak_equity = total_equity
        drawdown_pct = round(((account.peak_equity - total_equity) / account.peak_equity) * 100, 2) if account.peak_equity > 0 else 0.0
        
        account.equity = round(total_equity, 2)
        account.unrealized_pnl = round(total_unrealized, 2)
        account.max_drawdown_pct = drawdown_pct
        self.db.commit()

        # Trades stats
        trades = self.db.query(PaperTrade).filter(PaperTrade.account_id == account.id).all()
        winning_trades = [t for t in trades if t.realized_pnl > 0]
        win_rate = round((len(winning_trades) / len(trades)) * 100, 2) if trades else 0.0

        return {
            "id": account.id,
            "currency": account.currency,
            "initial_capital": account.initial_capital,
            "cash_balance": round(account.cash_balance, 2),
            "equity": round(account.equity, 2),
            "realized_pnl": round(account.realized_pnl, 2),
            "unrealized_pnl": round(account.unrealized_pnl, 2),
            "peak_equity": round(account.peak_equity, 2),
            "max_drawdown_pct": round(account.max_drawdown_pct, 2),
            "daily_entries_count": account.daily_entries_count,
            "is_kill_switch_active": account.is_kill_switch_active,
            "win_rate_pct": win_rate,
            "total_trades": len(trades),
            "open_positions_count": len(positions)
        }

    def place_order(
        self,
        symbol: str,
        side: str,
        quantity: int,
        requested_price: float,
        stop_loss: Optional[float] = None,
        target_price: Optional[float] = None,
        order_type: str = "MARKET",
        signal_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Submits and executes a simulated paper trade order.
        Validates risk limits, capital availability, and duplicates.
        """
        account = self._ensure_account()
        order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.datetime.utcnow()

        side = side.upper()
        if side not in ["BUY", "SELL"]:
            return {"status": "REJECTED", "error": "Invalid side. Must be BUY or SELL."}

        # Check existing positions
        existing_pos = self.db.query(PaperPosition).filter(
            PaperPosition.account_id == account.id,
            PaperPosition.symbol == symbol
        ).first()

        if side == "BUY":
            # Check duplicate
            if existing_pos:
                order = PaperOrder(
                    id=order_id,
                    account_id=account.id,
                    symbol=symbol,
                    side=side,
                    order_type=order_type,
                    quantity=quantity,
                    requested_price=requested_price,
                    status="REJECTED",
                    rejection_reason="Duplicate position already open for symbol",
                    signal_id=signal_id,
                    created_at=now
                )
                self.db.add(order)
                self.db.commit()
                return {"status": "REJECTED", "error": "An open position already exists for this symbol."}

            # Check risk and capital with freshly aggregated unrealized P&L
            positions = self.db.query(PaperPosition).filter(PaperPosition.account_id == account.id).all()
            total_unrealized = sum(p.unrealized_pnl for p in positions)
            account.unrealized_pnl = round(total_unrealized, 2)

            fill_price = self.risk_engine.calculate_execution_price_with_slippage(requested_price, "BUY")
            trade_val = quantity * fill_price
            fees = self.risk_engine.calculate_fees(trade_val)
            total_req = trade_val + fees

            is_eligible, reason = self.risk_engine.check_trade_eligibility(
                current_daily_entries=account.daily_entries_count,
                realized_daily_pnl=account.realized_pnl,
                unrealized_daily_pnl=account.unrealized_pnl,
                has_open_position_for_symbol=False,
                current_cash=account.cash_balance,
                required_capital=total_req
            )

            if not is_eligible:
                order = PaperOrder(
                    id=order_id,
                    account_id=account.id,
                    symbol=symbol,
                    side=side,
                    order_type=order_type,
                    quantity=quantity,
                    requested_price=requested_price,
                    status="REJECTED",
                    rejection_reason=reason,
                    signal_id=signal_id,
                    created_at=now
                )
                self.db.add(order)
                self.db.commit()
                return {"status": "REJECTED", "error": reason}

            # Execute BUY order
            account.cash_balance -= total_req
            account.daily_entries_count += 1
            
            sl = stop_loss if stop_loss else round(fill_price * 0.985, 2)
            tp = target_price if target_price else round(fill_price * 1.03, 2)

            pos = PaperPosition(
                account_id=account.id,
                symbol=symbol,
                quantity=quantity,
                average_entry_price=fill_price,
                current_price=fill_price,
                stop_loss=sl,
                target_price=tp,
                unrealized_pnl=0.0,
                unrealized_pnl_pct=0.0,
                entry_fees=fees,
                opened_at=now,
                strategy_id="orb_vwap_ema",
                signal_id=signal_id
            )
            self.db.add(pos)

            order = PaperOrder(
                id=order_id,
                account_id=account.id,
                symbol=symbol,
                side=side,
                order_type=order_type,
                quantity=quantity,
                requested_price=requested_price,
                executed_price=fill_price,
                stop_loss=sl,
                target_price=tp,
                status="FILLED",
                fees=fees,
                signal_id=signal_id,
                created_at=now,
                executed_at=now
            )
            self.db.add(order)
            self.db.commit()

            return {
                "status": "FILLED",
                "order_id": order_id,
                "symbol": symbol,
                "side": side,
                "quantity": quantity,
                "executed_price": fill_price,
                "stop_loss": sl,
                "target_price": tp,
                "fees": fees
            }

        elif side == "SELL":
            # Close existing position
            if not existing_pos:
                return {"status": "REJECTED", "error": "No open position exists to sell for this symbol."}

            fill_price = self.risk_engine.calculate_execution_price_with_slippage(requested_price, "SELL")
            qty = min(quantity, existing_pos.quantity)
            exit_val = qty * fill_price
            exit_fees = self.risk_engine.calculate_fees(exit_val)
            
            entry_fees_portion = round((existing_pos.entry_fees or 0.0) * (qty / existing_pos.quantity), 2)
            total_fees = round(entry_fees_portion + exit_fees, 2)
            
            gross_pnl = (fill_price - existing_pos.average_entry_price) * qty
            net_pnl = round(gross_pnl - total_fees, 2)
            pnl_pct = round((net_pnl / (existing_pos.average_entry_price * qty)) * 100, 2)

            # Update account:
            # Cash balance receives exit proceeds minus exit fees
            account.cash_balance += (exit_val - exit_fees)
            account.realized_pnl += net_pnl

            # Record Trade
            trade = PaperTrade(
                id=f"TRD-{uuid.uuid4().hex[:8].upper()}",
                account_id=account.id,
                order_id=order_id,
                symbol=symbol,
                side="BUY",
                quantity=qty,
                entry_price=existing_pos.average_entry_price,
                exit_price=fill_price,
                realized_pnl=net_pnl,
                realized_pnl_pct=pnl_pct,
                fees=total_fees,
                opened_at=existing_pos.opened_at,
                closed_at=now,
                exit_reason="MANUAL_CLOSE",
                strategy_id=existing_pos.strategy_id
            )
            self.db.add(trade)

            # Remove or reduce position
            if qty >= existing_pos.quantity:
                self.db.delete(existing_pos)
            else:
                existing_pos.quantity -= qty
                existing_pos.entry_fees = max(0.0, round(existing_pos.entry_fees - entry_fees_portion, 2))

            order = PaperOrder(
                id=order_id,
                account_id=account.id,
                symbol=symbol,
                side=side,
                order_type=order_type,
                quantity=qty,
                requested_price=requested_price,
                executed_price=fill_price,
                status="FILLED",
                fees=exit_fees,
                signal_id=signal_id,
                created_at=now,
                executed_at=now
            )
            self.db.add(order)
            self.db.commit()

            return {
                "status": "FILLED",
                "order_id": order_id,
                "symbol": symbol,
                "side": side,
                "quantity": qty,
                "executed_price": fill_price,
                "realized_pnl": net_pnl,
                "fees": exit_fees
            }

    def update_position_prices(self, price_map: Dict[str, float]):
        """Updates open positions with latest mark-to-market prices."""
        account = self._ensure_account()
        positions = self.db.query(PaperPosition).filter(PaperPosition.account_id == account.id).all()
        for pos in positions:
            if pos.symbol in price_map:
                curr_p = price_map[pos.symbol]
                pos.current_price = curr_p
                unrealized = round((curr_p - pos.average_entry_price) * pos.quantity, 2)
                pos.unrealized_pnl = unrealized
                pos.unrealized_pnl_pct = round((unrealized / (pos.average_entry_price * pos.quantity)) * 100, 2)
        self.db.commit()

    def simulate_candle_bar(self, symbol: str, candle: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Simulates a candle bar for an open position.
        Evaluates stop-loss and target triggers.
        Conservative conflict resolution: if both stop and target are touched,
        stop-loss is executed first.
        """
        account = self._ensure_account()
        pos = self.db.query(PaperPosition).filter(
            PaperPosition.account_id == account.id,
            PaperPosition.symbol == symbol
        ).first()
        if not pos:
            return None

        c_high = float(candle['high'])
        c_low = float(candle['low'])
        c_close = float(candle['close'])
        time_str = candle.get('time_str', '')
        if not time_str and 'timestamp' in candle:
            t = candle['timestamp']
            time_str = t.strftime("%H:%M") if hasattr(t, 'strftime') else str(t)[11:16]

        hit_target = c_high >= pos.target_price
        hit_stop = c_low <= pos.stop_loss
        
        exit_price = None
        exit_reason = None

        if hit_target and hit_stop:
            # Conservative principle: assume worst-case stop was hit first
            exit_price = pos.stop_loss
            exit_reason = "STOP_LOSS_CONSERVATIVE_CONFLICT"
        elif hit_stop:
            exit_price = pos.stop_loss
            exit_reason = "STOP_LOSS"
        elif hit_target:
            exit_price = pos.target_price
            exit_reason = "TARGET_2R"
        elif time_str >= "15:15":
            exit_price = c_close
            exit_reason = "INTRADAY_SQUARE_OFF"

        if exit_price is not None:
            result = self.place_order(
                symbol=symbol,
                side="SELL",
                quantity=pos.quantity,
                requested_price=exit_price,
                order_type="MARKET"
            )
            if result.get("status") == "FILLED":
                # Update exit_reason on trade record
                trade = self.db.query(PaperTrade).filter(
                    PaperTrade.account_id == account.id,
                    PaperTrade.symbol == symbol
                ).order_by(PaperTrade.closed_at.desc()).first()
                if trade:
                    trade.exit_reason = exit_reason
                    self.db.commit()
            result["exit_reason"] = exit_reason
            return result
        else:
            self.update_position_prices({symbol: c_close})
            return None

    def reset_account(self, initial_capital: float = 100000.0):
        """Resets virtual paper account for fresh simulations."""
        self.db.query(PaperOrder).delete()
        self.db.query(PaperTrade).delete()
        self.db.query(PaperPosition).delete()
        account = self._ensure_account()
        account.initial_capital = initial_capital
        account.cash_balance = initial_capital
        account.equity = initial_capital
        account.realized_pnl = 0.0
        account.unrealized_pnl = 0.0
        account.peak_equity = initial_capital
        account.max_drawdown_pct = 0.0
        account.daily_entries_count = 0
        account.is_kill_switch_active = False
        self.db.commit()
