import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from './api';
import autoFillJobService from './autoFillJobService';

describe('autoFillJobService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    localStorage.clear();
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
  });

  it('start POSTs scope + id and returns the jobId', async () => {
    mock.onPost('/symbols/auto-fill-jobs').reply(202, { jobId: 'j1' });
    const res = await autoFillJobService.start('Page', 'p1');
    expect(res).toEqual({ jobId: 'j1' });
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ scope: 'Page', id: 'p1' });
  });

  it('list GETs the jobs collection', async () => {
    const jobs = [{ jobId: 'j1' }];
    mock.onGet('/symbols/auto-fill-jobs').reply(200, jobs);
    expect(await autoFillJobService.list()).toEqual(jobs);
  });

  it('dismiss DELETEs a single job', async () => {
    mock.onDelete('/symbols/auto-fill-jobs/j1').reply(204);
    await autoFillJobService.dismiss('j1');
    expect(mock.history.delete[0].url).toBe('/symbols/auto-fill-jobs/j1');
  });

  it('dismissAllCompleted DELETEs the collection', async () => {
    mock.onDelete('/symbols/auto-fill-jobs').reply(204);
    await autoFillJobService.dismissAllCompleted();
    expect(mock.history.delete[0].url).toBe('/symbols/auto-fill-jobs');
  });
});
