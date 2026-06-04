import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from './api';
import annotationService, { type CreateAnnotationData } from './annotationService';
import type { Annotation, BoundingBox } from '../types';

const box: BoundingBox = { x: 1, y: 2, width: 3, height: 4 } as unknown as BoundingBox;
const ann = { id: 'a1' } as unknown as Annotation;

describe('annotationService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    localStorage.clear();
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
  });

  it('list GETs /pages/:id/annotations', async () => {
    mock.onGet('/pages/p1/annotations').reply(200, [ann]);
    expect(await annotationService.list('p1')).toEqual([ann]);
  });

  it('create POSTs the annotation payload', async () => {
    mock.onPost('/pages/p1/annotations').reply(201, ann);
    const data = {
      type: 'Symbol',
      orientation: 0,
      boundingBox: box,
    } as unknown as CreateAnnotationData;

    const res = await annotationService.create('p1', data);

    expect(res).toEqual(ann);
    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({ type: 'Symbol' });
  });

  it('update passes the body through untouched when no null fields', async () => {
    mock.onPut('/pages/p1/annotations/a1').reply(200, ann);
    await annotationService.update('p1', 'a1', { content: 'x' });
    expect(JSON.parse(mock.history.put[0].data)).toEqual({ content: 'x' });
  });

  it('update translates parentId:null into clearParent', async () => {
    mock.onPut('/pages/p1/annotations/a1').reply(200, ann);
    await annotationService.update('p1', 'a1', { parentId: null });
    const body = JSON.parse(mock.history.put[0].data);
    expect(body).not.toHaveProperty('parentId');
    expect(body.clearParent).toBe(true);
  });

  it('update translates symbolId:null into clearSymbol', async () => {
    mock.onPut('/pages/p1/annotations/a1').reply(200, ann);
    await annotationService.update('p1', 'a1', { symbolId: null });
    const body = JSON.parse(mock.history.put[0].data);
    expect(body).not.toHaveProperty('symbolId');
    expect(body.clearSymbol).toBe(true);
  });

  it('update keeps a non-null parentId as-is', async () => {
    mock.onPut('/pages/p1/annotations/a1').reply(200, ann);
    await annotationService.update('p1', 'a1', { parentId: 'parent-1' });
    const body = JSON.parse(mock.history.put[0].data);
    expect(body.parentId).toBe('parent-1');
    expect(body).not.toHaveProperty('clearParent');
  });

  it('remove DELETEs the annotation', async () => {
    mock.onDelete('/pages/p1/annotations/a1').reply(204);
    await annotationService.remove('p1', 'a1');
    expect(mock.history.delete[0].url).toBe('/pages/p1/annotations/a1');
  });

  it('updateBoundingBox PUTs to the boundingboxes endpoint', async () => {
    mock.onPut('/pages/p1/annotations/boundingboxes/a1').reply(200, box);
    const res = await annotationService.updateBoundingBox('p1', 'a1', box);
    expect(res).toEqual(box);
    expect(JSON.parse(mock.history.put[0].data)).toEqual(box);
  });

  it('autoAnnotate POSTs without query string by default', async () => {
    mock.onPost('/pages/p1/auto-annotate').reply(200, [ann]);
    expect(await annotationService.autoAnnotate('p1')).toEqual([ann]);
    expect(mock.history.post[0].url).toBe('/pages/p1/auto-annotate');
  });

  it('autoAnnotate adds replaceExisting=true when requested', async () => {
    mock.onPost('/pages/p1/auto-annotate?replaceExisting=true').reply(200, [ann]);
    await annotationService.autoAnnotate('p1', { replaceExisting: true });
    expect(mock.history.post[0].url).toBe('/pages/p1/auto-annotate?replaceExisting=true');
  });

  it('autoAnnotateAll builds the query string from options', async () => {
    const result = { appliedCount: 1, failedCount: 0, totalCreated: 5 };
    mock.onPost(/\/documents\/d1\/auto-annotate/).reply(200, result);

    const res = await annotationService.autoAnnotateAll('d1', {
      excludePageId: 'p9',
      replaceExisting: true,
    });

    expect(res).toEqual(result);
    expect(mock.history.post[0].url).toBe(
      '/documents/d1/auto-annotate?excludePageId=p9&replaceExisting=true',
    );
  });

  it('listForDocument omits the query string when no options', async () => {
    mock.onGet('/documents/d1/annotations').reply(200, []);
    await annotationService.listForDocument('d1');
    expect(mock.history.get[0].url).toBe('/documents/d1/annotations');
  });

  it('listForDocument encodes type/currentPageId/parentId', async () => {
    mock.onGet(/\/documents\/d1\/annotations/).reply(200, []);
    await annotationService.listForDocument('d1', {
      type: 'Symbol' as never,
      currentPageId: 'p1',
      parentId: 'par',
    });
    expect(mock.history.get[0].url).toBe(
      '/documents/d1/annotations?type=Symbol&currentPageId=p1&parentId=par',
    );
  });

  it('listForDocument uses rootOnly only when parentId is absent', async () => {
    mock.onGet(/\/documents\/d1\/annotations/).reply(200, []);
    await annotationService.listForDocument('d1', { rootOnly: true, parentId: 'par' });
    expect(mock.history.get[0].url).toBe('/documents/d1/annotations?parentId=par');
  });
});
