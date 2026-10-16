import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QuotationDetailPage from '../QuotationDetailPage';
import { quotationApi } from '../../../lib/api/quotationApi';
import { QuotationStatus } from '../../../types/quotation';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'quot-888-uuid' }),
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
    getQuotationById: vi.fn(),
    checkBudget: vi.fn(),
    updateQuotationStatus: vi.fn(),
  },
}));

const sampleQuotation = {
  id: 'quot-888-uuid',
  incidentId: 'inc-101',
  incidentTitle: 'Water Pressure Drop',
  providerBusinessName: 'Kandy Flow Mechanics',
  providerRating: 4.9,
  providerVerificationStatus: 'Verified',
  totalAmount: 54000,
  taxAndOtherCharges: 2500,
  validUntilUtc: '2026-10-31T00:00:00Z',
  isExpired: false,
  status: QuotationStatus.Submitted,
  statusName: 'Submitted',
  notes: 'All replacement parts carry a 1-year manufacturer warranty',
  items: [
    {
      id: 'item-1',
      description: 'Grundfos High-Pressure Pump Unit',
      quantity: 1,
      unitPrice: 45000,
      totalPrice: 45000,
    },
    {
      id: 'item-2',
      description: 'Plumbing installation & pressure testing labor',
      quantity: 1,
      unitPrice: 9000,
      totalPrice: 9000,
    },
  ],
};

const sampleBudgetCheck = {
  isWithinBudget: true,
  quotationAmount: 54000,
  allocatedBudget: 60000,
  difference: 6000,
  explanation: 'Bid is within pre-allocated incident budget cap',
};

describe('QuotationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'Owner';
  });

  it('renders loading state while fetching quotation details', () => {
    (quotationApi.getQuotationById as any).mockReturnValue(new Promise(() => {}));
    (quotationApi.checkBudget as any).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <QuotationDetailPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading contractor quotation\.\.\./i)).toBeDefined();
  });

  it('renders quotation header, contractor info, budget adherence and line items', async () => {
    (quotationApi.getQuotationById as any).mockResolvedValue({
      success: true,
      data: sampleQuotation,
    });
    (quotationApi.checkBudget as any).mockResolvedValue({
      success: true,
      data: sampleBudgetCheck,
    });

    render(
      <MemoryRouter>
        <QuotationDetailPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Kandy Flow Mechanics')).toBeDefined();
    expect(screen.getAllByText('LKR 54,000.00').length).toBeGreaterThan(0);
    expect(screen.getByText('★ 4.9 / 5.0')).toBeDefined();
    expect(screen.getByText('Within Budget')).toBeDefined();
    expect(screen.getByText(/bid is within pre-allocated incident budget cap/i)).toBeDefined();
    expect(screen.getByText('Grundfos High-Pressure Pump Unit')).toBeDefined();
    expect(screen.getByText('Plumbing installation & pressure testing labor')).toBeDefined();
    expect(screen.getByText(/all replacement parts carry a 1-year manufacturer warranty/i)).toBeDefined();
  });

  it('updates status from Submitted to UnderReview when clicking Mark Under Review', async () => {
    (quotationApi.getQuotationById as any).mockResolvedValue({
      success: true,
      data: sampleQuotation,
    });
    (quotationApi.checkBudget as any).mockResolvedValue({
      success: true,
      data: sampleBudgetCheck,
    });
    (quotationApi.updateQuotationStatus as any).mockResolvedValue({
      success: true,
      data: {
        ...sampleQuotation,
        status: QuotationStatus.UnderReview,
        statusName: 'UnderReview',
      },
    });

    render(
      <MemoryRouter>
        <QuotationDetailPage />
      </MemoryRouter>
    );

    const reviewBtn = await screen.findByRole('button', { name: /mark under review/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(quotationApi.updateQuotationStatus).toHaveBeenCalledWith('quot-888-uuid', {
        status: QuotationStatus.UnderReview,
      });
    });
  });

  it('updates status to Accepted when UnderReview quotation is accepted', async () => {
    (quotationApi.getQuotationById as any).mockResolvedValue({
      success: true,
      data: {
        ...sampleQuotation,
        status: QuotationStatus.UnderReview,
        statusName: 'UnderReview',
      },
    });
    (quotationApi.checkBudget as any).mockResolvedValue({
      success: true,
      data: sampleBudgetCheck,
    });
    (quotationApi.updateQuotationStatus as any).mockResolvedValue({
      success: true,
      data: {
        ...sampleQuotation,
        status: QuotationStatus.Accepted,
        statusName: 'Accepted',
      },
    });

    render(
      <MemoryRouter>
        <QuotationDetailPage />
      </MemoryRouter>
    );

    const acceptBtn = await screen.findByRole('button', { name: /accept quotation/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(quotationApi.updateQuotationStatus).toHaveBeenCalledWith('quot-888-uuid', {
        status: QuotationStatus.Accepted,
      });
    });
  });

  it('renders error state and retries fetching on failure', async () => {
    (quotationApi.getQuotationById as any).mockRejectedValueOnce({
      response: { data: { message: 'Quotation server timeout' } },
    });

    render(
      <MemoryRouter>
        <QuotationDetailPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Quotation server timeout')).toBeDefined();

    (quotationApi.getQuotationById as any).mockResolvedValueOnce({
      success: true,
      data: sampleQuotation,
    });

    const retryBtn = screen.getByRole('button', { name: /retry request/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('Kandy Flow Mechanics')).toBeDefined();
  });

  it('navigates back to quotations on back button click', async () => {
    (quotationApi.getQuotationById as any).mockResolvedValue({
      success: true,
      data: sampleQuotation,
    });
    (quotationApi.checkBudget as any).mockResolvedValue({
      success: true,
      data: sampleBudgetCheck,
    });

    render(
      <MemoryRouter>
        <QuotationDetailPage />
      </MemoryRouter>
    );

    const backBtn = await screen.findByRole('button', { name: /back to quotations/i });
    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/quotations');
  });
});
