import { test, expect } from '@playwright/test';
import fs from 'fs';
import { DocumentsPage } from '../pages/DocumentsPage';

test.describe('Dataset export', () => {
  test('COCO export produces a valid JSON file', async ({ page }) => {
    const docs = new DocumentsPage(page);
    await docs.goto();

    const title = `Export-COCO-${Date.now()}`;
    await docs.createDocument(title);
    await docs.expectVisible(title);
    await docs.openDocument(title);
    await expect(page).toHaveURL(/\/documents\/[^/]+$/);

    // Wait for the export button to appear (document must have pages loaded)
    const exportBtn = page.locator('[data-tour="export-button"]');
    await expect(exportBtn).toBeVisible({ timeout: 15_000 });
    await exportBtn.click();

    // Modal opens
    await expect(page.getByText('Export Dataset').first()).toBeVisible();

    // Ensure COCO format is selected
    await page.getByRole('button', { name: 'COCO' }).click();

    // If captions exist, select all; otherwise the button is already enabled
    const captionCheckboxes = page.locator('input[type="checkbox"][class*="accent-ink"]');
    const captionCount = await captionCheckboxes.count();
    if (captionCount > 0) {
      await page.getByRole('button', { name: 'All' }).click();
    }

    // Trigger export and capture the download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export Dataset' }).click(),
    ]);

    // includeImages defaults to false for COCO → .json
    expect(download.suggestedFilename()).toMatch(/\.json$/);

    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const content = fs.readFileSync(filePath!, 'utf-8');
    const coco = JSON.parse(content);
    expect(Array.isArray(coco.images)).toBe(true);
    expect(coco.images.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(coco.annotations)).toBe(true);

    // Success toast
    await expect(page.getByText('Dataset exported successfully')).toBeVisible({ timeout: 10_000 });
  });

  test('YOLO export produces a ZIP file', async ({ page }) => {
    const docs = new DocumentsPage(page);
    await docs.goto();

    const title = `Export-YOLO-${Date.now()}`;
    await docs.createDocument(title);
    await docs.expectVisible(title);
    await docs.openDocument(title);
    await expect(page).toHaveURL(/\/documents\/[^/]+$/);

    const exportBtn = page.locator('[data-tour="export-button"]');
    await expect(exportBtn).toBeVisible({ timeout: 15_000 });
    await exportBtn.click();

    await expect(page.getByText('Export Dataset').first()).toBeVisible();

    await page.getByRole('button', { name: 'YOLO' }).click();

    // If captions exist, select all
    const captionCheckboxes = page.locator('input[type="checkbox"][class*="accent-ink"]');
    const captionCount = await captionCheckboxes.count();
    if (captionCount > 0) {
      await page.getByRole('button', { name: 'All' }).click();
    }

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export Dataset' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.zip$/);

    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const stats = fs.statSync(filePath!);
    expect(stats.size).toBeGreaterThan(0);

    // Check ZIP magic bytes (PK = 0x50 0x4B)
    const buf = Buffer.alloc(2);
    const fd = fs.openSync(filePath!, 'r');
    fs.readSync(fd, buf, 0, 2, 0);
    fs.closeSync(fd);
    expect(buf[0]).toBe(0x50); // 'P'
    expect(buf[1]).toBe(0x4b); // 'K'

    await expect(page.getByText('Dataset exported successfully')).toBeVisible({ timeout: 10_000 });
  });
});
