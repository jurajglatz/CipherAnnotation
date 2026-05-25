import { test, expect } from '@playwright/test';
import { AnnotationPage } from '../pages/AnnotationPage';
import { SEED } from '../fixtures/constants';

/**
 * AI auto-fill / captioning job — job-START flow only.
 * Does NOT assert any OCR or AI-generated output text.
 *
 * The test intercepts:
 *  - GET /api/settings/public  → returns autoContentGenerator:true so the
 *    "Caption symbols" button is rendered (it hides itself when the feature
 *    flag is off, which is the default in the test environment).
 *  - POST /api/symbols/auto-fill-jobs → returns a stub job (Pending) so the
 *    real CPU-heavy TrOCR pipeline is never invoked.
 *  - GET /api/symbols/auto-fill-jobs  → returns the same stub so the bell
 *    badge / context sees an active job.
 */
test('triggering auto-fill shows the job starting (no OCR assertion)', async ({ page }) => {
  const FAKE_JOB_ID = 'e2e-fake-job-id';
  const FAKE_PAGE_ID = 'e2e-fake-page-id';

  const fakeJob = {
    jobId: FAKE_JOB_ID,
    scope: 'Page',
    scopeId: FAKE_PAGE_ID,
    status: 'Pending',
    startedAt: new Date().toISOString(),
    completedAt: null,
    pages: [
      {
        pageId: FAKE_PAGE_ID,
        pageNumber: 1,
        documentId: 'e2e-fake-doc-id',
        documentTitle: SEED.documentTitle,
        total: 5,
        filled: 0,
        status: 'Pending',
        error: null,
      },
    ],
  };

  // 1. Make the feature flag appear enabled so the button renders.
  await page.route('**/api/settings/public', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ autoContentGenerator: true }) }),
  );

  // 2. Stub the job-start endpoint; return a Pending job immediately.
  await page.route('**/api/symbols/auto-fill-jobs', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ jobId: FAKE_JOB_ID }),
      });
    } else {
      // GET — return the same job in Pending state so the bell badge appears.
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([fakeJob]),
      });
    }
  });

  const annotate = new AnnotationPage(page);
  await annotate.openFirstPage(SEED.documentTitle);

  // The "Caption symbols" button opens a scope-selection modal.
  await page.getByRole('button', { name: 'Caption symbols' }).click();

  // Pick "Current page only" scope — triggers the (stubbed) background job.
  await page.getByRole('button', { name: 'Current page only' }).click();

  // Stable start signal: the success toast fires as soon as the POST returns.
  // This does NOT depend on OCR finishing.
  await expect(
    page.getByText('Captioning this page in the background'),
  ).toBeVisible({ timeout: 15_000 });
});
