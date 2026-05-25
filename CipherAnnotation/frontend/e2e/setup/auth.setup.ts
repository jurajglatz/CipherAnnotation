import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import { USER, ADMIN, SEED, AUTH_DIR, USER_STATE, ADMIN_STATE } from '../fixtures/constants';
import { ensureRegistered, login, ensureSeedDocument } from './api';

setup.setTimeout(120_000); // extra headroom for login 429-retry backoff on rapid re-runs

setup('seed data and save auth state', async ({ page, request }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // 1. Ensure users exist.
  await ensureRegistered(request, USER);
  await ensureRegistered(request, ADMIN);

  // 2. Log in the regular user and seed a document with one page.
  const auth = await login(request, USER);
  await ensureSeedDocument(request, auth.accessToken, SEED.documentTitle, SEED.documentDescription);

  // 3. Inject auth into the browser and save storageState (localStorage + cookies).
  await page.goto('/');
  await page.evaluate((a) => {
    localStorage.setItem('accessToken', a.accessToken);
    localStorage.setItem('accessTokenExpiresAt', a.accessTokenExpiresAt);
    localStorage.setItem('user', JSON.stringify(a.user));
  }, auth);
  await page.context().storageState({ path: USER_STATE });

  // 4. Same for the admin (no seed data needed).
  const adminAuth = await login(request, ADMIN);
  await page.evaluate((a) => {
    localStorage.setItem('accessToken', a.accessToken);
    localStorage.setItem('accessTokenExpiresAt', a.accessTokenExpiresAt);
    localStorage.setItem('user', JSON.stringify(a.user));
  }, adminAuth);
  await page.context().storageState({ path: ADMIN_STATE });

  expect(fs.existsSync(USER_STATE)).toBeTruthy();
});
