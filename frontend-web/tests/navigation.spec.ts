import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './auth-helpers';

test.describe('AssetBridge Navigation & Role Access E2E', () => {
  test('Manager navigates through sidebar links and views Workflows & Settings', async ({ page }) => {
    await setupAuthenticatedSession(page, {
      id: 'usr-manager-e2e',
      fullName: 'Saman Manager',
      email: 'manager@assetbridge.com',
      role: 'Manager',
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify Manager sidebar items are present
    const workflowsLink = page.locator('aside a', { hasText: 'Workflows & Approvals' });
    await expect(workflowsLink).toBeVisible();

    // Click Workflows link
    await workflowsLink.click();
    await expect(page).toHaveURL(/\/workflows/);
    await expect(page.locator('h1', { hasText: 'Workflows & Approvals' })).toBeVisible();

    // Click Settings link
    const settingsLink = page.locator('aside a', { hasText: 'Settings' });
    await settingsLink.click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.locator('h1', { hasText: 'Account & Profile Settings' })).toBeVisible();
  });

  test('Owner role does not see Workflows & Approvals in navigation sidebar', async ({ page }) => {
    await setupAuthenticatedSession(page, {
      id: 'usr-owner-e2e',
      fullName: 'Sunil Owner',
      email: 'owner@assetbridge.com',
      role: 'Owner',
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify Owner has My Assets and Incidents
    await expect(page.locator('aside a', { hasText: 'My Assets' })).toBeVisible();
    await expect(page.locator('aside a', { hasText: 'Incidents' })).toBeVisible();

    // Verify Owner does NOT see Workflows & Approvals
    await expect(page.locator('aside a', { hasText: 'Workflows & Approvals' })).toHaveCount(0);
  });

  test('Sign out button logs user out, clears storage, and redirects to /login', async ({ page }) => {
    await setupAuthenticatedSession(page, {
      id: 'usr-manager-e2e',
      fullName: 'Saman Manager',
      email: 'manager@assetbridge.com',
      role: 'Manager',
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    // Click Sign out button in topbar
    const signOutBtn = page.locator('button[title="Sign Out"]');
    await signOutBtn.click();

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=Welcome Back')).toBeVisible();

    // Verify token was removed
    const token = await page.evaluate(() => localStorage.getItem('assetbridge_token'));
    expect(token).toBeNull();
  });
});
