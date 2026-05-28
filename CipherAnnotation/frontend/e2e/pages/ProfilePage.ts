import { Page, expect } from '@playwright/test';

export class ProfilePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/profile');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/profile$/);
    await expect(this.page.getByRole('heading', { name: /your.*profile/i })).toBeVisible();
  }
}
