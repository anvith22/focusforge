import { describe, it, expect } from 'vitest';

describe('Focus Timer Calculation and Formatting Logic', () => {
  it('correctly calculates remaining time and bounds at zero', () => {
    const plannedMinutes = 25;
    const totalPlannedSeconds = plannedMinutes * 60;

    const elapsedSeconds = 500;
    const remaining = Math.max(0, totalPlannedSeconds - elapsedSeconds);
    expect(remaining).toBe(1000);

    const overElapsed = 1600;
    const overRemaining = Math.max(0, totalPlannedSeconds - overElapsed);
    expect(overRemaining).toBe(0);
  });

  it('formats MM:SS correctly with zero-padding', () => {
    const formatTime = (totalSeconds: number) => {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    expect(formatTime(1500)).toBe('25:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(9)).toBe('00:09');
    expect(formatTime(0)).toBe('00:00');
  });

  it('correctly deducts paused durations from timestamp-based elapsed time', () => {
    const startMs = 1000000;
    const nowMs = 1060000; // 60 seconds later
    const accumulatedPauseMs = 15000; // 15 seconds paused

    const elapsedMs = Math.max(0, nowMs - startMs - accumulatedPauseMs);
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    expect(elapsedSeconds).toBe(45);
  });

  it('calculates weekly completion percentage accurately', () => {
    const calcPercentage = (actual: number, planned: number) => {
      if (planned <= 0) return 0;
      return Math.round((actual / planned) * 100);
    };

    expect(calcPercentage(60, 60)).toBe(100);
    expect(calcPercentage(30, 60)).toBe(50);
    expect(calcPercentage(90, 60)).toBe(150);
    expect(calcPercentage(0, 0)).toBe(0);
  });
});
