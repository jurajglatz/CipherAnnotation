/**
 * AutoFillJobs Context
 *
 * Tracks symbol-captioning jobs the user has started. Polls the backend
 * every ~1.5s while any job is Pending/Running so the bell in the navbar
 * stays in sync with per-page progress.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import autoFillJobService, { AutoFillJob, AutoFillScope } from '@/services/autoFillJobService';
import { useAuth } from '@/hooks';

interface AutoFillJobsContextValue {
  jobs: AutoFillJob[];
  activeCount: number;
  start: (scope: AutoFillScope, id: string) => Promise<{ jobId: string }>;
  dismiss: (jobId: string) => Promise<void>;
  dismissAllCompleted: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AutoFillJobsContextValue | undefined>(undefined);

const POLL_MS = 1500;

export const AutoFillJobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [jobs, setJobs] = useState<AutoFillJob[]>([]);
  const timerRef = useRef<number | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!isAuthenticated) {
      setJobs([]);
      return;
    }
    try {
      const next = await autoFillJobService.list();
      setJobs(next);
    } catch {
      // Network errors are silent — the bell will recover on the next tick.
    }
  }, [isAuthenticated]);

  const hasActive = useMemo(
    () => jobs.some((j) => j.status === 'Pending' || j.status === 'Running'),
    [jobs],
  );

  // Polling loop: only ticks while at least one job is still in flight.
  // When everything completes we go idle and rely on user actions (start,
  // dismiss, or a manual refresh) to wake the loop up again.
  useEffect(() => {
    if (!isAuthenticated) return;
    // Always fetch once when the user logs in or this provider mounts.
    fetchOnce();
  }, [isAuthenticated, fetchOnce]);

  useEffect(() => {
    if (!isAuthenticated || !hasActive) {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (timerRef.current !== null) return;
    timerRef.current = window.setInterval(fetchOnce, POLL_MS);
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [hasActive, isAuthenticated, fetchOnce]);

  const start = useCallback(async (scope: AutoFillScope, id: string) => {
    const res = await autoFillJobService.start(scope, id);
    // Pull the fresh job into local state immediately so the bell lights up
    // without waiting for the next poll tick.
    await fetchOnce();
    return res;
  }, [fetchOnce]);

  const dismiss = useCallback(async (jobId: string) => {
    await autoFillJobService.dismiss(jobId);
    setJobs((cur) => cur.filter((j) => j.jobId !== jobId));
  }, []);

  const dismissAllCompleted = useCallback(async () => {
    await autoFillJobService.dismissAllCompleted();
    setJobs((cur) => cur.filter((j) => j.status === 'Pending' || j.status === 'Running'));
  }, []);

  const value = useMemo<AutoFillJobsContextValue>(() => ({
    jobs,
    activeCount: jobs.filter((j) => j.status === 'Pending' || j.status === 'Running').length,
    start,
    dismiss,
    dismissAllCompleted,
    refresh: fetchOnce,
  }), [jobs, start, dismiss, dismissAllCompleted, fetchOnce]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useAutoFillJobs(): AutoFillJobsContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAutoFillJobs must be used within AutoFillJobsProvider');
  return v;
}
