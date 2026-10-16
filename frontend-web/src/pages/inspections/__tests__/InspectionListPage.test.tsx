import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InspectionListPage from '../InspectionListPage';
import { inspectionApi } from '../../../lib/api/inspectionApi';
import { InspectionStatus, FindingSeverity } from '../../../types/inspection';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
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
    getInspections: vi.fn(),
  },
}));

const sampleInspections = [
  {
    id: 'insp-101-uuid',
    incidentId: 'inc-001',
    incidentTitle: 'Roof Water Seepage in Attic',
    inspectorBusinessName: 'Apex Roofing & Waterproofing',
    scheduledAtUtc: '2026-09-14T10:00:00Z',
    status: InspectionStatus.Scheduled,
    statusName: 'Scheduled',
    estimatedSeverity: FindingSeverity.High,
    findings: [{ id: 'f-1', description: 'Cracked ridge tile' }],
    notes: 'Initial attic structural assessment',
  },
  {
    id: 'insp-102-uuid',
    incidentId: 'inc-002',
    incidentTitle: 'Circuit Breaker Overheating',
    inspectorBusinessName: 'ElectroCare Colombo',
    scheduledAtUtc: '2026-09-15T15:30:00Z',
    status: InspectionStatus.Completed,
    statusName: 'Completed',
    estimatedSeverity: FindingSeverity.Critical,
    findings: [{ id: 'f-2', description: 'Melted busbar insulator' }],
    notes: 'Urgent thermal inspection',
  },
];

describe('InspectionListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'ServiceProvider';
  });

  it('renders loading state while fetching inspections', () => {
    (inspectionApi.getInspections as any).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <InspectionListPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading inspection records\.\.\./i)).toBeDefined();
  });

  it('renders inspection list with incident titles, inspectors, findings count and severity badges', async () => {
    (inspectionApi.getInspections as any).mockResolvedValue({
      success: true,
      data: {
        items: sampleInspections,
      },
    });

    render(
      <MemoryRouter>
        <InspectionListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Roof Water Seepage in Attic')).toBeDefined();
    expect(screen.getByText('Apex Roofing & Waterproofing')).toBeDefined();
    expect(screen.getByText('Circuit Breaker Overheating')).toBeDefined();
    expect(screen.getByText('ElectroCare Colombo')).toBeDefined();
    expect(screen.getAllByText('1 finding(s)').length).toBe(2);
    expect(screen.getByText('High')).toBeDefined();
    expect(screen.getByText('Critical')).toBeDefined();
  });

  it('filters inspection items by search input text', async () => {
    (inspectionApi.getInspections as any).mockResolvedValue({
      success: true,
      data: {
        items: sampleInspections,
      },
    });

    render(
      <MemoryRouter>
        <InspectionListPage />
      </MemoryRouter>
    );

    await screen.findByText('Roof Water Seepage in Attic');

    const searchInput = screen.getByPlaceholderText(/search by incident title, inspector name, or defect notes\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'Circuit Breaker' } });

    expect(screen.getByText('Circuit Breaker Overheating')).toBeDefined();
    expect(screen.queryByText('Roof Water Seepage in Attic')).toBeNull();
  });

  it('displays empty state when no inspections match the criteria', async () => {
    (inspectionApi.getInspections as any).mockResolvedValue({
      success: true,
      data: {
        items: [],
      },
    });

    render(
      <MemoryRouter>
        <InspectionListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/no inspections found/i)).toBeDefined();
  });

  it('displays error state and retries fetching inspection data on user request', async () => {
    (inspectionApi.getInspections as any).mockRejectedValueOnce({
      response: { data: { message: 'Inspection service temporarily unreachable.' } },
    });

    render(
      <MemoryRouter>
        <InspectionListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Inspection service temporarily unreachable.')).toBeDefined();

    (inspectionApi.getInspections as any).mockResolvedValueOnce({
      success: true,
      data: { items: sampleInspections },
    });

    const retryBtn = screen.getByRole('button', { name: /retry request/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('Roof Water Seepage in Attic')).toBeDefined();
  });

  it('renders Schedule Inspection button for ServiceProvider and hides for Owner', async () => {
    (inspectionApi.getInspections as any).mockResolvedValue({
      success: true,
      data: { items: sampleInspections },
    });

    const { unmount } = render(
      <MemoryRouter>
        <InspectionListPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: /schedule inspection/i })).toBeDefined();

    unmount();

    mockUserRole = 'Owner';
    render(
      <MemoryRouter>
        <InspectionListPage />
      </MemoryRouter>
    );

    await screen.findByText('Roof Water Seepage in Attic');
    expect(screen.queryByRole('button', { name: /schedule inspection/i })).toBeNull();
  });

  it('navigates to inspection detail page when clicking View button', async () => {
    (inspectionApi.getInspections as any).mockResolvedValue({
      success: true,
      data: { items: sampleInspections },
    });

    render(
      <MemoryRouter>
        <InspectionListPage />
      </MemoryRouter>
    );

    await screen.findByText('Roof Water Seepage in Attic');

    const viewBtns = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/inspections/insp-101-uuid');
  });
});
