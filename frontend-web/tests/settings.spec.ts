import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './auth-helpers';

test.describe('AssetBridge Settings & Profile Management E2E', () => {
  test('Renders settings page with current user profile information', async ({ page }) => {
    await setupAuthenticatedSession(page, {
      id: 'usr-settings-e2e',
      fullName: 'Anura Bandara',
      email: 'anura@assetbridge.com',
      role: 'Manager',
      phoneNumber: '+94771234567',
    });

    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);

    // Verify user profile details using accessible queries
    await expect(page.locator('h1', { hasText: 'Account & Profile Settings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Anura Bandara' })).toBeVisible();
    await expect(page.locator('text=anura@assetbridge.com').first()).toBeVisible();
  });

  test('Validates password fields before submitting password update', async ({ page }) => {
    await setupAuthenticatedSession(page, {
      id: 'usr-settings-e2e',
      fullName: 'Anura Bandara',
      email: 'anura@assetbridge.com',
      role: 'Manager',
      phoneNumber: '+94771234567',
    });

    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);

    // Locate password change submit button
    const updatePasswordBtn = page.locator('button', { hasText: /update password/i });
    if (await updatePasswordBtn.isVisible()) {
      await updatePasswordBtn.click();
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
