import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  CheckCircle2,
  XOctagon,
  Clock,
  Calendar,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Filter,
  Download,
} from 'lucide-react';
import * as api from '../lib/api';
import { FocusSession } from '../types';

export const HistoryPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', statusFilter, fromDate, toDate],
    queryFn: () =>
      api.getSessions({
        status: statusFilter === 'all' ? undefined : statusFilter,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        limit: 200,
      }),
  });

  const exportToCSV = () => {
    if (sessions.length === 0) return;
    const headers = [
      'ID',
      'Task Title',
      'Project',
      'Status',
      'Planned Minutes',
      'Actual Minutes',
      'Cycle Number',
      'Started At',
      'Ended At',
      'Accomplishment',
      'Blockers',
      'Next Action',
    ];

    const rows = sessions.map((s) => [
      `"${s.id}"`,
      `"${(s.task_title || '').replace(/"/g, '""')}"`,
      `"${(s.project_name || '').replace(/"/g, '""')}"`,
      s.status,
      s.planned_minutes,
      Math.round(s.actual_seconds / 60),
      s.cycle_number || 1,
      `"${s.started_at}"`,
      `"${s.ended_at || ''}"`,
      `"${(s.accomplishment || '').replace(/"/g, '""')}"`,
      `"${(s.blockers || '').replace(/"/g, '""')}"`,
      `"${(s.next_action || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `focusforge-sessions-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Focus Session History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete record of your focused deep work sprints and reflections.
          </p>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            {['all', 'completed', 'abandoned'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Export CSV button */}
          <button
            onClick={exportToCSV}
            disabled={sessions.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition disabled:opacity-40"
            title="Download sessions as CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>Date Filter:</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {(fromDate || toDate) && (
            <button
              onClick={() => {
                setFromDate('');
                setToDate('');
              }}
              className="text-xs text-blue-600 hover:underline font-semibold ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* History Feed */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading session history...</div>
      ) : sessions.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-8 space-y-3">
          <History className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No sessions recorded yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Start a focus session from the Today dashboard to log your first deep work milestone.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isCompleted = session.status === 'completed';
            const actualMinutes = Math.round(session.actual_seconds / 60);

            const startDate = new Date(session.started_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            const startTime = new Date(session.started_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const endTime = session.ended_at
              ? new Date(session.ended_at).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;

            return (
              <div
                key={session.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-600'
                          : session.status === 'running'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : session.status === 'running' ? (
                        <Clock className="w-5 h-5" />
                      ) : (
                        <XOctagon className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {session.task_title || 'Unscheduled Focus Sprint'}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        {session.project_name && (
                          <span className="font-medium text-slate-700 flex items-center gap-1.5">
                            {session.project_color && (
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: session.project_color }}
                              />
                            )}
                            {session.project_name} •
                          </span>
                        )}
                        <span>
                          {startDate} at {startTime} {endTime ? `→ ${endTime}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Planned vs Actual Badges */}
                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    {session.cycle_number && (
                      <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
                        Cycle #{session.cycle_number}
                      </span>
                    )}

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : session.status === 'running'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {session.status}
                    </span>

                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold font-mono">
                      {actualMinutes}m / {session.planned_minutes}m
                    </span>
                  </div>
                </div>

                {/* Reflection Details */}
                {(session.accomplishment || session.blockers || session.next_action) && (
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {session.accomplishment && (
                      <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          Accomplished
                        </span>
                        <p className="text-slate-600 leading-relaxed">{session.accomplishment}</p>
                      </div>
                    )}

                    {session.blockers && (
                      <div className="p-3 bg-amber-50/60 rounded-xl space-y-1">
                        <span className="font-bold text-amber-800 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          Blockers / Friction
                        </span>
                        <p className="text-amber-900/80 leading-relaxed">{session.blockers}</p>
                      </div>
                    )}

                    {session.next_action && (
                      <div className="p-3 bg-emerald-50/60 rounded-xl space-y-1">
                        <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                          Next Concrete Step
                        </span>
                        <p className="text-emerald-900/80 leading-relaxed">{session.next_action}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
