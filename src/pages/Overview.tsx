import React, { useEffect, useState } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { api } from '../services/api';
import { Candle, TradeSignal, PaperPosition, PaperOrder } from '../types';
import { TradingViewChart } from '../components/charts/TradingViewChart';
import { WatchlistPanel } from '../components/trading/WatchlistPanel';
import { MetricCard } from '../components/common/MetricCard';
import { SignalActionModal } from '../components/trading/SignalActionModal';
import { Radio, ShieldCheck, ArrowRight, X } from 'lucide-react';

export const Overview: React.FC = () => {
  const {
    selectedSymbol,
    timeframe,
    setTimeframe,
    paperAccount,
    openPositions,
    activeSignals,
    fetchPaperAccount,
    fetchSignals,
    setNotification,
  } = useTradingStore();

  const [candles, setCandles] = useState<Candle[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<TradeSignal | null>(null);
  const [activeTab, setActiveTab] = useState<'signals' | 'positions' | 'orders'>('signals');
  const [recentOrders, setRecentOrders] = useState<PaperOrder[]>([]);

  // Load candles for active symbol
  useEffect(() => {
    let isMounted = true;
    api
      .getCandles(selectedSymbol, timeframe, 150)
      .then((res) => {
        if (isMounted) setCandles(res.candles);
      })
      .catch((err) => {
        console.error('Failed to load candles for', selectedSymbol, err);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSymbol, timeframe]);

  // Load orders
  useEffect(() => {
    api.getPaperOrders().then(setRecentOrders).catch(console.error);
  }, [paperAccount]);

  // Find active signal for the currently selected symbol if available
  const activeSymbolSignal = activeSignals.find((s) => s.symbol === selectedSymbol);

  const handleClosePosition = async (symbol: string) => {
    try {
      await api.closePaperPosition(symbol);
      await fetchPaperAccount();
      setNotification({ message: `Closed position for ${symbol}.`, type: 'info' });
    } catch (e: any) {
      setNotification({ message: e.message || 'Failed to close position', type: 'error' });
    }
  };

  const equity = paperAccount?.equity ?? 100000.0;
  const cash = paperAccount?.cash_balance ?? 100000.0;
  const realizedPnl = paperAccount?.realized_pnl ?? 0.0;
  const unrealizedPnl = paperAccount?.unrealized_pnl ?? 0.0;
  const winRate = paperAccount?.win_rate_pct ?? 0.0;
  const drawdown = paperAccount?.max_drawdown_pct ?? 0.0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b0f17]">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 shrink-0 border-b border-slate-800/80 bg-[#090d15]">
        <MetricCard
          label="VIRTUAL EQUITY"
          value={`₹${equity.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          kicker="INR"
        />
        <MetricCard
          label="AVAILABLE CASH"
          value={`₹${cash.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          kicker="UNENCUMBERED"
        />
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
        <MetricCard
          label="WIN RATE"
          value={`${winRate.toFixed(1)}%`}
          subValue={`${paperAccount?.total_trades ?? 0} trades`}
        />
        <MetricCard
          label="MAX DRAWDOWN"
          value={`${drawdown.toFixed(2)}%`}
          trend={drawdown > 1.5 ? 'negative' : 'neutral'}
          kicker="CIRCUIT: 1.5%"
        />
      </div>

      {/* Main Workspace: Chart + Watchlist Panel */}
      <div className="flex-1 flex min-h-0 p-4 gap-4">
        {/* Chart Column */}
        <div className="flex-1 flex flex-col min-w-0">
          <TradingViewChart
            candles={candles}
            symbol={selectedSymbol}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            orbHigh={activeSymbolSignal?.indicator_values?.orb_high}
            orbLow={activeSymbolSignal?.indicator_values?.orb_low}
            entryPrice={activeSymbolSignal?.proposed_entry}
            stopLossPrice={activeSymbolSignal?.stop_loss}
            targetPrice={activeSymbolSignal?.target_price}
          />
        </div>

        {/* Watchlist Side Panel */}
        <div className="shrink-0">
          <WatchlistPanel />
        </div>
      </div>

      {/* Lower Panel: Active Signals, Open Positions, Recent Orders */}
      <div className="h-60 border-t border-slate-800/80 bg-[#0d121d] flex flex-col shrink-0 select-none">
        {/* Tabs */}
        <div className="h-9 px-4 border-b border-slate-800/80 flex items-center justify-between bg-[#090d15] text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('signals')}
              className={`px-3 py-1 font-medium transition-colors border-b-2 ${
                activeTab === 'signals'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Active Trade Signals ({activeSignals.length})
            </button>
            <button
              onClick={() => setActiveTab('positions')}
              className={`px-3 py-1 font-medium transition-colors border-b-2 ${
                activeTab === 'positions'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Open Positions ({openPositions.length})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1 font-medium transition-colors border-b-2 ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Order History ({recentOrders.length})
            </button>
          </div>

          <span className="text-[10px] text-slate-300 font-mono">
            STRATEGY: ORB + VWAP + EMA + VOL
          </span>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'signals' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0b0f17] text-slate-300 font-mono text-[11px] sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2">SYMBOL</th>
                  <th className="px-4 py-2">DIRECTION</th>
                  <th className="px-4 py-2">REF PRICE</th>
                  <th className="px-4 py-2">ENTRY</th>
                  <th className="px-4 py-2">STOP LOSS</th>
                  <th className="px-4 py-2">TARGET (2R)</th>
                  <th className="px-4 py-2">SUGGESTED QTY</th>
                  <th className="px-4 py-2">STATUS</th>
                  <th className="px-4 py-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                {activeSignals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-300">
                      Scanning market candles for valid intraday setups...
                    </td>
                  </tr>
                ) : (
                  activeSignals.map((sig) => (
                    <tr key={sig.signal_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2 font-bold text-white">{sig.symbol.replace('.NS', '')}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            sig.direction === 'BUY'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {sig.direction}
                        </span>
                      </td>
                      <td className="px-4 py-2 tabular-nums">₹{sig.reference_price.toFixed(2)}</td>
                      <td className="px-4 py-2 tabular-nums text-blue-400">₹{sig.proposed_entry.toFixed(2)}</td>
                      <td className="px-4 py-2 tabular-nums text-rose-400">₹{sig.stop_loss.toFixed(2)}</td>
                      <td className="px-4 py-2 tabular-nums text-emerald-400">₹{sig.target_price.toFixed(2)}</td>
                      <td className="px-4 py-2 tabular-nums">{sig.suggested_quantity}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`text-[10px] ${
                            sig.execution_eligibility ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {sig.signal_status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => setSelectedSignal(sig)}
                          className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[10px] font-semibold transition-colors"
                        >
                          Inspect & Trade
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'positions' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0b0f17] text-slate-300 font-mono text-[11px] sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2">SYMBOL</th>
                  <th className="px-4 py-2">QTY</th>
                  <th className="px-4 py-2">ENTRY PRICE</th>
                  <th className="px-4 py-2">CURRENT PRICE</th>
                  <th className="px-4 py-2">STOP LOSS</th>
                  <th className="px-4 py-2">TARGET</th>
                  <th className="px-4 py-2">UNREALIZED P&L</th>
                  <th className="px-4 py-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                {openPositions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-300">
                      No open virtual positions. Execute a confirmed signal to open a paper trade.
                    </td>
                  </tr>
                ) : (
                  openPositions.map((pos) => {
                    const isProfit = pos.unrealized_pnl >= 0;
                    return (
                      <tr key={pos.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-2 font-bold text-white">{pos.symbol.replace('.NS', '')}</td>
                        <td className="px-4 py-2 tabular-nums">{pos.quantity}</td>
                        <td className="px-4 py-2 tabular-nums">₹{pos.average_entry_price.toFixed(2)}</td>
                        <td className="px-4 py-2 tabular-nums">₹{pos.current_price.toFixed(2)}</td>
                        <td className="px-4 py-2 tabular-nums text-rose-400">₹{pos.stop_loss.toFixed(2)}</td>
                        <td className="px-4 py-2 tabular-nums text-emerald-400">₹{pos.target_price.toFixed(2)}</td>
                        <td
                          className={`px-4 py-2 tabular-nums font-semibold ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}₹{pos.unrealized_pnl.toFixed(2)} ({isProfit ? '+' : ''}
                          {pos.unrealized_pnl_pct.toFixed(2)}%)
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handleClosePosition(pos.symbol)}
                            className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[10px] font-semibold transition-colors"
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
          )}

          {activeTab === 'orders' && (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0b0f17] text-slate-300 font-mono text-[11px] sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2">ORDER ID</th>
                  <th className="px-4 py-2">SYMBOL</th>
                  <th className="px-4 py-2">SIDE</th>
                  <th className="px-4 py-2">QTY</th>
                  <th className="px-4 py-2">REQ PRICE</th>
                  <th className="px-4 py-2">EXEC PRICE</th>
                  <th className="px-4 py-2">FEES</th>
                  <th className="px-4 py-2">STATUS</th>
                  <th className="px-4 py-2">TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-300">
                      No order execution history found.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2 font-mono text-slate-400">{ord.id}</td>
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
                      <td className="px-4 py-2 tabular-nums">₹{ord.requested_price.toFixed(2)}</td>
                      <td className="px-4 py-2 tabular-nums">
                        {ord.executed_price ? `₹${ord.executed_price.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-2 tabular-nums">₹{ord.fees.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
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
          )}
        </div>
      </div>

      {/* Signal Inspection & Order Modal */}
      <SignalActionModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />
    </div>
  );
};
