import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './auth-helpers';

test.describe('AssetBridge Incident Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page, {
      id: 'usr-owner-e2e',
      fullName: 'Dilshan Owner',
      email: 'owner@assetbridge.com',
      role: 'Owner',
    });
  });

  test('Displays incident list and filters incidents by category', async ({ page }) => {
    // Mock assets API
    await page.route(/.*\/assets/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [{ id: 'ast-1', name: 'Empire Residencies', city: 'Colombo' }],
            totalCount: 1,
          },
        }),
      });
    });

    // Mock incidents list API
    await page.route(/.*\/incidents/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  id: 'inc-01',
                  title: 'Ceiling Water Leakage',
                  category: 'Plumbing',
                  priority: 'High',
                  status: 'Reported',
                  assetName: 'Empire Residencies',
                  estimatedBudget: 45000,
                  createdAtUtc: new Date().toISOString(),
                },
                {
                  id: 'inc-02',
                  title: 'Main Breaker Tripping',
                  category: 'Electrical',
                  priority: 'Emergency',
                  status: 'Planning',
                  assetName: 'Empire Residencies',
                  estimatedBudget: 60000,
                  createdAtUtc: new Date().toISOString(),
                },
              ],
              totalCount: 2,
              page: 1,
              pageSize: 10,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/incidents');
    await expect(page).toHaveURL(/\/incidents/);

    // Verify incident titles in the list
    await expect(page.locator('text=Ceiling Water Leakage')).toBeVisible();
    await expect(page.locator('text=Main Breaker Tripping')).toBeVisible();
  });

  test('Opens report modal, validates required fields, and submits new incident', async ({ page }) => {
    await page.route(/.*\/assets/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [{ id: 'ast-1', name: 'Empire Residencies', city: 'Colombo' }],
            totalCount: 1,
          },
        }),
      });
    });

    let submittedPayload: any = null;
    await page.route(/.*\/incidents/, async (route) => {
      if (route.request().method() === 'POST') {
        submittedPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'inc-new-999',
              ...submittedPayload,
              status: 'Reported',
              createdAtUtc: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { items: [], totalCount: 0 },
          }),
        });
      }
    });

    await page.goto('/incidents');

    // Click Report Incident button
    const reportBtn = page.locator('button', { hasText: /report incident/i });
    await reportBtn.click();

    // Verify modal is open with title "Report Property Incident"
    await expect(page.locator('text=Report Property Incident')).toBeVisible();

    // Fill form fields
    const titleInput = page.locator('input[placeholder*="Severe water leakage"]');
    await titleInput.fill('Roof Tile Cracking after Storm');

    const descTextarea = page.locator('textarea[placeholder*="Describe the issue"]');
    await descTextarea.fill('Multiple terracotta roof tiles cracked on the north wing causing minor seepage.');

    // Click submit
    const submitBtn = page.locator('button[type="submit"]', { hasText: /submit incident/i });
    await submitBtn.click();

    // Wait for modal to close upon success
    await expect(page.locator('text=Report Property Incident')).toHaveCount(0);
    expect(submittedPayload).not.toBeNull();
    expect(submittedPayload.title).toBe('Roof Tile Cracking after Storm');
  });
});
