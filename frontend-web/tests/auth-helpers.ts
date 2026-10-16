import { Page } from '@playwright/test';

export interface TestUser {
  id: string;
  fullName: string;
  email: string;
  role: 'Owner' | 'Representative' | 'ServiceProvider' | 'Manager' | 'Admin';
  phoneNumber?: string;
}

export function createValidTestToken(role: string, email: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  // Set expiry 24 hours into future
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const payload = btoa(JSON.stringify({ sub: 'usr-e2e', email, role, exp }));
  const signature = 'sig-valid-e2e';
  return `${header}.${payload}.${signature}`;
}

export async function setupAuthenticatedSession(page: Page, user: TestUser) {
  const token = createValidTestToken(user.role, user.email);

  // Match all backend API requests whether directed to localhost:5206 or containing /api/
  await page.route(/(localhost:5206|\/api\/)/, async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: user,
        }),
      });
      return;
    }
    if (url.includes('/notifications')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: url.includes('/unread-count') ? 0 : [],
        }),
      });
      return;
    }
    // Default safe response for unintercepted backend API endpoints
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: [], totalCount: 0, totalPages: 1 },
      }),
    });
  });

  // Inject valid token and profile into localStorage before any page scripts run
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('assetbridge_token', token);
      localStorage.setItem('assetbridge_user', JSON.stringify(user));
    },
    { token, user }
  );
}
