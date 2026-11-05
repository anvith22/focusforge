import { useState, useEffect, useRef, useCallback } from 'react';
import { FocusSession, FrictionCategory } from '../types';
import * as api from '../lib/api';
import soundEngine from '../lib/soundEngine';

const TIMER_STORAGE_KEY = 'focusforge_timer_state';
const POMODORO_CYCLE_KEY = 'focusforge_pomodoro_cycle';

interface LocalTimerState {
  sessionId: string;
  isPaused: boolean;
  pausedTimestamp: number | null;
  accumulatedPauseMs: number;
}

export function useFocusTimer(onSessionEnded?: () => void) {
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [accumulatedPauseMs, setAccumulatedPauseMs] = useState<number>(0);
  const [pausedTimestamp, setPausedTimestamp] = useState<number | null>(null);

  const [pomodoroCycle, setPomodoroCycle] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(POMODORO_CYCLE_KEY);
      return saved ? parseInt(saved, 10) : 1;
    } catch {
      return 1;
    }
  });

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(25 * 60);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Reflection
  const [showReflectionModal, setShowReflectionModal] = useState<boolean>(false);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Save local state to localStorage
  const saveLocalState = (state: LocalTimerState | null) => {
    if (state) {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }
  };

  const getLocalState = (): LocalTimerState | null => {
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // Reconcile and calculate exact elapsed seconds using timestamps
  const calculateElapsed = useCallback(() => {
    if (!activeSession) return 0;

    const startMs = new Date(activeSession.started_at).getTime();
    const now = Date.now();

    let totalPause = accumulatedPauseMs;
    if (isPaused && pausedTimestamp) {
      totalPause += now - pausedTimestamp;
    }

    const elapsedMs = Math.max(0, now - startMs - totalPause);
    return Math.floor(elapsedMs / 1000);
  }, [activeSession, isPaused, pausedTimestamp, accumulatedPauseMs]);

  // Initial recovery from backend PostgreSQL
  const recoverActiveSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await api.getActiveSession();
      if (session) {
        setActiveSession(session);
        const local = getLocalState();
        if (local && local.sessionId === session.id) {
          setIsPaused(local.isPaused);
          setAccumulatedPauseMs(local.accumulatedPauseMs || 0);
          setPausedTimestamp(local.pausedTimestamp);
        } else {
          setIsPaused(false);
          setAccumulatedPauseMs(0);
          setPausedTimestamp(null);
        }
      } else {
        setActiveSession(null);
        saveLocalState(null);
      }
    } catch (err) {
      console.error('Failed to recover active session:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    recoverActiveSession();
  }, [recoverActiveSession]);

  // Update timer tick
  useEffect(() => {
    if (!activeSession) {
      document.title = 'FocusForge — Focus OS';
      return;
    }

    const updateTimes = () => {
      const elapsed = calculateElapsed();
      setElapsedSeconds(elapsed);

      const totalPlannedSec = activeSession.planned_minutes * 60;
      const remaining = Math.max(0, totalPlannedSec - elapsed);
      setRemainingSeconds(remaining);

      // Update document title & Favicon
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      const prefix = isPaused ? '⏸️' : '⚡';
      const taskSuffix = activeSession.task_title ? ` [${activeSession.task_title}]` : '';
      document.title = `${prefix} (${formatted})${taskSuffix} — FocusForge`;

      // Update dynamic canvas favicon
      try {
        const ratio = totalPlannedSec > 0 ? Math.min(1, elapsed / totalPlannedSec) : 0;
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.beginPath();
          ctx.arc(16, 16, 14, 0, 2 * Math.PI);
          ctx.fillStyle = '#0a0f1d';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(16, 16, 11, -0.5 * Math.PI, -0.5 * Math.PI + 2 * Math.PI * (1 - ratio));
          ctx.lineWidth = 4;
          ctx.strokeStyle = isPaused ? '#f59e0b' : '#3b82f6';
          ctx.stroke();

          let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'shortcut icon';
            document.head.appendChild(link);
          }
          link.href = canvas.toDataURL();
        }
      } catch {}

      // Auto trigger completion prompt & chime if timer reached 0
      if (remaining === 0 && !isPaused && !showReflectionModal) {
        setShowReflectionModal(true);
        try {
          soundEngine.stopAmbient();
          soundEngine.playSessionCompletionBell();
        } catch {}

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Focus Session Complete! 🏆', {
            body: `Great job! Your ${activeSession.planned_minutes}-minute sprint is complete. Time to reflect or take a recovery break.`,
          });
        }
      }
    };

    updateTimes();

    if (!isPaused) {
      timerRef.current = setInterval(updateTimes, 1000);
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateTimes();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', updateTimes);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', updateTimes);
    };
  }, [activeSession, isPaused, calculateElapsed, showReflectionModal]);

  // Request notification permission if needed
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {}
    }
  };

  // Timer actions
  const startTimer = async (plannedMinutes: number, taskId?: string | null) => {
    setError(null);
    await requestNotificationPermission();

    try {
      const session = await api.startSession({
        planned_minutes: plannedMinutes,
        task_id: taskId || null,
        cycle_number: pomodoroCycle,
      });

      setActiveSession(session);
      setIsPaused(false);
      setAccumulatedPauseMs(0);
      setPausedTimestamp(null);
      setElapsedSeconds(0);
      setRemainingSeconds(plannedMinutes * 60);

      saveLocalState({
        sessionId: session.id,
        isPaused: false,
        pausedTimestamp: null,
        accumulatedPauseMs: 0,
      });

      return session;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const pauseTimer = () => {
    if (!activeSession || isPaused) return;
    const now = Date.now();
    setIsPaused(true);
    setPausedTimestamp(now);

    saveLocalState({
      sessionId: activeSession.id,
      isPaused: true,
      pausedTimestamp: now,
      accumulatedPauseMs,
    });
  };

  const resumeTimer = () => {
    if (!activeSession || !isPaused || !pausedTimestamp) return;
    const now = Date.now();
    const pauseDuration = now - pausedTimestamp;
    const newAccumulated = accumulatedPauseMs + pauseDuration;

    setIsPaused(false);
    setAccumulatedPauseMs(newAccumulated);
    setPausedTimestamp(null);

    saveLocalState({
      sessionId: activeSession.id,
      isPaused: false,
      pausedTimestamp: null,
      accumulatedPauseMs: newAccumulated,
    });
  };

  const completeTimer = async (reflection?: {
    accomplishment?: string;
    blockers?: string;
    next_action?: string;
  }) => {
    if (!activeSession) return;
    setError(null);
    try {
      const finalActualSeconds = calculateElapsed();
      await api.completeSession(activeSession.id, {
        actual_seconds: finalActualSeconds,
        accomplishment: reflection?.accomplishment || '',
        blockers: reflection?.blockers || '',
        next_action: reflection?.next_action || '',
      });

      // Advance Pomodoro Cycle (1 to 4 loop)
      const nextCycle = (pomodoroCycle % 4) + 1;
      setPomodoroCycle(nextCycle);
      localStorage.setItem(POMODORO_CYCLE_KEY, String(nextCycle));

      setActiveSession(null);
      saveLocalState(null);
      setShowReflectionModal(false);
      setIsZenMode(false);
      document.title = 'FocusForge — Focus OS';
      if (onSessionEnded) onSessionEnded();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const abandonTimer = async (reflection?: {
    blockers?: string;
    next_action?: string;
    friction_category?: FrictionCategory;
  }) => {
    if (!activeSession) return;
    setError(null);
    try {
      const finalActualSeconds = calculateElapsed();
      await api.abandonSession(activeSession.id, {
        actual_seconds: finalActualSeconds,
        blockers: reflection?.blockers || '',
        next_action: reflection?.next_action || '',
        friction_category: reflection?.friction_category || 'none',
      });

      setActiveSession(null);
      saveLocalState(null);
      setShowReflectionModal(false);
      setIsZenMode(false);
      document.title = 'FocusForge — Focus OS';
      if (onSessionEnded) onSessionEnded();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  return {
    activeSession,
    isPaused,
    elapsedSeconds,
    remainingSeconds,
    pomodoroCycle,
    setPomodoroCycle,
    isLoading,
    error,
    showReflectionModal,
    setShowReflectionModal,
    isZenMode,
    setIsZenMode,
    startTimer,
    pauseTimer,
    resumeTimer,
    completeTimer,
    abandonTimer,
    refreshSession: recoverActiveSession,
  };
}

export default useFocusTimer;
