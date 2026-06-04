import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from './api';
import exportService from './exportService';
import type { ExportRequest } from '../types';

const req = { documentIds: ['d1'] } as unknown as ExportRequest;

describe('exportService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    localStorage.clear();
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it('exportCoco POSTs to /export/coco and returns a blob', async () => {
    mock.onPost('/export/coco').reply(200, new Blob(['coco']));
    const res = await exportService.exportCoco(req);
    expect(res).toBeInstanceOf(Blob);
    expect(mock.history.post[0].responseType).toBe('blob');
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ documentIds: ['d1'] });
  });

  it('exportYolo POSTs to /export/yolo as a blob', async () => {
    mock.onPost('/export/yolo').reply(200, new Blob(['yolo']));
    const res = await exportService.exportYolo(req);
    expect(res).toBeInstanceOf(Blob);
    expect(mock.history.post[0].responseType).toBe('blob');
  });

  it('exportTfRecord POSTs to /export/tfrecord as a blob', async () => {
    mock.onPost('/export/tfrecord').reply(200, new Blob(['tf']));
    const res = await exportService.exportTfRecord(req);
    expect(res).toBeInstanceOf(Blob);
    expect(mock.history.post[0].responseType).toBe('blob');
  });

  it('getExportStatus GETs /export/:id', async () => {
    const status = { id: 'e1', status: 'completed', progress: 100 };
    mock.onGet('/export/e1').reply(200, status);
    expect(await exportService.getExportStatus('e1')).toEqual(status);
  });

  it('cancelExport POSTs /export/:id/cancel', async () => {
    mock.onPost('/export/e1/cancel').reply(204);
    await exportService.cancelExport('e1');
    expect(mock.history.post[0].url).toBe('/export/e1/cancel');
  });

  it('downloadBlob creates an anchor, clicks it and cleans up', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:url');
    const revokeObjectURL = vi.fn();
    // jsdom does not implement these by default.
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    const click = vi.fn();
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(click);
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    const blob = new Blob(['data']);
    exportService.downloadBlob(blob, 'out.zip');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('out.zip');
    expect(anchor.href).toContain('blob:url');
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:url');
  });
});
