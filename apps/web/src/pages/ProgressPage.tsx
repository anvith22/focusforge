import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Flame,
  CheckCircle2,
  Clock,
  TrendingUp,
  Target,
  Sparkles,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import * as api from '../lib/api';
import ProgressCard from '../components/ProgressCard';
import FocusHeatmap from '../components/FocusHeatmap';

export const ProgressPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  const { data, isLoading } = useQuery({
    queryKey: ['weeklyDashboard'],
    queryFn: () => api.getWeeklyDashboard(),
  });

  const { data: sessionsData } = useQuery({
    queryKey: ['completedSessionsAll'],
    queryFn: () => api.getSessions({ status: 'completed' }),
  });

  const days = data?.days || [];
  const totals = data?.totals || {
    planned_minutes: 0,
    actual_minutes: 0,
    completed_sessions: 0,
    tasks_completed: 0,
    completion_percentage: 0,
  };
  const streaks = data?.streaks || { current_streak: 0, best_streak: 0 };
  const frictionBreakdown = data?.friction_breakdown || [];
  const peakHours = data?.peak_hours || [];

  const maxDailyMinutes = Math.max(60, ...days.map((d: any) => Math.max(d.focus_minutes || 0, d.planned_minutes || 0)));

  const frictionLabels: Record<string, { label: string; tip: string }> = {
    fatigue: { label: 'Fatigue after work', tip: 'Try starting with an easier 10-minute micro-sprint first.' },
    interruption: { label: 'External interruptions', tip: 'Put phone on do-not-disturb and enable Zen Mode.' },
    scope_creep: { label: 'Scope creep', tip: 'Use "Break Down" to restrict scope to 1 isolated subtask.' },
    complexity: { label: 'High complexity / stuck', tip: 'Switch to a spike branch or write a 5-line prototype.' },
    unclear: { label: 'Unclear next step', tip: 'Clarify what "done" looks like before hitting Start.' },
    other: { label: 'Other', tip: 'Review friction notes in session history.' },
    none: { label: 'No explicit reason', tip: 'Capture friction tags to diagnose patterns.' },
  };

  const totalAbandoned = frictionBreakdown.reduce((sum: number, f: any) => sum + Number(f.count), 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Progress & Consistency
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Measurable after-work engineering velocity and consistency streaks backed by PostgreSQL.
        </p>
      </div>

      {/* High-level KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProgressCard
          title="Current Streak"
          value={`${streaks.current_streak} days`}
          subtitle={`Best: ${streaks.best_streak} consecutive days`}
          icon={Flame}
          iconColor="text-amber-600 bg-amber-50"
        />
        <ProgressCard
          title="Weekly Actual Focus"
          value={`${totals.actual_minutes}m`}
          subtitle={`Planned: ${totals.planned_minutes}m`}
          icon={Clock}
          progressPercent={totals.completion_percentage}
          iconColor="text-blue-600 bg-blue-50"
        />
        <ProgressCard
          title="Completed Sessions"
          value={totals.completed_sessions}
          subtitle="Past 7 days"
          icon={Target}
          iconColor="text-indigo-600 bg-indigo-50"
        />
        <ProgressCard
          title="Tasks Completed"
          value={totals.tasks_completed}
          subtitle="Shipped items"
          icon={CheckCircle2}
          iconColor="text-emerald-600 bg-emerald-50"
        />
      </div>

      {/* GitHub-style Engineering Heatmap */}
      <FocusHeatmap sessions={sessionsData || []} />

      {/* Weekly Chart Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-slate-900">
                Focus Output {timeRange === '7d' ? '(Past 7 Days)' : timeRange === '30d' ? '(Past 30 Days)' : '(Past 90 Days)'}
              </h3>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['7d', '30d', '90d'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      timeRange === range
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Comparing actual focused minutes against planned duration
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-blue-600" />
              <span className="text-slate-600">Actual Focus</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-200" />
              <span className="text-slate-500">Planned Duration</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-400">
            Loading metrics...
          </div>
        ) : (
          <div className="h-64 flex items-end justify-between gap-2 sm:gap-6 pt-6 pb-2 px-2 border-b border-slate-100">
            {days.map((day: any) => {
              const actualH = (Number(day.focus_minutes || 0) / maxDailyMinutes) * 100;
              const plannedH = (Number(day.planned_minutes || 0) / maxDailyMinutes) * 100;
              const dateStr = String(day.day_date || day.date || '');
              const labelStr = String(day.day_label || day.day_name || '');

              return (
                <div key={dateStr} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-1 h-44">
                    {/* Planned Bar */}
                    <div
                      style={{ height: `${Math.max(4, plannedH)}%` }}
                      className="w-1/2 max-w-[20px] bg-slate-200 group-hover:bg-slate-300 rounded-t-md transition-all duration-300"
                      title={`Planned: ${day.planned_minutes}m`}
                    />
                    {/* Actual Bar */}
                    <div
                      style={{ height: `${Math.max(4, actualH)}%` }}
                      className="w-1/2 max-w-[20px] bg-blue-600 group-hover:bg-blue-500 rounded-t-md transition-all duration-300 shadow-xs"
                      title={`Actual Focus: ${day.focus_minutes}m`}
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-700 block">
                      {labelStr}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {dateStr.slice(5)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Friction Analytics & Peak Productive Hours Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Friction & Abandonment Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Friction & Abandonment Diagnostic</h3>
              <p className="text-xs text-slate-500">Root causes recorded when sprints are interrupted</p>
            </div>
          </div>

          {frictionBreakdown.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No abandoned sessions recorded yet. Excellent sprint completion rate! 🎉
            </div>
          ) : (
            <div className="space-y-3">
              {frictionBreakdown.map((item: any) => {
                const info = frictionLabels[item.friction_category] || frictionLabels.other;
                const percent = totalAbandoned > 0 ? Math.round((item.count / totalAbandoned) * 100) : 0;
                return (
                  <div key={item.friction_category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{info.label}</span>
                      <span className="font-mono text-slate-500">
                        {item.count} session(s) ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 italic">💡 {info.tip}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Peak Hours Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Zap className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Peak Energy Hours</h3>
              <p className="text-xs text-slate-500">Focus minutes delivered across hours of the day (00:00–23:00)</p>
            </div>
          </div>

          {peakHours.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Complete sessions to uncover your optimal evening focus window.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-2">
                {Array.from({ length: 24 }).map((_, hour) => {
                  const hourData = peakHours.find((h: any) => h.hour_of_day === hour);
                  const minutes = hourData ? hourData.minutes : 0;
                  const intensity =
                    minutes > 60
                      ? 'bg-indigo-600 text-white'
                      : minutes > 30
                      ? 'bg-indigo-500 text-white'
                      : minutes > 10
                      ? 'bg-indigo-200 text-indigo-900'
                      : 'bg-slate-100 text-slate-400';

                  return (
                    <div
                      key={hour}
                      className={`p-1.5 rounded-lg text-center transition ${intensity}`}
                      title={`${hour}:00 — ${minutes} min focused`}
                    >
                      <div className="text-[10px] font-mono font-bold">{hour}h</div>
                      <div className="text-[9px] font-mono truncate">{minutes}m</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 pt-2 text-center">
                Darker tiles indicate your most productive engineering hours.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">7-Day Consistency Breakdown</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Actual Focus</th>
                <th className="py-3 px-5">Planned</th>
                <th className="py-3 px-5">Sessions Completed</th>
                <th className="py-3 px-5">Tasks Completed</th>
                <th className="py-3 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {days.map((day: any) => {
                const hadActivity = (day.focus_minutes || 0) > 0 || (day.completed_tasks || 0) > 0;
                const dateStr = String(day.day_date || day.date || '');
                const labelStr = String(day.day_label || day.day_name || '');

                return (
                  <tr key={dateStr} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-5 font-semibold text-slate-900">
                      {labelStr}, {dateStr}
                    </td>
                    <td className="py-3.5 px-5 font-mono font-bold text-blue-600">
                      {day.focus_minutes || 0} min
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-500">
                      {day.planned_minutes || 0} min
                    </td>
                    <td className="py-3.5 px-5 font-medium">{day.completed_sessions || 0}</td>
                    <td className="py-3.5 px-5 font-medium">{day.completed_tasks || 0}</td>
                    <td className="py-3.5 px-5 text-right">
                      {hadActivity ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active 🔥
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                          Rest Day
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
