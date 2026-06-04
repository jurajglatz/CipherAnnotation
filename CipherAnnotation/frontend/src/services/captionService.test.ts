import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from './api';
import captionService from './captionService';
import type { Caption } from '../types';

const caption = { id: 'c1', name: 'A' } as unknown as Caption;

describe('captionService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    localStorage.clear();
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
  });

  it('list GETs /documents/:id/captions', async () => {
    mock.onGet('/documents/d1/captions').reply(200, [caption]);
    expect(await captionService.list('d1')).toEqual([caption]);
  });

  it('create POSTs { name }', async () => {
    mock.onPost('/documents/d1/captions').reply(201, caption);
    const res = await captionService.create('d1', 'A');
    expect(res).toEqual(caption);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ name: 'A' });
  });

  it('rename PUTs { name } to the caption', async () => {
    mock.onPut('/documents/d1/captions/c1').reply(200, caption);
    const res = await captionService.rename('d1', 'c1', 'B');
    expect(res).toEqual(caption);
    expect(JSON.parse(mock.history.put[0].data)).toEqual({ name: 'B' });
  });

  it('remove DELETEs the caption', async () => {
    mock.onDelete('/documents/d1/captions/c1').reply(204);
    await captionService.remove('d1', 'c1');
    expect(mock.history.delete[0].url).toBe('/documents/d1/captions/c1');
  });
});
