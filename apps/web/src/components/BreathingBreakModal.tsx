import React, { useState, useEffect } from 'react';
import {
  Wind,
  X,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Sparkles,
  CheckCircle2,
  HeartPulse,
} from 'lucide-react';
import soundEngine from '../lib/soundEngine';

interface BreathingBreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakMinutes?: number;
  onStartNextSprint?: () => void;
}

type BreathPhase = 'Inhale' | 'Hold (Full)' | 'Exhale' | 'Hold (Empty)';

export const BreathingBreakModal: React.FC<BreathingBreakModalProps> = ({
  isOpen,
  onClose,
  breakMinutes = 5,
  onStartNextSprint,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(breakMinutes * 60);
  const [isPaused, setIsPaused] = useState(false);

  // Box Breathing Cycle: 4-4-4-4 seconds (16s total)
  const [cycleTime, setCycleTime] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSecondsLeft(breakMinutes * 60);
      setIsPaused(false);
      setCycleTime(0);
    }
  }, [isOpen, breakMinutes]);

  // Overall break countdown timer
  useEffect(() => {
    if (!isOpen || isPaused) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          try {
            soundEngine.playBreakFinishChime();
          } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isPaused]);

  // 16s Box Breathing loop
  useEffect(() => {
    if (!isOpen || isPaused) return;

    const breathInterval = setInterval(() => {
      setCycleTime((prev) => (prev + 1) % 16);
    }, 1000);

    return () => clearInterval(breathInterval);
  }, [isOpen, isPaused]);

  if (!isOpen) return null;

  // Determine current breathing phase based on 16s cycle
  let phase: BreathPhase = 'Inhale';
  let phaseSeconds = 4;
  let circleScale = 'scale-100';
  let glowColor = 'shadow-cyan-500/30';
  let phaseInstruction = 'Deep breath through your nose...';

  if (cycleTime < 4) {
    phase = 'Inhale';
    phaseSeconds = 4 - cycleTime;
    circleScale = 'scale-125';
    glowColor = 'shadow-teal-500/50';
    phaseInstruction = 'Fill your lungs slowly and deeply';
  } else if (cycleTime < 8) {
    phase = 'Hold (Full)';
    phaseSeconds = 8 - cycleTime;
    circleScale = 'scale-125';
    glowColor = 'shadow-indigo-500/50';
    phaseInstruction = 'Keep stillness, relax shoulders';
  } else if (cycleTime < 12) {
    phase = 'Exhale';
    phaseSeconds = 12 - cycleTime;
    circleScale = 'scale-90';
    glowColor = 'shadow-blue-500/50';
    phaseInstruction = 'Release tension completely through mouth';
  } else {
    phase = 'Hold (Empty)';
    phaseSeconds = 16 - cycleTime;
    circleScale = 'scale-90';
    glowColor = 'shadow-purple-500/30';
    phaseInstruction = 'Rest in peace before the next cycle';
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedBreakTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050811]/90 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="w-full max-w-xl bg-gradient-to-b from-[#0b1329] to-[#080d1c] text-white rounded-3xl border border-teal-500/30 shadow-2xl overflow-hidden flex flex-col p-8 md:p-10 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block">
                Rest & Recalibrate
              </span>
              <span className="text-sm font-semibold text-slate-300">
                Box Breathing (4-4-4-4)
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center Visual Box Breathing Circle */}
        <div className="my-10 flex flex-col items-center justify-center space-y-6">
          <div className="relative flex items-center justify-center w-56 h-56">
            {/* Outer pulsating ring */}
            <div
              className={`absolute inset-0 rounded-full border-2 border-teal-400/30 transition-transform duration-1000 ease-in-out ${circleScale}`}
            />
            {/* Middle glowing aura */}
            <div
              className={`absolute inset-4 rounded-full bg-gradient-to-tr from-teal-500/10 via-cyan-500/20 to-indigo-500/10 blur-xl transition-all duration-1000 ease-in-out ${circleScale} ${glowColor}`}
            />
            {/* Inner Core */}
            <div
              className={`w-36 h-36 rounded-full bg-gradient-to-tr from-teal-600 to-cyan-500 shadow-2xl flex flex-col items-center justify-center text-white transition-all duration-1000 ease-in-out ${circleScale} ${glowColor}`}
            >
              <Wind className="w-6 h-6 mb-1 opacity-90 animate-pulse" />
              <span className="text-xl font-extrabold tracking-tight">{phase}</span>
              <span className="text-xs font-mono font-semibold opacity-90 mt-0.5">
                {phaseSeconds}s
              </span>
            </div>
          </div>

          {/* Phase text instruction */}
          <div className="text-center space-y-1">
            <p className="text-base font-semibold text-teal-200 tracking-wide">
              {phaseInstruction}
            </p>
            <p className="text-xs text-slate-400">
              Lowers cortisol, resets dopamine receptors, and primes focus for the next session.
            </p>
          </div>
        </div>

        {/* Break Remaining Pill */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Break Remaining
            </span>
            <div className="text-2xl font-mono font-black text-white">{formattedBreakTime}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>

            {onStartNextSprint ? (
              <button
                onClick={() => {
                  onClose();
                  onStartNextSprint();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-xs font-bold text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-teal-500/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Start Next Sprint
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                Finish Break
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default BreathingBreakModal;
