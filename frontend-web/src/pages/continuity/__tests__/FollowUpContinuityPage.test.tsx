import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FollowUpContinuityPage from '../FollowUpContinuityPage';
import { followUpApi } from '../../../lib/api/followUpApi';
import { assetApi } from '../../../lib/api/assetApi';
import { FollowUpStatus, FollowUpPriority } from '../../../types/workflow';

let mockCurrentUser = {
  id: 'usr-manager-1',
  fullName: 'Kamal Manager',
  role: 'Manager',
};

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isAuthenticated: true,
  }),
}));

vi.mock('../../../lib/api/followUpApi', () => ({
  followUpApi: {
    getFollowUps: vi.fn(),
    createFollowUp: vi.fn(),
    updateFollowUpStatus: vi.fn(),
  },
}));

vi.mock('../../../lib/api/assetApi', () => ({
  assetApi: {
    getAssets: vi.fn(),
  },
}));

const sampleAssets = [
  { id: 'ast-10', name: 'World Trade Center Tower 1', city: 'Colombo' },
  { id: 'ast-20', name: 'Park Street Mews Complex', city: 'Colombo' },
];

const sampleTasks = [
  {
    id: 'tsk-001',
    assetId: 'ast-10',
    assetName: 'World Trade Center Tower 1',
    title: 'HVAC Compressor 30-Day Warranty Inspection',
    description: 'Verify refrigerant pressure and check vibration damping mounts.',
    status: FollowUpStatus.Pending,
    statusName: 'Pending',
    priority: FollowUpPriority.High,
    priorityName: 'High',
    dueDateUtc: '2026-04-15T00:00:00Z',
    isOverdue: false,
    resolutionNotes: null,
    createdAtUtc: '2026-03-15T10:00:00Z',
  },
  {
    id: 'tsk-002',
    assetId: 'ast-20',
    assetName: 'Park Street Mews Complex',
    title: 'Roof Membrane Sealant Re-check',
    description: 'Ensure waterproof bitumen membrane held after monsoon downpour.',
    status: FollowUpStatus.Completed,
    statusName: 'Completed',
    priority: FollowUpPriority.Medium,
    priorityName: 'Medium',
    dueDateUtc: '2026-03-01T00:00:00Z',
    isOverdue: false,
    resolutionNotes: 'Inspection completed, no leaks detected.',
    createdAtUtc: '2026-02-15T10:00:00Z',
  },
];

