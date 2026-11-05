import React, { useState } from 'react';
import {
  Play,
  Pause,
  CheckCircle2,
  XOctagon,
  Maximize2,
  CheckSquare,
  AlertCircle,
  Clock,
  Sparkles,
  Brain,
  Wind,
} from 'lucide-react';
import { Task, FocusSession, FrictionCategory } from '../types';
import { SessionReflectionModal } from './SessionReflectionModal';
import { FocusChecklistModal } from './FocusChecklistModal';
import { ZenModeOverlay } from './ZenModeOverlay';
import SoundscapeBar from './SoundscapeBar';
import soundEngine from '../lib/soundEngine';
import { openDistractionPad, openBreathingBreak } from '../lib/modalEvents';

interface FocusTimerProps {
  activeSession: FocusSession | null;
  isPaused: boolean;
  remainingSeconds: number;
  elapsedSeconds: number;
  availableTasks?: Task[];
  selectedTaskId?: string | null;
  onSelectTask?: (taskId: string | null) => void;
  onStart: (minutes: number, taskId?: string | null) => Promise<any>;
  onPause: () => void;
  onResume: () => void;
  onComplete: (reflection: { accomplishment: string; blockers: string; next_action: string }) => Promise<void>;
  onAbandon: (reflection?: { blockers?: string; next_action?: string; friction_category?: FrictionCategory }) => Promise<void>;
  error?: string | null;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({
  activeSession,
  isPaused,
  remainingSeconds,
  elapsedSeconds,
  availableTasks = [],
  selectedTaskId,
  onSelectTask,
  onStart,
  onPause,
  onResume,
  onComplete,
  onAbandon,
  error,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<number>(25);
  const [customMinutes, setCustomMinutes] = useState<number>(30);
  const [isCustom, setIsCustom] = useState<boolean>(false);

  // Modals
  const [isReflectionOpen, setIsReflectionOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isZenModeOpen, setIsZenModeOpen] = useState(false);
  const [isAbandonConfirmOpen, setIsAbandonConfirmOpen] = useState(false);
  const [abandonFriction, setAbandonFriction] = useState<FrictionCategory>('interruption');
  const [abandonBlockerNote, setAbandonBlockerNote] = useState('');

  // Automatic Pomodoro Cycle tracking (1-4, then long break)
  const [cycleCount, setCycleCount] = useState<number>(() => {
    const saved = localStorage.getItem('focusforge_pomodoro_cycle');
    return saved ? parseInt(saved, 10) : 1;
  });

  const breakMinutes = cycleCount % 4 === 0 ? 15 : 5;

  const advanceCycle = () => {
    const next = cycleCount + 1;
    setCycleCount(next);
    localStorage.setItem('focusforge_pomodoro_cycle', String(next));
  };

  const resetCycle = () => {
    setCycleCount(1);
    localStorage.setItem('focusforge_pomodoro_cycle', '1');
  };

  const durationMinutes = isCustom ? customMinutes : selectedPreset;

  // Format MM:SS
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formattedRemaining = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const totalPlannedSec = (activeSession?.planned_minutes || durationMinutes) * 60;
  const progressRatio = activeSession ? Math.min(1, elapsedSeconds / totalPlannedSec) : 0;
  const strokeDashoffset = 440 - 440 * progressRatio;

  const handleLaunchSession = () => {
    onStart(durationMinutes, selectedTaskId);
  };

  const handleOpenChecklist = () => {
    setIsChecklistOpen(true);
  };

  return (
    <>
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 font-bold shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight">Focus Timer</h2>
                {activeSession ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0">
                    Ready
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {activeSession ? 'Deep work block in progress' : 'Select a sprint duration'}
              </p>
            </div>
          </div>

          {/* Primary Top Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <SoundscapeBar compact={true} />

            {activeSession && (
              <button
                onClick={() => setIsZenModeOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-sm"
                title="Fullscreen distraction-free mode"
              >
                <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Zen</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Utility Action Bar (Park Thought & Box Breathing) */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <button
            onClick={openDistractionPad}
            className="px-3 py-2 rounded-xl bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200/70 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition group shadow-xs"
            title="Park intrusive thoughts (Ctrl+J)"
          >
            <Brain className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="truncate">Park Thought</span>
            <kbd className="hidden sm:inline-block text-[10px] font-mono px-1 py-0.5 rounded bg-indigo-200/60 text-indigo-800">
              Ctrl+J
            </kbd>
          </button>

          <button
            onClick={openBreathingBreak}
            className="px-3 py-2 rounded-xl bg-teal-50/80 hover:bg-teal-100/80 border border-teal-200/70 text-teal-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition group shadow-xs"
            title="Box Breathing Reset (4-4-4-4)"
          >
            <Wind className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="truncate">Box Breathing</span>
          </button>
        </div>

        {/* Pomodoro Cycle Indicator Bar */}
        <div className="mb-4 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-50/70 via-orange-50/40 to-slate-50 border border-rose-100/90 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-slate-800 truncate">
              🍅 Cycle {((cycleCount - 1) % 4) + 1} of 4
            </span>
            <span className="hidden sm:inline text-[11px] text-slate-500 font-medium truncate">
              • {cycleCount % 4 === 0 ? '15m Long Break next' : '5m Short Break next'}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4].map((step) => {
                const activeNum = ((cycleCount - 1) % 4) + 1;
                const isDone = step < activeNum;
                const isCurrent = step === activeNum;
                return (
                  <span
                    key={step}
                    title={`Sprint ${step}`}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      isDone
                        ? 'bg-rose-500 shadow-xs'
                        : isCurrent
                        ? 'bg-rose-500 ring-4 ring-rose-200 animate-pulse'
                        : 'bg-slate-200'
                    }`}
                  />
                );
              })}
            </div>
            {cycleCount > 1 && (
              <button
                onClick={resetCycle}
                className="text-[10px] text-slate-400 hover:text-slate-600 font-medium transition"
                title="Reset to Cycle 1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Circular Timer Visual */}
        <div className="flex flex-col items-center justify-center my-4">
          <div className="relative w-52 h-52 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r="70"
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                className={`transition-all duration-500 ${
                  isPaused ? 'stroke-amber-500' : 'stroke-blue-600'
                }`}
                strokeWidth="10"
                strokeDasharray="440"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Center Content */}
            <div className="absolute flex flex-col items-center text-center">
              <div className="text-4xl font-mono font-bold tracking-tight text-slate-900 dark:text-white">
                {activeSession
                  ? formattedRemaining
                  : `${String(durationMinutes).padStart(2, '0')}:00`}
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-1">
                {activeSession
                  ? isPaused
                    ? 'Paused'
                    : 'Focusing'
                  : 'Ready'}
              </span>
              {activeSession && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  {Math.round(elapsedSeconds / 60)}m done
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Controls and Configuration */}
        {!activeSession ? (
          <div className="space-y-4">
            {/* Duration Presets */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '10m', value: 10, desc: 'Quick Start' },
                { label: '25m', value: 25, desc: 'Standard' },
                { label: '50m', value: 50, desc: 'Deep Sprint' },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset.value);
                    setIsCustom(false);
                  }}
                  className={`py-2 px-2 rounded-xl text-center border transition ${
                    !isCustom && selectedPreset === preset.value
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900/80'
                  }`}
                >
                  <span className="block text-sm font-bold">{preset.label}</span>
                  <span className="block text-[10px] text-slate-400 truncate">{preset.desc}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`py-2 px-2 rounded-xl text-center border transition ${
                  isCustom
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900/80'
                }`}
              >
                <span className="block text-sm font-bold">Custom</span>
                <span className="block text-[10px] text-slate-400">Set minutes</span>
              </button>
            </div>

            {/* Custom Input */}
            {isCustom && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-600 pl-2">Sprint Duration:</span>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(Math.max(1, Math.min(180, parseInt(e.target.value) || 1)))}
                  className="w-20 px-2 py-1 text-sm bg-white rounded-lg border border-slate-300 font-bold text-center"
                />
                <span className="text-xs text-slate-500">minutes</span>
              </div>
            )}

            {/* Task Link Selection */}
            {availableTasks.length > 0 && onSelectTask && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  Link to Task (Recommended):
                </label>
                <select
                  value={selectedTaskId || ''}
                  onChange={(e) => onSelectTask(e.target.value ? e.target.value : null)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">No task linked (General Deep Work)</option>
                  {availableTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.priority.toUpperCase()}] {t.title} {t.project_name ? `(${t.project_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handleOpenChecklist}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                Focus Checklist
              </button>
              <button
                type="button"
                onClick={handleLaunchSession}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Focus ({durationMinutes}m)
              </button>
            </div>
          </div>
        ) : (
          /* Active Session Controls */
          <div className="space-y-4">
            {/* Active task details */}
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-center">
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
                Active Objective
              </span>
              <p className="text-sm font-bold text-slate-900 truncate">
                {activeSession.task_title || 'General Focus Session'}
              </p>
              {activeSession.project_name && (
                <span className="text-xs text-slate-500">{activeSession.project_name}</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {isPaused ? (
                <button
                  type="button"
                  onClick={onResume}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Resume
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onPause}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsReflectionOpen(true)}
                className="py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Complete
              </button>

              <button
                type="button"
                onClick={() => setIsAbandonConfirmOpen(true)}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition flex items-center justify-center gap-1.5"
              >
                <XOctagon className="w-3.5 h-3.5" />
                Abandon
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Abandon & Friction Cause Diagnostic Modal */}
      {isAbandonConfirmOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAbandonConfirmOpen(false);
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-slate-800"
          >
            <div className="bg-rose-50/80 px-6 py-4 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XOctagon className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-sm text-rose-950">Abandon Focus Sprint</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAbandonConfirmOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-rose-100/50"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Logging the obstacle helps your consistency analytics isolate and overcome recurring friction patterns.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  What caused this sprint to halt?
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'fatigue', label: '🥱 Fatigue after work' },
                    { id: 'interruption', label: '🔔 Interrupted' },
                    { id: 'complexity', label: '🐛 High complexity / stuck' },
                    { id: 'scope_creep', label: '📈 Scope creep' },
                    { id: 'unclear', label: '❓ Unclear requirements' },
                    { id: 'other', label: '🌀 Other' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAbandonFriction(cat.id as FrictionCategory)}
                      className={`p-2 rounded-xl text-left border transition font-medium ${
                        abandonFriction === cat.id
                          ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Blocker notes (optional)
                </label>
                <input
                  type="text"
                  value={abandonBlockerNote}
                  onChange={(e) => setAbandonBlockerNote(e.target.value)}
                  placeholder="e.g. Needed database credentials, got unexpected phone call..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAbandonConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onAbandon({
                      blockers: abandonBlockerNote.trim(),
                      friction_category: abandonFriction,
                    });
                    setIsAbandonConfirmOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
                >
                  Confirm & Log Friction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reflection Modal */}
      <SessionReflectionModal
        isOpen={isReflectionOpen}
        actualSeconds={elapsedSeconds}
        plannedMinutes={activeSession?.planned_minutes || durationMinutes}
        taskTitle={activeSession?.task_title}
        firstIncompleteSubtask={
          availableTasks
            .find((t) => t.id === (activeSession?.task_id || selectedTaskId))
            ?.subtasks?.find((s) => !s.completed)?.title || null
        }
        onConfirm={async (reflection) => {
          await onComplete(reflection);
          setIsReflectionOpen(false);
          advanceCycle();
          openBreathingBreak();
        }}
        onClose={() => {
          setIsReflectionOpen(false);
          advanceCycle();
          openBreathingBreak();
        }}
      />

      {/* Checklist Modal */}
      <FocusChecklistModal
        isOpen={isChecklistOpen}
        plannedMinutes={durationMinutes}
        taskTitle={
          availableTasks.find((t) => t.id === selectedTaskId)?.title || null
        }
        onConfirm={handleLaunchSession}
        onClose={() => setIsChecklistOpen(false)}
      />

      {/* Zen Mode Overlay */}
      {activeSession && (
        <ZenModeOverlay
          isOpen={isZenModeOpen}
          session={activeSession}
          isPaused={isPaused}
          remainingSeconds={remainingSeconds}
          elapsedSeconds={elapsedSeconds}
          onPause={onPause}
          onResume={onResume}
          onComplete={() => {
            setIsZenModeOpen(false);
            setIsReflectionOpen(true);
          }}
          onAbandon={() => {
            setIsZenModeOpen(false);
            onAbandon();
          }}
          onExit={() => setIsZenModeOpen(false)}
        />
      )}
    </>
  );
};

export default FocusTimer;
