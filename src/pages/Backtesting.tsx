import React, { useState } from 'react';
import { api } from '../services/api';
import { BacktestResult, BacktestTradeItem } from '../types';
import { useTradingStore } from '../store/useTradingStore';
import { MetricCard } from '../components/common/MetricCard';
import { Play, RotateCcw, AlertTriangle, ArrowUpRight, ArrowDownRight, LineChart } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const Backtesting: React.FC = () => {
  const { watchlist, setNotification } = useTradingStore();
  const [symbol, setSymbol] = useState('RELIANCE.NS');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRunBacktest = async () => {
    setIsLoading(true);
    try {
      const savedParams = localStorage.getItem('nse_strategy_params');
      const params = savedParams ? JSON.parse(savedParams) : undefined;

      const res = await api.runBacktest({
        strategy_id: 'orb_vwap_ema',
        symbols: [symbol],
        initial_capital: initialCapital,
        parameters: params,
      });

      setResult(res);
      setNotification({ message: `Completed backtest for ${symbol}.`, type: 'success' });
    } catch (e: any) {
      setNotification({ message: e.message || 'Backtest failed', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Run backtest on initial load if none exists
  React.useEffect(() => {
    handleRunBacktest();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0b0f17] p-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <LineChart className="w-5 h-5 text-blue-400" />
            <span>Event-Driven Backtesting Simulator</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Bar-by-bar candle execution with next-bar open fills, 5 bps slippage, 3 bps exchange fees, and conservative intrabar stop/target collisions.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#0d121d] border border-slate-800 rounded-lg text-white font-mono focus:outline-none"
          >
            {watchlist.map((w) => (
              <option key={w.symbol} value={w.symbol}>
                {w.symbol.replace('.NS', '')} (NSE)
              </option>
            ))}
          </select>

          <button
            onClick={handleRunBacktest}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-colors disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Simulating...' : 'Run Backtest'}</span>
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-5 space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <MetricCard
              label="NET PROFIT"
              value={`${result.net_profit >= 0 ? '+' : ''}₹${result.net_profit.toLocaleString('en-IN')}`}
              trend={result.net_profit >= 0 ? 'positive' : 'negative'}
              subValue={`${result.total_return_pct >= 0 ? '+' : ''}${result.total_return_pct.toFixed(2)}%`}
            />
            <MetricCard
              label="WIN RATE"
              value={`${result.win_rate_pct.toFixed(1)}%`}
              subValue={`${result.winning_trades}W / ${result.losing_trades}L`}
            />
            <MetricCard
              label="PROFIT FACTOR"
              value={result.profit_factor.toFixed(2)}
              trend={result.profit_factor >= 1.5 ? 'positive' : 'neutral'}
            />
            <MetricCard
              label="EXPECTANCY (₹)"
              value={`₹${result.expectancy.toFixed(2)}`}
              trend={result.expectancy > 0 ? 'positive' : 'negative'}
            />
            <MetricCard
              label="MAX DRAWDOWN"
              value={`${result.max_drawdown_pct.toFixed(2)}%`}
              trend={result.max_drawdown_pct > 2.0 ? 'negative' : 'neutral'}
            />
            <MetricCard
              label="AVG HOLD TIME"
              value={`${result.avg_holding_period_mins.toFixed(0)} min`}
              subValue={`${result.total_trades} trades`}
            />
          </div>

          {/* Equity Curve Chart */}
          <div className="bg-[#0d121d] border border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Portfolio Equity Curve (Simulated)
                </h2>
                <span className="text-[10px] text-slate-300 font-mono">
                  Initial Capital: ₹{result.initial_capital.toLocaleString('en-IN')} → Final Equity: ₹{result.final_equity.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.equity_curve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={10}
                    tickFormatter={(val) => (val ? String(val).slice(11, 16) : '')}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    domain={['dataMin - 1000', 'dataMax + 1000']}
                    tickFormatter={(val) => `₹${Number(val).toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#090d15', borderColor: '#334155', fontSize: '11px' }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Equity']}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#equityGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trade History Table */}
          <div className="bg-[#0d121d] border border-slate-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-[#090d15] flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Simulated Execution Trade Journal ({result.trades.length} Closed Trades)
              </h2>
              <span className="text-[10px] text-slate-300 font-mono">SLIPPAGE: 5 BPS · FEES: 3 BPS</span>
            </div>

            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0b0f17] text-slate-300 font-mono text-[11px] sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">TRADE ID</th>
                    <th className="px-4 py-2.5">ENTRY TIME</th>
                    <th className="px-4 py-2.5">EXIT TIME</th>
                    <th className="px-4 py-2.5">ENTRY PRICE</th>
                    <th className="px-4 py-2.5">EXIT PRICE</th>
                    <th className="px-4 py-2.5">QTY</th>
                    <th className="px-4 py-2.5">NET P&L</th>
                    <th className="px-4 py-2.5">RETURN %</th>
                    <th className="px-4 py-2.5">EXIT REASON</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                  {result.trades.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-300 font-sans">
                        No trades triggered during this backtest window.
                      </td>
                    </tr>
                  ) : (
                    result.trades.map((tr) => {
                      const isProfit = tr.pnl > 0;
                      return (
                        <tr key={tr.trade_id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-2.5 text-slate-400">{tr.trade_id}</td>
                          <td className="px-4 py-2.5 text-slate-300">{tr.entry_time.slice(0, 16)}</td>
                          <td className="px-4 py-2.5 text-slate-300">{tr.exit_time.slice(0, 16)}</td>
                          <td className="px-4 py-2.5 tabular-nums">₹{tr.entry_price.toFixed(2)}</td>
                          <td className="px-4 py-2.5 tabular-nums">₹{tr.exit_price.toFixed(2)}</td>
                          <td className="px-4 py-2.5 tabular-nums">{tr.quantity}</td>
                          <td
                            className={`px-4 py-2.5 tabular-nums font-semibold ${
                              isProfit ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isProfit ? '+' : ''}₹{tr.pnl.toFixed(2)}
                          </td>
                          <td
                            className={`px-4 py-2.5 tabular-nums font-semibold ${
                              isProfit ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isProfit ? '+' : ''}
                            {tr.pnl_pct.toFixed(2)}%
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                tr.exit_reason.includes('TARGET')
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : tr.exit_reason.includes('STOP')
                                  ? 'bg-rose-950 text-rose-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {tr.exit_reason}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
