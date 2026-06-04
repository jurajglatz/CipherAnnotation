import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from './api';
import pageService from './pageService';
import type { Page, PreprocessHistoryState } from '../types';

const page = { id: 'p1', pageNumber: 1 } as unknown as Page;

describe('pageService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    localStorage.clear();
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
  });

  it('getPages GETs /documents/:id/pages', async () => {
    mock.onGet('/documents/d1/pages').reply(200, [page]);
    expect(await pageService.getPages('d1')).toEqual([page]);
  });

  it('getPage GETs a single page', async () => {
    mock.onGet('/documents/d1/pages/p1').reply(200, page);
    expect(await pageService.getPage('d1', 'p1')).toEqual(page);
  });

  it('preprocessPage POSTs operations', async () => {
    mock.onPost('/documents/d1/pages/p1/preprocess').reply(200, page);
    const ops = [{ name: 'grayscale' }, { name: 'threshold', value: 128 }];

    const res = await pageService.preprocessPage('d1', 'p1', ops);

    expect(res).toEqual(page);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ operations: ops });
  });

  it('resetPreprocessing DELETEs the preprocess endpoint', async () => {
    mock.onDelete('/documents/d1/pages/p1/preprocess').reply(200, page);
    expect(await pageService.resetPreprocessing('d1', 'p1')).toEqual(page);
  });

  it('addPages POSTs each file under "files" as multipart', async () => {
    mock.onPost('/documents/d1/pages').reply(201, [page]);
    const files = [
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['b'], 'b.png', { type: 'image/png' }),
    ];

    const res = await pageService.addPages('d1', files);

    expect(res).toEqual([page]);
    const sent = mock.history.post[0].data as FormData;
    expect(sent).toBeInstanceOf(FormData);
    expect(sent.getAll('files')).toHaveLength(2);
    expect(mock.history.post[0].headers?.['Content-Type']).toBe('multipart/form-data');
  });

  it('deletePage DELETEs a single page', async () => {
    mock.onDelete('/documents/d1/pages/p1').reply(204);
    await pageService.deletePage('d1', 'p1');
    expect(mock.history.delete[0].url).toBe('/documents/d1/pages/p1');
  });

  it('getPageImage requests a blob', async () => {
    mock.onGet('/documents/d1/pages/p1/image').reply(200, new Blob(['img']));
    const res = await pageService.getPageImage('d1', 'p1');
    expect(res).toBeInstanceOf(Blob);
    expect(mock.history.get[0].responseType).toBe('blob');
  });

  it('getPageProcessedImage requests the processed blob', async () => {
    mock.onGet('/documents/d1/pages/p1/processed-image').reply(200, new Blob(['img']));
    const res = await pageService.getPageProcessedImage('d1', 'p1');
    expect(res).toBeInstanceOf(Blob);
    expect(mock.history.get[0].responseType).toBe('blob');
  });

  it('getPreprocessHistory GETs the history endpoint', async () => {
    const hist = { canUndo: true, canRedo: false } as unknown as PreprocessHistoryState;
    mock.onGet('/documents/d1/pages/p1/preprocess/history').reply(200, hist);
    expect(await pageService.getPreprocessHistory('d1', 'p1')).toEqual(hist);
  });

  it('undoPreprocess POSTs to the undo endpoint', async () => {
    const hist = { canUndo: false } as unknown as PreprocessHistoryState;
    mock.onPost('/documents/d1/pages/p1/preprocess/undo').reply(200, hist);
    expect(await pageService.undoPreprocess('d1', 'p1')).toEqual(hist);
  });

  it('redoPreprocess POSTs to the redo endpoint', async () => {
    const hist = { canRedo: false } as unknown as PreprocessHistoryState;
    mock.onPost('/documents/d1/pages/p1/preprocess/redo').reply(200, hist);
    expect(await pageService.redoPreprocess('d1', 'p1')).toEqual(hist);
  });

  it('applyPreprocessToAllPages POSTs operations to apply-all', async () => {
    const result = { processed: 3, failed: 0 };
    mock.onPost('/documents/d1/pages/preprocess/apply-all').reply(200, result);
    const ops = [{ name: 'invert' }];

    const res = await pageService.applyPreprocessToAllPages('d1', ops);

    expect(res).toEqual(result);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ operations: ops });
  });
});
