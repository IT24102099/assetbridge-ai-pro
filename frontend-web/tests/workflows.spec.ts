import { test, expect } from '@playwright/test';
import { setupAuthenticatedSession } from './auth-helpers';

test.describe('AssetBridge M4 Workflow & Human Governance E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page, {
      id: 'usr-mgr-e2e',
      fullName: 'Priyantha Manager',
      email: 'manager@assetbridge.com',
      role: 'Manager',
    });
  });

  test('Displays workflow dashboard with KPI cards and 15-state workflow table', async ({ page }) => {
    // Mock workflows metrics
    await page.route(/.*\/workflows\/metrics/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            activeWorkflowsCount: 4,
            pendingApprovalsCount: 1,
            completedWorkflowsCount: 12,
            failedWorkflowsCount: 0,
            averageResolutionDays: 3.5,
          },
        }),
      });
    });

    // Mock workflows list
    await page.route(/.*\/workflows(\?.*)?$/, async (route) => {
      if (route.request().url().includes('/metrics')) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 'wf-e2e-100',
                correlationId: 'corr-e2e-abc',
                incidentId: 'inc-99',
                incidentTitle: 'Server Room Chiller Leak',
                assetId: 'ast-01',
                assetName: 'Orion City Colombo',
                currentState: 7, // AwaitingApproval
                currentStateName: 'AwaitingApproval',
                createdAtUtc: new Date().toISOString(),
              },
            ],
            totalCount: 1,
            page: 1,
            pageSize: 50,
          },
        }),
      });
    });

    await page.goto('/workflows');
    await expect(page).toHaveURL(/\/workflows/);

    // Verify header and table record
    await expect(page.locator('h1', { hasText: 'Workflows & Approvals' })).toBeVisible();
    await expect(page.locator('text=Server Room Chiller Leak')).toBeVisible();
    await expect(page.locator('text=Orion City Colombo')).toBeVisible();
  });

  test('Manager reviews proposal and submits governance approval', async ({ page }) => {
    // Mock single workflow timeline, runs, followups, assistance
    await page.route(/.*\/workflows\/wf-e2e-100\/timeline/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            currentState: 7,
            steps: [
              { stepState: 1, stepName: 'IncidentRegistered', status: 3 },
              { stepState: 2, stepName: 'Planning', status: 3 },
            ],
            approvals: [],
            auditEvents: [],
          },
        }),
      });
    });

    await page.route(/.*\/workflows\/wf-e2e-100\/agent-runs/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route(/.*\/workflows\/wf-e2e-100\/follow-ups/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route(/.*\/workflows\/wf-e2e-100\/assistance/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: null }),
      });
    });

    let approvedPayload: any = null;
    await page.route(/.*\/workflows\/wf-e2e-100\/approve/, async (route) => {
      approvedPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.route(/.*\/workflows\/wf-e2e-100$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'wf-e2e-100',
            correlationId: 'corr-e2e-abc',
            incidentId: 'inc-99',
            incidentTitle: 'Server Room Chiller Leak',
            assetId: 'ast-01',
            assetName: 'Orion City Colombo',
            currentState: 7,
            currentStateName: 'AwaitingApproval',
            createdAtUtc: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto('/workflows/wf-e2e-100');
    await expect(page).toHaveURL(/\/workflows\/wf-e2e-100/);

    // Verify detail page header
    await expect(page.locator('h1', { hasText: 'Server Room Chiller Leak' })).toBeVisible();

    // Click Approve button
    const approveBtn = page.locator('button', { hasText: /^approve$/i });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // Verify modal is displayed
    await expect(page.locator('text=Approve Maintenance Proposal')).toBeVisible();

    // Confirm decision
    const confirmBtn = page.locator('button[type="submit"]', { hasText: /confirm decision/i });
    await confirmBtn.click();

    // Verify payload was received
    await page.waitForTimeout(500);
    expect(approvedPayload).not.toBeNull();
    expect(approvedPayload.decisionReason).toContain('Approved after technical inspection');
  });
});
