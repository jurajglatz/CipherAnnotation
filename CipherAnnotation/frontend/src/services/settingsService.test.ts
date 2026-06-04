import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from './api';
import settingsService from './settingsService';

describe('settingsService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    localStorage.clear();
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
  });

  it('getPublic GETs /settings/public', async () => {
    mock.onGet('/settings/public').reply(200, { autoContentGenerator: true });
    expect(await settingsService.getPublic()).toEqual({ autoContentGenerator: true });
  });

  it('getAllAdmin GETs /admin/settings', async () => {
    const settings = { 'AutoContentGenerator.Enabled': 'true' };
    mock.onGet('/admin/settings').reply(200, settings);
    expect(await settingsService.getAllAdmin()).toEqual(settings);
  });

  it('setAdmin PUTs the URL-encoded key with { value }', async () => {
    mock.onPut('/admin/settings/AutoContentGenerator.Enabled').reply(204);
    await settingsService.setAdmin('AutoContentGenerator.Enabled', 'false');
    expect(mock.history.put[0].url).toBe('/admin/settings/AutoContentGenerator.Enabled');
    expect(JSON.parse(mock.history.put[0].data)).toEqual({ value: 'false' });
  });

  it('encodes keys containing reserved characters', async () => {
    mock.onPut('/admin/settings/a%2Fb').reply(204);
    await settingsService.setAdmin('a/b', 'v');
    expect(mock.history.put[0].url).toBe('/admin/settings/a%2Fb');
  });
});
