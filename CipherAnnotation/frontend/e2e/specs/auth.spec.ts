import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { USER } from '../fixtures/constants';

// These tests must NOT reuse the logged-in storageState.
test.use({ storageState: { cookies: [], origins: [] } });

test('unauthenticated user is redirected to /login from a protected route', async ({ page }) => {
  // The auth setup project consumes ~4 of the 5 rate-limit slots (5 req/min/IP fixed window).
  // Extend this test's timeout and wait for the window to reset before running UI auth tests.
  test.setTimeout(90_000);
  await page.waitForTimeout(62_000);
  await page.goto('/documents');
  await expect(page).toHaveURL(/\/login$/);
});

test('login with seeded credentials lands on /documents', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(USER.email, USER.password);
  await expect(page).toHaveURL(/\/documents$/);
});

test('login with wrong password shows an error and stays on /login', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(USER.email, 'definitely-wrong');
  await expect(page).toHaveURL(/\/login$/);
});

test('register a brand-new user logs in and lands on /documents', async ({ page }) => {
  const register = new RegisterPage(page);
  const unique = `e2e-new-${Date.now()}@example.test`;
  await register.goto();
  await register.register('New E2E User', unique, 'E2e-Password!123');
  await expect(page).toHaveURL(/\/documents$/);
});

test('logout returns to /login', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(USER.email, USER.password);
  await expect(page).toHaveURL(/\/documents$/);
  await page.getByRole('button', { name: new RegExp(USER.name) }).click();
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
