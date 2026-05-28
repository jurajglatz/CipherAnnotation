import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

const useAuthMock = vi.fn();
vi.mock('@/hooks', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/services/autoFillJobService', () => ({
  default: {
    list: vi.fn(),
    start: vi.fn(),
    dismiss: vi.fn(),
    dismissAllCompleted: vi.fn(),
  },
}));

import { AutoFillJobsProvider, useAutoFillJobs } from './AutoFillJobsContext';
import autoFillJobService from '@/services/autoFillJobService';

const svc = autoFillJobService as unknown as Record<string, ReturnType<typeof vi.fn>>;

function Probe() {
  const v = useAutoFillJobs();
  return (
    <div>
      <span data-testid="count">{v.activeCount}</span>
      <span data-testid="total">{v.jobs.length}</span>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AutoFillJobsProvider>
      <Probe />
    </AutoFillJobsProvider>,
  );
}

describe('AutoFillJobsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ isAuthenticated: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fetch when unauthenticated', async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false });
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('0'));
    expect(svc.list).not.toHaveBeenCalled();
  });

  it('fetches once on mount when authenticated', async () => {
    svc.list.mockResolvedValue([{ jobId: '1', status: 'Completed' }]);
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('1'));
    expect(svc.list).toHaveBeenCalledTimes(1);
  });

  it('activeCount counts Pending + Running', async () => {
    svc.list.mockResolvedValue([
      { jobId: '1', status: 'Running' },
      { jobId: '2', status: 'Pending' },
      { jobId: '3', status: 'Completed' },
    ]);
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
  });

  it('polls every 1.5s while a job is active', async () => {
    vi.useFakeTimers();
    svc.list.mockResolvedValue([{ jobId: '1', status: 'Running' }]);

    renderWithProvider();

    // Wait for the initial fetch AND state update (activeCount > 0 means interval is registered)
    await vi.waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(svc.list).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(svc.list).toHaveBeenCalledTimes(3);
  });

  it('stops polling once no jobs are active', async () => {
    vi.useFakeTimers();
    svc.list
      .mockResolvedValueOnce([{ jobId: '1', status: 'Running' }])
      .mockResolvedValue([{ jobId: '1', status: 'Completed' }]);

    renderWithProvider();
    // Wait for initial fetch AND state update (interval registered when active)
    await vi.waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(svc.list).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(svc.list).toHaveBeenCalledTimes(2);
  });
});
