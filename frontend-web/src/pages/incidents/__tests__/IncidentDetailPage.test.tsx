import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IncidentDetailPage } from '../IncidentDetailPage';
import { incidentApi } from '../../../lib/api/incidentApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'inc-999-uuid' }),
  };
});

let mockUserRole = 'Manager';
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-manager-1',
      fullName: 'Kamal Silva',
      email: 'manager@assetbridge.lk',
      role: mockUserRole,
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../../lib/api/incidentApi', () => ({
  incidentApi: {
    getIncidentById: vi.fn(),
    getEvidence: vi.fn(),
    updateStatus: vi.fn(),
    uploadEvidence: vi.fn(),
  },
}));

const sampleIncident = {
  id: 'inc-999-uuid',
  title: 'Elevator power fluctuation',
  description: 'Main passenger elevator motor tripping unexpectedly on ground floor',
  category: 'Electrical',
  priority: 'Emergency',
  status: 'Reported',
  assetName: 'Havelock City Phase 2',
  assetCity: 'Colombo',
  locationDetails: 'Tower B, Ground Level Main Lift',
  createdAtUtc: '2026-09-05T08:00:00Z',
  evidence: [],
};

const sampleEvidence = [
  {
    id: 'ev-1',
    fileName: 'breaker-tripped.jpg',
    fileUrl: 'https://storage.assetbridge.lk/evidence/breaker-tripped.jpg',
    evidenceType: 'Photo',
    caption: 'Main 60A breaker tripped',
    createdAtUtc: '2026-09-05T08:15:00Z',
  },
];

describe('IncidentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'Manager';
  });

  it('shows loading state while fetching incident telemetry and evidence', () => {
    (incidentApi.getIncidentById as any).mockReturnValue(new Promise(() => {}));
    (incidentApi.getEvidence as any).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/incidents/inc-999-uuid']}>
        <IncidentDetailPage />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/loading incident triage details & ai diagnostic telemetry\.\.\./i)
    ).toBeDefined();
  });

  it('renders incident overview, ID, asset name, and AI triage recommendation', async () => {
    (incidentApi.getIncidentById as any).mockResolvedValue({ data: sampleIncident });
    (incidentApi.getEvidence as any).mockResolvedValue({ data: [] });

    render(
      <MemoryRouter initialEntries={['/incidents/inc-999-uuid']}>
        <IncidentDetailPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('INC-INC-')).toBeDefined(); // Formatted from id.slice(0, 4)
    expect(screen.getAllByText('Havelock City Phase 2').length).toBeGreaterThan(0);
    expect(screen.getByText('Elevator power fluctuation')).toBeDefined();
    expect(screen.getByText('Main passenger elevator motor tripping unexpectedly on ground floor')).toBeDefined();
    expect(screen.getByText(/ai triage & recommendation/i)).toBeDefined();
    expect(screen.getByText(/certified electrical specialist/i)).toBeDefined();
  });

  it('changes workflow status when selecting a new option in the status dropdown', async () => {
    (incidentApi.getIncidentById as any).mockResolvedValue({ data: sampleIncident });
    (incidentApi.getEvidence as any).mockResolvedValue({ data: [] });
    (incidentApi.updateStatus as any).mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter initialEntries={['/incidents/inc-999-uuid']}>
        <IncidentDetailPage />
      </MemoryRouter>
    );

    await screen.findByText('Elevator power fluctuation');

    const statusSelect = screen.getByDisplayValue('1. Incident Reported');
    fireEvent.change(statusSelect, { target: { value: 'Validating' } });

    await waitFor(() => {
      expect(incidentApi.updateStatus).toHaveBeenCalledWith('inc-999-uuid', {
        newStatus: 'Validating',
        statusChangeReason: 'Status updated to Validating',
      });
    });
  });

  it('switches between Details, Photos, and Timeline tabs', async () => {
    (incidentApi.getIncidentById as any).mockResolvedValue({ data: sampleIncident });
    (incidentApi.getEvidence as any).mockResolvedValue({ data: sampleEvidence });

    render(
      <MemoryRouter initialEntries={['/incidents/inc-999-uuid']}>
        <IncidentDetailPage />
      </MemoryRouter>
    );

    await screen.findByText('Elevator power fluctuation');

    // Click Photos tab
    const photosTab = screen.getByRole('button', { name: /photos \(1\)/i });
    fireEvent.click(photosTab);

    expect(await screen.findByText('breaker-tripped.jpg')).toBeDefined();
    expect(screen.getByText('Main 60A breaker tripped')).toBeDefined();

    // Click Timeline tab
    const timelineTab = screen.getByRole('button', { name: /timeline/i });
    fireEvent.click(timelineTab);

    expect(await screen.findByText(/automated agent dispatched triage telemetry/i)).toBeDefined();
  });

  it('uploads evidence photo successfully when file is attached', async () => {
    (incidentApi.getIncidentById as any).mockResolvedValue({ data: sampleIncident });
    (incidentApi.getEvidence as any).mockResolvedValue({ data: [] });
    (incidentApi.uploadEvidence as any).mockResolvedValue({ data: { id: 'new-ev-id' } });

    const { container } = render(
      <MemoryRouter initialEntries={['/incidents/inc-999-uuid']}>
        <IncidentDetailPage />
      </MemoryRouter>
    );

    await screen.findByText('Elevator power fluctuation');

    // Go to photos tab
    fireEvent.click(screen.getByRole('button', { name: /photos/i }));

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const mockFile = new File(['mock content'], 'generator-fault.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    await waitFor(() => {
      expect(incidentApi.uploadEvidence).toHaveBeenCalledWith(
        'inc-999-uuid',
        mockFile,
        'Photo',
        'Defect Photo: generator-fault.png'
      );
    });
  });

  it('renders error state and retries fetching on failure', async () => {
    (incidentApi.getIncidentById as any).mockRejectedValueOnce({
      response: { data: { message: 'Incident record not found or inaccessible.' } },
    });
    (incidentApi.getEvidence as any).mockResolvedValueOnce({ data: [] });

    render(
      <MemoryRouter initialEntries={['/incidents/inc-999-uuid']}>
        <IncidentDetailPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText('Incident record not found or inaccessible.')
    ).toBeDefined();

    // Reset with success and test retry
    (incidentApi.getIncidentById as any).mockResolvedValueOnce({ data: sampleIncident });
    (incidentApi.getEvidence as any).mockResolvedValueOnce({ data: [] });

    const retryBtn = screen.getByRole('button', { name: /retry request/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('Elevator power fluctuation')).toBeDefined();
  });
});
