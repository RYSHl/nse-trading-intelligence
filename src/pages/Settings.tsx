import React, { useState } from 'react';
import { Settings as SettingsIcon, ShieldAlert, Key, Globe, Database, ArrowRight } from 'lucide-react';
import { useTradingStore } from '../store/useTradingStore';

export const Settings: React.FC = () => {
  const { setNotification } = useTradingStore();

  const [kiteKey, setKiteKey] = useState('');
  const [kiteSecret, setKiteSecret] = useState('');

  const handleKiteSave = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification({
      message: 'Broker integration is strictly disabled in this phase. Run in paper trading / replay mode.',
      type: 'info',
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0b0f17] p-6 select-none">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-400" />
          <span>Workstation Configuration & Broker Roadmap</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Terminal environment settings, database paths, and prepared Zerodha Kite Connect architecture.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Workstation Info */}
        <div className="bg-[#0d121d] border border-slate-800 rounded-lg p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
            Environment & Database Details
          </h2>

          <div className="space-y-2 text-xs font-mono text-slate-400">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span>Primary Exchange:</span>
              <span className="text-white">National Stock Exchange of India (NSE)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span>Timezone Normalization:</span>
              <span className="text-blue-400">Asia/Kolkata (IST)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span>Local Database:</span>
              <span className="text-slate-200">SQLite (nse_trading.db)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span>Default Candle Interval:</span>
              <span className="text-slate-200">5-Minute OHLCV</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Starting Virtual Capital:</span>
              <span className="text-emerald-400">₹100,000.00</span>
            </div>
          </div>
        </div>

        {/* Prepared Zerodha Kite Integration */}
        <div className="bg-[#0d121d] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Zerodha Kite Connect Architecture</span>
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                DISABLED IN THIS PHASE
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              The Kite broker adapter architecture is built with strict safety gates. When enabled in a future release, the pipeline requires manual user approval for any order execution:
            </p>

            <div className="p-3 bg-[#090d15] border border-slate-800 rounded text-[11px] font-mono text-slate-300 space-y-1 mb-4">
              <div>Kite WebSocket → Tick Validation</div>
              <div>→ 5m Candle Aggregator → Indicator Engine</div>
              <div>→ Strategy Engine → Institutional Risk Filters</div>
              <div>→ Signal Dashboard → <strong className="text-amber-400">[EXPLICIT USER APPROVAL]</strong></div>
              <div>→ Broker Order Adapter</div>
            </div>

            <form onSubmit={handleKiteSave} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Kite API Key (Future):</label>
                <input
                  type="text"
                  placeholder="Disabled in this phase"
                  disabled
                  value={kiteKey}
                  onChange={(e) => setKiteKey(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-800 rounded text-slate-500 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Kite API Secret (Future):</label>
                <input
                  type="password"
                  placeholder="Disabled in this phase"
                  disabled
                  value={kiteSecret}
                  onChange={(e) => setKiteSecret(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-800 rounded text-slate-500 font-mono cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded bg-slate-800 text-slate-400 text-xs font-medium cursor-not-allowed"
                disabled
              >
                Broker Integration Disabled
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
