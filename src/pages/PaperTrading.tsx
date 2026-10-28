import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PaperOrder, PaperPosition, PaperTrade } from '../types';
import { useTradingStore } from '../store/useTradingStore';
import { MetricCard } from '../components/common/MetricCard';
import { FileCheck2, RotateCcw, Plus, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const PaperTrading: React.FC = () => {
  const { paperAccount, openPositions, watchlist, fetchPaperAccount, setNotification } = useTradingStore();
  const [orders, setOrders] = useState<PaperOrder[]>([]);
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // New order form state
  const [orderSymbol, setOrderSymbol] = useState('RELIANCE.NS');
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderQty, setOrderQty] = useState(10);
  const [orderPrice, setOrderPrice] = useState(2940.0);
  const [orderStop, setOrderStop] = useState(2900.0);
  const [orderTarget, setOrderTarget] = useState(3020.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = () => {
    fetchPaperAccount();
    api.getPaperOrders().then(setOrders).catch(console.error);
    api.getPaperTrades().then(setTrades).catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenOrderModal = (sym?: string) => {
    const targetSym = sym || orderSymbol;
    const item = watchlist.find((w) => w.symbol === targetSym);
    const p = item?.last_price || 2000.0;
    setOrderSymbol(targetSym);
    setOrderPrice(p);
    setOrderStop(Number((p * 0.985).toFixed(2)));
    setOrderTarget(Number((p * 1.03).toFixed(2)));
    setIsOrderModalOpen(true);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.submitPaperOrder({
        symbol: orderSymbol,
        side: orderSide,
        quantity: orderQty,
        requested_price: orderPrice,
        stop_loss: orderStop,
        target_price: orderTarget,
      });

      setNotification({
        message: `Paper order executed: ${orderSide} ${orderQty} ${orderSymbol} @ ₹${res.executed_price.toFixed(2)}`,
        type: 'success',
      });
      setIsOrderModalOpen(false);
      loadData();
    } catch (err: any) {
      setNotification({ message: err.message || 'Order rejected by risk engine', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClosePosition = async (sym: string) => {
    try {
      await api.closePaperPosition(sym);
      setNotification({ message: `Position closed for ${sym}.`, type: 'info' });
      loadData();
    } catch (err: any) {
      setNotification({ message: err.message || 'Failed to close position', type: 'error' });
    }
  };

  const handleResetAccount = async () => {
    if (!window.confirm('Reset virtual paper trading account to ₹100,000 cash?')) return;
    try {
      await api.resetPaperAccount();
      setNotification({ message: 'Paper trading account reset successfully.', type: 'info' });
      loadData();
    } catch (err: any) {
      setNotification({ message: err.message || 'Failed to reset account', type: 'error' });
    }
  };

  const equity = paperAccount?.equity ?? 100000.0;
  const cash = paperAccount?.cash_balance ?? 100000.0;
  const realizedPnl = paperAccount?.realized_pnl ?? 0.0;
  const unrealizedPnl = paperAccount?.unrealized_pnl ?? 0.0;
  const winRate = paperAccount?.win_rate_pct ?? 0.0;
  const totalTrades = paperAccount?.total_trades ?? 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0b0f17] p-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-blue-400" />
            <span>Virtual Paper Trading Terminal</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Persistent simulated broker execution in SQLite. Strictly isolated from real exchange accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetAccount}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Account</span>
          </button>

          <button
            onClick={() => handleOpenOrderModal()}
            className="flex items-center gap-2 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Paper Order</span>
          </button>
        </div>
      </div>

      {/* Account Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
        <MetricCard label="TOTAL EQUITY" value={`₹${equity.toLocaleString('en-IN')}`} kicker="INR" />
        <MetricCard label="UNENCUMBERED CASH" value={`₹${cash.toLocaleString('en-IN')}`} kicker="AVAILABLE" />
        <MetricCard
          label="REALIZED P&L"
          value={`${realizedPnl >= 0 ? '+' : ''}₹${realizedPnl.toFixed(2)}`}
          trend={realizedPnl >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="UNREALIZED P&L"
          value={`${unrealizedPnl >= 0 ? '+' : ''}₹${unrealizedPnl.toFixed(2)}`}
          trend={unrealizedPnl >= 0 ? 'positive' : 'negative'}
        />
        <MetricCard label="WIN RATE" value={`${winRate.toFixed(1)}%`} subValue={`${totalTrades} trades`} />
        <MetricCard label="OPEN POSITIONS" value={openPositions.length} kicker="INTRA-DAY" />
      </div>

      {/* Open Positions Section */}
      <div className="bg-[#0d121d] border border-slate-800 rounded-lg mt-6 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-[#090d15] flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Open Virtual Positions ({openPositions.length})
          </h2>
          <span className="text-[10px] text-slate-300 font-mono">MARKED-TO-MARKET</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0b0f17] text-slate-300 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-2.5">SYMBOL</th>
                <th className="px-4 py-2.5">QUANTITY</th>
                <th className="px-4 py-2.5">ENTRY PRICE</th>
                <th className="px-4 py-2.5">MARKET PRICE</th>
                <th className="px-4 py-2.5">STOP LOSS</th>
                <th className="px-4 py-2.5">TARGET</th>
                <th className="px-4 py-2.5">UNREALIZED P&L</th>
                <th className="px-4 py-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
              {openPositions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-300 font-sans">
                    No active positions currently open. Place a paper order above.
                  </td>
                </tr>
              ) : (
                openPositions.map((pos) => {
                  const isProfit = pos.unrealized_pnl >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-white">{pos.symbol.replace('.NS', '')}</td>
                      <td className="px-4 py-2.5 tabular-nums">{pos.quantity}</td>
                      <td className="px-4 py-2.5 tabular-nums">₹{pos.average_entry_price.toFixed(2)}</td>
                      <td className="px-4 py-2.5 tabular-nums">₹{pos.current_price.toFixed(2)}</td>
                      <td className="px-4 py-2.5 tabular-nums text-rose-400">₹{pos.stop_loss.toFixed(2)}</td>
                      <td className="px-4 py-2.5 tabular-nums text-emerald-400">₹{pos.target_price.toFixed(2)}</td>
                      <td
                        className={`px-4 py-2.5 tabular-nums font-semibold ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isProfit ? '+' : ''}₹{pos.unrealized_pnl.toFixed(2)} ({isProfit ? '+' : ''}
                        {pos.unrealized_pnl_pct.toFixed(2)}%)
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleClosePosition(pos.symbol)}
                          className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[10px] font-semibold transition-colors"
                        >
                          Close Position
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orders Ledger & Trade Journal Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Order Execution Ledger */}
        <div className="bg-[#0d121d] border border-slate-800 rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-[#090d15] flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Auditable Order Ledger ({orders.length})
            </h2>
            <span className="text-[10px] text-slate-300 font-mono">DETERMINISTIC FILLS</span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0b0f17] text-slate-300 font-mono text-[11px] sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">SYMBOL</th>
                  <th className="px-4 py-2">SIDE</th>
                  <th className="px-4 py-2">QTY</th>
                  <th className="px-4 py-2">STATUS</th>
                  <th className="px-4 py-2">TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-300 font-sans">
                      No order ledger records.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2 text-slate-400">{ord.id.slice(0, 12)}</td>
                      <td className="px-4 py-2 font-bold text-white">{ord.symbol.replace('.NS', '')}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`font-semibold ${
                            ord.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {ord.side}
                        </span>
                      </td>
                      <td className="px-4 py-2 tabular-nums">{ord.quantity}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            ord.status === 'FILLED'
                              ? 'bg-emerald-950 text-emerald-400'
                              : 'bg-rose-950 text-rose-400'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-300">{new Date(ord.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Realized Trade Journal */}
        <div className="bg-[#0d121d] border border-slate-800 rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-[#090d15] flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Closed Trade Journal ({trades.length})
            </h2>
            <span className="text-[10px] text-slate-300 font-mono">REALIZED P&L</span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0b0f17] text-slate-300 font-mono text-[11px] sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2">SYMBOL</th>
                  <th className="px-4 py-2">QTY</th>
                  <th className="px-4 py-2">ENTRY</th>
                  <th className="px-4 py-2">EXIT</th>
                  <th className="px-4 py-2">NET P&L</th>
                  <th className="px-4 py-2">REASON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-300 font-sans">
                      No closed paper trades yet.
                    </td>
                  </tr>
                ) : (
                  trades.map((tr) => {
                    const isProfit = tr.realized_pnl >= 0;
                    return (
                      <tr key={tr.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-2 font-bold text-white">{tr.symbol.replace('.NS', '')}</td>
                        <td className="px-4 py-2 tabular-nums">{tr.quantity}</td>
                        <td className="px-4 py-2 tabular-nums">₹{tr.entry_price.toFixed(2)}</td>
                        <td className="px-4 py-2 tabular-nums">
                          {tr.exit_price ? `₹${tr.exit_price.toFixed(2)}` : '—'}
                        </td>
                        <td
                          className={`px-4 py-2 tabular-nums font-semibold ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}₹{tr.realized_pnl.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-slate-400">{tr.exit_reason || 'MANUAL'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Order Placement Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d121d] border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-[#090d15]">
              <h3 className="text-sm font-semibold text-white">Submit Virtual Paper Order</h3>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="p-5 space-y-4 text-xs font-sans">
              <div>
                <label className="text-slate-300 block mb-1">Stock Symbol (NSE):</label>
                <select
                  value={orderSymbol}
                  onChange={(e) => {
                    const sym = e.target.value;
                    setOrderSymbol(sym);
                    const item = watchlist.find((w) => w.symbol === sym);
                    if (item) setOrderPrice(item.last_price);
                  }}
                  className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-700 rounded text-white font-mono"
                >
                  {watchlist.map((w) => (
                    <option key={w.symbol} value={w.symbol}>
                      {w.symbol.replace('.NS', '')} — {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Side:</label>
                  <div className="grid grid-cols-2 gap-1 bg-[#0b0f17] p-1 border border-slate-800 rounded">
                    <button
                      type="button"
                      onClick={() => setOrderSide('BUY')}
                      className={`py-1 rounded font-bold text-center transition-colors ${
                        orderSide === 'BUY' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderSide('SELL')}
                      className={`py-1 rounded font-bold text-center transition-colors ${
                        orderSide === 'SELL' ? 'bg-rose-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Quantity:</label>
                  <input
                    type="number"
                    min="1"
                    value={orderQty}
                    onChange={(e) => setOrderQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-700 rounded text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Reference / Requested Price (₹):</label>
                <input
                  type="number"
                  step="0.05"
                  value={orderPrice}
                  onChange={(e) => setOrderPrice(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-700 rounded text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Stop Loss (₹):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={orderStop}
                    onChange={(e) => setOrderStop(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-700 rounded text-rose-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Target Price (₹):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={orderTarget}
                    onChange={(e) => setOrderTarget(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-700 rounded text-emerald-400 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Required Capital:</span>
                  <span className="text-white font-semibold">₹{(orderQty * orderPrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated 5 bps Slippage:</span>
                  <span className="text-slate-300">₹{(orderQty * orderPrice * 0.0005).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 rounded font-semibold text-white transition-colors ${
                    orderSide === 'BUY'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {isSubmitting ? 'Routing...' : `Submit Paper ${orderSide}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
