import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuditLogsPage from '../AuditLogsPage';
import { auditApi } from '../../../lib/api/auditApi';
import { AuditEventType } from '../../../types/workflow';

vi.mock('../../../lib/api/auditApi', () => ({
  auditApi: {
    getAuditEvents: vi.fn(),
  },
}));

const sampleEvents = [
  {
    id: 'evt-001',
    workflowInstanceId: 'wf-999',
    correlationId: 'corr-12345678',
    eventType: AuditEventType.WorkflowCreated,
    eventTypeName: 'WorkflowCreated',
    description: 'Workflow initiated for incident: Chilled Water Pipe Rupture',
    userId: 'usr-admin-1',
    userName: 'Admin User',
    metadataJson: '{"incidentPriority":"High","estimatedBudget":75000}',
    createdAtUtc: '2026-03-10T09:00:00Z',
  },
  {
    id: 'evt-002',
    workflowInstanceId: 'wf-999',
    correlationId: 'corr-12345678',
    eventType: AuditEventType.ApprovalApproved,
    eventTypeName: 'ApprovalApproved',
    description: 'Manager approved proposal from CoolTech HVAC Solutions',
    userId: 'usr-mgr-2',
    userName: 'Kamal Manager',
    metadataJson: '{"decisionReason":"Approved within budget","totalCost":65000}',
    createdAtUtc: '2026-03-10T11:30:00Z',
  },
];

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (auditApi.getAuditEvents as any).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <AuditLogsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading governance audit trail\.\.\./i)).toBeDefined();
  });

  it('renders audit ledger events and immutable KPI cards', async () => {
    (auditApi.getAuditEvents as any).mockResolvedValue({
      success: true,
      data: { items: sampleEvents, totalCount: 2, totalPages: 1, page: 1, pageSize: 15 },
    });

    render(
      <MemoryRouter>
        <AuditLogsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Governance Audit Logs')).toBeDefined();
    expect(screen.getByText(/Append-Only/i)).toBeDefined();
    expect(screen.getByText(/Workflow initiated for incident: Chilled Water Pipe Rupture/i)).toBeDefined();
    expect(screen.getByText(/Manager approved proposal from CoolTech HVAC Solutions/i)).toBeDefined();
    expect(screen.getByText('Kamal Manager')).toBeDefined();
  });

  it('filters audit trail by search input', async () => {
    (auditApi.getAuditEvents as any).mockResolvedValue({
      success: true,
      data: { items: sampleEvents, totalCount: 2, totalPages: 1, page: 1, pageSize: 15 },
    });

    render(
      <MemoryRouter>
        <AuditLogsPage />
      </MemoryRouter>
    );

    await screen.findByText('Governance Audit Logs');

    const searchInput = screen.getByPlaceholderText(/search by actor, description, correlation id\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'CoolTech' } });

    expect(screen.queryByText(/Workflow initiated for incident/i)).toBeNull();
    expect(screen.getByText(/Manager approved proposal from CoolTech HVAC Solutions/i)).toBeDefined();
  });

  it('filters audit logs by event type select dropdown', async () => {
    (auditApi.getAuditEvents as any).mockResolvedValue({
      success: true,
      data: { items: sampleEvents, totalCount: 2, totalPages: 1, page: 1, pageSize: 15 },
    });

    render(
      <MemoryRouter>
        <AuditLogsPage />
      </MemoryRouter>
    );

    await screen.findByText('Governance Audit Logs');

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: AuditEventType.ApprovalApproved.toString() } });

    await waitFor(() => {
      expect(auditApi.getAuditEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: AuditEventType.ApprovalApproved,
        })
      );
    });
  });

  it('verifies audit ledger is strictly read-only with no modification or deletion controls', async () => {
    (auditApi.getAuditEvents as any).mockResolvedValue({
      success: true,
      data: { items: sampleEvents, totalCount: 2, totalPages: 1, page: 1, pageSize: 15 },
    });

    render(
      <MemoryRouter>
        <AuditLogsPage />
      </MemoryRouter>
    );

    await screen.findByText('Governance Audit Logs');

    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /edit/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /create audit/i })).toBeNull();
  });

  it('opens and closes metadata JSON viewer modal', async () => {
    (auditApi.getAuditEvents as any).mockResolvedValue({
      success: true,
      data: { items: sampleEvents, totalCount: 2, totalPages: 1, page: 1, pageSize: 15 },
    });

    render(
      <MemoryRouter>
        <AuditLogsPage />
      </MemoryRouter>
    );

    await screen.findByText('Governance Audit Logs');

    const jsonButtons = screen.getAllByRole('button', { name: /json/i });
    fireEvent.click(jsonButtons[0]);

    expect(await screen.findByText('Audit Event Metadata')).toBeDefined();
    expect(screen.getByText(/"incidentPriority": "High"/i)).toBeDefined();

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Audit Event Metadata')).toBeNull();
  });

  it('renders error state and retries on failure', async () => {
    (auditApi.getAuditEvents as any).mockRejectedValueOnce({
      response: { data: { message: 'Audit database unavailable' } },
    });

    render(
      <MemoryRouter>
        <AuditLogsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Audit database unavailable')).toBeDefined();

    (auditApi.getAuditEvents as any).mockResolvedValueOnce({
      success: true,
      data: { items: sampleEvents, totalCount: 2, totalPages: 1, page: 1, pageSize: 15 },
    });

    const retryBtn = screen.getByRole('button', { name: /retry request/i });
    fireEvent.click(retryBtn);

    expect(await screen.findByText('Governance Audit Logs')).toBeDefined();
  });
});
