import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InspectionDetailPage from '../InspectionDetailPage';
import { inspectionApi } from '../../../lib/api/inspectionApi';
import { InspectionStatus, FindingSeverity } from '../../../types/inspection';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'insp-555-uuid' }),
  };
});

let mockUserRole = 'ServiceProvider';
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-sp',
      fullName: 'Perera Tech Services',
      email: 'tech@perera.lk',
      role: mockUserRole,
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../../lib/api/inspectionApi', () => ({
  inspectionApi: {
    getInspectionById: vi.fn(),
    updateInspectionStatus: vi.fn(),
    removeFinding: vi.fn(),
  },
}));

const sampleInspection = {
  id: 'insp-555-uuid',
  incidentId: 'inc-999',
  incidentTitle: 'Water Heater Pressure Valve Burst',
  inspectorBusinessName: 'Prime Plumbing Contractors',
  scheduledAtUtc: '2026-09-16T11:00:00Z',
  status: InspectionStatus.Scheduled,
  statusName: 'Scheduled',
  estimatedSeverity: FindingSeverity.High,
  notes: 'Check expansion tank integrity and primary pressure relief valve',
  findings: [
    {
      id: 'f-1',
      description: 'Primary pressure relief valve diaphragm ruptured',
      recommendation: 'Replace with 150 PSI brass pressure relief valve',
      estimatedCost: 14500,
      severity: FindingSeverity.High,
      severityName: 'High',
    },
  ],
};

describe('InspectionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'ServiceProvider';
    window.confirm = vi.fn(() => true);
  });

  it('renders loading state while retrieving inspection details', () => {
    (inspectionApi.getInspectionById as any).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <InspectionDetailPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading inspection details\.\.\./i)).toBeDefined();
  });

  it('renders inspection overview, inspector info, notes, and technical findings', async () => {
    (inspectionApi.getInspectionById as any).mockResolvedValue({
      success: true,
      data: sampleInspection,
    });

    render(
      <MemoryRouter>
        <InspectionDetailPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Water Heater Pressure Valve Burst')).toBeDefined();
    expect(screen.getByText('Prime Plumbing Contractors')).toBeDefined();
    expect(screen.getByText(/check expansion tank integrity and primary pressure relief valve/i)).toBeDefined();
    expect(screen.getByText('Primary pressure relief valve diaphragm ruptured')).toBeDefined();
    expect(screen.getByText('Replace with 150 PSI brass pressure relief valve')).toBeDefined();
  });

  it('transitions inspection status from Scheduled to InProgress on button click', async () => {
    (inspectionApi.getInspectionById as any).mockResolvedValue({
      success: true,
      data: sampleInspection,
    });
    (inspectionApi.updateInspectionStatus as any).mockResolvedValue({
      success: true,
      data: {
        ...sampleInspection,
        status: InspectionStatus.InProgress,
        statusName: 'InProgress',
      },
    });

    render(
      <MemoryRouter>
        <InspectionDetailPage />
      </MemoryRouter>
    );

    const startBtn = await screen.findByRole('button', { name: /start inspection/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(inspectionApi.updateInspectionStatus).toHaveBeenCalledWith(
        'insp-555-uuid',
        expect.objectContaining({
          status: InspectionStatus.InProgress,
        })
      );
    });
  });

  it('transitions inspection status from InProgress to Completed on button click', async () => {
    (inspectionApi.getInspectionById as any).mockResolvedValue({
      success: true,
      data: {
        ...sampleInspection,
        status: InspectionStatus.InProgress,
        statusName: 'InProgress',
      },
    });
    (inspectionApi.updateInspectionStatus as any).mockResolvedValue({
      success: true,
      data: {
        ...sampleInspection,
        status: InspectionStatus.Completed,
        statusName: 'Completed',
      },
    });

    render(
      <MemoryRouter>
        <InspectionDetailPage />
      </MemoryRouter>
    );

    const completeBtn = await screen.findByRole('button', { name: /mark completed/i });
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(inspectionApi.updateInspectionStatus).toHaveBeenCalledWith(
        'insp-555-uuid',
        expect.objectContaining({
          status: InspectionStatus.Completed,
        })
      );
    });
  });

  it('deletes a finding and removes it from list after confirmation', async () => {
    (inspectionApi.getInspectionById as any).mockResolvedValue({
      success: true,
      data: sampleInspection,
    });
    (inspectionApi.removeFinding as any).mockResolvedValue({
      success: true,
    });

    render(
      <MemoryRouter>
        <InspectionDetailPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Primary pressure relief valve diaphragm ruptured')).toBeDefined();

    const deleteBtn = screen.getByTitle('Remove finding');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(inspectionApi.removeFinding).toHaveBeenCalledWith('insp-555-uuid', 'f-1');
      expect(screen.queryByText('Primary pressure relief valve diaphragm ruptured')).toBeNull();
    });
  });

  it('renders error state and retries on failure', async () => {
    (inspectionApi.getInspectionById as any).mockRejectedValueOnce({
      response: { data: { message: 'Inspection record unavailable' } },
    });

    render(
      <MemoryRouter>
        <InspectionDetailPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Inspection record unavailable')).toBeDefined();

    (inspectionApi.getInspectionById as any).mockResolvedValueOnce({
      success: true,
      data: sampleInspection,
    });

    const retryBtn = screen.getByRole('button', { name: /retry request/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('Water Heater Pressure Valve Burst')).toBeDefined();
  });
});
