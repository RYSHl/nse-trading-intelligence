import React, { useState } from 'react';
import { TradeSignal } from '../../types';
import { CheckCircle2, XCircle, AlertTriangle, X, Shield, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useTradingStore } from '../../store/useTradingStore';

interface SignalActionModalProps {
  signal: TradeSignal | null;
  onClose: () => void;
}

export const SignalActionModal: React.FC<SignalActionModalProps> = ({ signal, onClose }) => {
  const { fetchPaperAccount, setNotification } = useTradingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!signal) return null;

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.submitPaperOrder({
        symbol: signal.symbol,
        side: 'BUY',
        quantity: signal.suggested_quantity,
        requested_price: signal.proposed_entry,
        stop_loss: signal.stop_loss,
        target_price: signal.target_price,
        signal_id: signal.signal_id,
      });

      await fetchPaperAccount();
      setNotification({
        message: `Paper BUY order executed for ${signal.symbol}: ${signal.suggested_quantity} shares @ ₹${res.executed_price.toFixed(2)}`,
        type: 'success',
      });
      onClose();
    } catch (e: any) {
      setNotification({
        message: e.message || 'Order rejected by risk engine',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBuy = signal.direction === 'BUY';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d121d] border border-slate-700/80 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#090d15]">
          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                isBuy
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {signal.direction}
            </span>
            <h2 className="text-base font-semibold text-white tracking-wide">{signal.symbol}</h2>
            <span className="text-xs text-slate-300 font-mono">· {signal.strategy_id}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 font-sans">
          {/* Explanation Banner */}
          <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg">
            <h3 className="text-slate-400 font-medium mb-1 uppercase tracking-wider text-[10px]">
              Quantitative Trade Rationale
            </h3>
            <p className="text-slate-200 leading-relaxed">{signal.explanation}</p>
          </div>

          {/* Pricing & Levels Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-3 bg-[#0b0f17] border border-slate-800 rounded">
              <span className="text-slate-300 text-[10px] block">PROPOSED ENTRY</span>
              <span className="text-base font-semibold text-white tabular-nums">
                ₹{signal.proposed_entry.toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-[#0b0f17] border border-slate-800 rounded">
              <span className="text-slate-300 text-[10px] block">STOP LOSS</span>
              <span className="text-base font-semibold text-rose-400 tabular-nums">
                ₹{signal.stop_loss.toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-[#0b0f17] border border-slate-800 rounded">
              <span className="text-slate-300 text-[10px] block">TARGET (2R)</span>
              <span className="text-base font-semibold text-emerald-400 tabular-nums">
                ₹{signal.target_price.toFixed(2)}
              </span>
            </div>
            <div className="p-3 bg-[#0b0f17] border border-slate-800 rounded">
              <span className="text-slate-300 text-[10px] block">POSITION QTY</span>
              <span className="text-base font-semibold text-blue-400 tabular-nums">
                {signal.suggested_quantity} shares
              </span>
            </div>
          </div>

          {/* Risk Budget Summary */}
          {signal.risk_details && (
            <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg font-mono text-[11px] space-y-1.5">
              <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold mb-1">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>Risk & Sizing Budget Breakdown</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Risk per share (Entry - SL):</span>
                <span className="text-slate-200 tabular-nums">₹{signal.risk_details.risk_per_share.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>0.5% Account Risk Budget:</span>
                <span className="text-slate-200 tabular-nums">₹{signal.risk_details.risk_budget.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Max Capital Allocation (20%):</span>
                <span className="text-slate-200 tabular-nums">₹{signal.risk_details.max_capital_allocation.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Binding Sizing Constraint:</span>
                <span className="text-amber-400 font-semibold">{signal.risk_details.binding_constraint}</span>
              </div>
              <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-1 mt-1 font-semibold">
                <span>Estimated Maximum Downside Loss:</span>
                <span className="text-rose-400 tabular-nums">₹{signal.estimated_max_loss.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Rules Checklist */}
          <div>
            <h3 className="text-slate-400 font-medium mb-2 uppercase tracking-wider text-[10px]">
              Rules Verification Checklist
            </h3>
            <div className="space-y-1.5 font-mono text-[11px]">
              {signal.passed_conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-emerald-950/20 border border-emerald-900/40 rounded text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{cond}</span>
                </div>
              ))}
              {signal.failed_conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-rose-950/20 border border-rose-900/40 rounded text-rose-300">
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{cond}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 border-t border-slate-800 flex items-center justify-between shrink-0 bg-[#090d15]">
          <div className="text-[11px] text-slate-300 font-mono">
            EXECUTION STATUS:{' '}
            <span
              className={`font-semibold ${
                signal.execution_eligibility ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {signal.signal_status}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={!signal.execution_eligibility || isSubmitting || signal.suggested_quantity <= 0}
              className={`flex items-center gap-2 px-5 py-2 rounded text-xs font-semibold transition-colors ${
                signal.execution_eligibility && signal.suggested_quantity > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800 text-slate-300 cursor-not-allowed'
              }`}
            >
              <span>{isSubmitting ? 'Routing Paper Order...' : 'Execute Paper Buy'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
