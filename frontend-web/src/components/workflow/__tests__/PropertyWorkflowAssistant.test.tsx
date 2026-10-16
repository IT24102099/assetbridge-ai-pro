import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertyWorkflowAssistant } from '../PropertyWorkflowAssistant';
import * as AuthContextModule from '../../../context/AuthContext';
import { workflowApi } from '../../../lib/api/workflowApi';
import { PropertyWorkflowAssistantDto } from '../../../types/workflow';

vi.mock('../../../lib/api/workflowApi', () => ({
  workflowApi: {
    getPropertyAssistant: vi.fn(),
    sendProposalToOwner: vi.fn(),
    processOwnerProposalDecision: vi.fn(),
    askWorkflowAgent: vi.fn()
  }
}));

const mockAssistantData: PropertyWorkflowAssistantDto = {
  assetId: '11111111-1111-1111-1111-111111111111',
  assetCode: 'AS-NEG-1111',
  assetName: 'Negombo Beach Villa',
  propertyTypeName: 'Villa',
  address: '12 Beach Road, Negombo',
  city: 'Negombo',
  district: 'Gampaha',
  status: 'Active',
  ownerId: '22222222-2222-2222-2222-222222222222',
  ownerName: 'Sunil Perera',
  ownerEmail: 'sunil@test.lk',
  authorizedRepresentativeName: 'Kamal Silva',
  thumbnailUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914',
  mediaList: [
    {
      id: 'm-1',
      fileUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914',
      fileName: 'villa-cover.jpg',
      isThumbnail: true
    }
  ],
  incidents: [
    {
      id: 'inc-1',
      title: 'Roof tiles cracked after heavy storm',
      description: 'Rainwater seeping into top floor bedroom.',
      category: 1,
      categoryName: 'Roofing',
      priority: 3,
      priorityName: 'Emergency',
      status: 2,
      statusName: 'Validating',
      estimatedBudget: 150000,
      createdAtUtc: '2026-10-14T08:00:00Z',
      evidenceCount: 1,
      evidenceUrls: ['https://images.unsplash.com/photo-1513694203232-719a280e022f'],
      assignedRepresentativeId: 'rep-1',
      assignedRepresentativeName: 'Kamal Silva',
      activeWorkflowId: 'wf-1',
      workflowState: 'QuotationReview'
    }
  ],
  inspections: [
    {
      id: 'ins-1',
      incidentId: 'inc-1',
      incidentTitle: 'Roof tiles cracked after heavy storm',
      scheduledDate: '2026-10-15T09:00:00Z',
      status: 'Completed',
      inspectorName: 'Saman Technical Inspector',
      findingsSummary: '35 cracked terra-cotta tiles over master bedroom.',
      defectCount: 1,
      defectDescriptions: ['35 cracked terra-cotta tiles'],
      recommendedActions: ['Replace damaged tiles and apply elastomeric waterproofing sealant.'],
      followUpRequired: true
    }
  ],
  maintenanceJobs: [
    {
      id: 'job-1',
      incidentId: 'inc-1',
      title: 'Roof repair and flashing replacement',
      status: 'Planned',
      providerName: 'Ceylinco Renovations',
      scheduledDate: '2026-10-18T08:00:00Z',
      completedDate: null,
      approvedBudget: 60000,
      actualCost: 58500,
      isOverdue: false
    }
  ],
  quotations: [
    {
      id: 'q-1',
      incidentId: 'inc-1',
      providerName: 'Ceylinco Renovations',
      totalAmount: 58500,
      materialCost: 40000,
      laborCost: 18500,
      itemCount: 4,
      status: 'Submitted',
      warrantyMonths: 12,
      createdAtUtc: '2026-10-15T14:00:00Z',
      isSentToOwner: false
    }
  ],
  activeWorkflowId: 'wf-1',
  currentWorkflowState: 'QuotationReview',
  currentStageLabel: 'Quotation Review & AI Validation',
  plainLanguageSummary: 'Ceylinco Renovations quoted LKR 58,500 for roof tiles repair. Inspection confirmed 35 damaged tiles.',
  responsibleRole: 'Property Manager',
  proposalStatus: 'Draft',
  proposedAmountLkr: 58500,
  proposedProviderName: 'Ceylinco Renovations',
  proposedQuotationId: 'q-1',
  proposalSentAtUtc: null,
  ownerDecidedAtUtc: null,
  ownerRejectionReason: null,
  ownerComments: null,
  rejectionAlternatives: [],
  confirmedFacts: [
    'Property: Negombo Beach Villa (Villa) in Negombo, Gampaha.',
    'Owner: Sunil Perera (sunil@test.lk).',
    'Total Logged Incidents: 1 (Active: 1).',
    'Submitted Quotation: LKR 58,500.00 by Ceylinco Renovations.'
  ],
  aiRecommendations: [
    'Dispatch formal contractor proposal to Sunil Perera for explicit approval.'
  ],
  missingInformation: [],
  awaitingHumanDecision: [
    'Property manager review of quotation before sending to overseas owner.'
  ],
  recommendedNextAction: {
    title: 'Send Formal Maintenance Proposal to Owner',
    action_code: 'SEND_PROPOSAL_TO_OWNER',
    description: 'Quotation of LKR 58,500 is within estimated budget. Submit proposal for owner authorization.',
    why_it_matters: 'Ensures owner is consulted before committing funds.',
    prerequisites: ['Valid quotation submitted', 'Scope verified by inspection'],
    what_happens_next: 'Owner receives notification to accept or reject.',
    confidence_score: 0.94,
    target_url: null
  },
  auditEventsCount: 6,
  recentAuditHighlight: 'Manager Niroshan verified contractor quotation (10/15/2026 2:30 PM)',
  activeFollowUpsCount: 1,
  followUpTasks: [],
  isAiServiceConnected: true
};

