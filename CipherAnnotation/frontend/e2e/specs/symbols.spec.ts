import { test, expect } from '@playwright/test';
import { SymbolsPage } from '../pages/SymbolsPage';

test('symbols page loads', async ({ page }) => {
  const symbols = new SymbolsPage(page);
  await symbols.goto();
  await symbols.expectLoaded();
});

test('uncategorized symbols view loads', async ({ page }) => {
  const symbols = new SymbolsPage(page);
  await symbols.gotoUncategorized();
  await expect(page).toHaveURL(/\/symbols\/uncategorized$/);
  // "All symbols" back-link always renders once loading completes
  await expect(page.getByRole('link', { name: 'All symbols' })).toBeVisible();
});
