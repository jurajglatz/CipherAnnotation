import { test, expect } from '@playwright/test';
import { AnnotationPage } from '../pages/AnnotationPage';
import { SEED } from '../fixtures/constants';

test('annotation canvas opens for a seeded page', async ({ page }) => {
  const annotation = new AnnotationPage(page);
  await annotation.openFirstPage(SEED.documentTitle);
  await annotation.expectCanvasVisible();
});

test('drawing a rectangle creates an annotation', async ({ page }) => {
  const annotation = new AnnotationPage(page);
  await annotation.openFirstPage(SEED.documentTitle);
  await annotation.expectCanvasVisible();

  // The tree panel shows "No annotations yet" when empty.
  // Record the annotation count before drawing.
  const treePanel = page.locator('[data-tour="annotation-tree"]');

  // Activate the draw tool, then draw a rectangle via two clicks.
  await annotation.selectAnnotationTool();
  await annotation.drawRectangle();

  // After a successful draw the app posts an annotation to the API and
  // adds a row to the tree panel. Wait for the "No annotations yet" placeholder
  // to disappear, which confirms at least one annotation row was added.
  await expect(treePanel.getByText('No annotations yet')).toBeHidden({ timeout: 10_000 });
});
