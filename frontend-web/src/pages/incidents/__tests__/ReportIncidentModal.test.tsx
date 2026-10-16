import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportIncidentModal } from '../ReportIncidentModal';
import { assetApi } from '../../../lib/api/assetApi';
import { incidentApi } from '../../../lib/api/incidentApi';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      fullName: 'Test Owner',
      email: 'owner@assetbridge.lk',
      role: 'Owner',
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../../lib/api/assetApi', () => ({
  assetApi: {
    getAssets: vi.fn(),
  },
}));

vi.mock('../../../lib/api/incidentApi', () => ({
  incidentApi: {
    createIncident: vi.fn(),
    uploadEvidence: vi.fn(),
  },
}));

describe('ReportIncidentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 4 priority level buttons (Low, Medium, High, Emergency) visibly and with accessible radio semantics', async () => {
    (assetApi.getAssets as any).mockResolvedValue({
      data: {
        items: [
          {
            id: 'asset-1',
            name: 'Villa Colombo',
            city: 'Colombo',
            district: 'Colombo',
            propertyTypeName: 'Residential',
          },
        ],
      },
    });

    render(
      <ReportIncidentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Verify all 4 priority buttons are rendered
    const lowBtn = await screen.findByRole('radio', { name: /low/i });
    const medBtn = screen.getByRole('radio', { name: /medium/i });
    const highBtn = screen.getByRole('radio', { name: /high/i });
    const emergencyBtn = screen.getByRole('radio', { name: /emergency/i });

    expect(lowBtn).toBeDefined();
    expect(medBtn).toBeDefined();
    expect(highBtn).toBeDefined();
    expect(emergencyBtn).toBeDefined();

    // Default priority should be 'Medium'
    expect(medBtn.getAttribute('aria-checked')).toBe('true');
    expect(emergencyBtn.getAttribute('aria-checked')).toBe('false');

    // Click 'Emergency'
    fireEvent.click(emergencyBtn);
    expect(emergencyBtn.getAttribute('aria-checked')).toBe('true');
    expect(medBtn.getAttribute('aria-checked')).toBe('false');
  });

  it('renders script-like asset names safely as plain text without executing or injecting HTML elements', async () => {
    const maliciousAssetName = '<script>window.XSS_TRIGGERED = true;</script> Luxury Penthouse';

    (assetApi.getAssets as any).mockResolvedValue({
      data: {
        items: [
          {
            id: 'asset-xss',
            name: maliciousAssetName,
            city: 'Kandy',
            district: 'Kandy',
            propertyTypeName: 'Commercial',
          },
        ],
      },
    });

    const { container } = render(
      <ReportIncidentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Wait for asset dropdown to populate
    await waitFor(() => {
      const select = container.querySelector('#incident-asset-select') as HTMLSelectElement;
      expect(select).not.toBeNull();
      expect(select.options.length).toBeGreaterThan(0);
    });

    // Verify no executable <script> elements were created inside the document body or modal
    const scripts = container.querySelectorAll('script');
    expect(scripts.length).toBe(0);
    expect((window as any).XSS_TRIGGERED).toBeUndefined();

    // Verify option contains the text literally without HTML parsing
    const select = container.querySelector('#incident-asset-select') as HTMLSelectElement;
    const option = select.querySelector('option[value="asset-xss"]') as HTMLOptionElement;
    expect(option).not.toBeNull();
    expect(option.textContent).toContain('<script>window.XSS_TRIGGERED = true;</script>');
  });

  it('validates required fields and shows error when title or description is missing', async () => {
    (assetApi.getAssets as any).mockResolvedValue({
      data: {
        items: [{ id: 'asset-1', name: 'Lotus Tower Suite', city: 'Colombo', district: 'Colombo' }],
      },
    });

    render(
      <ReportIncidentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await screen.findByRole('option', { name: /lotus tower suite/i });

    const submitBtn = screen.getByRole('button', { name: /^submit incident$/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(await screen.findByText(/please fill in the incident title and description/i)).toBeDefined();
    expect(incidentApi.createIncident).not.toHaveBeenCalled();
  });

  it('validates budget and rejects values less than or equal to 0', async () => {
    (assetApi.getAssets as any).mockResolvedValue({
      data: {
        items: [{ id: 'asset-1', name: 'Lotus Tower Suite', city: 'Colombo', district: 'Colombo' }],
      },
    });

    render(
      <ReportIncidentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await screen.findByRole('option', { name: /lotus tower suite/i });

    fireEvent.change(screen.getByPlaceholderText(/severe water leakage/i), {
      target: { value: 'Pipe Leak' },
    });
    fireEvent.change(screen.getByPlaceholderText(/describe the issue/i), {
      target: { value: 'Severe water leak under sink' },
    });
    fireEvent.change(screen.getByPlaceholderText(/optional budget cap/i), {
      target: { value: '-500' },
    });

    const submitBtn = screen.getByRole('button', { name: /^submit incident$/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(await screen.findByText(/estimated budget in lkr must be greater than zero/i)).toBeDefined();
    expect(incidentApi.createIncident).not.toHaveBeenCalled();
  });

  it('handles API submission errors gracefully by displaying error banner', async () => {
    (assetApi.getAssets as any).mockResolvedValue({
      data: {
        items: [{ id: 'asset-1', name: 'Lotus Tower Suite', city: 'Colombo', district: 'Colombo' }],
      },
    });
    (incidentApi.createIncident as any).mockRejectedValue({
      response: { data: { message: 'Failed to create incident: Database unreachable' } },
    });

    render(
      <ReportIncidentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await screen.findByRole('radio', { name: /low/i });

    fireEvent.change(screen.getByPlaceholderText(/severe water leakage/i), {
      target: { value: 'Electrical sparking' },
    });
    fireEvent.change(screen.getByPlaceholderText(/describe the issue/i), {
      target: { value: 'Sparking from main distribution board' },
    });

    const submitBtn = screen.getByRole('button', { name: /^submit incident$/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/failed to create incident: database unreachable/i)).toBeDefined();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('submits valid incident data and triggers onSuccess callback', async () => {
    (assetApi.getAssets as any).mockResolvedValue({
      data: {
        items: [{ id: 'asset-1', name: 'Lotus Tower Suite', city: 'Colombo', district: 'Colombo' }],
      },
    });
    (incidentApi.createIncident as any).mockResolvedValue({
      data: { id: 'inc-1234', title: 'Electrical sparking' },
    });

    render(
      <ReportIncidentModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await screen.findByRole('radio', { name: /low/i });

    fireEvent.change(screen.getByPlaceholderText(/severe water leakage/i), {
      target: { value: 'Electrical sparking' },
    });
    fireEvent.change(screen.getByPlaceholderText(/describe the issue/i), {
      target: { value: 'Sparking from main distribution board' },
    });

    const submitBtn = screen.getByRole('button', { name: /^submit incident$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(incidentApi.createIncident).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: 'asset-1',
          title: 'Electrical sparking',
          description: 'Sparking from main distribution board',
          category: 'Plumbing',
          priority: 'Medium',
        })
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
