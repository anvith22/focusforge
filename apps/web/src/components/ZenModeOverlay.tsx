import React from 'react';
import { Maximize2, Minimize2, Pause, Play, CheckCircle2, XOctagon, Brain, Wind } from 'lucide-react';
import { FocusSession } from '../types';
import SoundscapeBar from './SoundscapeBar';
import { openDistractionPad, openBreathingBreak } from '../lib/modalEvents';

interface ZenModeOverlayProps {
  isOpen: boolean;
  session: FocusSession;
  isPaused: boolean;
  remainingSeconds: number;
  elapsedSeconds: number;
  onPause: () => void;
  onResume: () => void;
  onComplete: () => void;
  onAbandon: () => void;
  onExit: () => void;
}

export const ZenModeOverlay: React.FC<ZenModeOverlayProps> = ({
  isOpen,
  session,
  isPaused,
  remainingSeconds,
  elapsedSeconds,
  onPause,
  onResume,
  onComplete,
  onAbandon,
  onExit,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onExit]);

  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const totalPlannedSec = session.planned_minutes * 60;
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / totalPlannedSec) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-[#080c16] text-white flex flex-col justify-between p-8 md:p-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-blue-400">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
          Zen Mode — Deep Focus Sprint
        </div>
        <div className="flex items-center gap-3">
          <SoundscapeBar compact={true} />
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
            title="Exit Zen Mode (Esc)"
          >
            <Minimize2 className="w-4 h-4" />
            <span>Exit Fullscreen</span>
          </button>
        </div>
      </div>

      {/* Main Big Timer & Task */}
      <div className="flex flex-col items-center justify-center text-center my-auto space-y-6">
        {session.project_name && (
          <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-500/30">
            {session.project_name}
          </span>
        )}

        <h2 className="text-xl md:text-3xl font-extrabold text-slate-100 max-w-2xl px-4 tracking-tight leading-tight">
          {session.task_title || 'Single-Task Sprint in Progress'}
        </h2>

        {/* Large Countdown Display */}
        <div className="relative flex items-center justify-center">
          <div className="text-7xl md:text-9xl font-black font-mono tracking-tighter tabular-nums select-none text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
            {formattedTime}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-72 md:w-96 bg-slate-800/60 rounded-full h-2 overflow-hidden border border-slate-700/50">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000 ease-linear shadow-sm shadow-blue-500/50"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-xs text-slate-400 font-medium">
          {isPaused ? 'Timer paused' : `${session.planned_minutes}m Sprint in flow`}
        </p>
      </div>

      {/* Zen Bottom Controls */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={isPaused ? onResume : onPause}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition text-sm"
          >
            {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
            {isPaused ? 'Resume Sprint' : 'Pause'}
          </button>

          <button
            onClick={openDistractionPad}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-950/60 hover:bg-indigo-900/70 text-indigo-300 border border-indigo-800/50 font-medium transition text-sm"
            title="Park an intrusive thought (Ctrl+J)"
          >
            <Brain className="w-4 h-4" />
            Park Thought
            <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-indigo-900 text-indigo-200">Ctrl+J</kbd>
          </button>

          <button
            onClick={openBreathingBreak}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-teal-950/60 hover:bg-teal-900/70 text-teal-300 border border-teal-800/50 font-medium transition text-sm"
            title="Guided Box Breathing"
          >
            <Wind className="w-4 h-4" />
            Breathing Break
          </button>

          <button
            onClick={onComplete}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white shadow-lg shadow-emerald-500/30 transition text-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Finish & Reflect
          </button>

          <button
            onClick={onAbandon}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 font-medium transition text-sm"
          >
            <XOctagon className="w-4 h-4" />
            Abandon
          </button>
        </div>
      </div>

      {/* Footer Quote */}
      <div className="text-center text-xs text-slate-500">
        "Focus is saying no to the hundred other good ideas to stay committed to the current one."
      </div>
    </div>
  );
};

export default ZenModeOverlay;
