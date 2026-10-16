import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '../SettingsPage';
import { authApi } from '../../../lib/api/authApi';

const mockRefreshUser = vi.fn();
const mockLogout = vi.fn();

const mockUser = {
  id: 'user-123',
  email: 'owner@assetbridge.lk',
  fullName: 'Priyantha Jayawardena',
  phoneNumber: '+94 77 123 4567',
  role: 'Owner' as const,
  isActive: true,
  createdAtUtc: '2025-01-15T10:00:00Z',
  lastLoginAtUtc: '2025-02-01T12:00:00Z',
};

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    refreshUser: mockRefreshUser,
    logout: mockLogout,
  }),
}));

vi.mock('../../../lib/api/authApi', () => ({
  authApi: {
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));

describe('SettingsPage Redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders profile overview with user details, initials avatar, and role-specific capabilities', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    // Profile header & overview
    expect(screen.getByText('Account & Profile Settings')).toBeDefined();
    expect(screen.getAllByText('Priyantha Jayawardena').length).toBeGreaterThan(0);
    expect(screen.getAllByText('owner@assetbridge.lk').length).toBeGreaterThan(0);
    expect(screen.getByText('PJ')).toBeDefined(); // Initials
    expect(screen.getByText('Property Owner Capabilities')).toBeDefined();
    expect(screen.getByText('My Properties')).toBeDefined();
  });

  it('toggles edit mode, validates fields, and submits updated profile', async () => {
    (authApi.updateProfile as any).mockResolvedValue({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        ...mockUser,
        fullName: 'Priyantha J. Perera',
      },
    });

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    // Click Edit Profile button
    const editBtn = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editBtn);

    // Verify inputs appear
    const nameInput = screen.getByPlaceholderText('Enter your full name') as HTMLInputElement;
    expect(nameInput).toBeDefined();
    expect(nameInput.value).toBe('Priyantha Jayawardena');

    // Test validation: clear name
    fireEvent.change(nameInput, { target: { value: '' } });
    const saveBtn = screen.getByRole('button', { name: /save profile changes/i });
    fireEvent.click(saveBtn);

    expect(await screen.findByText('Full name is required.')).toBeDefined();
    expect(authApi.updateProfile).not.toHaveBeenCalled();

    // Fill valid new name
    fireEvent.change(nameInput, { target: { value: 'Priyantha J. Perera' } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(authApi.updateProfile).toHaveBeenCalledWith({
        fullName: 'Priyantha J. Perera',
        phoneNumber: '+94 77 123 4567',
      });
      expect(mockRefreshUser).toHaveBeenCalled();
    });
  });

  it('validates password fields and submits valid password change request', async () => {
    (authApi.changePassword as any).mockResolvedValue({
      success: true,
      data: true,
    });

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    const currentPwdInput = screen.getByPlaceholderText('Enter current password');
    const newPwdInput = screen.getByPlaceholderText('Minimum 6 characters');
    const confirmPwdInput = screen.getByPlaceholderText('Re-type new password');
    const updatePwdBtn = screen.getByRole('button', { name: /change password/i });

    // Try mismatched passwords
    fireEvent.change(currentPwdInput, { target: { value: 'OldPassword123!' } });
    fireEvent.change(newPwdInput, { target: { value: 'NewPassword123!' } });
    fireEvent.change(confirmPwdInput, { target: { value: 'DifferentPassword123!' } });
    fireEvent.click(updatePwdBtn);

    expect(await screen.findByText('New password and confirm password do not match.')).toBeDefined();
    expect(authApi.changePassword).not.toHaveBeenCalled();

    // Fix matching passwords
    fireEvent.change(confirmPwdInput, { target: { value: 'NewPassword123!' } });
    fireEvent.click(updatePwdBtn);

    await waitFor(() => {
      expect(authApi.changePassword).toHaveBeenCalledWith({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });
    });
  });
});
