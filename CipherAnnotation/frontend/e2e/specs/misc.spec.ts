import { test, expect } from '@playwright/test';

test('unknown route renders the not-found page', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');
  // NotFoundPage renders a large "404" heading and "Page not found" paragraph text.
  await expect(page.getByText(/not found/i).first()).toBeVisible();
});

test('landing page is reachable', async ({ page }) => {
  // Authenticated users are redirected to /documents — assert the redirect destination is stable.
  await page.goto('/');
  await expect(page).toHaveURL(/\/(documents|$)/);
});
