import { create } from 'zustand';
import { MarketStatus, PaperAccount, PaperPosition, WatchlistItem, TradeSignal } from '../types';
import { api } from '../services/api';

interface TradingState {
  selectedSymbol: string;
  timeframe: string;
  marketStatus: MarketStatus | null;
  paperAccount: PaperAccount | null;
  openPositions: PaperPosition[];
  watchlist: WatchlistItem[];
  activeSignals: TradeSignal[];
  isLoading: boolean;
  isBackendOnline: boolean;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;

  setSelectedSymbol: (symbol: string) => void;
  setTimeframe: (tf: string) => void;
  setBackendOnline: (online: boolean) => void;
  fetchMarketStatus: () => Promise<void>;
  fetchPaperAccount: () => Promise<void>;
  fetchWatchlist: () => Promise<void>;
  fetchSignals: () => Promise<void>;
  fetchAllData: () => Promise<void>;
  setNotification: (notif: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

export const useTradingStore = create<TradingState>((set, get) => {
  // Subscribe to api connectivity changes
  api.subscribeStatus((online) => {
    set({ isBackendOnline: online });
  });

  return {
    selectedSymbol: 'RELIANCE.NS',
    timeframe: '5m',
    marketStatus: null,
    paperAccount: null,
    openPositions: [],
    watchlist: [],
    activeSignals: [],
    isLoading: false,
    isBackendOnline: api.isBackendOnline(),
    notification: null,

    setSelectedSymbol: (symbol: string) => set({ selectedSymbol: symbol }),
    setTimeframe: (tf: string) => set({ timeframe: tf }),
    setBackendOnline: (online: boolean) => set({ isBackendOnline: online }),

    fetchMarketStatus: async () => {
      try {
        const status = await api.getMarketStatus();
        set({ marketStatus: status });
      } catch (e) {
        console.error('Error fetching market status:', e);
      }
    },

    fetchPaperAccount: async () => {
      try {
        const [acc, pos] = await Promise.all([
          api.getPaperAccount(),
          api.getPaperPositions()
        ]);
        set({ paperAccount: acc, openPositions: pos });
      } catch (e) {
        console.error('Error fetching paper account:', e);
      }
    },

    fetchWatchlist: async () => {
      try {
        const list = await api.getWatchlist();
        set({ watchlist: list });
      } catch (e) {
        console.error('Error fetching watchlist:', e);
      }
    },

    fetchSignals: async () => {
      try {
        const sigs = await api.getSignals();
        set({ activeSignals: sigs });
      } catch (e) {
        console.error('Error fetching signals:', e);
      }
    },

    fetchAllData: async () => {
      set({ isLoading: true });
      try {
        await Promise.allSettled([
          get().fetchMarketStatus(),
          get().fetchPaperAccount(),
          get().fetchWatchlist(),
          get().fetchSignals()
        ]);
      } finally {
        set({ isLoading: false });
      }
    },

    setNotification: (notif) => {
      set({ notification: notif });
      if (notif) {
        setTimeout(() => {
          if (get().notification?.message === notif.message) {
            set({ notification: null });
          }
        }, 4000);
      }
    }
  };
});
