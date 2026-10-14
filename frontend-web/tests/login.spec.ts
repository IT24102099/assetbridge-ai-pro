import { test, expect } from '@playwright/test';

test('AssetBridge login page loads successfully', async ({ page }) => {
  await page.goto('/login');

  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('body')).toBeVisible();
});
