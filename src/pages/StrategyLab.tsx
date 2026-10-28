import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Play, Save, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { useTradingStore } from '../store/useTradingStore';

export const StrategyLab: React.FC = () => {
  const navigate = useNavigate();
  const { setNotification } = useTradingStore();

  const [params, setParams] = useState({
    ema_fast: 20,
    ema_slow: 50,
    volume_multiplier: 1.5,
    atr_stop_multiplier: 1.5,
    target_rr: 2.0,
    entry_window_start: '09:30',
    entry_window_end: '14:30',
    square_off_time: '15:15',
    max_entries_per_day: 3,
    risk_per_trade_pct: 0.5,
    slippage_bps: 5.0,
    fees_bps: 3.0,
  });

  const handleSave = () => {
    localStorage.setItem('nse_strategy_params', JSON.stringify(params));
    setNotification({ message: 'Strategy configuration saved locally.', type: 'success' });
  };

  const handleLaunchBacktest = () => {
    localStorage.setItem('nse_strategy_params', JSON.stringify(params));
    navigate('/backtesting');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0b0f17] p-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-400" />
            <span>Strategy Lab & Parameter Sandbox</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure, validate, and stress-test the ORB + VWAP + EMA + Volume Confirmation strategy parameters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Configuration</span>
          </button>
          <button
            onClick={handleLaunchBacktest}
            className="flex items-center gap-2 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Backtest in Lab</span>
          </button>
        </div>
      </div>

      {/* Overfitting Warning Notice */}
      <div className="mt-4 p-4 rounded-lg bg-amber-950/20 border border-amber-800/40 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <strong className="text-amber-400 font-semibold block mb-0.5">Overfitting & Parameter Curve-Fitting Disclosure:</strong>
          Optimizing parameters solely to maximize past backtested return creates curve-fitted models that frequently fail under live market regime shifts. Maintain disciplined, economically grounded parameters with proper out-of-sample validation.
        </div>
      </div>

      {/* Grid of Parameter Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
        {/* Group 1: Technical Indicators */}
        <div className="bg-[#0d121d] border border-slate-800 rounded-lg p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
            Trend & Indicator Settings
          </h2>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Fast EMA Period:</span>
              <span className="font-mono font-semibold text-blue-400">{params.ema_fast}</span>
            </div>
            <input
              type="range"
              min="9"
              max="34"
              value={params.ema_fast}
              onChange={(e) => setParams({ ...params, ema_fast: Number(e.target.value) })}
              className="w-full accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Slow EMA Period:</span>
              <span className="font-mono font-semibold text-amber-400">{params.ema_slow}</span>
            </div>
            <input
              type="range"
              min="30"
              max="100"
              value={params.ema_slow}
              onChange={(e) => setParams({ ...params, ema_slow: Number(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Volume Spike Multiplier:</span>
              <span className="font-mono font-semibold text-emerald-400">{params.volume_multiplier}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.1"
              value={params.volume_multiplier}
              onChange={(e) => setParams({ ...params, volume_multiplier: Number(e.target.value) })}
              className="w-full accent-emerald-500"
            />
            <span className="text-[10px] text-slate-300 block mt-1">
              Relative to previous 20 completed 5-minute candles.
            </span>
          </div>
        </div>

        {/* Group 2: Session Timings */}
        <div className="bg-[#0d121d] border border-slate-800 rounded-lg p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
            NSE Session Timings (IST)
          </h2>

          <div>
            <label className="text-xs text-slate-300 block mb-1">Opening Range Formation:</label>
            <input
              type="text"
              disabled
              value="09:15 to 09:30 IST (3 completed bars)"
              className="w-full px-3 py-1.5 text-xs bg-[#0b0f17] border border-slate-800 rounded text-slate-400 font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1">Earliest Entry Allowed:</label>
            <input
              type="text"
              value={params.entry_window_start}
              onChange={(e) => setParams({ ...params, entry_window_start: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-[#0b0f17] border border-slate-700 rounded text-white font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1">No New Entries After:</label>
            <input
              type="text"
              value={params.entry_window_end}
              onChange={(e) => setParams({ ...params, entry_window_end: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-[#0b0f17] border border-slate-700 rounded text-white font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1">Intraday Square-off Time:</label>
            <input
              type="text"
              value={params.square_off_time}
              onChange={(e) => setParams({ ...params, square_off_time: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-[#0b0f17] border border-slate-700 rounded text-rose-400 font-mono"
            />
          </div>
        </div>

        {/* Group 3: Risk & Targets */}
        <div className="bg-[#0d121d] border border-slate-800 rounded-lg p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
            Stops, Targets & Execution
          </h2>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>ATR Stop Multiplier:</span>
              <span className="font-mono font-semibold text-rose-400">{params.atr_stop_multiplier}x ATR14</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.1"
              value={params.atr_stop_multiplier}
              onChange={(e) => setParams({ ...params, atr_stop_multiplier: Number(e.target.value) })}
              className="w-full accent-rose-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Target Risk/Reward (R):</span>
              <span className="font-mono font-semibold text-emerald-400">{params.target_rr}R</span>
            </div>
            <input
              type="range"
              min="1.5"
              max="3.5"
              step="0.1"
              value={params.target_rr}
              onChange={(e) => setParams({ ...params, target_rr: Number(e.target.value) })}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Simulated Slippage:</span>
              <span className="font-mono font-semibold text-slate-200">{params.slippage_bps} bps</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={params.slippage_bps}
              onChange={(e) => setParams({ ...params, slippage_bps: Number(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Brokerage & Exchange Fees:</span>
              <span className="font-mono font-semibold text-slate-200">{params.fees_bps} bps</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              value={params.fees_bps}
              onChange={(e) => setParams({ ...params, fees_bps: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
