import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Bot,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  XCircle,
  Play,
  FileText,
  Layers,
  Wrench
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { workflowApi } from '../../lib/api/workflowApi';
import { aiApi } from '../../lib/api/aiApi';
import {
  WorkflowInstanceDto,
  WorkflowTimelineDto,
  WorkflowState,
  AgentRunDto,
  FollowUpTaskDto
} from '../../types/workflow';
import { WorkflowTimeline } from '../../components/workflow/WorkflowTimeline';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'Manager' || user?.role === 'Admin';

  const [workflow, setWorkflow] = useState<WorkflowInstanceDto | null>(null);
  const [timeline, setTimeline] = useState<WorkflowTimelineDto | null>(null);
  const [agentRuns, setAgentRuns] = useState<AgentRunDto[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpTaskDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Workflow Execution States
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [aiExecutionStatus, setAiExecutionStatus] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Active detail tab
  const [activeTab, setActiveTab] = useState<'timeline' | 'governance' | 'agents' | 'audit' | 'continuity'>('timeline');

  // Human Governance Action Modal state
  const [governanceModal, setGovernanceModal] = useState<{
    isOpen: boolean;
    action: 'approve' | 'reject' | 'revision';
    reason: string;
    revisionComment: string;
    submitting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    action: 'approve',
    reason: '',
    revisionComment: '',
    submitting: false,
    error: null
  });

  const loadWorkflowDetails = async (showLoadingSpinner = true) => {
    if (!id) return;
    try {
      if (showLoadingSpinner) setLoading(true);
      setError(null);
      const [wfRes, tlRes, agentRes, fuRes] = await Promise.all([
        workflowApi.getWorkflowById(id),
        workflowApi.getWorkflowTimeline(id),
        workflowApi.getAgentRuns(id),
        workflowApi.getWorkflowFollowUps(id)
      ]);

      if (wfRes.success && wfRes.data) {
        setWorkflow(wfRes.data);
      } else {
        setError(wfRes.message || 'Workflow not found.');
      }

      if (tlRes.success && tlRes.data) {
        setTimeline(tlRes.data);
      }

      if (agentRes.success && agentRes.data) {
        setAgentRuns(agentRes.data);
      }

      if (fuRes.success && fuRes.data) {
        setFollowUps(fuRes.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load workflow details.');
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflowDetails();
  }, [id]);

  // Action 1: Start AI Workflow (4-Agent Pipeline Orchestration)
  const handleStartAiWorkflow = async () => {
    if (!workflow || isAiRunning) return;
    try {
      setIsAiRunning(true);
      setActionErrorMessage(null);
      setActionSuccessMessage(null);
      setAiExecutionStatus('1/4 Incident Planning Agent analyzing incident context...');

      const response = await aiApi.orchestrateWorkflow({
        workflow_instance_id: workflow.id,
        asset_id: workflow.assetId,
        incident_id: workflow.incidentId
      });

      if (response.success && response.data) {
        setActionSuccessMessage(
          `Agentic AI workflow executed successfully (${response.data.executed_agents_count} agents, ${response.data.total_duration_ms}ms). Proposal submitted for Manager approval.`
        );
        setActiveTab('agents');
      } else {
        setActionSuccessMessage('AI workflow pipeline executed. Telemetry updated.');
      }

      await loadWorkflowDetails(false);
    } catch (err: any) {
      setActionErrorMessage(
        err?.response?.data?.message || err?.message || 'Failed to orchestrate Agentic AI workflow.'
      );
    } finally {
      setIsAiRunning(false);
      setAiExecutionStatus(null);
    }
  };

  // Action 2: Run AI (Secondary Alias with execution feedback)
  const handleRunAi = async () => {
    await handleStartAiWorkflow();
  };

  // Action 3: Start Planning (Incident Planning State Transition)
  const handleStartPlanning = async () => {
    if (!workflow || isAiRunning) return;
    try {
      setIsAiRunning(true);
      setActionErrorMessage(null);
      setActionSuccessMessage(null);
      setAiExecutionStatus('Incident Planning Agent formulating structured maintenance plan...');

      // Transition state if created
      if (workflow.currentState === WorkflowState.Created) {
        await workflowApi.transitionWorkflow(workflow.id, {
          targetState: WorkflowState.Planning,
          reason: 'Initiated structured incident analysis & maintenance planning'
        });
      }

      // Execute multi-agent workflow to synthesize planning telemetry
      await aiApi.orchestrateWorkflow({
        workflow_instance_id: workflow.id,
        asset_id: workflow.assetId,
        incident_id: workflow.incidentId
      });

      setActionSuccessMessage('Incident planning completed. 4-step structural plan generated.');
      setActiveTab('agents');
      await loadWorkflowDetails(false);
    } catch (err: any) {
      setActionErrorMessage(
        err?.response?.data?.message || err?.message || 'Failed to execute incident planning.'
      );
    } finally {
      setIsAiRunning(false);
      setAiExecutionStatus(null);
    }
  };

  // Action 4: Generate Proposal (Navigate to Proposal or execute synthesis)
  const handleGenerateProposal = () => {
    if (!workflow) return;
    navigate(`/workflows/${workflow.id}/proposal`);
  };

  // Handle Governance Actions (Approve / Reject / Request Revision)
  const handleGovernanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!governanceModal.reason.trim()) {
      setGovernanceModal((prev) => ({ ...prev, error: 'Please provide a clear justification / reason.' }));
      return;
    }

    if (governanceModal.action === 'revision' && !governanceModal.revisionComment.trim()) {
      setGovernanceModal((prev) => ({ ...prev, error: 'Please specify the exact revision requested.' }));
      return;
    }

    try {
      setGovernanceModal((prev) => ({ ...prev, submitting: true, error: null }));

      if (governanceModal.action === 'approve') {
        await workflowApi.approveWorkflow(id, { decisionReason: governanceModal.reason.trim() });
        setActionSuccessMessage('Proposal approved by manager. Execution step initiated.');
      } else if (governanceModal.action === 'reject') {
        await workflowApi.rejectWorkflow(id, { decisionReason: governanceModal.reason.trim() });
        setActionSuccessMessage('Proposal rejected. Workflow marked as Rejected.');
      } else if (governanceModal.action === 'revision') {
        await workflowApi.requestRevision(id, {
          decisionReason: governanceModal.reason.trim(),
          revisionComment: governanceModal.revisionComment.trim()
        });
        setActionSuccessMessage('Revision requested. Contractor/estimator notified.');
      }

      setGovernanceModal((prev) => ({ ...prev, isOpen: false, submitting: false }));
      await loadWorkflowDetails(false);
    } catch (err: any) {
      setGovernanceModal((prev) => ({
        ...prev,
        submitting: false,
        error: err?.response?.data?.message || err?.message || 'Failed to submit governance decision.'
      }));
    }
  };

  if (loading) return <LoadingState message="Loading workflow telemetry and timeline..." />;
  if (error || !workflow) return <ErrorState message={error || 'Workflow not found'} onRetry={() => loadWorkflowDetails(true)} />;

  // Workflow Action state evaluation
  const isCreated = workflow.currentState === WorkflowState.Created;
  const isAwaitingApproval = workflow.currentState === WorkflowState.AwaitingApproval;
  const isApprovedOrBeyond =
    workflow.currentState === WorkflowState.Approved ||
    workflow.currentState === WorkflowState.Execution ||
    workflow.currentState === WorkflowState.CompletionReview ||
    workflow.currentState === WorkflowState.Completed ||
    workflow.currentState === WorkflowState.FollowUp;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workflows')}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900">{workflow.incidentTitle}</h1>
              <StatusBadge status={workflow.currentStateName} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Property: <span className="font-semibold text-slate-700">{workflow.assetName}</span> • Workflow ID: <span className="font-mono text-slate-600">{workflow.id}</span>
            </p>
          </div>
        </div>

        {/* Human Governance Quick Buttons for Manager/Admin (Only in AwaitingApproval) */}
        {isAwaitingApproval && isManagerOrAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/workflows/${workflow.id}/proposal`)}
              className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-xl border border-blue-200 transition inline-flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Review Proposal
            </button>
            <button
              onClick={() =>
                setGovernanceModal({
                  isOpen: true,
                  action: 'approve',
                  reason: 'Approved after technical inspection review & budget validation.',
                  revisionComment: '',
                  submitting: false,
                  error: null
                })
              }
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve
            </button>
            <button
              onClick={() =>
                setGovernanceModal({
                  isOpen: true,
                  action: 'revision',
                  reason: '',
                  revisionComment: '',
                  submitting: false,
                  error: null
                })
              }
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Request Changes
            </button>
            <button
              onClick={() =>
                setGovernanceModal({
                  isOpen: true,
                  action: 'reject',
                  reason: '',
                  revisionComment: '',
                  submitting: false,
                  error: null
                })
              }
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Success / Error Feedback Alerts */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionErrorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span className="font-medium">{actionErrorMessage}</span>
          </div>
          <button
            onClick={() => setActionErrorMessage(null)}
            className="text-red-700 hover:text-red-900 font-bold ml-2 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section 6: AI WORKFLOW ACTIONS Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 border border-slate-700 rounded-3xl p-6 text-white shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 block">
              Agentic AI Governance Controls
            </span>
            <h2 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              AI WORKFLOW ACTIONS
            </h2>
          </div>
          <span className="text-xs text-slate-300">
            Pipeline: <span className="font-mono text-cyan-300 font-bold">4 Specialized Agents + Controlled Tooling</span>
          </span>
        </div>

        {/* Execution In-Progress Indicator */}
        {isAiRunning && (
          <div className="p-3.5 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-3 animate-pulse">
            <div className="h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <div>
              <span className="font-bold block">AI Workflow Running...</span>
              <span className="text-[11px] text-cyan-300">{aiExecutionStatus || 'Executing multi-agent pipeline'}</span>
            </div>
          </div>
        )}

        {/* Action Controls Grid */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 1. Start AI Workflow (Primary Action) */}
          <button
            onClick={handleStartAiWorkflow}
            disabled={isAiRunning || isAwaitingApproval || isApprovedOrBeyond}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition inline-flex items-center gap-2 ${
              isAiRunning || isAwaitingApproval || isApprovedOrBeyond
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white active:scale-98'
            }`}
            title={
              isAwaitingApproval
                ? 'Workflow reached human approval stage. Review proposal below.'
                : 'Execute the full 4-agent sequential workflow'
            }
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Start AI Workflow
          </button>

          {/* 2. Start Planning */}
          <button
            onClick={handleStartPlanning}
            disabled={isAiRunning || !isCreated}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition inline-flex items-center gap-2 ${
              isAiRunning || !isCreated
                ? 'bg-slate-800/60 border-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white'
            }`}
            title="Invoke IncidentPlanningAgent to generate prioritized repair workflow"
          >
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            Start Planning
          </button>

          {/* 3. Generate Proposal / Review Proposal */}
          {isAwaitingApproval || isApprovedOrBeyond ? (
            <button
              onClick={handleGenerateProposal}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs shadow-xs transition inline-flex items-center gap-2"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
              Review Proposal
            </button>
          ) : (
            <button
              onClick={handleGenerateProposal}
              disabled={isAiRunning || isCreated}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition inline-flex items-center gap-2 ${
                isAiRunning || isCreated
                  ? 'bg-slate-800/60 border-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white'
              }`}
              title={
                isCreated
                  ? 'Generate Proposal is enabled after planning and quotation audit stage'
                  : 'View synthesized multi-agent proposal'
              }
            >
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
              Generate Proposal
            </button>
          )}

          {/* 4. Run AI (Secondary Alias) */}
          <button
            onClick={handleRunAi}
            disabled={isAiRunning || isAwaitingApproval || isApprovedOrBeyond}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition inline-flex items-center gap-2 ${
              isAiRunning || isAwaitingApproval || isApprovedOrBeyond
                ? 'bg-slate-800/60 border-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white'
            }`}
            title="Secondary execution trigger for agent orchestration"
          >
            <Bot className="h-3.5 w-3.5 text-purple-400" />
            Run AI
          </button>
        </div>
      </div>

      {/* Overview Metadata Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Correlation ID</span>
          <span className="text-xs font-mono font-bold text-slate-800 block mt-0.5 truncate">
            {workflow.correlationId || 'N/A'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current 15-State</span>
          <span className="text-xs font-bold text-blue-700 block mt-0.5">
            {workflow.currentStateName}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Created Date</span>
          <span className="text-xs font-bold text-slate-800 block mt-0.5">
            {new Date(workflow.createdAtUtc).toLocaleDateString()} by {workflow.createdByUserName || 'System'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Multi-Agent Runs</span>
          <span className="text-xs font-bold text-slate-800 block mt-0.5">
            {agentRuns.length} agent execution(s)
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`pb-3 transition relative ${
            activeTab === 'timeline' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          15-State Timeline
        </button>
        <button
          onClick={() => setActiveTab('governance')}
          className={`pb-3 transition relative ${
            activeTab === 'governance' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Human Governance & Approvals ({timeline?.approvals?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`pb-3 transition relative ${
            activeTab === 'agents' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Agent Runs & Tool Telemetry ({agentRuns.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 transition relative ${
            activeTab === 'audit' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Audit Log Trail ({timeline?.auditEvents?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('continuity')}
          className={`pb-3 transition relative ${
            activeTab === 'continuity' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Continuity & Follow-up ({followUps.length})
        </button>
      </div>

      {/* Tab 1: 15-State Visual Timeline */}
      {activeTab === 'timeline' && (
        <WorkflowTimeline
          currentState={workflow.currentState}
          steps={timeline?.steps || []}
          createdAtUtc={workflow.createdAtUtc}
          completedAtUtc={workflow.completedAtUtc}
        />
      )}

      {/* Tab 2: Governance & Approvals */}
      {activeTab === 'governance' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
                Human Approval History & Governance Record
              </h3>
              <p className="text-[11px] text-slate-500">
                Authoritative decisions recorded by operational managers (Strict Human-in-the-Loop)
              </p>
            </div>
            {isAwaitingApproval && isManagerOrAdmin && (
              <button
                onClick={() => navigate(`/workflows/${workflow.id}/proposal`)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-xl border border-blue-200 transition"
              >
                Review Proposal
              </button>
            )}
          </div>

          {timeline?.approvals && timeline.approvals.length > 0 ? (
            <div className="space-y-3">
              {timeline.approvals.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {app.assignedApproverUserName ? `Approver: ${app.assignedApproverUserName}` : 'Awaiting Manager Approval'}
                      </span>
                      <StatusBadge status={app.statusName} />
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Requested: {new Date(app.requestedAtUtc).toLocaleString()}
                    </span>
                  </div>

                  {app.decisionReason && (
                    <div className="p-3 bg-white rounded-xl border border-slate-100 text-slate-700">
                      <span className="font-bold text-slate-900 block text-[11px] mb-0.5">Decision Justification:</span>
                      <p className="text-[11px]">{app.decisionReason}</p>
                    </div>
                  )}

                  {app.revisionComment && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                      <span className="font-bold block text-[11px] mb-0.5">Requested Revision:</span>
                      <p className="text-[11px]">{app.revisionComment}</p>
                    </div>
                  )}

                  {app.decidedAtUtc && (
                    <span className="text-[10px] text-slate-400 block text-right font-mono">
                      Decided at: {new Date(app.decidedAtUtc).toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              No formal approval requests have been submitted for this workflow instance yet. Run AI Workflow to generate an approval request.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Agent Telemetry & Tool Executions */}
      {activeTab === 'agents' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-600" />
                Multi-Agent Telemetry & Controlled Tool Execution Logs ({agentRuns.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Auditable agent runs across 4 specialized roles with latency, inputs, outputs, and validation metrics (No hidden reasoning)
              </p>
            </div>
            {agentRuns.length === 0 && (
              <button
                onClick={handleStartAiWorkflow}
                disabled={isAiRunning}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Run AI Pipeline
              </button>
            )}
          </div>

          {agentRuns.length > 0 ? (
            <div className="space-y-4">
              {agentRuns.map((agent) => {
                // Agent role descriptions for Appendix F compliance
                const roleDescription =
                  agent.agentName === 'IncidentPlanningAgent'
                    ? 'Incident analysis and structured maintenance planning'
                    : agent.agentName === 'ProviderIntelligenceAgent'
                    ? 'Provider matching using verified skills, availability, location and history'
                    : agent.agentName === 'CostRecommendationAgent'
                    ? 'Quotation comparison, budget analysis and cost recommendation'
                    : agent.agentName === 'ValidationContinuityAgent'
                    ? 'Deterministic validation, governance and continuity/follow-up'
                    : 'Autonomous specialized maintenance agent';

                return (
                  <div key={agent.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs font-mono">{agent.agentName}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                          {agent.agentTypeName}
                        </span>
                        <StatusBadge status={agent.statusName} />
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Latency: {agent.durationMs || 0}ms • Retries: {agent.retryCount}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 italic">
                      Responsibility: {roleDescription}
                    </p>

                    {agent.outputSummary && (
                      <div className="p-3 bg-white rounded-xl border border-slate-100 text-[11px] text-slate-700">
                        <span className="font-bold text-slate-900 block mb-0.5">Execution Summary:</span>
                        {agent.outputSummary}
                      </div>
                    )}

                    {/* Tool Executions List */}
                    {agent.toolExecutions && agent.toolExecutions.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Controlled Tools Invoked ({agent.toolExecutions.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {agent.toolExecutions.map((tool) => (
                            <div
                              key={tool.id}
                              className="p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] space-y-1 shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                                  <Wrench className="h-3 w-3 text-blue-500" />
                                  {tool.toolName}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 font-mono text-[10px]">{tool.durationMs || 0}ms</span>
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[9px]">
                                    {tool.statusName}
                                  </span>
                                </div>
                              </div>

                              {tool.outputSummary && (
                                <p className="text-[10px] text-slate-600 font-mono truncate">
                                  {tool.outputSummary}
                                </p>
                              )}

                              {tool.validationResult && (
                                <span className="text-[9px] font-bold text-emerald-600 block">
                                  ✓ {tool.validationResult}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              No agent telemetry recorded for this workflow yet. Click [ Start AI Workflow ] to execute the multi-agent pipeline.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Audit Log Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-600" />
              Append-Oriented Governance Audit Trail
            </h3>
            <p className="text-[11px] text-slate-500">
              Cryptographically correlated event sequence for compliance and governance oversight
            </p>
          </div>

          {timeline?.auditEvents && timeline.auditEvents.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timeline.auditEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {evt.eventTypeName}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {evt.description}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-semibold">
                        {evt.userName || 'System'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 text-[11px] font-mono">
                        {new Date(evt.createdAtUtc).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              No audit events found for this workflow.
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Continuity & Follow-Up */}
      {activeTab === 'continuity' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-emerald-600" />
                Post-Maintenance Continuity & Warranty Tasks
              </h3>
              <p className="text-[11px] text-slate-500">
                Scheduled warranty rechecks, preventive inspections, and ongoing property preservation
              </p>
            </div>
            <button
              onClick={() => navigate('/follow-up')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              View Global Continuity
            </button>
          </div>

          {followUps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {followUps.map((fu) => (
                <div key={fu.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{fu.title}</span>
                    <StatusBadge status={fu.statusName} />
                  </div>
                  <p className="text-slate-600 text-[11px]">{fu.description}</p>
                  <div className="flex items-center justify-between pt-2 text-[10px] text-slate-400 border-t border-slate-200">
                    <span>Due: {new Date(fu.dueDateUtc).toLocaleDateString()}</span>
                    <span className={fu.isOverdue ? 'text-red-500 font-bold' : ''}>
                      {fu.isOverdue ? 'Overdue' : 'On Schedule'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400 text-xs">
              No continuity tasks scheduled for this workflow instance yet.
            </div>
          )}
        </div>
      )}

      {/* Human Governance Modal (Approve / Reject / Request Revision) */}
      {governanceModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                    governanceModal.action === 'approve'
                      ? 'bg-emerald-50 text-emerald-600'
                      : governanceModal.action === 'revision'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {governanceModal.action === 'approve' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : governanceModal.action === 'revision' ? (
                    <RotateCcw className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {governanceModal.action === 'approve'
                      ? 'Approve Maintenance Proposal'
                      : governanceModal.action === 'revision'
                      ? 'Request Proposal Revision'
                      : 'Reject Maintenance Proposal'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Human-in-the-loop decision recorded to ASP.NET Core state machine
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleGovernanceSubmit} className="p-6 space-y-4">
              {governanceModal.error && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{governanceModal.error}</span>
                </div>
              )}

              {governanceModal.action === 'revision' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Specific Revision Required *</label>
                  <textarea
                    value={governanceModal.revisionComment}
                    onChange={(e) =>
                      setGovernanceModal((prev) => ({ ...prev, revisionComment: e.target.value }))
                    }
                    placeholder="e.g. Request secondary quotation from verified electrical provider to reduce material markup."
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Governance Decision Justification *</label>
                <textarea
                  value={governanceModal.reason}
                  onChange={(e) =>
                    setGovernanceModal((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder={
                    governanceModal.action === 'approve'
                      ? 'e.g. Proposal verified against portfolio budget and SLS standard material pricing.'
                      : 'e.g. Quotation exceeds approved threshold without technical justification.'
                  }
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGovernanceModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={governanceModal.submitting}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition ${
                    governanceModal.action === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : governanceModal.action === 'revision'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {governanceModal.submitting ? 'Recording...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
