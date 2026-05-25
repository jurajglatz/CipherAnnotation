import { Page, expect } from '@playwright/test';
import { SAMPLE_PAGE } from '../fixtures/constants';

export class DocumentsPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/documents'); }

  async createDocument(title: string) {
    await this.page.getByRole('button', { name: 'New Document' }).click();
    await this.page.getByPlaceholder('Document title').fill(title);
    await this.page.locator('input[type="file"]').setInputFiles(SAMPLE_PAGE);
    await this.page.getByRole('button', { name: 'Create Document' }).click();
  }

  async openDocument(title: string) {
    // DocumentCard renders an h3 with the title and a "View" button.
    // Locate the heading, then find the nearest "View" button sibling via the shared card container.
    const heading = this.page.getByRole('heading', { name: title, exact: true }).first();
    // The View button is inside the same card — use a scoped locator via the card's content div (p-5).
    const contentDiv = heading.locator('xpath=ancestor::div[contains(@class,"flex-col")][1]');
    await contentDiv.getByRole('button', { name: 'View' }).first().click();
  }

  async expectVisible(title: string) {
    await expect(this.page.getByRole('heading', { name: title }).first()).toBeVisible();
  }
}
