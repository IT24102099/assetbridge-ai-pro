import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../AuthContext';
import { authApi } from '../../lib/api/authApi';
import { UserProfile } from '../../types/auth';

vi.mock('../../lib/api/authApi', () => ({
  authApi: {
    getCurrentUser: vi.fn(),
  },
}));

const mockUser: UserProfile = {
  id: 'usr-owner-001',
  email: 'owner@assetbridge.com',
  fullName: 'Priyantha Jayawardena',
  phoneNumber: '+94 77 123 4567',
  role: 'Owner',
  isActive: true,
  createdAtUtc: '2026-01-01T00:00:00Z',
};

// Helper component to consume AuthContext
const ConsumerComponent: React.FC = () => {
  const { user, token, isAuthenticated, isLoading, login, logout, hasRole, refreshUser } = useAuth();

  return (
    <div>
      <div data-testid="auth-loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="user-email">{user?.email ?? 'none'}</div>
      <div data-testid="user-role">{user?.role ?? 'none'}</div>
      <div data-testid="token-val">{token ?? 'none'}</div>
      <div data-testid="is-owner">{hasRole('Owner') ? 'yes' : 'no'}</div>
      <div data-testid="is-manager">{hasRole(['Manager', 'Admin']) ? 'yes' : 'no'}</div>
      <button
        data-testid="login-btn"
        onClick={() => login('mock.valid.token', mockUser)}
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
      <button data-testid="refresh-btn" onClick={refreshUser}>
        Refresh
      </button>
    </div>
  );
};

describe('AuthContext Component & Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes as unauthenticated when no token exists in localStorage', async () => {
    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('ready');
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('user-email').textContent).toBe('none');
    expect(screen.getByTestId('token-val').textContent).toBe('none');
  });

  it('clears session when an expired token is detected in localStorage', async () => {
    // Construct an expired JWT (exp in the past: 1000 seconds after epoch)
    const expiredHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const expiredPayload = btoa(JSON.stringify({ exp: 1000, sub: 'usr-123' }));
    const expiredToken = `${expiredHeader}.${expiredPayload}.signature`;

    localStorage.setItem('assetbridge_token', expiredToken);
    localStorage.setItem('assetbridge_user', JSON.stringify(mockUser));

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('ready');
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');
    expect(localStorage.getItem('assetbridge_token')).toBeNull();
  });

  it('restores authenticated session when a valid token and backend verification succeed', async () => {
    // Construct a valid future JWT (exp in future)
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ exp: futureExp, sub: 'usr-123' }));
    const validToken = `${header}.${payload}.signature`;

    localStorage.setItem('assetbridge_token', validToken);
    vi.mocked(authApi.getCurrentUser).mockResolvedValueOnce({
      success: true,
      data: mockUser,
      message: 'OK',
    } as any);

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('ready');
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    expect(screen.getByTestId('user-email').textContent).toBe('owner@assetbridge.com');
    expect(screen.getByTestId('token-val').textContent).toBe(validToken);
    expect(screen.getByTestId('is-owner').textContent).toBe('yes');
    expect(screen.getByTestId('is-manager').textContent).toBe('no');
  });

  it('handles login action, persists session, and updates role assertions', async () => {
    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('ready');
    });

    act(() => {
      screen.getByTestId('login-btn').click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated');
    expect(screen.getByTestId('user-email').textContent).toBe('owner@assetbridge.com');
    expect(screen.getByTestId('is-owner').textContent).toBe('yes');
    expect(localStorage.getItem('assetbridge_token')).toBe('mock.valid.token');
  });

  it('handles logout action, clears storage, and resets state', async () => {
    // Prevent jsdom unhandled navigation error for window.location.href
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, href: '' },
    });

    localStorage.setItem('assetbridge_token', 'sample-token');
    localStorage.setItem('assetbridge_user', JSON.stringify(mockUser));

    render(
      <AuthProvider>
        <ConsumerComponent />
      </AuthProvider>
    );

    act(() => {
      screen.getByTestId('logout-btn').click();
    });

    expect(localStorage.getItem('assetbridge_token')).toBeNull();
    expect(localStorage.getItem('assetbridge_user')).toBeNull();
    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });
});
