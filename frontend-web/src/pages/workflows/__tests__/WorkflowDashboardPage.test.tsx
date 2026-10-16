import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkflowDashboardPage from '../WorkflowDashboardPage';
import { workflowApi } from '../../../lib/api/workflowApi';
import { WorkflowState } from '../../../types/workflow';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockUserRole = 'Manager';
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-mgr-wf',
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
    getWorkflows: vi.fn(),
    getDashboardMetrics: vi.fn(),
  },
}));

const sampleWorkflows = [
  {
    id: 'wf-001-uuid',
    incidentId: 'inc-001',
    incidentTitle: 'Water Pressure Drop in 4th Floor',
    assetId: 'ast-001',
    assetName: 'Colombo Grand Tower',
    currentState: WorkflowState.AwaitingApproval,
    currentStateName: 'AwaitingApproval',
    stepsCount: 5,
    pendingApprovalsCount: 1,
    createdAtUtc: '2026-09-18T10:00:00Z',
    createdByUserName: 'Manager Perera',
    correlationId: 'corr-12345678',
  },
  {
    id: 'wf-002-uuid',
    incidentId: 'inc-002',
    incidentTitle: 'HVAC Compressor Failure',
    assetId: 'ast-002',
    assetName: 'Kandy Tech Park',
    currentState: WorkflowState.Execution,
    currentStateName: 'Execution',
    stepsCount: 8,
    pendingApprovalsCount: 0,
    createdAtUtc: '2026-09-17T09:00:00Z',
    createdByUserName: 'System',
    correlationId: 'corr-87654321',
  },
];

const sampleMetrics = {
  activeWorkflowsCount: 4,
  pendingApprovalsCount: 1,
  completedWorkflowsCount: 12,
  failedWorkflowsCount: 0,
};

describe('WorkflowDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'Manager';
  });

  it('renders loading state while retrieving workflows and metrics', () => {
    (workflowApi.getWorkflows as any).mockReturnValue(new Promise(() => {}));
    (workflowApi.getDashboardMetrics as any).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <WorkflowDashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading workflow instances\.\.\./i)).toBeDefined();
  });

  it('renders dashboard metrics and workflows table with incident title and state badges', async () => {
    (workflowApi.getWorkflows as any).mockResolvedValue({
      success: true,
      data: { items: sampleWorkflows },
    });
    (workflowApi.getDashboardMetrics as any).mockResolvedValue({
      success: true,
      data: sampleMetrics,
    });

    render(
      <MemoryRouter>
        <WorkflowDashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Water Pressure Drop in 4th Floor')).toBeDefined();
    expect(screen.getByText('Colombo Grand Tower')).toBeDefined();
    expect(screen.getByText('HVAC Compressor Failure')).toBeDefined();
    expect(screen.getByText('Kandy Tech Park')).toBeDefined();
    expect(screen.getByText('Active Workflows')).toBeDefined();
    expect(screen.getAllByText('Awaiting Approval').length).toBeGreaterThan(0);
  });

  it('shows Manager Spotlight banner when proposals are awaiting approval', async () => {
    (workflowApi.getWorkflows as any).mockResolvedValue({
      success: true,
      data: { items: sampleWorkflows },
    });
    (workflowApi.getDashboardMetrics as any).mockResolvedValue({
      success: true,
      data: sampleMetrics,
    });

    render(
      <MemoryRouter>
        <WorkflowDashboardPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/1 maintenance proposal awaiting human review/i)
    ).toBeDefined();
    expect(screen.getByRole('button', { name: /review proposals/i })).toBeDefined();
  });

  it('filters workflows by search query', async () => {
    (workflowApi.getWorkflows as any).mockResolvedValue({
      success: true,
      data: { items: sampleWorkflows },
    });
    (workflowApi.getDashboardMetrics as any).mockResolvedValue({
      success: true,
      data: sampleMetrics,
    });

    render(
      <MemoryRouter>
        <WorkflowDashboardPage />
      </MemoryRouter>
    );

    await screen.findByText('Water Pressure Drop in 4th Floor');

    const searchInput = screen.getByPlaceholderText(/search by incident, property asset, or id\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'Compressor' } });

    expect(screen.getByText('HVAC Compressor Failure')).toBeDefined();
    expect(screen.queryByText('Water Pressure Drop in 4th Floor')).toBeNull();
  });

  it('displays empty state when no workflows match filters', async () => {
    (workflowApi.getWorkflows as any).mockResolvedValue({
      success: true,
      data: { items: [] },
    });
    (workflowApi.getDashboardMetrics as any).mockResolvedValue({
      success: true,
      data: { activeWorkflowsCount: 0, pendingApprovalsCount: 0, completedWorkflowsCount: 0, failedWorkflowsCount: 0 },
    });

    render(
      <MemoryRouter>
        <WorkflowDashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/no workflows found/i)).toBeDefined();
  });

  it('displays empty state when workflow retrieval fails', async () => {
    (workflowApi.getWorkflows as any).mockRejectedValueOnce({
      response: { data: { message: 'Workflow engine unreachable' } },
    });
    (workflowApi.getDashboardMetrics as any).mockResolvedValueOnce({ success: false });

    render(
      <MemoryRouter>
        <WorkflowDashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/no workflows found/i)).toBeDefined();
  });

  it('shows Initiate Workflow button for Manager and hides for Owner', async () => {
    (workflowApi.getWorkflows as any).mockResolvedValue({
      success: true,
      data: { items: sampleWorkflows },
    });
    (workflowApi.getDashboardMetrics as any).mockResolvedValue({
      success: true,
      data: sampleMetrics,
    });

    const { unmount } = render(
      <MemoryRouter>
        <WorkflowDashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: /initiate workflow/i })).toBeDefined();

    unmount();

    mockUserRole = 'Owner';
    render(
      <MemoryRouter>
        <WorkflowDashboardPage />
      </MemoryRouter>
    );

    await screen.findByText('Water Pressure Drop in 4th Floor');
    expect(screen.queryByRole('button', { name: /initiate workflow/i })).toBeNull();
  });

  it('navigates to workflow detail page on Details & Timeline click', async () => {
    (workflowApi.getWorkflows as any).mockResolvedValue({
      success: true,
      data: { items: sampleWorkflows },
    });
    (workflowApi.getDashboardMetrics as any).mockResolvedValue({
      success: true,
      data: sampleMetrics,
    });

    render(
      <MemoryRouter>
        <WorkflowDashboardPage />
      </MemoryRouter>
    );

    await screen.findByText('Water Pressure Drop in 4th Floor');

    const detailButtons = screen.getAllByRole('button', { name: /details & timeline/i });
    fireEvent.click(detailButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/workflows/wf-001-uuid');
  });
});
