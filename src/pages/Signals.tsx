import React, { useState } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { TradeSignal } from '../types';
import { SignalActionModal } from '../components/trading/SignalActionModal';
import { Radio, CheckCircle2, AlertTriangle, ArrowRight, Shield } from 'lucide-react';

export const Signals: React.FC = () => {
  const { activeSignals } = useTradingStore();
  const [selectedSignal, setSelectedSignal] = useState<TradeSignal | null>(null);

  const buySignals = activeSignals.filter((s) => s.direction === 'BUY');
  const waitSignals = activeSignals.filter((s) => s.direction === 'WAIT');

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b0f17] p-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-400" />
            <span>Quantitative Trade Signals</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Rule-based, explainable signal pipeline for NSE intraday breakouts. Strictly separates actionable BUY from WAIT setups.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1 rounded bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
            <strong>{buySignals.length}</strong> CONFIRMED BUY
          </div>
          <div className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
            <strong>{waitSignals.length}</strong> WAITING SETUPS
          </div>
        </div>
      </div>

      {/* Signals Table */}
      <div className="flex-1 overflow-y-auto mt-4 border border-slate-800/80 rounded-lg bg-[#0d121d]">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead className="bg-[#090d15] text-slate-300 font-mono text-[11px] sticky top-0 border-b border-slate-800 z-10">
            <tr>
              <th className="px-4 py-3">SYMBOL</th>
              <th className="px-4 py-3">SETUP / DIRECTION</th>
              <th className="px-4 py-3">REF PRICE</th>
              <th className="px-4 py-3">PROPOSED ENTRY</th>
              <th className="px-4 py-3">STOP LOSS</th>
              <th className="px-4 py-3">TARGET (2R)</th>
              <th className="px-4 py-3">RISK / REWARD</th>
              <th className="px-4 py-3">SUGGESTED QTY</th>
              <th className="px-4 py-3">MAX LOSS RISK</th>
              <th className="px-4 py-3">EXECUTION STATUS</th>
              <th className="px-4 py-3 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 font-mono text-[11px]">
            {activeSignals.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-16 text-center text-slate-300 font-sans">
                  No active trade signals currently qualified.
                </td>
              </tr>
            ) : (
              activeSignals.map((sig) => {
                const isBuy = sig.direction === 'BUY';

                return (
                  <tr
                    key={sig.signal_id}
                    onClick={() => setSelectedSignal(sig)}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="font-bold text-white text-xs">{sig.symbol.replace('.NS', '')}</span>
                      <span className="text-[10px] text-slate-300 block font-sans">NSE Cash</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBuy
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {sig.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">₹{sig.reference_price.toFixed(2)}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-blue-400">
                      ₹{sig.proposed_entry.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-rose-400 font-semibold">
                      ₹{sig.stop_loss.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-emerald-400 font-semibold">
                      ₹{sig.target_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{sig.risk_reward_ratio}:1</td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-white">
                      {sig.suggested_quantity}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-rose-400">
                      ₹{sig.estimated_max_loss.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          sig.execution_eligibility
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-amber-950/60 text-amber-400'
                        }`}
                      >
                        {sig.signal_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSignal(sig);
                        }}
                        className="px-3 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-[10px] font-semibold transition-colors"
                      >
                        Details & Trade
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <SignalActionModal signal={selectedSignal} onClose={() => setSelectedSignal(null)} />
    </div>
  );
};
