import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ScannerItem, TradeSignal } from '../types';
import { useTradingStore } from '../store/useTradingStore';
import { useNavigate } from 'react-router-dom';
import { SignalActionModal } from '../components/trading/SignalActionModal';
import { Search, Filter, ArrowUpDown, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export const Scanner: React.FC = () => {
  const [items, setItems] = useState<ScannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'symbol' | 'price' | 'change_pct' | 'rel_volume'>('change_pct');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<TradeSignal | null>(null);

  const { setSelectedSymbol, activeSignals } = useTradingStore();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api
      .getScanner()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const sectors = ['ALL', ...Array.from(new Set(items.map((i) => i.sector).filter(Boolean)))];

  const filteredItems = items
    .filter((item) => {
      const matchSearch =
        item.symbol.toLowerCase().includes(search.toLowerCase()) ||
        item.name.toLowerCase().includes(search.toLowerCase());
      const matchSector = sectorFilter === 'ALL' || item.sector === sectorFilter;
      const matchStatus = statusFilter === 'ALL' || item.direction === statusFilter;
      return matchSearch && matchSector && matchStatus;
    })
    .sort((a, b) => {
      let valA = a[sortField] ?? 0;
      let valB = b[sortField] ?? 0;
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

  const handleInspect = (symbol: string) => {
    const sig = activeSignals.find((s) => s.symbol === symbol);
    if (sig) {
      setSelectedSignal(sig);
    } else {
      setSelectedSymbol(symbol);
      navigate('/');
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b0f17] p-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">NSE Market Scanner</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-factor technical screening: 09:15-09:30 ORB Breakout, Session VWAP, EMA Trend, & Volume Spike.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-300" />
            <input
              type="text"
              placeholder="Filter symbols..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-[#0d121d] border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-300 focus:outline-none focus:border-slate-700 w-44"
            />
          </div>

          {/* Sector Selector */}
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#0d121d] border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-slate-700"
          >
            {sectors.map((s) => (
              <option key={s} value={s}>
                Sector: {s}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#0d121d] border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-slate-700"
          >
            <option value="ALL">All Setups</option>
            <option value="BUY">BUY Setups Only</option>
            <option value="WAIT">WAIT Setups Only</option>
          </select>
        </div>
      </div>

      {/* Scanner Table */}
      <div className="flex-1 overflow-y-auto mt-4 border border-slate-800/80 rounded-lg bg-[#0d121d]">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead className="bg-[#090d15] text-slate-300 font-mono text-[11px] sticky top-0 border-b border-slate-800 z-10">
            <tr>
              <th
                onClick={() => handleSort('symbol')}
                className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>SYMBOL / COMPANY</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-300" />
                </div>
              </th>
              <th
                onClick={() => handleSort('price')}
                className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>PRICE</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-300" />
                </div>
              </th>
              <th
                onClick={() => handleSort('change_pct')}
                className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>CHANGE %</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-300" />
                </div>
              </th>
              <th className="px-4 py-3">ORB HIGH / LOW</th>
              <th className="px-4 py-3">VWAP</th>
              <th className="px-4 py-3">EMA20 vs EMA50</th>
              <th
                onClick={() => handleSort('rel_volume')}
                className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>REL VOL</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-300" />
                </div>
              </th>
              <th className="px-4 py-3">CONDITIONS MET</th>
              <th className="px-4 py-3">SIGNAL STATUS</th>
              <th className="px-4 py-3 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 font-mono text-[11px]">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center text-slate-300 font-sans">
                  Calculating technical indicators across NSE universe...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center text-slate-300 font-sans">
                  No stocks match the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isPositive = item.change_pct >= 0;
                const isBuy = item.direction === 'BUY';

                return (
                  <tr key={item.symbol} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-sans">
                      <div className="font-bold text-white font-mono">{item.symbol.replace('.NS', '')}</div>
                      <span className="text-[10px] text-slate-300 block">{item.name}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-white tabular-nums">
                      ₹{item.price.toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold tabular-nums ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {item.change_pct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-400">
                      {item.orb_high ? `H: ₹${item.orb_high.toFixed(2)}` : '—'}
                      <br />
                      {item.orb_low ? `L: ₹${item.orb_low.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[#c084fc]">
                      {item.vwap ? `₹${item.vwap.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-400">
                      <span className="text-[#38bdf8]">{item.ema20?.toFixed(2)}</span> /{' '}
                      <span className="text-[#fbbf24]">{item.ema50?.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <span
                        className={`font-semibold ${
                          (item.rel_volume ?? 0) >= 1.5 ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {item.rel_volume ? `${item.rel_volume.toFixed(2)}x` : '1.0x'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-400 font-semibold">{item.passed_count} passed</span>
                        {item.failed_count > 0 && (
                          <span className="text-slate-300 text-[10px]">({item.failed_count} wait)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBuy
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleInspect(item.symbol)}
                        className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-[10px] font-semibold transition-colors"
                      >
                        Inspect
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
