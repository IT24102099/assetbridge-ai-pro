import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MaintenanceJobDetailPage from '../MaintenanceJobDetailPage';
import { maintenanceApi } from '../../../lib/api/maintenanceApi';
import { MaintenanceJobStatus } from '../../../types/maintenance';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'job-777-uuid' }),
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
    getJobById: vi.fn(),
    updateJobStatus: vi.fn(),
  },
}));

const sampleJob = {
  id: 'job-777-uuid',
  title: 'Fire Damper Valve Replacement',
  incidentTitle: 'Ventilation Flap Stuck',
  providerBusinessName: 'Safety First Systems',
  scheduledStartUtc: '2026-09-15T08:30:00Z',
  scheduledEndUtc: '2026-09-15T16:30:00Z',
  approvedBudget: 62000,
  actualCost: null,
  status: MaintenanceJobStatus.Scheduled,
  statusName: 'Scheduled',
  description: 'Full replacement of defective fire damper valve and test sensor trip',
};

describe('MaintenanceJobDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'Manager';
  });

  it('renders loading state while retrieving job data', () => {
    (maintenanceApi.getJobById as any).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <MaintenanceJobDetailPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading maintenance work order\.\.\./i)).toBeDefined();
  });

  it('renders job details, stage tracker, and approved budget', async () => {
    (maintenanceApi.getJobById as any).mockResolvedValue({
      success: true,
      data: sampleJob,
    });

    render(
      <MemoryRouter>
        <MaintenanceJobDetailPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Fire Damper Valve Replacement')).toBeDefined();
    expect(screen.getByText('Safety First Systems')).toBeDefined();
    expect(screen.getByText('LKR 62,000.00')).toBeDefined();
    expect(screen.getByText(/ventilation flap stuck/i)).toBeDefined();
    // Stages tracker
    expect(screen.getByText('Planned')).toBeDefined();
    expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
    expect(screen.getByText('Completed')).toBeDefined();
  });

  it('shows Start Work Order button when job is Scheduled and opens transition modal', async () => {
    (maintenanceApi.getJobById as any).mockResolvedValue({
      success: true,
      data: sampleJob,
    });

    render(
      <MemoryRouter>
        <MaintenanceJobDetailPage />
      </MemoryRouter>
    );

    const startBtn = await screen.findByRole('button', { name: /start work order/i });
    fireEvent.click(startBtn);

    // Modal should open
    expect(screen.getByText(/update job milestone/i)).toBeDefined();
  });

  it('submits status update and updates job data on modal form submit', async () => {
    (maintenanceApi.getJobById as any).mockResolvedValue({
      success: true,
      data: {
        ...sampleJob,
        status: MaintenanceJobStatus.InProgress,
        statusName: 'InProgress',
      },
    });
    (maintenanceApi.updateJobStatus as any).mockResolvedValue({
      success: true,
      data: {
        ...sampleJob,
        status: MaintenanceJobStatus.Completed,
        statusName: 'Completed',
        actualCost: 61500,
      },
    });

    render(
      <MemoryRouter>
        <MaintenanceJobDetailPage />
      </MemoryRouter>
    );

    const completeBtn = await screen.findByRole('button', { name: /mark job completed/i });
    fireEvent.click(completeBtn);

    expect(screen.getByText(/update job milestone/i)).toBeDefined();

    // Fill notes and submit modal form
    const notesInput = screen.getByPlaceholderText(/repairs completed according to specifications/i);
    fireEvent.change(notesInput, { target: { value: 'Valve installed and pressure tested successfully' } });

    const submitBtn = screen.getByRole('button', { name: /save milestone/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(maintenanceApi.updateJobStatus).toHaveBeenCalledWith(
        'job-777-uuid',
        expect.objectContaining({
          status: MaintenanceJobStatus.Completed,
          completionNotes: 'Valve installed and pressure tested successfully',
        })
      );
    });
  });

  it('renders error state and retries fetching when API fails', async () => {
    (maintenanceApi.getJobById as any).mockRejectedValueOnce({
      response: { data: { message: 'Network connection failed' } },
    });

    render(
      <MemoryRouter>
        <MaintenanceJobDetailPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Network connection failed')).toBeDefined();

    (maintenanceApi.getJobById as any).mockResolvedValueOnce({
      success: true,
      data: sampleJob,
    });

    const retryBtn = screen.getByRole('button', { name: /retry request/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('Fire Damper Valve Replacement')).toBeDefined();
  });

  it('navigates back to maintenance list on back button click', async () => {
    (maintenanceApi.getJobById as any).mockResolvedValue({
      success: true,
      data: sampleJob,
    });

    render(
      <MemoryRouter>
        <MaintenanceJobDetailPage />
      </MemoryRouter>
    );

    const backBtn = await screen.findByRole('button', { name: /back to maintenance jobs/i });
    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/maintenance/jobs');
  });
});
