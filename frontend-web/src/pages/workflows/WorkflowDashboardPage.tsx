import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitMerge,
  Search,
  Plus,
  Eye,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { workflowApi } from '../../lib/api/workflowApi';
import {
  WorkflowInstanceDto,
  WorkflowState,
  WorkflowDashboardMetricsDto,
  WORKFLOW_STATE_LABELS
} from '../../types/workflow';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';
import CreateWorkflowModal from './CreateWorkflowModal';

export default function WorkflowDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isManagerOrAdmin = user?.role === 'Manager' || user?.role === 'Admin';

  const [workflows, setWorkflows] = useState<WorkflowInstanceDto[]>([]);
  const [metrics, setMetrics] = useState<WorkflowDashboardMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [listRes, metricsRes] = await Promise.allSettled([
        workflowApi.getWorkflows({ pageSize: 50 }),
        isManagerOrAdmin ? workflowApi.getDashboardMetrics() : Promise.resolve({ success: false, data: null })
      ]);

      if (listRes.status === 'fulfilled' && listRes.value.success && listRes.value.data) {
        setWorkflows(listRes.value.data.items || []);
      }

      if (metricsRes.status === 'fulfilled' && metricsRes.value.success && metricsRes.value.data) {
        setMetrics(metricsRes.value.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load workflows.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isManagerOrAdmin]);

  // Client-side search and filtering over fetched items
  const filtered = workflows.filter((wf) => {
    const matchesSearch =
      !searchQuery ||
      wf.incidentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wf.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wf.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesState = stateFilter === 'all' || wf.currentState.toString() === stateFilter;
    return matchesSearch && matchesState;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Live KPI values
  const activeCount = metrics ? metrics.activeWorkflowsCount : workflows.filter((w) => w.currentState !== WorkflowState.Completed && w.currentState !== WorkflowState.Failed).length;
  const pendingApprovalsCount = metrics ? metrics.pendingApprovalsCount : workflows.filter((w) => w.currentState === WorkflowState.AwaitingApproval).length;
  const inProgressCount = workflows.filter((w) => [WorkflowState.Planning, WorkflowState.ProviderSelection, WorkflowState.InspectionPending, WorkflowState.QuotationReview, WorkflowState.AiValidation, WorkflowState.Execution].includes(w.currentState)).length;
  const completedCount = metrics ? metrics.completedWorkflowsCount : workflows.filter((w) => w.currentState === WorkflowState.Completed).length;
  const failedCount = metrics ? metrics.failedWorkflowsCount : workflows.filter((w) => w.currentState === WorkflowState.Failed).length;

  return (
    <div className="space-y-6">
      {/* Header & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <GitMerge className="h-6 w-6 text-blue-600" />
            Workflows & Approvals
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end orchestration track connecting incidents, inspections, quotes & human governance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isManagerOrAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Initiate Workflow
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Active Workflows"
          value={activeCount}
          subtitle="Currently in progress"
          icon={GitMerge}
          variant="blue"
        />
        <StatCard
          title="Awaiting Approval"
          value={pendingApprovalsCount}
          subtitle="Manager sign-off required"
          icon={ShieldCheck}
          variant="amber"
        />
        <StatCard
          title="In Execution"
          value={inProgressCount}
          subtitle="Contractor active"
          icon={Layers}
          variant="purple"
        />
        <StatCard
          title="Completed"
          value={completedCount}
          subtitle="Successfully closed"
          icon={ShieldCheck}
          variant="emerald"
        />
        <StatCard
          title="Failed / Blocked"
          value={failedCount}
          subtitle="Exception halts"
          icon={GitMerge}
          variant="red"
        />
      </div>

      {/* Pending Approvals Spotlight Banner (for Managers) */}
      {isManagerOrAdmin && pendingApprovalsCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 rounded-3xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-900">
                {pendingApprovalsCount} Maintenance Proposal{pendingApprovalsCount > 1 ? 's' : ''} Awaiting Human Review
              </h3>
              <p className="text-[11px] text-amber-700 mt-0.5">
                AI contractor matching and budget compliance checks ready for manager governance approval.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStateFilter(WorkflowState.AwaitingApproval.toString())}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shrink-0 inline-flex items-center gap-1.5"
          >
            Review Proposals <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by incident, property asset, or ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="all">All 15 States</option>
            {Object.entries(WORKFLOW_STATE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Workflows Table */}
      {loading ? (
        <LoadingState message="Loading workflow instances..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No workflows found"
          description={
            searchQuery || stateFilter !== 'all'
              ? 'Try adjusting your search query or state filter parameters.'
              : 'Initiate a workflow for an open incident to begin multi-agent repair planning.'
          }
          actionLabel={isManagerOrAdmin ? '+ Initiate Workflow' : undefined}
          onAction={isManagerOrAdmin ? () => setIsCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Workflow / Incident</th>
                  <th className="py-3.5 px-4">Property Asset</th>
                  <th className="py-3.5 px-4">Current 15-State</th>
                  <th className="py-3.5 px-4">Steps / Approvals</th>
                  <th className="py-3.5 px-4">Initiated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((wf) => (
                  <tr key={wf.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">{wf.incidentTitle || 'Incident Workflow'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {wf.id.slice(0, 8)}... • Corr: {wf.correlationId?.slice(0, 8) || 'N/A'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {wf.assetName || 'Unassigned Property'}
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={wf.currentStateName} />
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px]">
                          {wf.stepsCount} step(s)
                        </span>
                        {wf.pendingApprovalsCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] animate-pulse">
                            Approval Needed
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <span>{new Date(wf.createdAtUtc).toLocaleDateString()}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        by {wf.createdByUserName || 'System'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      {wf.currentState === WorkflowState.AwaitingApproval && isManagerOrAdmin && (
                        <button
                          onClick={() => navigate(`/workflows/${wf.id}/proposal`)}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-xl transition inline-flex items-center gap-1"
                        >
                          <Sparkles className="h-3 w-3" />
                          Review Proposal
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/workflows/${wf.id}`)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details & Timeline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {currentPage} of {totalPages} ({filtered.length} total)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Workflow Modal */}
      <CreateWorkflowModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadData}
      />
    </div>
  );
}
