import React, { useState, useMemo } from 'react';
import { Calendar, Flame, Clock, Trophy, Sparkles } from 'lucide-react';
import { FocusSession } from '../types';

interface FocusHeatmapProps {
  sessions: FocusSession[];
  daysCount?: number; // Default 112 days (16 weeks)
}

interface DayData {
  dateStr: string; // YYYY-MM-DD
  date: Date;
  minutes: number;
  sessionsCount: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export const FocusHeatmap: React.FC<FocusHeatmapProps> = ({
  sessions = [],
  daysCount = 112,
}) => {
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);

  // Compute minute totals per day YYYY-MM-DD
  const heatmapData = useMemo(() => {
    const sessionMap = new Map<string, { minutes: number; count: number }>();

    sessions.forEach((s) => {
      if (s.status === 'completed' && s.started_at) {
        const dStr = new Date(s.started_at).toISOString().slice(0, 10);
        const mins = Math.round((s.actual_seconds || s.planned_minutes * 60) / 60);
        const curr = sessionMap.get(dStr) || { minutes: 0, count: 0 };
        sessionMap.set(dStr, {
          minutes: curr.minutes + mins,
          count: curr.count + 1,
        });
      }
    });

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const days: DayData[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);

      const entry = sessionMap.get(dStr) || { minutes: 0, count: 0 };
      const minutes = entry.minutes;

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (minutes >= 90) level = 4;
      else if (minutes >= 50) level = 3;
      else if (minutes >= 25) level = 2;
      else if (minutes > 0) level = 1;

      days.push({
        dateStr: dStr,
        date: d,
        minutes,
        sessionsCount: entry.count,
        level,
      });
    }

    return days;
  }, [sessions, daysCount]);

  // Group by weeks for the grid (7 days per column, Sunday = row 0 ... Saturday = row 6)
  const weeks = useMemo(() => {
    if (heatmapData.length === 0) return [];

    const cols: (DayData | null)[][] = [];
    const firstDay = heatmapData[0];
    const firstDayOfWeek = firstDay.date.getDay(); // 0 (Sun) to 6 (Sat)

    let currentWeek: (DayData | null)[] = [];

    // Prepend empty placeholder slots for days before the start date in that week
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

    heatmapData.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        cols.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      // Append placeholder slots to complete the final week column up to Saturday
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      cols.push(currentWeek);
    }

    return cols;
  }, [heatmapData]);

  // Calculate totals
  const totalMinutes = useMemo(
    () => heatmapData.reduce((acc, d) => acc + d.minutes, 0),
    [heatmapData]
  );
  const totalActiveDays = useMemo(
    () => heatmapData.filter((d) => d.minutes > 0).length,
    [heatmapData]
  );

  const levelColors = {
    0: 'bg-slate-100 border-slate-200/60 dark:bg-slate-800/60 dark:border-slate-700/60',
    1: 'bg-indigo-200 border-indigo-300 dark:bg-indigo-950 dark:border-indigo-800',
    2: 'bg-indigo-400 border-indigo-500 dark:bg-indigo-700 dark:border-indigo-600',
    3: 'bg-indigo-600 border-indigo-700 dark:bg-indigo-500 dark:border-indigo-400',
    4: 'bg-indigo-800 border-indigo-900 dark:bg-indigo-400 dark:border-indigo-300 shadow-sm shadow-indigo-500/30',
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-[#0c1322] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            Engineering Focus Consistency Heatmap
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daily deep-work activity over the past 16 weeks (112 days)
          </p>
        </div>

        {/* Quick summary badges */}
        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            {Math.round((totalMinutes / 60) * 10) / 10}h total
          </div>
          <div className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-900/60 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            {totalActiveDays} active days
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex gap-1.5 min-w-full">
          {/* Day of week labels: 7 rows with exact h-3.5 and gap-1.5 matching tiles */}
          <div className="flex flex-col gap-1.5 text-[10px] font-medium text-slate-400 select-none pr-1.5 shrink-0">
            <div className="h-3.5" />
            <div className="h-3.5 flex items-center leading-none">Mon</div>
            <div className="h-3.5" />
            <div className="h-3.5 flex items-center leading-none">Wed</div>
            <div className="h-3.5" />
            <div className="h-3.5 flex items-center leading-none">Fri</div>
            <div className="h-3.5" />
          </div>

          {/* Week columns */}
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1.5 shrink-0">
              {week.map((day, dIdx) =>
                day ? (
                  <div
                    key={day.dateStr}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`w-3.5 h-3.5 rounded-sm border cursor-pointer transition-all duration-150 hover:scale-125 hover:z-10 ${
                      levelColors[day.level]
                    }`}
                  />
                ) : (
                  <div key={`empty-${dIdx}`} className="w-3.5 h-3.5 opacity-0 pointer-events-none" />
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip & Legend Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="min-h-[20px] flex items-center">
          {hoveredDay ? (
            <span className="font-medium text-slate-800 dark:text-slate-200">
              <strong className="text-indigo-600 dark:text-indigo-400">
                {hoveredDay.minutes} mins
              </strong>{' '}
              focused ({hoveredDay.sessionsCount} session
              {hoveredDay.sessionsCount === 1 ? '' : 's'}) on{' '}
              {hoveredDay.date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          ) : (
            <span className="text-slate-400">Hover over any tile to view sprint details</span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>Less</span>
          <span className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60" />
          <span className="w-3 h-3 rounded-sm bg-indigo-200 dark:bg-indigo-950 border border-indigo-300 dark:border-indigo-800" />
          <span className="w-3 h-3 rounded-sm bg-indigo-400 dark:bg-indigo-700 border border-indigo-500 dark:border-indigo-600" />
          <span className="w-3 h-3 rounded-sm bg-indigo-600 dark:bg-indigo-500 border border-indigo-700 dark:border-indigo-400" />
          <span className="w-3 h-3 rounded-sm bg-indigo-800 dark:bg-indigo-400 border border-indigo-900 dark:border-indigo-300" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
export default FocusHeatmap;
