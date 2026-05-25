import { test, expect } from '@playwright/test';
import { SEED } from '../fixtures/constants';

test('authenticated user lands on documents with seeded data', async ({ page }) => {
  await page.goto('/documents');
  await expect(page).toHaveURL(/\/documents$/);
  await expect(page.getByText(SEED.documentTitle)).toBeVisible();
});