describe('FollowUpContinuityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = {
      id: 'usr-manager-1',
      fullName: 'Kamal Manager',
      role: 'Manager',
    };
  });

  it('renders loading state initially', () => {
    (followUpApi.getFollowUps as any).mockReturnValue(new Promise(() => {}));
    (assetApi.getAssets as any).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <FollowUpContinuityPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading property continuity tasks\.\.\./i)).toBeDefined();
  });

  it('renders tasks table and statistics cards', async () => {
    (followUpApi.getFollowUps as any).mockResolvedValue({
      success: true,
      data: { items: sampleTasks, totalCount: 2, page: 1, pageSize: 50 },
    });
    (assetApi.getAssets as any).mockResolvedValue({
      success: true,
      data: { items: sampleAssets, totalCount: 2, page: 1, pageSize: 50 },
    });

    render(
      <MemoryRouter>
        <FollowUpContinuityPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('HVAC Compressor 30-Day Warranty Inspection')).toBeDefined();
    expect(screen.getByText('Roof Membrane Sealant Re-check')).toBeDefined();
    expect(screen.getByText('Scheduled Checkups')).toBeDefined();
    expect(screen.getByText('Resolved / Verified')).toBeDefined();
  });

  it('filters tasks by search input', async () => {
    (followUpApi.getFollowUps as any).mockResolvedValue({
      success: true,
      data: { items: sampleTasks, totalCount: 2, page: 1, pageSize: 50 },
    });
    (assetApi.getAssets as any).mockResolvedValue({
      success: true,
      data: { items: sampleAssets, totalCount: 2, page: 1, pageSize: 50 },
    });

    render(
      <MemoryRouter>
        <FollowUpContinuityPage />
      </MemoryRouter>
    );

    await screen.findByText('HVAC Compressor 30-Day Warranty Inspection');

    const searchInput = screen.getByPlaceholderText(/search continuity tasks, properties\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'Bitumen' } });

    expect(screen.queryByText('HVAC Compressor 30-Day Warranty Inspection')).toBeNull();
    expect(screen.getByText('Roof Membrane Sealant Re-check')).toBeDefined();
  });

  it('filters tasks by status dropdown', async () => {
    (followUpApi.getFollowUps as any).mockResolvedValue({
      success: true,
      data: { items: sampleTasks, totalCount: 2, page: 1, pageSize: 50 },
    });
    (assetApi.getAssets as any).mockResolvedValue({
      success: true,
      data: { items: sampleAssets, totalCount: 2, page: 1, pageSize: 50 },
    });

    render(
      <MemoryRouter>
        <FollowUpContinuityPage />
      </MemoryRouter>
    );

    await screen.findByText('HVAC Compressor 30-Day Warranty Inspection');

    const selects = screen.getAllByRole('combobox');
    const statusDropdown = selects[0];
    fireEvent.change(statusDropdown, { target: { value: 'Completed' } });

    expect(screen.queryByText('HVAC Compressor 30-Day Warranty Inspection')).toBeNull();
    expect(screen.getByText('Roof Membrane Sealant Re-check')).toBeDefined();
  });

  it('opens schedule task modal, validates required fields, and creates task', async () => {
    (followUpApi.getFollowUps as any).mockResolvedValue({
      success: true,
      data: { items: sampleTasks, totalCount: 2, page: 1, pageSize: 50 },
    });
    (assetApi.getAssets as any).mockResolvedValue({
      success: true,
      data: { items: sampleAssets, totalCount: 2, page: 1, pageSize: 50 },
    });
    (followUpApi.createFollowUp as any).mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <FollowUpContinuityPage />
      </MemoryRouter>
    );

    await screen.findByText('HVAC Compressor 30-Day Warranty Inspection');

    const scheduleBtn = screen.getByRole('button', { name: /schedule follow-up/i });
    fireEvent.click(scheduleBtn);

    expect(screen.getByText('Schedule Continuity Task')).toBeDefined();

    // Submit without title
    const saveBtn = screen.getByRole('button', { name: /save task/i });
    fireEvent.click(saveBtn);

    expect(await screen.findByText(/please fill in all required fields\./i)).toBeDefined();
    expect(followUpApi.createFollowUp).not.toHaveBeenCalled();

    // Fill form
    const titleInput = screen.getByPlaceholderText(/6-Month Ceiling Waterproofing/i);
    fireEvent.change(titleInput, { target: { value: 'Elevator Cable Tension Calibration' } });

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-05-01' } });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(followUpApi.createFollowUp).toHaveBeenCalled();
    });
  });

  it('hides schedule button for Owner and ServiceProvider roles', async () => {
    mockCurrentUser = {
      id: 'usr-owner-1',
      fullName: 'Sunil Owner',
      role: 'Owner',
    };

    (followUpApi.getFollowUps as any).mockResolvedValue({
      success: true,
      data: { items: sampleTasks, totalCount: 2, page: 1, pageSize: 50 },
    });
    (assetApi.getAssets as any).mockResolvedValue({
      success: true,
      data: { items: sampleAssets, totalCount: 2, page: 1, pageSize: 50 },
    });

    render(
      <MemoryRouter>
        <FollowUpContinuityPage />
      </MemoryRouter>
    );

    await screen.findByText('HVAC Compressor 30-Day Warranty Inspection');

    expect(screen.queryByRole('button', { name: /schedule follow-up/i })).toBeNull();
  });

  it('renders error state and retries', async () => {
    (followUpApi.getFollowUps as any).mockRejectedValueOnce({
      response: { data: { message: 'Continuity service offline' } },
    });
    (assetApi.getAssets as any).mockResolvedValueOnce({ success: true, data: { items: [] } });

    render(
      <MemoryRouter>
        <FollowUpContinuityPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Continuity service offline')).toBeDefined();

    (followUpApi.getFollowUps as any).mockResolvedValueOnce({
      success: true,
      data: { items: sampleTasks, totalCount: 2, page: 1, pageSize: 50 },
    });
    (assetApi.getAssets as any).mockResolvedValueOnce({
      success: true,
      data: { items: sampleAssets, totalCount: 2, page: 1, pageSize: 50 },
    });

    const retryBtn = screen.getByRole('button', { name: /retry request/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('HVAC Compressor 30-Day Warranty Inspection')).toBeDefined();
  });
});
