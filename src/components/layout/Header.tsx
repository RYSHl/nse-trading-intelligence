import React from 'react';
import { useTradingStore } from '../../store/useTradingStore';
import { RefreshCw, Play, ShieldAlert, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

export const Header: React.FC = () => {
  const { marketStatus, paperAccount, isBackendOnline, fetchAllData, setNotification } = useTradingStore();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setIsRefreshing(false);
  };

  const handleStepReplay = async () => {
    try {
      await api.stepReplay(1);
      await fetchAllData();
      setNotification({ message: 'Advanced historical replay by 1 candle (5m).', type: 'info' });
    } catch (e: any) {
      setNotification({ message: e.message || 'Replay advance failed', type: 'error' });
    }
  };

  const handleToggleKillSwitch = async () => {
    try {
      const res = await api.toggleKillSwitch();
      await fetchAllData();
      setNotification({
        message: res.message,
        type: res.kill_switch ? 'error' : 'success'
      });
    } catch (e: any) {
      setNotification({ message: 'Failed to toggle kill switch', type: 'error' });
    }
  };

  const isKillSwitchActive = paperAccount?.is_kill_switch_active;
  const equity = paperAccount?.equity ?? 100000.0;
  const realizedPnl = paperAccount?.realized_pnl ?? 0.0;

  return (
    <header className="h-14 bg-[#0d121d] border-b border-slate-800/80 px-5 flex items-center justify-between shrink-0 select-none">
      {/* Left info cluster */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-200">NSE INDIA</span>
            <span className="text-slate-600">/</span>
            <span className="text-xs text-slate-400">Regular Intraday Cash</span>
          </div>
        </div>

        {/* Backend Connectivity Status Badge */}
        <div
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-mono ${
            isBackendOnline
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-amber-950/40 border-amber-700/60 text-amber-300'
          }`}
          title={
            isBackendOnline
              ? 'FastAPI Backend Engine is online (/api)'
              : 'FastAPI Backend is offline. Running in simulated static mode. Start local server with ./scripts/start-dev.sh for live scanning.'
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendOnline ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span>{isBackendOnline ? 'BACKEND: ONLINE' : 'BACKEND: OFFLINE (SIMULATED)'}</span>
        </div>

        {/* Explicit Session Status Badge - Never fake LIVE */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-mono">
          <span className="text-slate-400">SESSION:</span>
          <span className="text-amber-400 font-medium">
            {marketStatus?.session_status || 'HISTORICAL_RESEARCH'}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">{marketStatus?.freshness || 'HISTORICAL'}</span>
        </div>

        {/* Data Source */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
          <span className="text-slate-300">FEED:</span>
          <span className="text-slate-300">
            {isBackendOnline ? 'Yahoo Historical / Replay' : 'Simulated NSE Replay'}
          </span>
        </div>
      </div>

      {/* Right controls & Virtual Capital */}
      <div className="flex items-center gap-3">
        {/* Step Replay Simulator button */}
        <button
          onClick={handleStepReplay}
          title="Deterministic bar-by-bar market step"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Play className="w-3.5 h-3.5 text-blue-400" />
          <span>Step Replay</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Refresh market and account data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
        </button>

        {/* Virtual Account Equity Box */}
        <div className="hidden sm:flex items-center gap-3 px-3 py-1 bg-slate-900/90 border border-slate-800 rounded text-xs font-mono">
          <div>
            <span className="text-slate-400 text-[10px] block leading-none">VIRTUAL EQUITY</span>
            <span className="text-white font-semibold tabular-nums">
              ₹{equity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-[1px] h-6 bg-slate-800" />
          <div>
            <span className="text-slate-400 text-[10px] block leading-none">REALIZED P&L</span>
            <span className={`font-semibold tabular-nums ${realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {realizedPnl >= 0 ? '+' : ''}₹{realizedPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Emergency Kill Switch Button */}
        <button
          onClick={handleToggleKillSwitch}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
            isKillSwitchActive
              ? 'bg-rose-950/80 border-rose-600 text-rose-200 hover:bg-rose-900'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-rose-500/50 hover:text-rose-300'
          }`}
          title="Institutional Kill Switch: Immediately blocks all new trade entries"
        >
          {isKillSwitchActive ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>KILL SWITCH ACTIVE</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>KILL SWITCH</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
