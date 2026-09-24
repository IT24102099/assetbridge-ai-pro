import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  User,
  Sparkles
} from 'lucide-react';
import {
  WorkflowState,
  WorkflowStepDto,
  WorkflowStepStatus
} from '../../types/workflow';

interface WorkflowTimelineProps {
  currentState: WorkflowState;
  steps: WorkflowStepDto[];
  createdAtUtc: string;
  completedAtUtc?: string | null;
}

// 15 canonical states in their logical flow
const ORDERED_STATES: { state: WorkflowState; label: string; desc: string }[] = [
  { state: WorkflowState.Created, label: 'Incident Logged', desc: 'Incident created & workflow initiated' },
  { state: WorkflowState.Planning, label: 'Planning', desc: 'AI agent scopes damage & estimates initial budget' },
  { state: WorkflowState.ProviderSelection, label: 'Provider Matching', desc: 'Verified local contractors identified & invited' },
  { state: WorkflowState.InspectionPending, label: 'Site Inspection', desc: 'On-site technical evaluation & defect logging' },
  { state: WorkflowState.QuotationReview, label: 'Quotation Review', desc: 'Contractor bids & itemized pricing submitted' },
  { state: WorkflowState.AiValidation, label: 'AI Validation', desc: 'Automated cost benchmark & policy verification' },
  { state: WorkflowState.AwaitingApproval, label: 'Human Approval', desc: 'Operational manager governance sign-off' },
  { state: WorkflowState.Approved, label: 'Approved', desc: 'Formal approval granted by property manager' },
  { state: WorkflowState.Execution, label: 'Repair Execution', desc: 'Contractor assigned & active repair underway' },
  { state: WorkflowState.CompletionReview, label: 'Completion Review', desc: 'Post-repair verification & invoice audit' },
  { state: WorkflowState.Completed, label: 'Completed', desc: 'Repairs fully resolved & closed out' },
  { state: WorkflowState.FollowUp, label: 'Continuity & Warranty', desc: 'Post-maintenance warranty & checkups' }
];

export const WorkflowTimeline = ({
  currentState,
  steps = [],
  createdAtUtc,
  completedAtUtc
}: WorkflowTimelineProps) => {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  // Helper to determine status of each step in ordered timeline
  const getStepStatus = (state: WorkflowState) => {
    // Special handling for branch states
    if (currentState === WorkflowState.Failed) {
      if (state === WorkflowState.Failed) return 'failed';
    }
    if (currentState === WorkflowState.Rejected) {
      if (state === WorkflowState.AwaitingApproval) return 'failed';
    }
    if (currentState === WorkflowState.RevisionRequested) {
      if (state === WorkflowState.AwaitingApproval) return 'revision';
    }

    if (currentState === state) {
      return 'current';
    }

    // Check if recorded in steps as completed
    const matchingStep = steps.find((s) => s.stepState === state);
    if (matchingStep && matchingStep.status === WorkflowStepStatus.Completed) {
      return 'completed';
    }

    // State ordinal check
    if (currentState > state && currentState !== WorkflowState.Failed && currentState !== WorkflowState.Rejected) {
      return 'completed';
    }

    return 'pending';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            15-State Workflow Execution Track
          </h3>
          <p className="text-[11px] text-slate-500">
            Deterministic governance pathway enforced by ASP.NET Core state machine
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400 text-[11px]">Initiated: {new Date(createdAtUtc).toLocaleDateString()}</span>
          {completedAtUtc && (
            <span className="text-emerald-600 font-bold text-[11px]">
              Resolved: {new Date(completedAtUtc).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Special State Badges (Revision / Rejected / Failed) */}
      {currentState === WorkflowState.RevisionRequested && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
          <RotateCcw className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold block">Revision Requested by Manager</span>
            <span className="text-amber-700">Contractor quotation or scope requires amendment before re-evaluating.</span>
          </div>
        </div>
      )}

      {currentState === WorkflowState.Rejected && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold block">Workflow Proposal Rejected</span>
            <span className="text-red-700">Proposal declined during human review. Scope must be re-evaluated.</span>
          </div>
        </div>
      )}

      {currentState === WorkflowState.Failed && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold block">Workflow Failed</span>
            <span className="text-red-700">Execution halted due to system exception or unrecoverable error.</span>
          </div>
        </div>
      )}

      {/* Visual Timeline Steps */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {ORDERED_STATES.map((item, idx) => {
          const status = getStepStatus(item.state);
          const recordedStep = steps.find((s) => s.stepState === item.state);
          const isExpanded = expandedStepId === recordedStep?.id;

          let iconBg = 'bg-slate-100 text-slate-400 border-slate-300';
          let icon = <Clock className="h-3.5 w-3.5" />;
          let titleColor = 'text-slate-500';

          if (status === 'completed') {
            iconBg = 'bg-emerald-500 text-white border-emerald-600 ring-4 ring-emerald-50';
            icon = <CheckCircle2 className="h-3.5 w-3.5" />;
            titleColor = 'text-slate-900';
          } else if (status === 'current') {
            iconBg = 'bg-blue-600 text-white border-blue-700 ring-4 ring-blue-100 animate-pulse';
            icon = <Sparkles className="h-3.5 w-3.5" />;
            titleColor = 'text-blue-700 font-bold';
          } else if (status === 'revision') {
            iconBg = 'bg-amber-500 text-white border-amber-600 ring-4 ring-amber-50';
            icon = <RotateCcw className="h-3.5 w-3.5" />;
            titleColor = 'text-amber-800 font-bold';
          } else if (status === 'failed') {
            iconBg = 'bg-red-600 text-white border-red-700 ring-4 ring-red-50';
            icon = <XCircle className="h-3.5 w-3.5" />;
            titleColor = 'text-red-700 font-bold';
          }

          return (
            <div key={item.state} className="relative group">
              {/* Node dot */}
              <div
                className={`absolute -left-6 top-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${iconBg}`}
              >
                {icon}
              </div>

              {/* Content Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400 font-bold">0{idx + 1}</span>
                    <h4 className={`text-xs font-bold ${titleColor}`}>{item.label}</h4>
                    {status === 'current' && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">
                        Active Stage
                      </span>
                    )}
                    {status === 'completed' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                </div>

                {recordedStep && (
                  <div className="text-right flex flex-col items-end">
                    <span className="text-[11px] text-slate-400">
                      {new Date(recordedStep.startedAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {recordedStep.notes && (
                      <button
                        onClick={() => setExpandedStepId(isExpanded ? null : recordedStep.id)}
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5 mt-0.5"
                      >
                        {isExpanded ? 'Less' : 'Details'}
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Step Log Card */}
              {recordedStep && isExpanded && (
                <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 text-slate-400" />
                      Actor: <span className="font-semibold text-slate-700">{recordedStep.startedBy}</span>
                    </span>
                    {recordedStep.durationSeconds !== undefined && recordedStep.durationSeconds !== null && (
                      <span>Duration: {recordedStep.durationSeconds.toFixed(1)}s</span>
                    )}
                  </div>
                  {recordedStep.notes && (
                    <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100 text-[11px]">
                      {recordedStep.notes}
                    </p>
                  )}
                  {recordedStep.errorMessage && (
                    <p className="text-red-700 bg-red-50 p-2 rounded-xl border border-red-200 text-[11px] font-mono">
                      {recordedStep.errorMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
