import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkflowDetailPage from '../WorkflowDetailPage';
import { workflowApi } from '../../../lib/api/workflowApi';
import { WorkflowState } from '../../../types/workflow';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'wf-999-uuid' }),
  };
});

let mockUserRole = 'Manager';
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-mgr',
      fullName: 'Kamal Manager',
      email: 'manager@assetbridge.lk',
      role: mockUserRole,
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../../lib/api/workflowApi', () => ({
  workflowApi: {
    getWorkflowById: vi.fn(),
    getWorkflowTimeline: vi.fn(),
    getAgentRuns: vi.fn(),
    getWorkflowFollowUps: vi.fn(),
    getAiAssistance: vi.fn(),
    askWorkflowAgent: vi.fn(),
    approveWorkflow: vi.fn(),
    rejectWorkflow: vi.fn(),
    requestRevision: vi.fn(),
    transitionWorkflow: vi.fn(),
  },
}));

vi.mock('../../../lib/api/aiApi', () => ({
  aiApi: {
    orchestrateWorkflow: vi.fn(),
  },
}));

const sampleWorkflow = {
  id: 'wf-999-uuid',
  incidentId: 'inc-101',
  incidentTitle: 'Chilled Water Pipe Rupture',
  assetId: 'ast-001',
  assetName: 'Orion City Colombo',
  currentState: WorkflowState.AwaitingApproval,
  currentStateName: 'AwaitingApproval',
  correlationId: 'corr-99998888',
  createdAtUtc: '2026-09-18T10:00:00Z',
  updatedAtUtc: '2026-09-18T10:15:00Z',
  createdByUserName: 'Manager Kamal',
  stepsCount: 6,
  pendingApprovalsCount: 1,
  steps: [
    {
      id: 'step-1',
      stepNumber: 1,
      name: 'Incident AI Triage',
      status: 2,
      statusName: 'Completed',
      agentRole: 'IncidentPlanningAgent',
      startedAtUtc: '2026-09-18T10:01:00Z',
      completedAtUtc: '2026-09-18T10:02:00Z',
    },
  ],
  approvals: [
    {
      id: 'appr-1',
      stepId: 'step-5',
      requiredRole: 'Manager',
      status: 1,
      statusName: 'Pending',
      requestedAtUtc: '2026-09-18T10:15:00Z',
    },
  ],
};

const sampleTimeline = {
  workflowId: 'wf-999-uuid',
  incidentTitle: 'Chilled Water Pipe Rupture',
  currentState: WorkflowState.AwaitingApproval,
  currentStateName: 'AwaitingApproval',
  states: [
    {
      state: WorkflowState.Created,
      stateName: 'Created',
      label: '1. Incident Registered',
      description: 'Incident verified',
      isCompleted: true,
      isCurrent: false,
      isPending: false,
      timestampUtc: '2026-09-18T10:00:00Z',
    },
    {
      state: WorkflowState.AwaitingApproval,
      stateName: 'AwaitingApproval',
      label: '7. Manager Review & Governance Sign-off',
      description: 'Manager approval required',
      isCompleted: false,
      isCurrent: true,
      isPending: false,
      timestampUtc: '2026-09-18T10:15:00Z',
    },
  ],
};

const sampleAgentRuns = [
  {
    id: 'run-1',
    agentName: 'ContractorMatchingAgent',
    agentRole: 'Specialist Matcher',
    status: 'Completed',
    startedAtUtc: '2026-09-18T10:05:00Z',
    completedAtUtc: '2026-09-18T10:06:00Z',
    durationMs: 1250,
    modelUsed: 'gemini-1.5-pro',
    outputSummary: 'Evaluated 3 certified HVAC plumbing contractors with 95% match.',
  },
];

