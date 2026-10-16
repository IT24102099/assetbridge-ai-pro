import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiProposalReviewPage from '../AiProposalReviewPage';
import { workflowApi } from '../../../lib/api/workflowApi';
import { incidentApi } from '../../../lib/api/incidentApi';
import { quotationApi } from '../../../lib/api/quotationApi';
import { inspectionApi } from '../../../lib/api/inspectionApi';
import { WorkflowState } from '../../../types/workflow';
import { IncidentPriority, IncidentStatus } from '../../../types/incident';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'wf-111-proposal' }),
  };
});

let mockCurrentUser = {
  id: 'usr-manager-1',
  fullName: 'Kamal Manager',
  role: 'Manager',
};

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isAuthenticated: true,
  }),
}));

vi.mock('../../../lib/api/workflowApi', () => ({
  workflowApi: {
    getWorkflowById: vi.fn(),
    approveWorkflow: vi.fn(),
    rejectWorkflow: vi.fn(),
    requestRevision: vi.fn(),
  },
}));

vi.mock('../../../lib/api/incidentApi', () => ({
  incidentApi: {
    getIncidentById: vi.fn(),
  },
}));

vi.mock('../../../lib/api/quotationApi', () => ({
  quotationApi: {
    getQuotations: vi.fn(),
  },
}));

vi.mock('../../../lib/api/inspectionApi', () => ({
  inspectionApi: {
    getInspections: vi.fn(),
  },
}));

const sampleWorkflow = {
  id: 'wf-111-proposal',
  incidentId: 'inc-101',
  incidentTitle: 'HVAC Compressor Breakdown',
  assetId: 'ast-01',
  assetName: 'Access Towers Level 4',
  currentState: WorkflowState.AwaitingApproval,
  currentStateName: 'AwaitingApproval',
  createdAtUtc: '2026-03-10T10:00:00Z',
};

const sampleIncident = {
  id: 'inc-101',
  title: 'HVAC Compressor Breakdown',
  description: 'Main chiller compressor failed causing temperature alert in server room.',
  priority: 'High' as IncidentPriority,
  priorityName: 'High',
  status: 'Reported' as IncidentStatus,
  statusName: 'Reported',
  estimatedBudget: 85000,
  assetId: 'ast-01',
  assetName: 'Access Towers Level 4',
  createdAtUtc: '2026-03-10T08:00:00Z',
};

const sampleQuotation = {
  id: 'quot-777',
  incidentId: 'inc-101',
  providerId: 'prv-cooltech',
  providerBusinessName: 'CoolTech HVAC Solutions',
  totalAmount: 78500,
  status: 1,
  statusName: 'Submitted',
  itemizedCostSummary: 'Compressor pump replacement & refrigerant top-up',
  estimatedDurationDays: 3,
  validUntilUtc: '2026-03-30T00:00:00Z',
  createdAtUtc: '2026-03-11T12:00:00Z',
};

const sampleInspection = {
  id: 'insp-555',
  incidentId: 'inc-101',
  inspectorName: 'Eng. Sunil Perera',
  scheduledDate: '2026-03-10T14:00:00Z',
  completedDate: '2026-03-10T16:00:00Z',
  summary: 'Thermal overload tripped internal seals.',
  status: 3,
  statusName: 'Completed',
  findings: [
    {
      id: 'f-1',
      description: 'Compressor bearing seized due to lubricant starvation',
      severity: 3,
      recommendation: 'Replace core assembly under manufacturer specs',
    },
  ],
};

