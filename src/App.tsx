import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTradingStore } from './store/useTradingStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Overview } from './pages/Overview';
import { Scanner } from './pages/Scanner';
import { Signals } from './pages/Signals';
import { StrategyLab } from './pages/StrategyLab';
import { Backtesting } from './pages/Backtesting';
import { PaperTrading } from './pages/PaperTrading';
import { Portfolio } from './pages/Portfolio';
import { Analytics } from './pages/Analytics';
import { RiskManagement } from './pages/RiskManagement';
import { DataSources } from './pages/DataSources';
import { Settings } from './pages/Settings';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export default function App() {
  const { fetchAllData, notification, setNotification } = useTradingStore();

  useEffect(() => {
    fetchAllData();
    // Poll data every 30 seconds
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-[#0b0f17] text-slate-100 font-sans">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <Header />

          {/* Routed Views */}
          <main className="flex-1 overflow-hidden relative">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/signals" element={<Signals />} />
              <Route path="/strategy-lab" element={<StrategyLab />} />
              <Route path="/backtesting" element={<Backtesting />} />
              <Route path="/paper-trading" element={<PaperTrading />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/risk-management" element={<RiskManagement />} />
              <Route path="/data-sources" element={<DataSources />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Global Notification Toast */}
            {notification && (
              <div
                className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-xs shadow-2xl backdrop-blur-md font-sans transition-all duration-300 ${
                  notification.type === 'success'
                    ? 'bg-emerald-950/90 border-emerald-700/80 text-emerald-200'
                    : notification.type === 'error'
                    ? 'bg-rose-950/90 border-rose-700/80 text-rose-200'
                    : 'bg-blue-950/90 border-blue-700/80 text-blue-200'
                }`}
              >
                {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {notification.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                {notification.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
                <span>{notification.message}</span>
                <button
                  onClick={() => setNotification(null)}
                  className="ml-2 p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
