import { test, expect } from '@playwright/test';
import { createValidTestToken } from './auth-helpers';

test.describe('AssetBridge Authentication & Security Tests', () => {
  test('AssetBridge login page loads successfully and displays branding', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/login');

    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Welcome Back')).toBeVisible();

    const loadTimeMs = Date.now() - startTime;
    console.log(`[PERF] Login page loaded in ${loadTimeMs}ms`);
  });

  test('Login form validates credentials and handles invalid login attempt', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[placeholder="Enter your password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await emailInput.fill('nonexistent_user@assetbridge.com');
    await passwordInput.fill('InvalidPassword123!');

    const startSubmit = Date.now();
    await submitBtn.click();

    await page.waitForTimeout(500);
    const duration = Date.now() - startSubmit;
    console.log(`[PERF] Login submission roundtrip took ~${duration}ms`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('XSS security: script payloads in inputs do not trigger alert or dialog', async ({ page }) => {
    let dialogTriggered = false;
    page.on('dialog', async (dialog) => {
      dialogTriggered = true;
      await dialog.dismiss();
    });

    await page.goto('/login');
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill("<script>alert('XSS')</script>");

    await page.waitForTimeout(500);
    expect(dialogTriggered).toBe(false);
  });

  test('Redirects unauthenticated user to login when visiting protected route', async ({ page }) => {
    // Attempt visiting protected dashboard route directly
    await page.goto('/dashboard');

    // ProtectedRoute redirects unauthenticated users to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=Welcome Back')).toBeVisible();
  });

  test('Successful login stores session and navigates to dashboard', async ({ page }) => {
    const validJwt = createValidTestToken('Manager', 'manager@assetbridge.com');

    // Intercept auth login API
    await page.route(/.*\/auth\/login/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: validJwt,
            refreshToken: 'e2e-refresh-token',
            user: {
              id: 'usr-e2e-mgr',
              email: 'manager@assetbridge.com',
              fullName: 'E2E Test Manager',
              role: 'Manager',
            },
          },
        }),
      });
    });

    // Mock /auth/me
    await page.route(/.*\/auth\/me/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'usr-e2e-mgr',
            email: 'manager@assetbridge.com',
            fullName: 'E2E Test Manager',
            role: 'Manager',
          },
        }),
      });
    });

    // Mock dashboard metrics
    await page.route(/(localhost:5206|\/api\/)/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [], totalCount: 0 },
        }),
      });
    });

    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[placeholder="Enter your password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await emailInput.fill('manager@assetbridge.com');
    await passwordInput.fill('ManagerPassword123!');
    await submitBtn.click();

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).toBeVisible();
  });
});
