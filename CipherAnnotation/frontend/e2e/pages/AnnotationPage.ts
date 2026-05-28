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

  // ── CaptionsPanel helpers ──────────────────────────────────────────────────

  /**
   * Add a new caption via the CaptionsPanel inline-add flow.
   * Clicks "Add caption", types the name into the "Label…" input, then
   * commits by pressing Enter. Waits for the caption row to appear.
   */
  async addCaption(name: string) {
    await this.page.getByTitle('Add caption').click();
    const input = this.page.getByPlaceholder('Label…');
    await input.waitFor({ state: 'visible' });
    await input.fill(name);
    await input.press('Enter');
    // Wait for the new row to be visible in the captions list
    await expect(this.page.getByText(name).first()).toBeVisible({ timeout: 10_000 });
  }

  /**
   * Rename the first caption whose displayed name matches `oldName`.
   * Hovers the row to reveal the Rename button (opacity-0 group-hover:opacity-100),
   * clicks it, clears the input, types the new name, and presses Enter.
   */
  async renameCaption(oldName: string, newName: string) {
    // Scope to the CaptionsPanel — the AnnotationTreePanel also groups by caption
    // and renders a <li> with the same text, so an unscoped locator hits the wrong one.
    const captionsPanel = this.page.locator('[data-testid="captions-panel"]');
    const row = captionsPanel.locator('li').filter({ hasText: oldName }).first();
    await row.hover();
    await row.getByTitle('Rename').click();
    // After Rename, the row's name text is swapped for an <input>, so re-acquire
    // it within the panel — only one renaming input is ever active at a time.
    const input = captionsPanel.locator('li input[type="text"]').first();
    await input.fill(newName);
    await input.press('Enter');
    await expect(this.page.getByText(newName).first()).toBeVisible({ timeout: 10_000 });
  }

  /**
   * Delete the caption with the given name. Hovers the row to reveal the
   * Delete button (title="Delete"), clicks it. Asserts the row disappears.
   * Note: caption must have usageCount === 0 or the backend will reject it.
   */
  async deleteCaption(name: string) {
    const captionsPanel = this.page.locator('[data-testid="captions-panel"]');
    const row = captionsPanel.locator('li').filter({ hasText: name }).first();
    await row.hover();
    await row.getByTitle('Delete').click();
    await expect(row).toBeHidden({ timeout: 10_000 });
  }

  // ── PropertiesPanel helpers ────────────────────────────────────────────────

  /**
   * Assign a caption to the currently selected annotation via the Caption
   * <select> in PropertiesPanel. Uses selectOption({ label }) to match by
   * option text.
   */
  async assignCaption(captionName: string) {
    // PropertiesPanel renders Caption then Type selects inside a <fieldset>.
    // The Caption select is the first <select> inside the fieldset.
    const fieldset = this.page.locator('fieldset').first();
    await fieldset.locator('select').first().selectOption({ label: captionName });
  }

  /**
   * Set the annotation Type via the Type <select> in PropertiesPanel.
   * Pass the visible option label: "Text", "Cipher", or "Symbol".
   */
  async setType(label: string) {
    // The Type select is the second <select> inside PropertiesPanel's fieldset.
    // It has exactly three options: Text, Cipher, Symbol.
    const fieldset = this.page.locator('fieldset').first();
    await fieldset.locator('select').nth(1).selectOption({ label });
  }

  /**
   * Delete the currently selected annotation using the Delete button in
   * PropertiesPanel (bottom of the right sidebar).
   * The PropertiesPanel Delete button has a border-cipher-red class that
   * distinguishes it from the opacity-0 hover-only buttons in the tree panel.
   * It is a full-width button — target it by its unique class fragment.
   */
  async deleteSelectedAnnotation() {
    // PropertiesPanel Delete button: full-width, always visible when annotation selected.
    // It has class "w-full flex items-center justify-center gap-2 border border-cipher-red/40"
    // — no title attr. Use getByText scoped to a button with w-full.
    await this.page.locator('button.w-full').filter({ hasText: 'Delete' }).click();
  }

  /**
   * Select the first annotation row in the AnnotationTreePanel by clicking it.
   * Works after a rectangle has been drawn. Expands the group if collapsed.
   */
  async selectFirstAnnotation() {
    const treePanel = this.page.locator('[data-tour="annotation-tree"]');
    // Each annotation sits inside an <li> with the class group. Click the first one.
    const firstRow = treePanel.locator('li div.group').first();
    await firstRow.click();
  }
}
