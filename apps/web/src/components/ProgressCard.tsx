import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ProgressCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: string;
  progressPercent?: number;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-600 bg-blue-50',
  trend,
  progressPercent,
}) => {
  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {title}
          </span>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</div>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>

        <div className={`p-3 rounded-xl ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {progressPercent !== undefined && (
        <div className="mt-4">
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
        </div>
      )}

      {trend && (
        <div className="mt-3 text-xs text-emerald-600 font-medium flex items-center gap-1">
          {trend}
        </div>
      )}
    </div>
  );
};

export default ProgressCard;
