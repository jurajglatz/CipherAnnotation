import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from './api';
import symbolService from './symbolService';
import type { Symbol } from '../types';

const sym = { id: 's1' } as unknown as Symbol;

describe('symbolService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    localStorage.clear();
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
  });

  it('list serializes params (joins documentIds, drops empties)', async () => {
    mock.onGet('/symbols').reply(200, [sym]);

    await symbolService.list({
      scope: 'Document' as never,
      documentIds: ['d1', 'd2'],
      onlyUncaptioned: false,
      take: 20,
    });

    expect(mock.history.get[0].params).toEqual({
      scope: 'Document',
      contentSearch: undefined,
      documentIds: 'd1,d2',
      onlyUncaptioned: undefined,
      take: 20,
      skip: undefined,
    });
  });

  it('list leaves documentIds undefined when empty', async () => {
    mock.onGet('/symbols').reply(200, []);
    await symbolService.list({ documentIds: [] });
    expect(mock.history.get[0].params.documentIds).toBeUndefined();
  });

  it('listUnlinkedAnnotations GETs the unlinked endpoint', async () => {
    mock.onGet('/symbols/unlinked-annotations').reply(200, []);
    await symbolService.listUnlinkedAnnotations({ onlyUncaptioned: true });
    expect(mock.history.get[0].params.onlyUncaptioned).toBe(true);
  });

  it('getById GETs /symbols/:id', async () => {
    mock.onGet('/symbols/s1').reply(200, sym);
    expect(await symbolService.getById('s1')).toEqual(sym);
  });

  it('getSuggestions coerces null content to empty string', async () => {
    mock.onGet('/symbols/suggestions').reply(200, []);
    await symbolService.getSuggestions(null);
    expect(mock.history.get[0].params).toEqual({ content: '', take: 6 });
  });

  it('create POSTs multipart FormData with pngFile and optional content', async () => {
    mock.onPost('/symbols').reply(201, sym);
    const res = await symbolService.create(new Blob(['png']), 'alpha', 'a.png');

    expect(res).toEqual(sym);
    const fd = mock.history.post[0].data as FormData;
    expect(fd).toBeInstanceOf(FormData);
    expect(fd.get('content')).toBe('alpha');
    expect(mock.history.post[0].headers?.['Content-Type']).toBe('multipart/form-data');
  });

  it('create omits content when not provided', async () => {
    mock.onPost('/symbols').reply(201, sym);
    await symbolService.create(new Blob(['png']));
    const fd = mock.history.post[0].data as FormData;
    expect(fd.get('content')).toBeNull();
  });

  it('updateImage PUTs multipart FormData', async () => {
    mock.onPut('/symbols/s1/image').reply(200, sym);
    await symbolService.updateImage('s1', new Blob(['png']));
    expect(mock.history.put[0].data).toBeInstanceOf(FormData);
  });

  it('update PUTs { content }', async () => {
    mock.onPut('/symbols/s1').reply(200, sym);
    await symbolService.update('s1', 'beta');
    expect(JSON.parse(mock.history.put[0].data)).toEqual({ content: 'beta' });
  });

  it('renameCaption PUTs to the rename-caption endpoint', async () => {
    const result = { updated: 2 };
    mock.onPut('/symbols/s1/rename-caption').reply(200, result);
    const res = await symbolService.renameCaption('s1', 'x');
    expect(res).toEqual(result);
    expect(JSON.parse(mock.history.put[0].data)).toEqual({ content: 'x' });
  });

  it('renameCaptionByContent PUTs old/new content', async () => {
    mock.onPut('/symbols/rename-caption').reply(200, {});
    await symbolService.renameCaptionByContent('old', 'new');
    expect(JSON.parse(mock.history.put[0].data)).toEqual({
      oldContent: 'old',
      newContent: 'new',
    });
  });

  it('delete DELETEs /symbols/:id', async () => {
    mock.onDelete('/symbols/s1').reply(204);
    await symbolService.delete('s1');
    expect(mock.history.delete[0].url).toBe('/symbols/s1');
  });

  it('getImageUrl builds the static image URL (no request)', () => {
    expect(symbolService.getImageUrl('s1')).toBe('/api/symbols/s1/image');
  });

  it('getOccurrences passes take/skip params', async () => {
    mock.onGet('/symbols/s1/occurrences').reply(200, []);
    await symbolService.getOccurrences('s1', 50, 10);
    expect(mock.history.get[0].params).toEqual({ take: 50, skip: 10 });
  });

  it('recognize POSTs /symbols/:id/recognize', async () => {
    const result = { content: 'A' };
    mock.onPost('/symbols/s1/recognize').reply(200, result);
    expect(await symbolService.recognize('s1')).toEqual(result);
  });

  it('autoFillContent POSTs scope + id', async () => {
    const result = { candidates: 1, filled: 1, skippedNotOwner: 0, skippedNoSuggestion: 0, items: [] };
    mock.onPost('/symbols/auto-fill-content').reply(200, result);
    const res = await symbolService.autoFillContent('Document', 'd1');
    expect(res).toEqual(result);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ scope: 'Document', id: 'd1' });
  });
});
