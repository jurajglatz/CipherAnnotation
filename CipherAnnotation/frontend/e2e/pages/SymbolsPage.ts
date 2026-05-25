import { Page, expect } from '@playwright/test';

export class SymbolsPage {
  constructor(private page: Page) {}

  async goto() { await this.page.goto('/symbols'); }
  async gotoUncategorized() { await this.page.goto('/symbols/uncategorized'); }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/symbols$/);
    await expect(this.page.getByRole('heading', { name: 'Symbols', level: 1 })).toBeVisible();
  }
}
