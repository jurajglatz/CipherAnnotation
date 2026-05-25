import { Page, expect } from '@playwright/test';
import { DocumentsPage } from './DocumentsPage';

export class AnnotationPage {
  constructor(private page: Page) {}

  /**
   * Navigate from /documents to the seeded document and click the first page
   * thumbnail. Asserts the URL lands on an /annotate/ route.
   */
  async openFirstPage(documentTitle: string) {
    const docs = new DocumentsPage(this.page);
    await docs.goto();
    await docs.openDocument(documentTitle);
    // Wait for the page thumbnail to appear
    await this.page.locator('[data-tour="page-thumb"]').first().waitFor({ state: 'visible' });
    await this.page.locator('[data-tour="page-thumb"]').first().click();
    await expect(this.page).toHaveURL(/\/documents\/[^/]+\/annotate\/[^/]+$/);
  }

  /**
   * The annotation canvas is an <svg> element rendered inside the container
   * div[data-tour="annotation-canvas"]. The SVG always mounts regardless of
   * whether the page image blob has loaded.
   */
  async expectCanvasVisible() {
    const canvas = this.page.locator('[data-tour="annotation-canvas"] svg');
    await expect(canvas).toBeVisible();
  }

  /**
   * Click the "Draw annotation" tool button (Square icon, tooltip "Draw annotation").
   * Must be activated before canvas clicks create shapes.
   */
  async selectAnnotationTool() {
    // The draw-annotation button has tooltip text "Draw annotation" and contains
    // a Square icon. It is the third button in the tool-selector group.
    // Use the data-tour toolbar wrapper to scope the search.
    const toolbar = this.page.locator('[data-tour="annotation-toolbar"]');
    // The button has a Tooltip with label "Draw annotation"; target it by its
    // title attribute or by the Square icon's parent button.
    // Tooltip wraps the button — the button itself has no text, only an icon.
    // We locate by its position: it is the third button in the tool group.
    const toolGroup = toolbar.locator('.flex.items-center.gap-1.bg-parchment-100');
    await toolGroup.locator('button').nth(2).click();
  }

  /**
   * Draw a rectangle on the canvas using two clicks (the app uses two-click
   * drawing, not drag). Clicks are placed at 25%/25% and 75%/75% of the SVG
   * bounding box.
   */
  async drawRectangle() {
    const svg = this.page.locator('[data-tour="annotation-canvas"] svg');
    await svg.waitFor({ state: 'visible' });
    const box = await svg.boundingBox();
    if (!box) throw new Error('Canvas SVG bounding box is null');

    const x1 = box.x + box.width * 0.25;
    const y1 = box.y + box.height * 0.25;
    const x2 = box.x + box.width * 0.75;
    const y2 = box.y + box.height * 0.75;

    // Two-click drawing: first click starts the rect, second click commits it.
    await this.page.mouse.click(x1, y1);
    await this.page.mouse.click(x2, y2);
  }
}
