import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MaintenanceJobListPage from '../MaintenanceJobListPage';
import { maintenanceApi } from '../../../lib/api/maintenanceApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockUserRole = 'Manager';
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-mgr',
      fullName: 'Anura Kumara',
      email: 'manager@assetbridge.lk',
      role: mockUserRole,
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../../lib/api/maintenanceApi', () => ({
  maintenanceApi: {
    getJobs: vi.fn(),
  },
}));

const sampleJobs = [
  {
    id: 'job-001-uuid-1234',
    title: 'Replace burnt HVAC motor',
    incidentTitle: 'Server room AC breakdown',
    providerBusinessName: 'Cooling Lanka (Pvt) Ltd',
    scheduledStartUtc: '2026-09-10T09:00:00Z',
    approvedBudget: 45000,
    actualCost: 42000,
    status: 3,
    statusName: 'InProgress',
  },
  {
    id: 'job-002-uuid-5678',
    title: 'Main pipeline leak fix',
    incidentTitle: 'Basement flood',
    providerBusinessName: 'Quick Plumbing Services',
    scheduledStartUtc: '2026-09-12T14:00:00Z',
    approvedBudget: 18000,
    actualCost: null,
    status: 2,
    statusName: 'Scheduled',
  },
];

describe('MaintenanceJobListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'Manager';
  });

  it('renders loading state while fetching maintenance jobs', () => {
    (maintenanceApi.getJobs as any).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <MaintenanceJobListPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading maintenance work orders\.\.\./i)).toBeDefined();
  });

  it('renders maintenance work orders table with budget, provider and status badges', async () => {
    (maintenanceApi.getJobs as any).mockResolvedValue({
      success: true,
      data: {
        items: sampleJobs,
        totalCount: 2,
        totalPages: 1,
      },
    });

    render(
      <MemoryRouter>
        <MaintenanceJobListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Replace burnt HVAC motor')).toBeDefined();
    expect(screen.getByText('Cooling Lanka (Pvt) Ltd')).toBeDefined();
    expect(screen.getByText('Main pipeline leak fix')).toBeDefined();
    expect(screen.getByText('Quick Plumbing Services')).toBeDefined();
    expect(screen.getByText('LKR 45,000.00')).toBeDefined();
    expect(screen.getByText('Actual: LKR 42,000')).toBeDefined();
  });

  it('filters jobs by status using status dropdown filter', async () => {
    (maintenanceApi.getJobs as any).mockResolvedValue({
      success: true,
      data: {
        items: sampleJobs,
        totalCount: 2,
        totalPages: 1,
      },
    });

    render(
      <MemoryRouter>
        <MaintenanceJobListPage />
      </MemoryRouter>
    );

    await screen.findByText('Replace burnt HVAC motor');

    const statusDropdown = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusDropdown, { target: { value: 'InProgress' } });

    await waitFor(
      () => {
        expect(maintenanceApi.getJobs).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'InProgress',
          })
        );
      },
      { timeout: 3000 }
    );
  });

  it('displays empty state when no jobs match filter criteria', async () => {
    (maintenanceApi.getJobs as any).mockResolvedValue({
      success: true,
      data: {
        items: [],
        totalCount: 0,
        totalPages: 1,
      },
    });

    render(
      <MemoryRouter>
        <MaintenanceJobListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/no maintenance jobs found/i)).toBeDefined();
  });

  it('displays error state and retries fetching on user retry action', async () => {
    (maintenanceApi.getJobs as any).mockRejectedValueOnce({
      response: { data: { message: 'Database query timed out.' } },
    });

    render(
      <MemoryRouter>
        <MaintenanceJobListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Database query timed out.')).toBeDefined();

    (maintenanceApi.getJobs as any).mockResolvedValueOnce({
      success: true,
      data: { items: sampleJobs, totalCount: 2, totalPages: 1 },
    });

    const retryBtn = screen.getByRole('button', { name: /retry request/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('Replace burnt HVAC motor')).toBeDefined();
  });

  it('shows Create Maintenance Job button for Manager and hides for Owner', async () => {
    (maintenanceApi.getJobs as any).mockResolvedValue({
      success: true,
      data: { items: sampleJobs, totalCount: 2, totalPages: 1 },
    });

    const { unmount } = render(
      <MemoryRouter>
        <MaintenanceJobListPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: /create maintenance job/i })).toBeDefined();

    unmount();

    mockUserRole = 'Owner';
    render(
      <MemoryRouter>
        <MaintenanceJobListPage />
      </MemoryRouter>
    );

    await screen.findByText('Replace burnt HVAC motor');
    expect(screen.queryByRole('button', { name: /create maintenance job/i })).toBeNull();
  });

  it('navigates to job detail view when View button is clicked', async () => {
    (maintenanceApi.getJobs as any).mockResolvedValue({
      success: true,
      data: { items: sampleJobs, totalCount: 2, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <MaintenanceJobListPage />
      </MemoryRouter>
    );

    await screen.findByText('Replace burnt HVAC motor');

    const viewBtns = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/maintenance/jobs/job-001-uuid-1234');
  });
});
