import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { RiskConfig } from '../types';
import { useTradingStore } from '../store/useTradingStore';
import { ShieldAlert, ShieldCheck, Calculator, Save, AlertTriangle, Lock } from 'lucide-react';

export const RiskManagement: React.FC = () => {
  const { setNotification, paperAccount, fetchPaperAccount } = useTradingStore();
  const [config, setConfig] = useState<RiskConfig>({
    risk_per_trade_pct: 0.5,
    max_position_allocation_pct: 20.0,
    max_entries_per_day: 3,
    daily_loss_threshold_pct: 1.5,
    target_rr: 2.0,
    slippage_bps: 5.0,
    fees_bps: 3.0,
    kill_switch: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Position Sizing Calculator State
  const [calcEquity, setCalcEquity] = useState(100000);
  const [calcEntry, setCalcEntry] = useState(2940.0);
  const [calcStop, setCalcStop] = useState(2910.0);

  useEffect(() => {
    api.getRiskConfig().then(setConfig).catch(console.error);
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const updated = await api.updateRiskConfig(config);
      setConfig(updated);
      await fetchPaperAccount();
      setNotification({ message: 'Risk parameters updated successfully.', type: 'success' });
    } catch (err: any) {
      setNotification({ message: err.message || 'Failed to update risk config', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleKillSwitch = async () => {
    try {
      const res = await api.toggleKillSwitch();
      setConfig((prev) => ({ ...prev, kill_switch: res.kill_switch }));
      await fetchPaperAccount();
      setNotification({
        message: res.message,
        type: res.kill_switch ? 'error' : 'success',
      });
    } catch (e: any) {
      setNotification({ message: 'Failed to toggle kill switch', type: 'error' });
    }
  };

  // Calculator logic
  const riskPerShare = Math.max(0.01, calcEntry - calcStop);
  const riskBudget = calcEquity * (config.risk_per_trade_pct / 100);
  const qtyByRisk = Math.floor(riskBudget / riskPerShare);
  const maxCap = calcEquity * (config.max_position_allocation_pct / 100);
  const qtyByCap = Math.floor(maxCap / calcEntry);
  const finalQty = Math.max(0, Math.min(qtyByRisk, qtyByCap));
  const estimatedMaxLoss = finalQty * riskPerShare;
  const bindingConstraint = qtyByRisk <= qtyByCap ? '0.5% RISK BUDGET' : '20% CAPITAL ALLOCATION';

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0b0f17] p-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-400" />
            <span>Centralized Risk Engine & Capital Governance</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Institutional position sizing formulas, max daily entries, and daily loss circuit breakers.
          </p>
        </div>

        {/* Kill Switch Toggle */}
        <button
          onClick={handleToggleKillSwitch}
          className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold border transition-colors ${
            config.kill_switch
              ? 'bg-rose-950/80 border-rose-600 text-rose-200 hover:bg-rose-900'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-rose-500/50 hover:text-rose-300'
          }`}
        >
          {config.kill_switch ? (
            <>
              <Lock className="w-4 h-4 text-rose-400" />
              <span>KILL SWITCH ACTIVE (LOCKED)</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ACTIVATE EMERGENCY KILL SWITCH</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Risk Configuration Form */}
        <div className="bg-[#0d121d] border border-slate-800 rounded-lg p-5">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
            Institutional Risk Rules
          </h2>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Risk per Trade (% of Equity):</span>
                <span className="font-mono font-semibold text-blue-400">{config.risk_per_trade_pct}%</span>
              </div>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="5.0"
                value={config.risk_per_trade_pct}
                onChange={(e) => setConfig({ ...config, risk_per_trade_pct: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-700 rounded text-white font-mono"
              />
              <span className="text-[10px] text-slate-300 block mt-1">Default 0.5% risk budget per trade.</span>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Maximum Position Allocation (% of Equity):</span>
                <span className="font-mono font-semibold text-amber-400">{config.max_position_allocation_pct}%</span>
              </div>
              <input
                type="number"
                step="1"
                min="5"
                max="100"
                value={config.max_position_allocation_pct}
                onChange={(e) => setConfig({ ...config, max_position_allocation_pct: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-700 rounded text-white font-mono"
              />
              <span className="text-[10px] text-slate-300 block mt-1">
                Caps maximum capital deployed in any single stock to 20%.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1">Max Entries per Day:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.max_entries_per_day}
                  onChange={(e) => setConfig({ ...config, max_entries_per_day: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-700 rounded text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Daily Loss Circuit (%):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10.0"
                  value={config.daily_loss_threshold_pct}
                  onChange={(e) => setConfig({ ...config, daily_loss_threshold_pct: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-700 rounded text-rose-400 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 block mb-1">Slippage (Basis Points):</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="50"
                  value={config.slippage_bps}
                  onChange={(e) => setConfig({ ...config, slippage_bps: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-700 rounded text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Fees (Basis Points):</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="50"
                  value={config.fees_bps}
                  onChange={(e) => setConfig({ ...config, fees_bps: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-700 rounded text-white font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Risk Parameters</span>
              </button>
            </div>
          </form>
        </div>

        {/* Position Sizing Calculator */}
        <div className="bg-[#0d121d] border border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-400" />
              <span>Real-Time Position Sizing Calculator</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Virtual Account Equity (₹):</label>
                <input
                  type="number"
                  value={calcEquity}
                  onChange={(e) => setCalcEquity(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-700 rounded text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Proposed Entry Price (₹):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={calcEntry}
                    onChange={(e) => setCalcEntry(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-700 rounded text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Stop Loss Price (₹):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={calcStop}
                    onChange={(e) => setCalcStop(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-[#0b0f17] border border-slate-700 rounded text-rose-400 font-mono"
                  />
                </div>
              </div>

              {/* Calculator Output Breakdown */}
              <div className="mt-4 p-4 bg-[#090d15] border border-slate-800 rounded-lg space-y-2 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Risk per Share:</span>
                  <span className="text-white font-semibold">₹{riskPerShare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Risk Budget ({config.risk_per_trade_pct}%):</span>
                  <span className="text-slate-200">₹{riskBudget.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Qty by Risk Budget:</span>
                  <span className="text-blue-400">{qtyByRisk} shares</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Qty by Capital Cap (20%):</span>
                  <span className="text-amber-400">{qtyByCap} shares</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Binding Limit:</span>
                  <span className="text-amber-400 font-bold">{bindingConstraint}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm">
                  <span className="text-white">Final Permitted Quantity:</span>
                  <span className="text-emerald-400">{finalQty} shares</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Total Capital Required:</span>
                  <span className="text-slate-200">₹{(finalQty * calcEntry).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Estimated Max Loss at Stop:</span>
                  <span className="text-rose-400">₹{estimatedMaxLoss.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-950/20 border border-amber-800/40 rounded text-[11px] text-amber-200/90 leading-relaxed">
            Loss circuit breakers automatically calculate realized plus unrealized losses. When intraday drawdowns reach -{config.daily_loss_threshold_pct}%, new orders are strictly blocked.
          </div>
        </div>
      </div>
    </div>
  );
};
