import { test, expect } from '@playwright/test';
import { DocumentsPage } from '../pages/DocumentsPage';
import { SEED } from '../fixtures/constants';

test('authenticated user lands on documents with seeded data', async ({ page }) => {
  const docs = new DocumentsPage(page);
  await docs.goto();
  await expect(page).toHaveURL(/\/documents$/);
  // The list is paginated and sorted newest-first; search so the seeded
  // document is rendered even when the shared test DB holds many documents.
  await docs.expectVisible(SEED.documentTitle);
});
