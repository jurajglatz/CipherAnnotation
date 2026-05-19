/**
 * NotificationsBell
 *
 * Bell icon in the navbar showing per-page progress of background symbol
 * auto-fill jobs. One line per page: "<Document> - Page <N> - <filled> out of <total>".
 * Completed/failed entries stay until the user dismisses them.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, X, AlertTriangle, Loader2 } from 'lucide-react';
import { useAutoFillJobs } from '@/context/AutoFillJobsContext';
import { AutoFillJob, AutoFillPageProgress } from '@/services/autoFillJobService';

const statusIcon = (s: AutoFillPageProgress['status']) => {
  switch (s) {
    case 'Completed':
      return <Check className="w-3.5 h-3.5 text-emerald-600" />;
    case 'Failed':
      return <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />;
    case 'Running':
      return <Loader2 className="w-3.5 h-3.5 text-sepia-700 animate-spin" />;
    case 'Pending':
    default:
      return <span className="inline-block w-2 h-2 rounded-full bg-sepia-400" />;
  }
};

const PageRow: React.FC<{ p: AutoFillPageProgress }> = ({ p }) => {
  const pct = p.total === 0 ? 100 : Math.round((p.filled / p.total) * 100);
  return (
    <div className="px-3 py-2 border-b border-sepia-600/10 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {statusIcon(p.status)}
          <span className="text-xs text-ink-900 truncate">
            {p.documentTitle} — Page {p.pageNumber}
          </span>
        </div>
        <span className="text-xs font-medium text-ink-900/80 whitespace-nowrap">
          {p.filled} out of {p.total}
        </span>
      </div>
      <div className="mt-1.5 h-1 rounded bg-sepia-600/10 overflow-hidden">
        <div
          className={`h-full transition-all ${
            p.status === 'Failed' ? 'bg-rose-500' : p.status === 'Completed' ? 'bg-emerald-500' : 'bg-sepia-600'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {p.error && <p className="mt-1 text-[11px] text-rose-600">{p.error}</p>}
    </div>
  );
};

const JobBlock: React.FC<{ job: AutoFillJob; onDismiss: (id: string) => void }> = ({ job, onDismiss }) => {
  const total = job.pages.reduce((s, p) => s + p.total, 0);
  const filled = job.pages.reduce((s, p) => s + p.filled, 0);
  const isDone = job.status === 'Completed' || job.status === 'Failed';

  return (
    <div className="border border-sepia-600/15 rounded-md bg-parchment-50 mb-2 last:mb-0">
      <div className="flex items-center justify-between px-3 py-1.5 bg-parchment-100/70 border-b border-sepia-600/10 rounded-t-md">
        <span className="text-[11px] uppercase tracking-wide font-semibold text-ink-900/70">
          {job.scope === 'Document' ? 'Document caption job' : 'Page caption job'} · {filled}/{total}
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-medium ${
            job.status === 'Running' || job.status === 'Pending'
              ? 'text-sepia-700'
              : job.status === 'Failed'
                ? 'text-rose-700'
                : 'text-emerald-700'
          }`}>
            {job.status === 'Pending' ? 'Queued' :
             job.status === 'Running' ? 'Running…' :
             job.status === 'Completed' ? 'Completed' : 'Failed'}
          </span>
          {isDone && (
            <button
              onClick={() => onDismiss(job.jobId)}
              className="text-ink-900/50 hover:text-ink-900"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div>
        {job.pages.map((p) => <PageRow key={p.pageId} p={p} />)}
      </div>
    </div>
  );
};

export const NotificationsBell: React.FC = () => {
  const { jobs, activeCount, dismiss, dismissAllCompleted } = useAutoFillJobs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const hasAny = jobs.length > 0;
  const completedCount = jobs.filter((j) => j.status === 'Completed' || j.status === 'Failed').length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-md hover:bg-ink-900/5 border border-transparent hover:border-sepia-600/20 transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-ink-900/80" />
        {activeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-sepia-700 text-parchment-50 text-[10px] font-semibold flex items-center justify-center">
            {activeCount}
          </span>
        )}
        {activeCount === 0 && completedCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[380px] max-h-[70vh] overflow-y-auto bg-parchment-50 border border-sepia-600/20 rounded-md shadow-xl z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-sepia-600/15">
            <span className="text-sm font-semibold text-ink-900">Notifications</span>
            {completedCount > 0 && (
              <button
                onClick={dismissAllCompleted}
                className="text-xs text-ink-900/60 hover:text-ink-900"
              >
                Clear completed
              </button>
            )}
          </div>
          <div className="p-2">
            {!hasAny && (
              <p className="text-xs text-ink-900/60 px-2 py-6 text-center">
                No notifications.
              </p>
            )}
            {jobs.map((job) => (
              <JobBlock key={job.jobId} job={job} onDismiss={dismiss} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;