describe('PropertyWorkflowAssistant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders property overview, confirmed facts, and executive summary correctly', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'mgr-1', email: 'manager@test.lk', fullName: 'Niroshan Dias', role: 'Manager', isActive: true, createdAtUtc: '2026-10-15T00:00:00Z' },
      token: 'jwt-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      refreshUser: vi.fn()
    });

    vi.mocked(workflowApi.getPropertyAssistant).mockResolvedValue({
      success: true,
      data: mockAssistantData,
      message: 'OK',
      timestampUtc: '2026-10-16T10:00:00Z'
    });

    render(<PropertyWorkflowAssistant assetId="11111111-1111-1111-1111-111111111111" />);

    // Check loading indicator first
    expect(screen.getByText(/Correlating property records/i)).toBeDefined();

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('Negombo Beach Villa')).toBeDefined();
    });

    expect(screen.getByText('AS-NEG-1111')).toBeDefined();
    expect(screen.getByText(/Kamal Silva/)).toBeDefined();
    expect(screen.getByText(/Quotation Review & AI Validation/)).toBeDefined();
    expect(screen.getByText(/Ceylinco Renovations quoted LKR 58,500/)).toBeDefined();
    expect(screen.getByText('Confirmed Database Facts')).toBeDefined();
    expect(screen.getByText(/Property: Negombo Beach Villa/)).toBeDefined();
  });

  it('renders Manager proposal dispatch action and opens proposal confirmation modal', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'mgr-1', email: 'manager@test.lk', fullName: 'Niroshan Dias', role: 'Manager', isActive: true, createdAtUtc: '2026-10-15T00:00:00Z' },
      token: 'jwt-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      refreshUser: vi.fn()
    });

    vi.mocked(workflowApi.getPropertyAssistant).mockResolvedValue({
      success: true,
      data: mockAssistantData,
      message: 'OK',
      timestampUtc: '2026-10-16T10:00:00Z'
    });

    render(<PropertyWorkflowAssistant assetId="11111111-1111-1111-1111-111111111111" />);

    await waitFor(() => {
      expect(screen.getByText('Send Proposal to Owner')).toBeDefined();
    });

    const sendButton = screen.getByText('Send Proposal to Owner');
    await userEvent.click(sendButton);

    // Modal should appear
    expect(screen.getByText('Send Maintenance Proposal to Overseas Owner')).toBeDefined();
    expect(screen.getByText('Confirm & Dispatch Proposal')).toBeDefined();
  });

  it('renders rejection alternatives when proposal was rejected by owner', async () => {
    const rejectedData: PropertyWorkflowAssistantDto = {
      ...mockAssistantData,
      proposalStatus: 'RejectedByOwner',
      ownerRejectionReason: 'Quotation exceeds budget',
      rejectionAlternatives: [
        {
          alternativeType: 'RevisedQuotation',
          title: 'Request Revised Quotation (Scope Optimization)',
          rationale: "Addresses 'Quotation exceeds budget' by trimming non-critical items.",
          estimatedCostRangeLkr: 'LKR 46,000 - 51,000',
          feasibilityScore: 0.94,
          actionCode: 'REQUEST_REVISED_QUOTATION',
          targetUrl: '/quotations/q-1'
        },
        {
          alternativeType: 'AlternativeProvider',
          title: 'Invite Competitive Bid from Lakroof Solutions',
          rationale: 'Solicits competitive pricing from second verified contractor in Gampaha.',
          estimatedCostRangeLkr: 'LKR 48,000 - 54,000',
          feasibilityScore: 0.89,
          actionCode: 'INVITE_ALTERNATIVE_PROVIDER',
          targetUrl: '/providers'
        }
      ]
    };

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { id: 'mgr-1', email: 'manager@test.lk', fullName: 'Niroshan Dias', role: 'Manager', isActive: true, createdAtUtc: '2026-10-15T00:00:00Z' },
      token: 'jwt-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      refreshUser: vi.fn()
    });

    vi.mocked(workflowApi.getPropertyAssistant).mockResolvedValue({
      success: true,
      data: rejectedData,
      message: 'OK',
      timestampUtc: '2026-10-16T10:00:00Z'
    });

    render(<PropertyWorkflowAssistant assetId="11111111-1111-1111-1111-111111111111" />);

    await waitFor(() => {
      expect(screen.getByText(/AI Practical Alternatives/i)).toBeDefined();
    });

    expect(screen.getByText('Request Revised Quotation (Scope Optimization)')).toBeDefined();
    expect(screen.getByText('Invite Competitive Bid from Lakroof Solutions')).toBeDefined();
    expect(screen.getByText('LKR 46,000 - 51,000')).toBeDefined();
  });
});
