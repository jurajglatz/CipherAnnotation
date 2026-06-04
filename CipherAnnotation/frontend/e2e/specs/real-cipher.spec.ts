import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * One-off: upload a real cipher scan (e2e/images/9.png) end-to-end —
 * create document, open detail, open annotation canvas, then run real
 * YOLOv11 auto-annotate against it. Not part of the regular suite;
 * run explicitly via `npm run test:e2e -- real-cipher.spec.ts`.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CIPHER_IMAGE = path.resolve(__dirname, '..', 'images', '9.png');

/** Upload a fresh cipher doc and open its first page for annotation. Returns the doc title. */
async function uploadCipherAndOpenAnnotation(page: import('@playwright/test').Page): Promise<string> {
  const title = `Real Cipher (E2E) ${Date.now()}`;

  await page.goto('/documents');
  await page.getByRole('button', { name: 'New Document' }).click();
  await page.getByPlaceholder('Document title').fill(title);
  await page.locator('input[type="file"]').setInputFiles(CIPHER_IMAGE);
  await page.getByRole('button', { name: 'Create Document' }).click();

  await expect(page.getByRole('heading', { name: title }).first()).toBeVisible({ timeout: 30_000 });

  await page
    .getByRole('heading', { name: title })
    .first()
    .locator('xpath=ancestor::div[contains(@class,"flex-col")][1]')
    .getByRole('button', { name: 'View' })
    .click();
  await expect(page).toHaveURL(/\/documents\/[^/]+$/);

  await expect(page.locator('[data-tour="page-thumb"]').first()).toBeVisible({ timeout: 30_000 });
  await page.locator('[data-tour="page-thumb"]').first().click();
  await expect(page).toHaveURL(/\/documents\/[^/]+\/annotate\/[^/]+$/);
  await expect(page.locator('[data-tour="annotation-canvas"] svg')).toBeVisible({ timeout: 30_000 });

  return title;
}

test('upload a real cipher page and open it for annotation', async ({ page }) => {
  test.setTimeout(120_000);
  await uploadCipherAndOpenAnnotation(page);
});

test('auto-annotate a real cipher page (YOLOv11)', async ({ page }) => {
  // YOLO inference on CPU is slow on a 3400×4400 scan — give it room.
  test.setTimeout(5 * 60_000);

  await uploadCipherAndOpenAnnotation(page);

  // No prompt path: the page has no annotations yet, so clicking goes straight to detection.
  await page.getByRole('button', { name: 'Auto-annotate' }).click();

  // Stable success signal: the per-result toast fires once the backend returns.
  await expect(
    page.getByText(/Auto-annotated \d+ regions?/i),
  ).toBeVisible({ timeout: 4 * 60_000 });

  // And the annotation tree's empty-state placeholder is gone.
  await expect(page.getByText('No annotations yet')).toBeHidden();
});
