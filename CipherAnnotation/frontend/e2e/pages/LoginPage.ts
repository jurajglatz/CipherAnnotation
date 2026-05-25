import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/login'); }
  async login(email: string, password: string) {
    await this.page.locator('#email').fill(email);
    await this.page.locator('#password').fill(password);
    await this.page.getByRole('button', { name: 'Sign In' }).click();
  }
  async expectError() {
    await expect(this.page.getByText(/invalid|failed|incorrect/i)).toBeVisible();
  }
}
