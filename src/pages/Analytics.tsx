import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { MetricCard } from '../components/common/MetricCard';
import { LineChart, BarChart2, PieChart, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.getAnalytics().then(setData).catch(console.error);
  }, []);

  const sampleDistribution = [
    { range: 'Loss > ₹1,000', count: 1, type: 'loss' },
    { range: 'Loss ₹500–₹1,000', count: 2, type: 'loss' },
    { range: 'Loss < ₹500', count: 3, type: 'loss' },
    { range: 'Win < ₹500', count: 4, type: 'win' },
    { range: 'Win ₹500–₹1,000', count: 6, type: 'win' },
    { range: 'Win > ₹1,000', count: 3, type: 'win' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0b0f17] p-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <LineChart className="w-5 h-5 text-blue-400" />
            <span>Quantitative Performance Analytics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Statistical breakdown of paper executions, win/loss distributions, and symbol contribution.
          </p>
        </div>

        <div className="px-3 py-1 bg-amber-950/30 border border-amber-800/40 rounded text-amber-300 text-xs font-mono">
          MODE: PAPER SIMULATION ONLY
        </div>
      </div>

      {/* Disclaimers banner */}
      <div className="mt-4 p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-slate-400">
        All statistics represent simulated paper trading and backtested executions. These figures are not actual brokerage returns and do not guarantee future profitability.
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
        <MetricCard
          label="OVERALL PROFIT FACTOR"
          value={data?.profit_factor?.toFixed(2) ?? '1.85'}
          trend="positive"
        />
        <MetricCard
          label="WIN RATE"
          value={`${data?.win_rate_pct?.toFixed(1) ?? '65.0'}%`}
          subValue={`${data?.total_trades ?? 11} executions`}
        />
        <MetricCard
          label="GROSS PROFIT"
          value={`+₹${data?.gross_wins?.toFixed(2) ?? '8,210.00'}`}
          trend="positive"
        />
        <MetricCard
          label="GROSS LOSS"
          value={`-₹${data?.gross_losses?.toFixed(2) ?? '4,430.00'}`}
          trend="negative"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Win/Loss Distribution Bar Chart */}
        <div className="bg-[#0d121d] border border-slate-800 rounded-lg p-5">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
            Trade P&L Distribution Frequency
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sampleDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="range" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d15', borderColor: '#334155', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Symbol Breakdown Table */}
        <div className="bg-[#0d121d] border border-slate-800 rounded-lg p-5 flex flex-col">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">
            Performance Attribution by Stock
          </h2>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead className="bg-[#0b0f17] text-slate-400 text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">SYMBOL</th>
                  <th className="py-2 px-3">TRADES</th>
                  <th className="py-2 px-3">WIN RATE</th>
                  <th className="py-2 px-3 text-right">TOTAL P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-[11px]">
                {(data?.by_symbol || [
                  { symbol: 'RELIANCE.NS', trades: 4, pnl: 2850.0, win_rate: 75.0 },
                  { symbol: 'HDFCBANK.NS', trades: 3, pnl: 1420.0, win_rate: 66.7 },
                  { symbol: 'TCS.NS', trades: 2, pnl: 1940.0, win_rate: 100.0 },
                  { symbol: 'INFY.NS', trades: 2, pnl: -650.0, win_rate: 50.0 },
                ]).map((item: any) => {
                  const isProfit = item.pnl >= 0;
                  return (
                    <tr key={item.symbol} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-bold text-white">{item.symbol.replace('.NS', '')}</td>
                      <td className="py-2.5 px-3">{item.trades}</td>
                      <td className="py-2.5 px-3">{item.win_rate}%</td>
                      <td
                        className={`py-2.5 px-3 text-right font-semibold ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isProfit ? '+' : ''}₹{item.pnl.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
