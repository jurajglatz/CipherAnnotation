/**
 * Document lifecycle spec.
 *
 * On a fresh document:
 *   edit metadata + flip visibility → add a page → delete a page → delete the doc.
 * Each step is asserted before moving on. Independent of seeded state.
 */

import { test, expect } from '@playwright/test';
import { DocumentsPage } from '../pages/DocumentsPage';
import { SAMPLE_PAGE } from '../fixtures/constants';

test('document lifecycle: edit, visibility, add page, delete page, delete doc', async ({ page }) => {
  test.setTimeout(90_000);

  const docs = new DocumentsPage(page);
  const originalTitle = `Lifecycle-Doc-${Date.now()}`;
  const renamedTitle = `${originalTitle} (renamed)`;

  // ── 1. Create the doc and open its detail page ────────────────────────────
  await docs.goto();
  await docs.createDocument(originalTitle);
  await docs.expectVisible(originalTitle);
  await docs.openDocument(originalTitle);
  await expect(page).toHaveURL(/\/documents\/[^/]+$/);
  await expect(page.getByRole('heading', { name: originalTitle })).toBeVisible();

  // ── 2. Edit metadata + flip visibility Private → Public in one save ──────
  await page.getByRole('button', { name: 'Edit' }).click();
  const titleInput = page.getByPlaceholder('Document title');
  await titleInput.fill(renamedTitle);
  // Visibility is a <select> with options "Private" and "Public" (default Private).
  await page.locator('select').filter({ hasText: 'Private' }).first().selectOption('Public');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Document updated')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('heading', { name: renamedTitle })).toBeVisible();

  // ── 3. Add a page via AddPagesModal ───────────────────────────────────────
  await page.locator('[data-tour="add-pages"]').click();
  // The modal's file input is hidden; setInputFiles works regardless of visibility.
  // The modal stores previews via URL.createObjectURL synchronously, so the
  // Upload button enables in the same tick — no readiness wait needed.
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_PAGE);
  // Submit button label is "Upload N Page(s)"; match the prefix. Also wait for
  // the POST so we can fail loudly if the backend rejects it.
  const [addPagesRes] = await Promise.all([
    page.waitForResponse(
      (r) => /\/api\/documents\/[^/]+\/pages$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 30_000 },
    ),
    page.getByRole('button', { name: /^Upload\b/ }).click(),
  ]);
  expect(addPagesRes.ok(), `addPages POST failed: ${addPagesRes.status()}`).toBeTruthy();
  // Inspect the body — if the server returned [], the client toast still says
  // "0 page(s) added successfully" and the second thumb will never appear.
  const addPagesBody = await addPagesRes.json();
  expect(
    Array.isArray(addPagesBody) ? addPagesBody.length : 0,
    `addPages returned ${JSON.stringify(addPagesBody)}`,
  ).toBeGreaterThanOrEqual(1);
  // Then the toast confirms client-side completion before we assert UI state.
  await expect(page.getByText(/page\(s\) added successfully/i)).toBeVisible({ timeout: 10_000 });
  // The second page thumb's <img alt="Page 2"> appears in the grid. (Asserting by
  // accessible name rather than the data-testid wrapper, which has surprising
  // matching behavior in our reused stack.)
  await expect(page.getByRole('img', { name: 'Page 2' })).toBeVisible({ timeout: 10_000 });

  // ── 4. Delete the second page ─────────────────────────────────────────────
  // Two "Delete page" buttons exist (one per thumb); .nth(1) is the second.
  // The button has opacity-0 group-hover:opacity-100, so force past the visibility check.
  await page.getByLabel('Delete page').nth(1).click({ force: true });
  // ConfirmDialog "Delete Page" opens; confirm via the dialog's "Delete" button.
  await expect(page.getByRole('heading', { name: 'Delete Page' })).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Delete Page' })
    .getByRole('button', { name: 'Delete' })
    .click();
  // The second page is gone — only Page 1's <img> remains.
  await expect(page.getByRole('img', { name: 'Page 2' })).toBeHidden({ timeout: 10_000 });
  await expect(page.getByRole('img', { name: 'Page 1' })).toBeVisible();

  // ── 5. Delete the document ───────────────────────────────────────────────
  // Distinct aria-label so the locator can't collide with "Delete page" buttons.
  await page.getByRole('button', { name: 'Delete document' }).click();
  await expect(page.getByRole('heading', { name: 'Delete Document' })).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Delete Document' })
    .getByRole('button', { name: 'Delete' })
    .click();
  // Navigates back to /documents and the renamed title is gone from the list.
  await expect(page).toHaveURL(/\/documents$/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: renamedTitle })).toBeHidden();
});
