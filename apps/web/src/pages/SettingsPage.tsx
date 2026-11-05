import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Bell,
  Clock,
  Database,
  Moon,
  Sun,
  Volume2,
  Check,
  Shield,
  Activity,
  Layers,
} from 'lucide-react';
import * as api from '../lib/api';
import { UserSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Health check query
  const { data: health } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: () => api.getHealth(),
    refetchInterval: 15000,
  });

  // Settings from PostgreSQL
  const { data: serverSettings, isLoading } = useQuery({
    queryKey: ['userSettings'],
    queryFn: () => api.getSettings(),
  });

  const [form, setForm] = useState<Partial<UserSettings>>({
    daily_target_minutes: 60,
    default_focus_minutes: 25,
    short_break_minutes: 5,
    long_break_minutes: 15,
    evening_start_time: '18:30',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    enable_notifications: true,
    sound_enabled: true,
    pomodoro_cycles_target: 4,
  });

  useEffect(() => {
    if (serverSettings) {
      setForm(serverSettings);
    }
  }, [serverSettings]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<UserSettings>) => api.updateSettings(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['userSettings'], updated);
      queryClient.invalidateQueries({ queryKey: ['todayDashboard'] });
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2500);

      // Notification permission request
      if (updated.enable_notifications && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          PostgreSQL-synced configuration for your evening deep work routines and sound engine.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Focus Goals Section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Focus & Pomodoro Parameters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Daily Focus Target (Minutes)
              </label>
              <input
                type="number"
                min="10"
                max="480"
                value={form.daily_target_minutes || 60}
                onChange={(e) =>
                  setForm({ ...form, daily_target_minutes: parseInt(e.target.value) || 60 })
                }
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">Recommended: 45–90 min after work.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Default Sprint Duration
              </label>
              <select
                value={form.default_focus_minutes || 25}
                onChange={(e) =>
                  setForm({ ...form, default_focus_minutes: parseInt(e.target.value) || 25 })
                }
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value={10}>10 minutes (Quick Start)</option>
                <option value={25}>25 minutes (Standard Pomodoro)</option>
                <option value={50}>50 minutes (Deep Work Sprint)</option>
                <option value={90}>90 minutes (Ultradian Rhythm)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Short Break Duration (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={form.short_break_minutes || 5}
                onChange={(e) =>
                  setForm({ ...form, short_break_minutes: parseInt(e.target.value) || 5 })
                }
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Long Break Duration (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={form.long_break_minutes || 15}
                onChange={(e) =>
                  setForm({ ...form, long_break_minutes: parseInt(e.target.value) || 15 })
                }
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Pomodoro Cycle Target
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={form.pomodoro_cycles_target || 4}
                onChange={(e) =>
                  setForm({ ...form, pomodoro_cycles_target: parseInt(e.target.value) || 4 })
                }
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">Number of sprints before a long break.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Preferred Evening Start Time
              </label>
              <input
                type="time"
                value={form.evening_start_time || '18:30'}
                onChange={(e) => setForm({ ...form, evening_start_time: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {/* Timezone and Localization */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Moon className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Localization</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              App Timezone
            </label>
            <input
              type="text"
              list="timezone-options"
              value={form.timezone || 'Asia/Kolkata'}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <datalist id="timezone-options">
              {[
                'Asia/Kolkata',
                'America/New_York',
                'America/Chicago',
                'America/Denver',
                'America/Los_Angeles',
                'Europe/London',
                'Europe/Paris',
                'Europe/Berlin',
                'Asia/Tokyo',
                'Asia/Singapore',
                'Asia/Dubai',
                'Australia/Sydney',
                'UTC',
              ].map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
            <p className="text-[11px] text-slate-400 mt-1">
              Used for daily rollover, recurrence, and consistency streaks.
            </p>
          </div>
        </div>

        {/* Appearance & Theme */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Moon className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Appearance & Theme</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Color Mode
            </label>
            <div className="flex items-center gap-3">
              {[
                { id: 'light', label: 'Light Mode', icon: Sun },
                { id: 'dark', label: 'Dark Mode', icon: Moon },
              ].map(({ id, label, icon: Icon }) => {
                const isSelected = (localStorage.getItem('focusforge_theme') || 'light') === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      localStorage.setItem('focusforge_theme', id);
                      if (id === 'dark') document.documentElement.classList.add('dark');
                      else document.documentElement.classList.remove('dark');
                      setForm((f) => ({ ...f }));
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Notifications and Audio */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Bell className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">Notifications & Audio Cues</h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.enable_notifications ?? true}
                onChange={(e) =>
                  setForm({ ...form, enable_notifications: e.target.checked })
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <span className="text-sm font-semibold text-slate-800">
                  Browser Desktop Notifications
                </span>
                <p className="text-xs text-slate-500">
                  Receive an OS notification when working in your code editor as a session completes.
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sound_enabled ?? true}
                onChange={(e) => setForm({ ...form, sound_enabled: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <span className="text-sm font-semibold text-slate-800">
                  Web Audio Synthesizer Bells & Chimes
                </span>
                <p className="text-xs text-slate-500">
                  Play harmonic singing bowl chimes on completion and break finishes.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedFeedback && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <Check className="w-4 h-4" /> Preferences saved to PostgreSQL!
            </span>
          )}
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>

      {/* Backend & PostgreSQL System Health Status Card */}
      <div className="bg-slate-900 text-slate-200 rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <Database className="w-4 h-4 text-emerald-400" />
            System Health & Persistence
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {health?.status === 'healthy' ? 'ONLINE' : 'CONNECTING'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-800/80 rounded-xl">
            <span className="text-slate-400 block mb-1">Database Status</span>
            <span className="font-semibold text-white capitalize">
              {health?.database?.status || 'Connecting...'}
            </span>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl">
            <span className="text-slate-400 block mb-1">Architecture</span>
            <span className="font-semibold text-white">PostgreSQL 18 + Node Express</span>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl">
            <span className="text-slate-400 block mb-1">Server Mode</span>
            <span className="font-semibold text-white font-mono uppercase">
              {health?.environment || 'Development'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
