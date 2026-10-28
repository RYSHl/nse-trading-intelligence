import React from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { MetricCard } from '../components/common/MetricCard';
import { PieChart, ArrowUpRight, ArrowDownRight, Briefcase, Shield } from 'lucide-react';
import { api } from '../services/api';

export const Portfolio: React.FC = () => {
  const { paperAccount, openPositions, fetchPaperAccount, setNotification } = useTradingStore();

  const handleClose = async (sym: string) => {
    try {
      await api.closePaperPosition(sym);
      await fetchPaperAccount();
      setNotification({ message: `Position closed for ${sym}.`, type: 'info' });
    } catch (e: any) {
      setNotification({ message: e.message || 'Failed to close position', type: 'error' });
    }
  };

  const equity = paperAccount?.equity ?? 100000.0;
  const cash = paperAccount?.cash_balance ?? 100000.0;
  const positionsVal = openPositions.reduce((acc, p) => acc + p.quantity * p.current_price, 0);
  const totalUnrealized = openPositions.reduce((acc, p) => acc + p.unrealized_pnl, 0);
  const capitalUtilizationPct = equity > 0 ? (positionsVal / equity) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0b0f17] p-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-400" />
            <span>Portfolio & Capital Allocation</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time equity monitoring, margin exposure, and position risk budgeting across NSE holdings.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
        <MetricCard label="NET PORTFOLIO EQUITY" value={`₹${equity.toLocaleString('en-IN')}`} kicker="INR" />
        <MetricCard label="FREE CASH MARGIN" value={`₹${cash.toLocaleString('en-IN')}`} kicker="AVAILABLE" />
        <MetricCard
          label="OPEN POSITION VALUE"
          value={`₹${positionsVal.toLocaleString('en-IN')}`}
          subValue={`${capitalUtilizationPct.toFixed(1)}% deployed`}
        />
        <MetricCard
          label="TOTAL UNREALIZED P&L"
          value={`${totalUnrealized >= 0 ? '+' : ''}₹${totalUnrealized.toFixed(2)}`}
          trend={totalUnrealized >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {/* Capital Allocation Bar */}
      <div className="bg-[#0d121d] border border-slate-800 rounded-lg p-5 mt-6">
        <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
          Capital Exposure Breakdown
        </h2>
        <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${Math.min(100, capitalUtilizationPct)}%` }}
            className="bg-blue-600 h-full transition-all duration-500"
            title={`Invested: ${capitalUtilizationPct.toFixed(1)}%`}
          />
          <div
            style={{ width: `${Math.max(0, 100 - capitalUtilizationPct)}%` }}
            className="bg-slate-800 h-full"
            title={`Free Cash: ${(100 - capitalUtilizationPct).toFixed(1)}%`}
          />
        </div>
        <div className="flex justify-between items-center text-xs font-mono mt-2 text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            Open Equities Exposure: ₹{positionsVal.toFixed(2)} ({capitalUtilizationPct.toFixed(1)}%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-800 inline-block" />
            Unencumbered Cash: ₹{cash.toFixed(2)} ({(100 - capitalUtilizationPct).toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Active Holdings Table */}
      <div className="bg-[#0d121d] border border-slate-800 rounded-lg mt-6 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-[#090d15] flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Active Holdings ({openPositions.length})
          </h2>
          <span className="text-[10px] text-slate-300 font-mono">MAX 20% ALLOCATION PER SYMBOL</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0b0f17] text-slate-300 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-2.5">SYMBOL</th>
                <th className="px-4 py-2.5">QTY</th>
                <th className="px-4 py-2.5">AVG ENTRY</th>
                <th className="px-4 py-2.5">CURRENT</th>
                <th className="px-4 py-2.5">MARKET VAL</th>
                <th className="px-4 py-2.5">STOP LOSS</th>
                <th className="px-4 py-2.5">TARGET</th>
                <th className="px-4 py-2.5">UNREALIZED P&L</th>
                <th className="px-4 py-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
              {openPositions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-300 font-sans">
                    No active positions currently held in portfolio.
                  </td>
                </tr>
              ) : (
                openPositions.map((pos) => {
                  const mktVal = pos.quantity * pos.current_price;
                  const isProfit = pos.unrealized_pnl >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-white">{pos.symbol.replace('.NS', '')}</td>
                      <td className="px-4 py-2.5 tabular-nums">{pos.quantity}</td>
                      <td className="px-4 py-2.5 tabular-nums">₹{pos.average_entry_price.toFixed(2)}</td>
                      <td className="px-4 py-2.5 tabular-nums">₹{pos.current_price.toFixed(2)}</td>
                      <td className="px-4 py-2.5 tabular-nums font-semibold">₹{mktVal.toFixed(2)}</td>
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
                          onClick={() => handleClose(pos.symbol)}
                          className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[10px] font-semibold transition-colors"
                        >
                          Square Off
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
    </div>
  );
};
