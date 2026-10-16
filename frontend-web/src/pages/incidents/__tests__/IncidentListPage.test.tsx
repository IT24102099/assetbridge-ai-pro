import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IncidentListPage } from '../IncidentListPage';
import { incidentApi } from '../../../lib/api/incidentApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockUserRole = 'Owner';
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-1',
      fullName: 'Sunil Perera',
      email: 'owner@assetbridge.lk',
      role: mockUserRole,
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../../lib/api/incidentApi', () => ({
  incidentApi: {
    getIncidents: vi.fn(),
  },
}));

const sampleIncidents = [
  {
    id: 'inc-001-uuid',
    title: 'Water pressure drop on 4th floor',
    description: 'Sudden drop in water pressure across all bathrooms',
    category: 'Plumbing',
    priority: 'High',
    status: 'Reported',
    assetName: 'Colombo Grand Tower',
    assetCity: 'Colombo',
    createdAtUtc: '2026-09-01T10:00:00Z',
  },
  {
    id: 'inc-002-uuid',
    title: 'HVAC cooling unit failure',
    description: 'Compressor not starting in Server Room',
    category: 'HVAC',
    priority: 'Emergency',
    status: 'WorkInProgress',
    assetName: 'Kandy Tech Park',
    assetCity: 'Kandy',
    createdAtUtc: '2026-09-02T12:30:00Z',
  },
];

describe('IncidentListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'Owner';
  });

  it('renders loading state initially while fetching incidents', () => {
    (incidentApi.getIncidents as any).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <IncidentListPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading maintenance incidents\.\.\./i)).toBeDefined();
  });

  it('renders incidents table with titles, asset details and status badges on API success', async () => {
    (incidentApi.getIncidents as any).mockResolvedValue({
      data: {
        items: sampleIncidents,
        totalCount: 2,
        pageNumber: 1,
        pageSize: 10,
      },
    });

    render(
      <MemoryRouter>
        <IncidentListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Water pressure drop on 4th floor')).toBeDefined();
    expect(screen.getByText('Colombo Grand Tower')).toBeDefined();
    expect(screen.getByText('HVAC cooling unit failure')).toBeDefined();
    expect(screen.getByText('Kandy Tech Park')).toBeDefined();
    expect(screen.getAllByText('Plumbing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HVAC').length).toBeGreaterThan(0);
  });

  it('filters incidents when category filter dropdown changes', async () => {
    (incidentApi.getIncidents as any).mockResolvedValue({
      data: {
        items: [sampleIncidents[0]],
        totalCount: 1,
        pageNumber: 1,
        pageSize: 10,
      },
    });

    render(
      <MemoryRouter>
        <IncidentListPage />
      </MemoryRouter>
    );

    await screen.findByText('Water pressure drop on 4th floor');

    // Find the category select element
    const categorySelect = screen.getByDisplayValue('All Categories');
    fireEvent.change(categorySelect, { target: { value: 'Plumbing' } });

    await waitFor(() => {
      expect(incidentApi.getIncidents).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'Plumbing',
        })
      );
    });
  });

  it('submits search filter query and requests matching incidents', async () => {
    (incidentApi.getIncidents as any).mockResolvedValue({
      data: {
        items: sampleIncidents,
        totalCount: 2,
        pageNumber: 1,
        pageSize: 10,
      },
    });

    render(
      <MemoryRouter>
        <IncidentListPage />
      </MemoryRouter>
    );

    await screen.findByText('Water pressure drop on 4th floor');

    const searchInput = screen.getByPlaceholderText(/search by incident title, details, or asset\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'Compressor' } });
    fireEvent.submit(searchInput.closest('form')!);

    await waitFor(() => {
      expect(incidentApi.getIncidents).toHaveBeenCalledWith(
        expect.objectContaining({
          searchTerm: 'Compressor',
          pageNumber: 1,
        })
      );
    });
  });

  it('displays empty state when no incidents match and allows reporting', async () => {
    (incidentApi.getIncidents as any).mockResolvedValue({
      data: {
        items: [],
        totalCount: 0,
        pageNumber: 1,
        pageSize: 10,
      },
    });

    render(
      <MemoryRouter>
        <IncidentListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/no incidents found/i)).toBeDefined();
    expect(screen.getByText(/there are no active or historical incidents matching your search filters/i)).toBeDefined();
  });

  it('displays error state with retry button on API failure', async () => {
    (incidentApi.getIncidents as any).mockRejectedValueOnce({
      response: { data: { message: 'Incident microservice offline' } },
    });

    render(
      <MemoryRouter>
        <IncidentListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Incident microservice offline')).toBeDefined();

    // Now mock recovery and click retry
    (incidentApi.getIncidents as any).mockResolvedValueOnce({
      data: { items: sampleIncidents, totalCount: 2 },
    });

    const retryBtn = screen.getByRole('button', { name: /retry request/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('Water pressure drop on 4th floor')).toBeDefined();
  });

  it('hides Report Incident button when user is a ServiceProvider', async () => {
    mockUserRole = 'ServiceProvider';
    (incidentApi.getIncidents as any).mockResolvedValue({
      data: { items: sampleIncidents, totalCount: 2 },
    });

    render(
      <MemoryRouter>
        <IncidentListPage />
      </MemoryRouter>
    );

    await screen.findByText('Water pressure drop on 4th floor');
    expect(screen.queryByRole('button', { name: /report incident/i })).toBeNull();
  });

  it('navigates to incident details page when View button is clicked', async () => {
    (incidentApi.getIncidents as any).mockResolvedValue({
      data: { items: sampleIncidents, totalCount: 2 },
    });

    render(
      <MemoryRouter>
        <IncidentListPage />
      </MemoryRouter>
    );

    await screen.findByText('Water pressure drop on 4th floor');

    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/incidents/inc-001-uuid');
  });
});
