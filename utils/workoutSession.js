import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

// In-memory active-session state, exposed through a context so a floating
// header pill and the logger view can both read the same clock without
// duplicating the interval. Elapsed time is derived from wall-clock deltas so
// the number stays honest even if the JS tick misses a beat.

const SessionCtx = createContext(null);

export function formatElapsed(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

export function WorkoutSessionProvider({ children }) {
  // Session shape:
  //   { startedAt: number, templateName: string, templateId: string }
  //   pausedAt: number | null
  //   accumPausedMs: number  (total ms spent paused before now)
  const [session, setSession] = useState(null);
  const [pausedAt, setPausedAt] = useState(null);
  const [accumPausedMs, setAccumPausedMs] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Only tick when a session is running AND not paused — no need to spin a
  // 1s interval when there's nothing to update.
  useEffect(() => {
    if (!session || pausedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session, pausedAt]);

  const elapsedMs = session
    ? (pausedAt ? pausedAt : now) - session.startedAt - accumPausedMs
    : 0;
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));

  const start = useCallback((template) => {
    setSession({
      startedAt: Date.now(),
      templateName: template?.name || 'Workout',
      templateId: template?.id || null,
    });
    setPausedAt(null);
    setAccumPausedMs(0);
    setNow(Date.now());
  }, []);

  const pause = useCallback(() => {
    setPausedAt((prev) => prev ?? Date.now());
  }, []);

  const resume = useCallback(() => {
    setPausedAt((prev) => {
      if (!prev) return null;
      setAccumPausedMs((ms) => ms + (Date.now() - prev));
      return null;
    });
  }, []);

  const finish = useCallback(() => {
    const end = Date.now();
    const paused = pausedAt ? end - pausedAt : 0;
    const total = session ? end - session.startedAt - accumPausedMs - paused : 0;
    setSession(null);
    setPausedAt(null);
    setAccumPausedMs(0);
    return Math.max(0, total);
  }, [session, pausedAt, accumPausedMs]);

  const cancel = useCallback(() => {
    setSession(null);
    setPausedAt(null);
    setAccumPausedMs(0);
  }, []);

  const value = {
    active: !!session,
    paused: !!pausedAt,
    templateName: session?.templateName || null,
    templateId: session?.templateId || null,
    startedAt: session?.startedAt || null,
    elapsedSeconds,
    start,
    pause,
    resume,
    finish,
    cancel,
  };

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useWorkoutSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('useWorkoutSession must be used inside <WorkoutSessionProvider>');
  return ctx;
}
