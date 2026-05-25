import { test, expect } from '@playwright/test';
import { DocumentsPage } from '../pages/DocumentsPage';
import { SEED } from '../fixtures/constants';

test('seeded document detail shows at least one page thumbnail', async ({ page }) => {
  const docs = new DocumentsPage(page);
  await docs.goto();
  await docs.openDocument(SEED.documentTitle);
  await expect(page).toHaveURL(/\/documents\/[^/]+$/);
  // The outer wrapper div carries data-tour="page-thumb" for the first thumbnail.
  await expect(page.locator('[data-tour="page-thumb"]')).toBeVisible();
});

test('clicking a page thumbnail navigates to the annotation route', async ({ page }) => {
  const docs = new DocumentsPage(page);
  await docs.goto();
  await docs.openDocument(SEED.documentTitle);
  // Click the outer wrapper div that carries the onClick navigation handler.
  await page.locator('[data-tour="page-thumb"]').click();
  await expect(page).toHaveURL(/\/documents\/[^/]+\/annotate\/[^/]+$/);
});
