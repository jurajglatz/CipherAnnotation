/**
 * Annotation → Caption lifecycle spec.
 *
 * Covers the full lifecycle on a fresh document:
 *   draw annotation → add caption → assign caption to annotation →
 *   change annotation type → rename caption → delete annotation → delete caption.
 *
 * Uses a fresh document per run so the test is independent of seeded data and
 * prior test runs.
 */

import { test, expect } from '@playwright/test';
import { DocumentsPage } from '../pages/DocumentsPage';
import { AnnotationPage } from '../pages/AnnotationPage';

test('annotation and caption lifecycle', async ({ page }) => {
  const docs = new DocumentsPage(page);
  const annotation = new AnnotationPage(page);

  // ── 1. Create a fresh document and open its first page for annotation ──────
  const docTitle = `Lifecycle-${Date.now()}`;
  await docs.goto();
  await docs.createDocument(docTitle);
  await docs.expectVisible(docTitle);

  await annotation.openFirstPage(docTitle);
  await annotation.expectCanvasVisible();

  const treePanel = page.locator('[data-tour="annotation-tree"]');

  // ── 2. Draw one annotation ─────────────────────────────────────────────────
  await annotation.selectAnnotationTool();
  await annotation.drawRectangle();

  // Wait for the annotation to appear in the tree (placeholder disappears).
  await expect(treePanel.getByText('No annotations yet')).toBeHidden({ timeout: 15_000 });

  // ── 3. Add a caption via CaptionsPanel ────────────────────────────────────
  const captionName = `Cipher A ${Date.now()}`;
  await annotation.addCaption(captionName);

  // Confirm the caption row is visible in the panel.
  await expect(page.getByText(captionName).first()).toBeVisible();

  // ── 4. Select the drawn annotation ────────────────────────────────────────
  // Click the first row in the AnnotationTreePanel to select it and open
  // PropertiesPanel on the right.
  await annotation.selectFirstAnnotation();

  // PropertiesPanel is shown when an annotation is selected — it renders a
  // full-width "Delete" button at the bottom. Wait for it to confirm selection.
  await expect(page.locator('button.w-full').filter({ hasText: 'Delete' })).toBeVisible({ timeout: 10_000 });

  // ── 5. Assign the new caption to the annotation ───────────────────────────
  await annotation.assignCaption(captionName);

  // After debounce save, the PropertiesPanel header updates with the caption name.
  // A simpler stability check: just wait a moment for the debounce to flush.
  await page.waitForTimeout(600);

  // ── 6. Change the annotation Type to "Cipher" ─────────────────────────────
  await annotation.setType('Cipher');

  // Changing type to Cipher should reveal the Transcription textarea.
  await expect(page.getByPlaceholder('Cipher transcription')).toBeVisible({ timeout: 5_000 });

  // Wait for debounce save.
  await page.waitForTimeout(600);

  // ── 7. Rename the caption ─────────────────────────────────────────────────
  const renamedCaption = `${captionName} (renamed)`;
  await annotation.renameCaption(captionName, renamedCaption);
  await expect(page.getByText(renamedCaption).first()).toBeVisible({ timeout: 10_000 });

  // ── 8. Delete the annotation ──────────────────────────────────────────────
  // The annotation is still selected; click Delete in PropertiesPanel.
  await annotation.deleteSelectedAnnotation();

  // AnnotationTreePanel should return to its empty state.
  await expect(treePanel.getByText('No annotations yet')).toBeVisible({ timeout: 10_000 });

  // ── 9. Delete the caption ─────────────────────────────────────────────────
  // The caption now has usageCount === 0 (annotation was deleted), so deletion
  // is allowed. Hover the row to reveal the Delete button (opacity-0 group-hover).
  await annotation.deleteCaption(renamedCaption);

  // Caption row should be gone from CaptionsPanel.
  await expect(page.getByText(renamedCaption)).toBeHidden({ timeout: 10_000 });
});
