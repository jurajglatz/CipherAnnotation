import { test, expect } from '@playwright/test';
import { ProfilePage } from '../pages/ProfilePage';
import { USER } from '../fixtures/constants';

test('profile page loads and shows the user', async ({ page }) => {
  const profile = new ProfilePage(page);
  await profile.goto();
  await profile.expectLoaded();
  // The page renders both name (h2) and email; assert email as a unique identifier.
  await expect(page.getByText(USER.email)).toBeVisible();
});