describe('AiProposalReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = {
      id: 'usr-manager-1',
      fullName: 'Kamal Manager',
      role: 'Manager',
    };
  });

  it('renders loading state while synthesizing proposal details', () => {
    (workflowApi.getWorkflowById as any).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <AiProposalReviewPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/synthesizing multi-agent proposal & policy checks\.\.\./i)).toBeDefined();
  });

  it('renders proposal overview, incident context, and recommended contractor', async () => {
    (workflowApi.getWorkflowById as any).mockResolvedValue({ success: true, data: sampleWorkflow });
    (incidentApi.getIncidentById as any).mockResolvedValue({ success: true, data: sampleIncident });
    (quotationApi.getQuotations as any).mockResolvedValue({
      success: true,
      data: { items: [sampleQuotation], totalCount: 1, page: 1, pageSize: 5 },
    });
    (inspectionApi.getInspections as any).mockResolvedValue({
      success: true,
      data: { items: [sampleInspection], totalCount: 1, page: 1, pageSize: 5 },
    });

    render(
      <MemoryRouter>
        <AiProposalReviewPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('AI Maintenance Proposal Review')).toBeDefined();
    expect(screen.getAllByText(/Access Towers Level 4/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Recommended Contractor: CoolTech HVAC Solutions/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /approve proposal/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /request revision/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /reject/i })).toBeDefined();
  });

  it('submits approval decision and navigates back to workflow', async () => {
    (workflowApi.getWorkflowById as any).mockResolvedValue({ success: true, data: sampleWorkflow });
    (incidentApi.getIncidentById as any).mockResolvedValue({ success: true, data: sampleIncident });
    (quotationApi.getQuotations as any).mockResolvedValue({
      success: true,
      data: { items: [sampleQuotation], totalCount: 1, page: 1, pageSize: 5 },
    });
    (inspectionApi.getInspections as any).mockResolvedValue({
      success: true,
      data: { items: [sampleInspection], totalCount: 1, page: 1, pageSize: 5 },
    });
    (workflowApi.approveWorkflow as any).mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <AiProposalReviewPage />
      </MemoryRouter>
    );

    await screen.findByText('AI Maintenance Proposal Review');

    const approveBtn = screen.getByRole('button', { name: /approve proposal/i });
    fireEvent.click(approveBtn);

    expect(screen.getByText(/confirm proposal approval/i)).toBeDefined();

    const confirmBtn = screen.getByRole('button', { name: /submit decision/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(workflowApi.approveWorkflow).toHaveBeenCalledWith('wf-111-proposal', {
        decisionReason: 'Proposal verified against budget threshold and technical inspection findings.',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/workflows/wf-111-proposal');
    });
  });

  it('validates revision comment when requesting revision', async () => {
    (workflowApi.getWorkflowById as any).mockResolvedValue({ success: true, data: sampleWorkflow });
    (incidentApi.getIncidentById as any).mockResolvedValue({ success: true, data: sampleIncident });
    (quotationApi.getQuotations as any).mockResolvedValue({
      success: true,
      data: { items: [sampleQuotation], totalCount: 1, page: 1, pageSize: 5 },
    });
    (inspectionApi.getInspections as any).mockResolvedValue({
      success: true,
      data: { items: [sampleInspection], totalCount: 1, page: 1, pageSize: 5 },
    });
    (workflowApi.requestRevision as any).mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <AiProposalReviewPage />
      </MemoryRouter>
    );

    await screen.findByText('AI Maintenance Proposal Review');

    const revisionBtn = screen.getByRole('button', { name: /request revision/i });
    fireEvent.click(revisionBtn);

    expect(screen.getByText(/request quotation \/ scope revision/i)).toBeDefined();

    // Type reason only
    const reasonInput = screen.getByPlaceholderText(/provide rationale for the record\.\.\./i);
    fireEvent.change(reasonInput, { target: { value: 'Labor component is too high' } });

    // Submit without revision comment
    const confirmBtn = screen.getByRole('button', { name: /submit decision/i });
    fireEvent.click(confirmBtn);

    expect(await screen.findByText(/please specify the exact revision requested/i)).toBeDefined();
    expect(workflowApi.requestRevision).not.toHaveBeenCalled();

    // Now fill revision comment
    const revisionInput = screen.getByPlaceholderText(/specify what needs to be changed\.\.\./i);
    fireEvent.change(revisionInput, { target: { value: 'Seek 15% discount on labor fees' } });

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(workflowApi.requestRevision).toHaveBeenCalledWith('wf-111-proposal', {
        decisionReason: 'Labor component is too high',
        revisionComment: 'Seek 15% discount on labor fees',
      });
    });
  });

  it('submits rejection decision with reason', async () => {
    (workflowApi.getWorkflowById as any).mockResolvedValue({ success: true, data: sampleWorkflow });
    (incidentApi.getIncidentById as any).mockResolvedValue({ success: true, data: sampleIncident });
    (quotationApi.getQuotations as any).mockResolvedValue({
      success: true,
      data: { items: [sampleQuotation], totalCount: 1, page: 1, pageSize: 5 },
    });
    (inspectionApi.getInspections as any).mockResolvedValue({
      success: true,
      data: { items: [sampleInspection], totalCount: 1, page: 1, pageSize: 5 },
    });
    (workflowApi.rejectWorkflow as any).mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <AiProposalReviewPage />
      </MemoryRouter>
    );

    await screen.findByText('AI Maintenance Proposal Review');

    const rejectBtn = screen.getByRole('button', { name: /reject/i });
    fireEvent.click(rejectBtn);

    expect(screen.getByText(/reject proposal/i)).toBeDefined();

    const reasonInput = screen.getByPlaceholderText(/provide rationale for the record\.\.\./i);
    fireEvent.change(reasonInput, { target: { value: 'Asset scheduled for complete decommissioning next month' } });

    const confirmBtn = screen.getByRole('button', { name: /submit decision/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(workflowApi.rejectWorkflow).toHaveBeenCalledWith('wf-111-proposal', {
        decisionReason: 'Asset scheduled for complete decommissioning next month',
      });
    });
  });

  it('hides governance actions for Owner role', async () => {
    mockCurrentUser = {
      id: 'usr-owner-2',
      fullName: 'Sunil Owner',
      role: 'Owner',
    };

    (workflowApi.getWorkflowById as any).mockResolvedValue({ success: true, data: sampleWorkflow });
    (incidentApi.getIncidentById as any).mockResolvedValue({ success: true, data: sampleIncident });
    (quotationApi.getQuotations as any).mockResolvedValue({
      success: true,
      data: { items: [sampleQuotation], totalCount: 1, page: 1, pageSize: 5 },
    });
    (inspectionApi.getInspections as any).mockResolvedValue({
      success: true,
      data: { items: [sampleInspection], totalCount: 1, page: 1, pageSize: 5 },
    });

    render(
      <MemoryRouter>
        <AiProposalReviewPage />
      </MemoryRouter>
    );

    await screen.findByText('AI Maintenance Proposal Review');

    expect(screen.queryByRole('button', { name: /approve proposal/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /request revision/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /reject/i })).toBeNull();
  });

  it('renders error state and handles retry on API failure', async () => {
    (workflowApi.getWorkflowById as any).mockRejectedValueOnce({
      response: { data: { message: 'Proposal synthesis failed' } },
    });

    render(
      <MemoryRouter>
        <AiProposalReviewPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Proposal synthesis failed')).toBeDefined();

    (workflowApi.getWorkflowById as any).mockResolvedValueOnce({ success: true, data: sampleWorkflow });
    (incidentApi.getIncidentById as any).mockResolvedValueOnce({ success: true, data: sampleIncident });
    (quotationApi.getQuotations as any).mockResolvedValueOnce({
      success: true,
      data: { items: [sampleQuotation], totalCount: 1, page: 1, pageSize: 5 },
    });
    (inspectionApi.getInspections as any).mockResolvedValueOnce({
      success: true,
      data: { items: [sampleInspection], totalCount: 1, page: 1, pageSize: 5 },
    });

    const retryBtn = screen.getByRole('button', { name: /retry request/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('AI Maintenance Proposal Review')).toBeDefined();
  });
});
