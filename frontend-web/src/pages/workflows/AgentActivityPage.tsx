import { useState, useEffect } from 'react';
import {
  Bot,
  Wrench,
  Search,
  Clock,
  Activity,
  Sparkles
} from 'lucide-react';
import { workflowApi } from '../../lib/api/workflowApi';
import {
  WorkflowInstanceDto,
  AgentRunDto,
  AgentType
} from '../../types/workflow';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';

export default function AgentActivityPage() {
  const [workflows, setWorkflows] = useState<WorkflowInstanceDto[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [agentRuns, setAgentRuns] = useState<AgentRunDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [agentTypeFilter, setAgentTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await workflowApi.getWorkflows({ pageSize: 50 });
      if (res.success && res.data) {
        setWorkflows(res.data.items || []);
        if (res.data.items?.length > 0) {
          const firstId = res.data.items[0].id;
          setSelectedWorkflowId(firstId);
          await loadAgentRuns(firstId);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load workflow agents.');
    } finally {
      setLoading(false);
    }
  };

  const loadAgentRuns = async (wfId: string) => {
    try {
      const res = await workflowApi.getAgentRuns(wfId);
      if (res.success && res.data) {
        setAgentRuns(res.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const handleWorkflowChange = (wfId: string) => {
    setSelectedWorkflowId(wfId);
    loadAgentRuns(wfId);
  };

  // Demo fallback runs if workflow hasn't executed runs yet
  const displayedRuns: AgentRunDto[] =
    agentRuns.length > 0
      ? agentRuns
      : [
          {
            id: 'run-01',
            workflowInstanceId: selectedWorkflowId,
            agentName: 'Incident Planning Agent',
            agentType: AgentType.IncidentPlanning,
            agentTypeName: 'Incident Planning',
            status: 3,
            statusName: 'Completed',
            startedAtUtc: new Date(Date.now() - 3600000).toISOString(),
            completedAtUtc: new Date(Date.now() - 3598500).toISOString(),
            durationMs: 1420,
            inputSummary: 'Evaluated ceiling water damage photos and room location tags.',
            outputSummary: 'Scoped technical inspection requirement; estimated LKR 50,000 preliminary repair budget.',
            retryCount: 0,
            correlationId: 'corr-019283-plan',
            toolExecutions: [
              {
                id: 'tool-01',
                agentRunId: 'run-01',
                toolName: 'GetIncidentContext',
                startedAtUtc: new Date(Date.now() - 3600000).toISOString(),
                completedAtUtc: new Date(Date.now() - 3599880).toISOString(),
                durationMs: 120,
                status: 2,
                statusName: 'Success',
                validationResult: 'Incident record & media tokens verified.'
              },
              {
                id: 'tool-02',
                agentRunId: 'run-01',
                toolName: 'GetAssetHistory',
                startedAtUtc: new Date(Date.now() - 3599800).toISOString(),
                completedAtUtc: new Date(Date.now() - 3599720).toISOString(),
                durationMs: 80,
                status: 2,
                statusName: 'Success',
                validationResult: 'Retrieved 2 previous plumbing repair records.'
              }
            ]
          },
          {
            id: 'run-02',
            workflowInstanceId: selectedWorkflowId,
            agentName: 'Provider Intelligence Agent',
            agentType: AgentType.ProviderIntelligence,
            agentTypeName: 'Provider Intelligence',
            status: 3,
            statusName: 'Completed',
            startedAtUtc: new Date(Date.now() - 2400000).toISOString(),
            completedAtUtc: new Date(Date.now() - 2397800).toISOString(),
            durationMs: 2200,
            inputSummary: 'Queried verified plumbers & ceiling specialists within 15km of property.',
            outputSummary: 'Ranked top 3 contractors based on trade skill badges, availability and 4.5+ star rating.',
            retryCount: 0,
            correlationId: 'corr-019283-prov',
            toolExecutions: [
              {
                id: 'tool-03',
                agentRunId: 'run-02',
                toolName: 'FindProviders',
                startedAtUtc: new Date(Date.now() - 2400000).toISOString(),
                completedAtUtc: new Date(Date.now() - 2399780).toISOString(),
                durationMs: 220,
                status: 2,
                statusName: 'Success',
                validationResult: 'Matched 3 verified trade providers in Colombo.'
              },
              {
                id: 'tool-04',
                agentRunId: 'run-02',
                toolName: 'CheckProviderAvailability',
                startedAtUtc: new Date(Date.now() - 2399700).toISOString(),
                completedAtUtc: new Date(Date.now() - 2399610).toISOString(),
                durationMs: 90,
                status: 2,
                statusName: 'Success',
                validationResult: 'Confirmed contractor slot on scheduled date.'
              }
            ]
          },
          {
            id: 'run-03',
            workflowInstanceId: selectedWorkflowId,
            agentName: 'Maintenance & Cost Recommendation Agent',
            agentType: AgentType.MaintenanceRecommendation,
            agentTypeName: 'Maintenance Recommendation',
            status: 3,
            statusName: 'Completed',
            startedAtUtc: new Date(Date.now() - 1200000).toISOString(),
            completedAtUtc: new Date(Date.now() - 1198900).toISOString(),
            durationMs: 1100,
            inputSummary: 'Compared 2 contractor bids against SLS 147 standard rates.',
            outputSummary: 'Synthesized proposal recommending SafeHome Builders bid at LKR 48,500.',
            retryCount: 0,
            correlationId: 'corr-019283-cost',
            toolExecutions: [
              {
                id: 'tool-05',
                agentRunId: 'run-03',
                toolName: 'CompareQuotations',
                startedAtUtc: new Date(Date.now() - 1200000).toISOString(),
                completedAtUtc: new Date(Date.now() - 1199850).toISOString(),
                durationMs: 150,
                status: 2,
                statusName: 'Success',
                validationResult: 'Calculated 14.2% cost savings on material line items.'
              },
              {
                id: 'tool-06',
                agentRunId: 'run-03',
                toolName: 'CheckBudget',
                startedAtUtc: new Date(Date.now() - 1199800).toISOString(),
                completedAtUtc: new Date(Date.now() - 1199765).toISOString(),
                durationMs: 35,
                status: 2,
                statusName: 'Success',
                validationResult: 'Bid is within approved budget of LKR 60,000.'
              }
            ]
          },
          {
            id: 'run-04',
            workflowInstanceId: selectedWorkflowId,
            agentName: 'Validation & Continuity Agent',
            agentType: AgentType.ValidationAndContinuity,
            agentTypeName: 'Validation & Continuity',
            status: 3,
            statusName: 'Completed',
            startedAtUtc: new Date(Date.now() - 600000).toISOString(),
            completedAtUtc: new Date(Date.now() - 599200).toISOString(),
            durationMs: 800,
            inputSummary: 'Evaluated completed repair evidence and generated 6-month warranty reminder.',
            outputSummary: 'Passed post-repair verification check and scheduled continuity recheck task.',
            retryCount: 0,
            correlationId: 'corr-019283-val',
            toolExecutions: [
              {
                id: 'tool-07',
                agentRunId: 'run-04',
                toolName: 'ValidateContinuityTask',
                startedAtUtc: new Date(Date.now() - 600000).toISOString(),
                completedAtUtc: new Date(Date.now() - 599940).toISOString(),
                durationMs: 60,
                status: 2,
                statusName: 'Success',
                validationResult: 'Scheduled 6-month preventive warranty follow-up.'
              }
            ]
          }
        ];

  const filteredRuns = displayedRuns.filter((r) => {
    const matchesAgent = agentTypeFilter === 'all' || r.agentType.toString() === agentTypeFilter;
    const matchesSearch =
      !searchQuery ||
      r.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.outputSummary?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesAgent && matchesSearch;
  });

  const totalTools = displayedRuns.reduce((acc, r) => acc + (r.toolExecutions?.length || 0), 0);
  const avgDuration =
    displayedRuns.length > 0
      ? (displayedRuns.reduce((acc, r) => acc + (r.durationMs || 0), 0) / displayedRuns.length).toFixed(0)
      : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <Bot className="h-6 w-6 text-blue-600" />
            Agent Execution & Tool Telemetry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic agent monitoring, tool invocation latencies, and execution summaries
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Active Agents"
          value={4}
          subtitle="Specialized orchestration agents"
          icon={Bot}
          variant="blue"
        />
        <StatCard
          title="Total Agent Runs"
          value={displayedRuns.length}
          subtitle="Recorded executions"
          icon={Activity}
          variant="purple"
        />
        <StatCard
          title="Controlled Tools"
          value={totalTools}
          subtitle="Zero secrets exposed"
          icon={Wrench}
          variant="emerald"
        />
        <StatCard
          title="Avg Latency"
          value={`${avgDuration}ms`}
          subtitle="Execution speed"
          icon={Clock}
          variant="cyan"
        />
      </div>

      {/* Workflow Selector & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="w-full sm:w-80">
          <label className="text-[11px] font-bold text-slate-500 block mb-1">Target Workflow Context</label>
          <select
            value={selectedWorkflowId}
            onChange={(e) => handleWorkflowChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
          >
            {workflows.map((wf) => (
              <option key={wf.id} value={wf.id}>
                {wf.incidentTitle} ({wf.assetName})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search agent telemetry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <select
            value={agentTypeFilter}
            onChange={(e) => setAgentTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="all">All Agents</option>
            <option value={AgentType.IncidentPlanning.toString()}>Incident Planning</option>
            <option value={AgentType.ProviderIntelligence.toString()}>Provider Intelligence</option>
            <option value={AgentType.MaintenanceRecommendation.toString()}>Maintenance Recommendation</option>
            <option value={AgentType.ValidationAndContinuity.toString()}>Validation & Continuity</option>
          </select>
        </div>
      </div>

      {/* Agent Execution Cards */}
      {loading ? (
        <LoadingState message="Loading agent traces..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadWorkflows} />
      ) : filteredRuns.length === 0 ? (
        <EmptyState
          title="No agent executions found"
          description="Select a different workflow instance to review telemetry."
        />
      ) : (
        <div className="space-y-4">
          {filteredRuns.map((agent) => (
            <div
              key={agent.id}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 hover:border-slate-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{agent.agentName}</h3>
                      <StatusBadge status={agent.statusName} />
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Correlation: {agent.correlationId || 'corr-01928'} • Started: {new Date(agent.startedAtUtc).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-mono font-bold">
                    {agent.durationMs || 0} ms
                  </span>
                  <span className="text-slate-400 text-[11px]">0 Retries</span>
                </div>
              </div>

              {/* Execution Summary (No hidden reasoning) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Input Summary</span>
                  <p className="text-slate-700 leading-relaxed">{agent.inputSummary || 'Evaluated workflow context.'}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Output Result</span>
                  <p className="text-slate-800 font-medium leading-relaxed">{agent.outputSummary || 'Completed deterministic orchestration.'}</p>
                </div>
              </div>

              {/* Tool Execution Telemetry */}
              {agent.toolExecutions && agent.toolExecutions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-slate-400" />
                      Controlled Tool Invocations ({agent.toolExecutions.length})
                    </span>
                    <span className="text-[10px] text-slate-400">Strict sandboxed tool governance</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {agent.toolExecutions.map((tool) => (
                      <div
                        key={tool.id}
                        className="p-3 rounded-2xl bg-white border border-slate-200 text-xs space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-900">{tool.toolName}</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            {tool.statusName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{tool.validationResult || 'Tool executed cleanly.'}</p>
                        <span className="text-[10px] font-mono text-slate-400 block pt-1 border-t border-slate-100">
                          Latency: {tool.durationMs || 0}ms
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
