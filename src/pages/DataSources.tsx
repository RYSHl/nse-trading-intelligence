import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DataSourceStatus } from '../types';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Server, ShieldCheck, PowerOff } from 'lucide-react';
import { useTradingStore } from '../store/useTradingStore';

export const DataSources: React.FC = () => {
  const [sources, setSources] = useState<DataSourceStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const { setNotification } = useTradingStore();

  const fetchSources = async () => {
    setLoading(true);
    try {
      const data = await api.getDataSourcesStatus();
      setSources(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0b0f17] p-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            <span>Market Data Engine & Broker Gateways</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified provider contracts, feed freshness metadata, and disabled broker integration safety locks.
          </p>
        </div>

        <button
          onClick={fetchSources}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Ping Providers</span>
        </button>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
        {sources.map((src) => {
          const isActive = src.status === 'ACTIVE';
          const isDisabled = src.status === 'DISABLED';

          return (
            <div
              key={src.provider_name}
              className={`bg-[#0d121d] border rounded-lg p-5 flex flex-col justify-between ${
                isDisabled ? 'border-slate-800/60 opacity-90' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isActive
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {src.status}
                  </span>

                  {src.last_ping_ms !== null && src.last_ping_ms !== undefined && (
                    <span className="text-[10px] font-mono text-slate-400">
                      {src.last_ping_ms.toFixed(1)} ms
                    </span>
                  )}
                </div>

                <h2 className="text-sm font-semibold text-white tracking-tight">{src.provider_name}</h2>
                <span className="text-[10px] text-blue-400 font-mono block mt-0.5">{src.type}</span>

                <p className="text-xs text-slate-400 mt-3 leading-relaxed">{src.description}</p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800 text-xs font-mono space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Live Exchange Data:</span>
                  <span className={src.is_live_allowed ? 'text-emerald-400' : 'text-slate-500 font-semibold'}>
                    {src.is_live_allowed ? 'ALLOWED' : 'PROHIBITED / OFFLINE'}
                  </span>
                </div>
                {Object.entries(src.details).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[11px]">
                    <span className="capitalize">{k.replace('_', ' ')}:</span>
                    <span className="text-slate-200">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety Policy Notice */}
      <div className="mt-8 p-5 bg-[#0d121d] border border-slate-800 rounded-lg">
        <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Exchange Data & Broker Isolation Policy</span>
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          1. <strong>No Fabricated Live Data:</strong> The platform explicitly tags all market data as{' '}
          <code className="text-amber-400 font-mono bg-slate-900 px-1 py-0.5 rounded">HISTORICAL</code>,{' '}
          <code className="text-amber-400 font-mono bg-slate-900 px-1 py-0.5 rounded">DELAYED</code>, or{' '}
          <code className="text-blue-400 font-mono bg-slate-900 px-1 py-0.5 rounded">REPLAY</code>. A false "LIVE" badge is never rendered.
          <br />
          2. <strong>Zerodha Kite Connect Architecture:</strong> The Kite API client is prepared as an extensible interface. In this phase, credentials are not stored, and live orders require explicit, manual user approval before submission.
        </p>
      </div>
    </div>
  );
};
