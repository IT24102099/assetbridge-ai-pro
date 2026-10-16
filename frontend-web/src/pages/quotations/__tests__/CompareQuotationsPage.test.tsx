import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CompareQuotationsPage from '../CompareQuotationsPage';
import { quotationApi } from '../../../lib/api/quotationApi';
import { incidentApi } from '../../../lib/api/incidentApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('incidentId=inc-444'), vi.fn()],
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
    compareQuotations: vi.fn(),
    acceptQuotation: vi.fn(),
  },
}));

vi.mock('../../../lib/api/incidentApi', () => ({
  incidentApi: {
    getIncidents: vi.fn(),
  },
}));

vi.mock('../../../lib/api/providerApi', () => ({
  providerApi: {
    getProviders: vi.fn(),
  },
}));

const sampleComparisonResult = {
  incidentId: 'inc-444',
  incidentTitle: 'Master Bathroom Ceiling Water Leak',
  recommendedQuotationId: 'quot-A',
  recommendationReason: 'Lowest total cost with highest contractor rating and 1-year warranty.',
  lowestQuotationAmount: 42000,
  quotationsEvaluatedCount: 2,
  candidates: [
    {
      quotationId: 'quot-A',
      providerBusinessName: 'Apex Hydro Solutions',
      providerRating: 4.9,
      totalAmount: 42000,
      comparisonScore: 95.5,
      comparisonReasons: ['Lowest total cost', '1-year warranty included'],
      highlights: ['Top customer reviews'],
      warrantyMonths: 12,
      estimatedDurationDays: 2,
      isRecommended: true,
      isLowestCost: true,
      isWithinBudget: true,
      differenceFromLowest: 0,
      items: [{ description: 'PPR pipe replacement', quantity: 2, unitPrice: 21000, totalPrice: 42000 }],
    },
    {
      quotationId: 'quot-B',
      providerBusinessName: 'QuickFix Plumbing LK',
      providerRating: 4.4,
      totalAmount: 48000,
      comparisonScore: 82.0,
      comparisonReasons: ['Faster dispatch'],
      highlights: ['Local trade partner'],
      warrantyMonths: 6,
      estimatedDurationDays: 3,
      isRecommended: false,
      isLowestCost: false,
      isWithinBudget: true,
      differenceFromLowest: 6000,
      items: [{ description: 'PPR pipe replacement', quantity: 2, unitPrice: 24000, totalPrice: 48000 }],
    },
  ],
};

describe('CompareQuotationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'Owner';
  });

  it('restricts access for ServiceProvider and shows Quotation Comparison Restricted notice', () => {
    mockUserRole = 'ServiceProvider';

    render(
      <MemoryRouter>
        <CompareQuotationsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/quotation comparison restricted/i)).toBeDefined();
    expect(
      screen.getByText(/in accordance with assetbridge procurement governance/i)
    ).toBeDefined();
  });

  it('renders comparative candidate quotes side-by-side with AI recommendation for Owner', async () => {
    (incidentApi.getIncidents as any).mockResolvedValue({
      success: true,
      data: {
        items: [{ id: 'inc-444', title: 'Master Bathroom Ceiling Water Leak' }],
      },
    });
    (quotationApi.getQuotations as any).mockResolvedValue({
      success: true,
      data: {
        items: [{ incidentId: 'inc-444' }],
      },
    });
    (quotationApi.compareQuotations as any).mockResolvedValue({
      success: true,
      data: sampleComparisonResult,
    });

    render(
      <MemoryRouter>
        <CompareQuotationsPage />
      </MemoryRouter>
    );

    const apexElements = await screen.findAllByText(/apex hydro solutions/i);
    expect(apexElements.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/quickfix plumbing lk/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/42,000\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/48,000\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/lowest total cost/i).length).toBeGreaterThan(0);
  });

  it('renders error state and retries comparison when API fails', async () => {
    (incidentApi.getIncidents as any).mockResolvedValue({
      success: true,
      data: {
        items: [{ id: 'inc-444', title: 'Master Bathroom Ceiling Water Leak' }],
      },
    });
    (quotationApi.getQuotations as any).mockResolvedValue({
      success: true,
      data: { items: [] },
    });
    (quotationApi.compareQuotations as any).mockRejectedValueOnce({
      response: { data: { message: 'Comparison engine busy' } },
    });

    render(
      <MemoryRouter>
        <CompareQuotationsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Comparison engine busy')).toBeDefined();

    (quotationApi.compareQuotations as any).mockResolvedValueOnce({
      success: true,
      data: sampleComparisonResult,
    });

    const retryBtn = screen.getByRole('button', { name: /retry request/i });
    fireEvent.click(retryBtn);

    const apexElements = await screen.findAllByText(/apex hydro solutions/i);
    expect(apexElements.length).toBeGreaterThan(0);
  });
});
