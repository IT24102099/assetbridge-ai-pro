import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QuotationListPage from '../QuotationListPage';
import { quotationApi } from '../../../lib/api/quotationApi';
import { QuotationStatus } from '../../../types/quotation';

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
      id: 'usr-owner',
      fullName: 'Sunil Mendis',
      email: 'owner@assetbridge.lk',
      role: mockUserRole,
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../../lib/api/quotationApi', () => ({
  quotationApi: {
    getQuotations: vi.fn(),
  },
}));

const sampleQuotations = [
  {
    id: 'quot-001-uuid',
    incidentId: 'inc-001',
    incidentTitle: 'Water Pressure Drop in 4th Floor',
    providerBusinessName: 'Colombo HydroFix Ltd',
    providerRating: 4.8,
    totalAmount: 32500,
    taxAndOtherCharges: 1500,
    validUntilUtc: '2026-10-30T00:00:00Z',
    isExpired: false,
    status: QuotationStatus.Submitted,
    statusName: 'Submitted',
    items: [
      { id: 'item-1', description: 'Booster pump impeller replacement', quantity: 1, unitPrice: 28000, totalPrice: 28000 },
      { id: 'item-2', description: 'O-ring seals and gaskets', quantity: 2, unitPrice: 1500, totalPrice: 3000 },
    ],
  },
  {
    id: 'quot-002-uuid',
    incidentId: 'inc-001',
    incidentTitle: 'Water Pressure Drop in 4th Floor',
    providerBusinessName: 'QuickPipe Engineering',
    providerRating: 4.5,
    totalAmount: 36000,
    taxAndOtherCharges: 0,
    validUntilUtc: '2026-10-25T00:00:00Z',
    isExpired: false,
    status: QuotationStatus.UnderReview,
    statusName: 'UnderReview',
    items: [
      { id: 'item-3', description: 'Complete booster overhaul', quantity: 1, unitPrice: 36000, totalPrice: 36000 },
    ],
  },
];

describe('QuotationListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'Owner';
  });

  it('renders loading state while loading quotation records', () => {
    (quotationApi.getQuotations as any).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <QuotationListPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading quotation records\.\.\./i)).toBeDefined();
  });

  it('renders quotations table with contractor name, ratings, total LKR, and status badges', async () => {
    (quotationApi.getQuotations as any).mockResolvedValue({
      success: true,
      data: {
        items: sampleQuotations,
      },
    });

    render(
      <MemoryRouter>
        <QuotationListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Colombo HydroFix Ltd')).toBeDefined();
    expect(screen.getByText('QuickPipe Engineering')).toBeDefined();
    expect(screen.getByText('LKR 32,500.00')).toBeDefined();
    expect(screen.getByText('LKR 36,000.00')).toBeDefined();
    expect(screen.getByText('★ 4.8 rating')).toBeDefined();
  });

  it('filters quotations using search query', async () => {
    (quotationApi.getQuotations as any).mockResolvedValue({
      success: true,
      data: { items: sampleQuotations },
    });

    render(
      <MemoryRouter>
        <QuotationListPage />
      </MemoryRouter>
    );

    await screen.findByText('Colombo HydroFix Ltd');

    const searchInput = screen.getByPlaceholderText(/search by provider name, incident title, or quotation notes\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'QuickPipe' } });

    expect(screen.getByText('QuickPipe Engineering')).toBeDefined();
    expect(screen.queryByText('Colombo HydroFix Ltd')).toBeNull();
  });

  it('displays empty state when no quotations match criteria', async () => {
    (quotationApi.getQuotations as any).mockResolvedValue({
      success: true,
      data: { items: [] },
    });

    render(
      <MemoryRouter>
        <QuotationListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/no quotations found/i)).toBeDefined();
  });

  it('displays error state and retries fetching on user retry action', async () => {
    (quotationApi.getQuotations as any).mockRejectedValueOnce({
      response: { data: { message: 'Failed to connect to quotation service.' } },
    });

    render(
      <MemoryRouter>
        <QuotationListPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Failed to connect to quotation service.')).toBeDefined();

    (quotationApi.getQuotations as any).mockResolvedValueOnce({
      success: true,
      data: { items: sampleQuotations },
    });

    const retryBtn = screen.getByRole('button', { name: /retry request/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('Colombo HydroFix Ltd')).toBeDefined();
  });

  it('shows Compare Quotations button for Owner but hides for ServiceProvider', async () => {
    (quotationApi.getQuotations as any).mockResolvedValue({
      success: true,
      data: { items: sampleQuotations },
    });

    const { unmount } = render(
      <MemoryRouter>
        <QuotationListPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: /compare quotations/i })).toBeDefined();

    unmount();

    mockUserRole = 'ServiceProvider';
    render(
      <MemoryRouter>
        <QuotationListPage />
      </MemoryRouter>
    );

    await screen.findByText('Colombo HydroFix Ltd');
    expect(screen.queryByRole('button', { name: /compare quotations/i })).toBeNull();
  });

  it('navigates to quotation details when clicking View button', async () => {
    (quotationApi.getQuotations as any).mockResolvedValue({
      success: true,
      data: { items: sampleQuotations },
    });

    render(
      <MemoryRouter>
        <QuotationListPage />
      </MemoryRouter>
    );

    await screen.findByText('Colombo HydroFix Ltd');

    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    fireEvent.click(viewButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/quotations/quot-001-uuid');
  });
});
