import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'positive' | 'negative' | 'neutral';
  kicker?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  trend,
  kicker,
}) => {
  return (
    <div className="bg-[#0d121d] border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        {kicker && <span className="text-[10px] font-mono text-slate-300">{kicker}</span>}
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span
          className={`text-xl font-semibold font-mono tracking-tight tabular-nums ${
            trend === 'positive'
              ? 'text-emerald-400'
              : trend === 'negative'
              ? 'text-rose-400'
              : 'text-slate-100'
          }`}
        >
          {value}
        </span>
        {subValue && (
          <span
            className={`text-xs font-mono tabular-nums ${
              trend === 'positive'
                ? 'text-emerald-400/80'
                : trend === 'negative'
                ? 'text-rose-400/80'
                : 'text-slate-400'
            }`}
          >
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};
