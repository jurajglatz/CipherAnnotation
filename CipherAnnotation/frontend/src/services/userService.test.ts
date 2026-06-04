import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import api from './api';
import userService from './userService';

describe('userService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    localStorage.clear();
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
  });

  it('returns [] without hitting the API for queries shorter than 2 chars', async () => {
    const res = await userService.search('a');
    expect(res).toEqual([]);
    expect(mock.history.get).toHaveLength(0);
  });

  it('returns [] for whitespace-only / trimmed-too-short queries', async () => {
    expect(await userService.search('  x  ')).toEqual([]);
    expect(mock.history.get).toHaveLength(0);
  });

  it('searches with trimmed query and default limit', async () => {
    const users = [{ id: 'u1', email: 'a@b.c', name: 'A', avatarUri: null }];
    mock.onGet('/users/search').reply(200, users);

    const res = await userService.search('  alice  ');

    expect(res).toEqual(users);
    expect(mock.history.get[0].params).toEqual({ q: 'alice', limit: 10 });
  });

  it('passes a custom limit and forwards the abort signal', async () => {
    mock.onGet('/users/search').reply(200, []);
    const controller = new AbortController();

    await userService.search('bob', 5, controller.signal);

    expect(mock.history.get[0].params).toEqual({ q: 'bob', limit: 5 });
    expect(mock.history.get[0].signal).toBe(controller.signal);
  });
});
