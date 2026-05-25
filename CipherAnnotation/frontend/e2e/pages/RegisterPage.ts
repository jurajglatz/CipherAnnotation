import { Page } from '@playwright/test';

export class RegisterPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/register'); }
  async register(name: string, email: string, password: string) {
    await this.page.locator('#name').fill(name);
    await this.page.locator('#email').fill(email);
    await this.page.locator('#password').fill(password);
    await this.page.locator('#confirmPassword').fill(password);
    await this.page.getByRole('button', { name: 'Create Account' }).click();
  }
}