describe('WorkflowDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'Manager';
  });

  it('renders loading state while loading workflow instance details', () => {
    (workflowApi.getWorkflowById as any).mockReturnValue(new Promise(() => {}));
    (workflowApi.getWorkflowTimeline as any).mockReturnValue(new Promise(() => {}));
    (workflowApi.getAgentRuns as any).mockReturnValue(new Promise(() => {}));
    (workflowApi.getWorkflowFollowUps as any).mockReturnValue(new Promise(() => {}));
    (workflowApi.getAiAssistance as any).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <WorkflowDetailPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading workflow telemetry and timeline/i)).toBeDefined();
  });

  it('renders workflow header, property asset, correlation ID, and 15-state timeline', async () => {
    (workflowApi.getWorkflowById as any).mockResolvedValue({ success: true, data: sampleWorkflow });
    (workflowApi.getWorkflowTimeline as any).mockResolvedValue({ success: true, data: sampleTimeline });
    (workflowApi.getAgentRuns as any).mockResolvedValue({ success: true, data: sampleAgentRuns });
    (workflowApi.getWorkflowFollowUps as any).mockResolvedValue({ success: true, data: [] });
    (workflowApi.getAiAssistance as any).mockResolvedValue({ success: true, data: null });

    render(
      <MemoryRouter>
        <WorkflowDetailPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Chilled Water Pipe Rupture')).toBeDefined();
    expect(screen.getByText(/orion city colombo/i)).toBeDefined();
    expect(screen.getByText(/corr-99998888/i)).toBeDefined();
    expect(screen.getByText('Incident Logged')).toBeDefined();
    expect(screen.getByText('Human Approval')).toBeDefined();
  });

  it('approves proposal via human governance modal and submits reason', async () => {
    (workflowApi.getWorkflowById as any).mockResolvedValue({ success: true, data: sampleWorkflow });
    (workflowApi.getWorkflowTimeline as any).mockResolvedValue({ success: true, data: sampleTimeline });
    (workflowApi.getAgentRuns as any).mockResolvedValue({ success: true, data: sampleAgentRuns });
    (workflowApi.getWorkflowFollowUps as any).mockResolvedValue({ success: true, data: [] });
    (workflowApi.getAiAssistance as any).mockResolvedValue({ success: true, data: null });
    (workflowApi.approveWorkflow as any).mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <WorkflowDetailPage />
      </MemoryRouter>
    );

    await screen.findByText('Chilled Water Pipe Rupture');

    // Click Approve button in toolbar or governance section
    const approveBtn = screen.getByRole('button', { name: /^approve$/i });
    fireEvent.click(approveBtn);

    // Modal opens
    expect(screen.getByText(/Approve Maintenance Proposal/i)).toBeDefined();

    // Type reason
    const reasonInput = screen.getByPlaceholderText(/proposal verified against portfolio budget/i);
    fireEvent.change(reasonInput, { target: { value: 'Approved within contingency budget threshold' } });

    // Submit modal
    const confirmBtn = screen.getByRole('button', { name: /confirm decision/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(workflowApi.approveWorkflow).toHaveBeenCalledWith('wf-999-uuid', {
        decisionReason: 'Approved within contingency budget threshold',
      });
    });
  });

  it('rejects proposal via human governance modal and submits reason', async () => {
    (workflowApi.getWorkflowById as any).mockResolvedValue({ success: true, data: sampleWorkflow });
    (workflowApi.getWorkflowTimeline as any).mockResolvedValue({ success: true, data: sampleTimeline });
    (workflowApi.getAgentRuns as any).mockResolvedValue({ success: true, data: sampleAgentRuns });
    (workflowApi.getWorkflowFollowUps as any).mockResolvedValue({ success: true, data: [] });
    (workflowApi.getAiAssistance as any).mockResolvedValue({ success: true, data: null });
    (workflowApi.rejectWorkflow as any).mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <WorkflowDetailPage />
      </MemoryRouter>
    );

    await screen.findByText('Chilled Water Pipe Rupture');

    const rejectBtn = screen.getByRole('button', { name: /^reject$/i });
    fireEvent.click(rejectBtn);

    expect(screen.getByText(/Reject Maintenance Proposal/i)).toBeDefined();

    const reasonInput = screen.getByPlaceholderText(/quotation exceeds approved threshold/i);
    fireEvent.change(reasonInput, { target: { value: 'Cost exceeds permissible limit' } });

    const confirmBtn = screen.getByRole('button', { name: /confirm decision/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(workflowApi.rejectWorkflow).toHaveBeenCalledWith('wf-999-uuid', {
        decisionReason: 'Cost exceeds permissible limit',
      });
    });
  });

  it('validates revision comment when requesting proposal revision', async () => {
    (workflowApi.getWorkflowById as any).mockResolvedValue({ success: true, data: sampleWorkflow });
    (workflowApi.getWorkflowTimeline as any).mockResolvedValue({ success: true, data: sampleTimeline });
    (workflowApi.getAgentRuns as any).mockResolvedValue({ success: true, data: sampleAgentRuns });
    (workflowApi.getWorkflowFollowUps as any).mockResolvedValue({ success: true, data: [] });
    (workflowApi.getAiAssistance as any).mockResolvedValue({ success: true, data: null });

    render(
      <MemoryRouter>
        <WorkflowDetailPage />
      </MemoryRouter>
    );

    await screen.findByText('Chilled Water Pipe Rupture');

    const revisionBtn = screen.getByRole('button', { name: /request changes/i });
    fireEvent.click(revisionBtn);

    expect(screen.getByText(/Request Proposal Revision/i)).toBeDefined();

    // Provide reason but leave revisionComment empty
    const reasonInput = screen.getByPlaceholderText(/quotation exceeds approved threshold/i);
    fireEvent.change(reasonInput, { target: { value: 'Need better parts pricing' } });

    const confirmBtn = screen.getByRole('button', { name: /confirm decision/i });
    fireEvent.click(confirmBtn);

    expect(await screen.findByText(/please specify the exact revision requested/i)).toBeDefined();
    expect(workflowApi.requestRevision).not.toHaveBeenCalled();
  });

  it('switches to Agent Runs tab and displays execution telemetry', async () => {
    (workflowApi.getWorkflowById as any).mockResolvedValue({ success: true, data: sampleWorkflow });
    (workflowApi.getWorkflowTimeline as any).mockResolvedValue({ success: true, data: sampleTimeline });
    (workflowApi.getAgentRuns as any).mockResolvedValue({ success: true, data: sampleAgentRuns });
    (workflowApi.getWorkflowFollowUps as any).mockResolvedValue({ success: true, data: [] });
    (workflowApi.getAiAssistance as any).mockResolvedValue({ success: true, data: null });

    render(
      <MemoryRouter>
        <WorkflowDetailPage />
      </MemoryRouter>
    );

    await screen.findByText('Chilled Water Pipe Rupture');

    const agentsTab = screen.getByRole('button', { name: /agent runs/i });
    fireEvent.click(agentsTab);

    expect(await screen.findByText('ContractorMatchingAgent')).toBeDefined();
    expect(screen.getByText(/evaluated 3 certified hvac plumbing contractors/i)).toBeDefined();
    expect(screen.getByText(/1250ms/i)).toBeDefined();
  });

  it('renders error state and retries on failure', async () => {
    (workflowApi.getWorkflowById as any).mockRejectedValueOnce({
      response: { data: { message: 'Workflow record unavailable' } },
    });
    (workflowApi.getWorkflowTimeline as any).mockResolvedValueOnce({ success: false });
    (workflowApi.getAgentRuns as any).mockResolvedValueOnce({ success: false });
    (workflowApi.getWorkflowFollowUps as any).mockResolvedValueOnce({ success: false });
    (workflowApi.getAiAssistance as any).mockResolvedValueOnce(null);

    render(
      <MemoryRouter>
        <WorkflowDetailPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Workflow record unavailable')).toBeDefined();

    (workflowApi.getWorkflowById as any).mockResolvedValueOnce({ success: true, data: sampleWorkflow });
    (workflowApi.getWorkflowTimeline as any).mockResolvedValueOnce({ success: true, data: sampleTimeline });
    (workflowApi.getAgentRuns as any).mockResolvedValueOnce({ success: true, data: sampleAgentRuns });
    (workflowApi.getWorkflowFollowUps as any).mockResolvedValueOnce({ success: true, data: [] });
    (workflowApi.getAiAssistance as any).mockResolvedValueOnce(null);

    const retryBtn = screen.getByRole('button', { name: /retry request/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('Chilled Water Pipe Rupture')).toBeDefined();
  });
});
