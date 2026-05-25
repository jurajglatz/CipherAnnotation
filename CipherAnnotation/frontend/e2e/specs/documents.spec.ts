import { test, expect } from '@playwright/test';
import { DocumentsPage } from '../pages/DocumentsPage';
import { SEED } from '../fixtures/constants';

test('seeded document is listed', async ({ page }) => {
  const docs = new DocumentsPage(page);
  await docs.goto();
  await docs.expectVisible(SEED.documentTitle);
});

test('create a new document and see it in the list', async ({ page }) => {
  const docs = new DocumentsPage(page);
  await docs.goto();
  const title = `E2E Created ${Date.now()}`;
  await docs.createDocument(title);
  await docs.expectVisible(title);
});

test('open a document detail view', async ({ page }) => {
  const docs = new DocumentsPage(page);
  await docs.goto();
  await docs.openDocument(SEED.documentTitle);
  await expect(page).toHaveURL(/\/documents\/[^/]+$/);
});

test('public library page loads', async ({ page }) => {
  await page.goto('/documents/public');
  await expect(page).toHaveURL(/\/documents\/public$/);
});
