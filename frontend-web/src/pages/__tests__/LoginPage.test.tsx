import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { authApi } from '../../lib/api/authApi';

const mockNavigate = vi.fn();
const mockLogin = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: { from: { pathname: '/dashboard' } } }),
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
    user: null,
  }),
}));

vi.mock('../../lib/api/authApi', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login page with branding, inputs, and demo quick-fill buttons', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/name@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sign In/i })).toBeInTheDocument();

    // Check quick-fill buttons
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
  });

  it('validates empty inputs and displays error message', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/name@example.com/i);
    const form = emailInput.closest('form')!;
    fireEvent.submit(form);

    expect(
      screen.getByText(/Please enter your registered email address and password/i)
    ).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('populates credentials when quick fill button is clicked', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const managerQuickBtn = screen.getByText('Manager');
    fireEvent.click(managerQuickBtn);

    const emailInput = screen.getByPlaceholderText(/name@example.com/i) as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i) as HTMLInputElement;

    expect(emailInput.value).toBe('manager@assetbridge.lk');
    expect(passwordInput.value).toBe('SecurePassword123!');
  });

  it('toggles password visibility when eye button is clicked', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const passwordInput = screen.getByPlaceholderText(/Enter your password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    // Click toggle button located within password field wrapper
    const toggleBtn = passwordInput.parentElement!.querySelector('button')!;
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('text');

    // Click toggle button again
    fireEvent.click(toggleBtn);
    expect(passwordInput.type).toBe('password');
  });

  it('submits valid credentials, handles API success, and navigates', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      success: true,
      message: 'Login successful',
      data: {
        token: 'jwt-auth-token-xyz',
        user: {
          id: 'usr-1',
          email: 'manager@assetbridge.lk',
          fullName: 'Saman Perera',
          role: 'Manager',
          isActive: true,
          createdAtUtc: '2026-01-01T00:00:00Z',
        },
      },
    } as any);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'manager@assetbridge.lk' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
      target: { value: 'SecurePassword123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Sign In/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('manager@assetbridge.lk', 'SecurePassword123!');
      expect(mockLogin).toHaveBeenCalledWith('jwt-auth-token-xyz', expect.objectContaining({ role: 'Manager' }));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('displays backend error message when authentication fails', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce({
      response: {
        data: {
          message: 'Invalid email or password provided.',
        },
      },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/name@example.com/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your password/i), {
      target: { value: 'WrongPass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password provided.')).toBeInTheDocument();
    });
  });
});
