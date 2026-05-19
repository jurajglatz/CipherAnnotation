/**
 * Auto-fill job service
 * Talks to the in-memory background job tracker on the server. The bell in
 * the navbar polls list() and renders per-page progress for the current user.
 */

import api from './api';

export type AutoFillJobStatus = 'Pending' | 'Running' | 'Completed' | 'Failed';
export type AutoFillPageStatus = 'Pending' | 'Running' | 'Completed' | 'Failed';
export type AutoFillScope = 'Page' | 'Document';

export interface AutoFillPageProgress {
  pageId: string;
  pageNumber: number;
  documentId: string;
  documentTitle: string;
  total: number;
  filled: number;
  status: AutoFillPageStatus;
  error?: string | null;
}

export interface AutoFillJob {
  jobId: string;
  scope: AutoFillScope;
  scopeId: string;
  status: AutoFillJobStatus;
  startedAt: string;
  completedAt?: string | null;
  pages: AutoFillPageProgress[];
}

class AutoFillJobService {
  async start(scope: AutoFillScope, id: string): Promise<{ jobId: string }> {
    const response = await api.post<{ jobId: string }>('/symbols/auto-fill-jobs', { scope, id });
    return response.data;
  }

  async list(): Promise<AutoFillJob[]> {
    const response = await api.get<AutoFillJob[]>('/symbols/auto-fill-jobs');
    return response.data;
  }

  async dismiss(jobId: string): Promise<void> {
    await api.delete(`/symbols/auto-fill-jobs/${jobId}`);
  }

  async dismissAllCompleted(): Promise<void> {
    await api.delete('/symbols/auto-fill-jobs');
  }
}

export default new AutoFillJobService();
