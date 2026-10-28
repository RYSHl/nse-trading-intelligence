import React, { useState } from 'react';
import { useTradingStore } from '../../store/useTradingStore';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';
import { api } from '../../services/api';

export const WatchlistPanel: React.FC = () => {
  const { watchlist, selectedSymbol, setSelectedSymbol, fetchWatchlist, setNotification } = useTradingStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const filteredList = watchlist.filter(
    (item) =>
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    try {
      await api.addToWatchlist(newSymbol.trim().toUpperCase());
      await fetchWatchlist();
      setNewSymbol('');
      setIsAdding(false);
      setNotification({ message: `Added ${newSymbol.toUpperCase()} to universe.`, type: 'success' });
    } catch (err: any) {
      setNotification({ message: err.message || 'Failed to add symbol', type: 'error' });
    }
  };

  const handleRemove = async (e: React.MouseEvent, sym: string) => {
    e.stopPropagation();
    try {
      await api.removeFromWatchlist(sym);
      await fetchWatchlist();
      setNotification({ message: `Removed ${sym} from watchlist.`, type: 'info' });
    } catch (err: any) {
      setNotification({ message: err.message || 'Failed to remove', type: 'error' });
    }
  };

  return (
    <div className="w-80 bg-[#0d121d] border border-slate-800/80 rounded-lg flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xs font-semibold text-white tracking-wide">NSE WATCHLIST</h2>
          <span className="text-[10px] text-slate-300 font-mono">{watchlist.length} INSTRUMENTS</span>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="Add Stock Symbol"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Add Symbol Input form */}
      {isAdding && (
        <form onSubmit={handleAddSymbol} className="p-2 border-b border-slate-800/80 bg-slate-900/60 flex gap-2">
          <input
            type="text"
            placeholder="e.g. WIPRO.NS"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            className="flex-1 px-2.5 py-1 text-xs bg-[#0b0f17] border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500 font-mono"
            autoFocus
          />
          <button
            type="submit"
            className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
          >
            Add
          </button>
        </form>
      )}

      {/* Search Bar */}
      <div className="p-2 border-b border-slate-800/80 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-300" />
          <input
            type="text"
            placeholder="Filter stocks or sector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs bg-[#0b0f17] border border-slate-800 rounded text-slate-200 placeholder:text-slate-300 focus:outline-none focus:border-slate-700"
          />
        </div>
      </div>

      {/* Stocks List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
        {filteredList.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-300">No matching instruments found.</div>
        ) : (
          filteredList.map((item) => {
            const isSelected = selectedSymbol === item.symbol;
            const isPositive = item.change >= 0;

            return (
              <div
                key={item.symbol}
                onClick={() => setSelectedSymbol(item.symbol)}
                className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-950/30 border-l-2 border-blue-500'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-100 font-mono">
                      {item.symbol.replace('.NS', '')}
                    </span>
                    {/* Signal Status Pill */}
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-medium ${
                        item.signal_status === 'BUY'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : item.signal_status === 'SELL'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                          : 'bg-slate-800/70 text-slate-400'
                      }`}
                    >
                      {item.signal_status}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-300 block truncate max-w-[130px]">
                    {item.name}
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-semibold text-white tabular-nums">
                    ₹{item.last_price.toFixed(2)}
                  </div>
                  <div
                    className={`flex items-center justify-end text-[10px] font-mono tabular-nums ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="w-3 h-3 inline mr-0.5" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 inline mr-0.5" />
                    )}
                    {isPositive ? '+' : ''}
                    {item.change_pct.toFixed(2)}%
                  </div>
                </div>

                {/* Delete button (only show on hover) */}
                <button
                  onClick={(e) => handleRemove(e, item.symbol)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-rose-400 ml-1 transition-opacity"
                  title="Remove"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
