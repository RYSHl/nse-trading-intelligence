import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Radar,
  Radio,
  FlaskConical,
  History,
  FileCheck2,
  PieChart,
  LineChart,
  ShieldAlert,
  Database,
  Settings,
  TrendingUp
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/scanner', label: 'Market Scanner', icon: Radar },
  { path: '/signals', label: 'Trade Signals', icon: Radio },
  { path: '/strategy-lab', label: 'Strategy Lab', icon: FlaskConical },
  { path: '/backtesting', label: 'Backtesting', icon: History },
  { path: '/paper-trading', label: 'Paper Trading', icon: FileCheck2 },
  { path: '/portfolio', label: 'Portfolio & Positions', icon: PieChart },
  { path: '/analytics', label: 'Analytics', icon: LineChart },
  { path: '/risk-management', label: 'Risk Management', icon: ShieldAlert },
  { path: '/data-sources', label: 'Data Sources', icon: Database },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-[#0d121d] border-r border-slate-800/80 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-14 px-5 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
          <TrendingUp className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-white leading-tight">NSE Intelligence</h1>
          <p className="text-[10px] text-slate-400 font-mono">QUANT WORKSTATION</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-slate-300">
          Trading & Research
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Status Footer */}
      <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1 bg-[#090d15]">
        <div className="flex justify-between items-center">
          <span className="text-slate-300">Execution Mode</span>
          <span className="font-mono text-amber-400 font-medium">PAPER / REPLAY</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-300">Target Broker</span>
          <span className="font-mono text-slate-300">Zerodha Kite (Prepared)</span>
        </div>
      </div>
    </aside>
  );
};
