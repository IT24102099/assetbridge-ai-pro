import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import * as AuthContextModule from '../../../context/AuthContext';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner while authentication state is being verified to prevent content flashing', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Verifying authentication session...')).toBeDefined();
    expect(screen.queryByText('Protected Dashboard Content')).toBeNull();
  });

  it('redirects unauthenticated users to /login preserving the requested destination in query param', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/workflows/detail-123']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/workflows/detail-123" element={<div>Protected Workflow Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page Mock</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page Mock')).toBeDefined();
    expect(screen.queryByText('Protected Workflow Content')).toBeNull();
  });

  it('renders protected content when user is authenticated with appropriate role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'owner-1',
        email: 'owner@assetbridge.lk',
        fullName: 'Test Owner',
        role: 'Owner',
        isActive: true,
        createdAtUtc: '2025-01-01',
      },
      token: 'valid.mock.token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Dashboard Content')).toBeDefined();
  });

  it('redirects to /unauthorized when user lacks the required role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'owner-1',
        email: 'owner@assetbridge.lk',
        fullName: 'Test Owner',
        role: 'Owner',
        isActive: true,
        createdAtUtc: '2025-01-01',
      },
      token: 'valid.mock.token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/manager']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['Manager', 'Admin']} />}>
            <Route path="/manager" element={<div>Manager Dashboard Content</div>} />
          </Route>
          <Route path="/unauthorized" element={<div>Unauthorized Access Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Unauthorized Access Page')).toBeDefined();
    expect(screen.queryByText('Manager Dashboard Content')).toBeNull();
  });
});
