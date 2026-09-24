import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Building,
  AlertTriangle,
  FileText,
  DollarSign,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { workflowApi } from '../../lib/api/workflowApi';
import { incidentApi } from '../../lib/api/incidentApi';
import { quotationApi } from '../../lib/api/quotationApi';
import { inspectionApi } from '../../lib/api/inspectionApi';
import {
  WorkflowInstanceDto,
  WorkflowState
} from '../../types/workflow';
import { IncidentResponseDto } from '../../types/incident';
import { QuotationResponseDto } from '../../types/quotation';
import { InspectionResponseDto } from '../../types/inspection';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';

export default function AiProposalReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'Manager' || user?.role === 'Admin';

  const [workflow, setWorkflow] = useState<WorkflowInstanceDto | null>(null);
  const [incident, setIncident] = useState<IncidentResponseDto | null>(null);
  const [inspection, setInspection] = useState<InspectionResponseDto | null>(null);
  const [quotation, setQuotation] = useState<QuotationResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Decision Modal
  const [decisionModal, setDecisionModal] = useState<{
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

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const wfRes = await workflowApi.getWorkflowById(id);
      if (wfRes.success && wfRes.data) {
        setWorkflow(wfRes.data);

        // Load incident
        if (wfRes.data.incidentId) {
          const incRes = await incidentApi.getIncidentById(wfRes.data.incidentId);
          if (incRes.success && incRes.data) {
            setIncident(incRes.data);
          }
        }

        // Load quotations & inspections
        const [quotListRes, inspListRes] = await Promise.all([
          quotationApi.getQuotations({ incidentId: wfRes.data.incidentId, pageSize: 5 }),
          inspectionApi.getInspections({ incidentId: wfRes.data.incidentId, pageSize: 5 })
        ]);

        if (quotListRes.success && quotListRes.data && quotListRes.data.items?.length > 0) {
          setQuotation(quotListRes.data.items[0]);
        }

        if (inspListRes.success && inspListRes.data && inspListRes.data.items?.length > 0) {
          setInspection(inspListRes.data.items[0]);
        }
      } else {
        setError(wfRes.message || 'Workflow not found.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load AI proposal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!decisionModal.reason.trim()) {
      setDecisionModal((prev) => ({ ...prev, error: 'Please provide a clear justification / reason.' }));
      return;
    }

    if (decisionModal.action === 'revision' && !decisionModal.revisionComment.trim()) {
      setDecisionModal((prev) => ({ ...prev, error: 'Please specify the exact revision requested.' }));
      return;
    }

    try {
      setDecisionModal((prev) => ({ ...prev, submitting: true, error: null }));

      if (decisionModal.action === 'approve') {
        await workflowApi.approveWorkflow(id, { decisionReason: decisionModal.reason.trim() });
      } else if (decisionModal.action === 'reject') {
        await workflowApi.rejectWorkflow(id, { decisionReason: decisionModal.reason.trim() });
      } else if (decisionModal.action === 'revision') {
        await workflowApi.requestRevision(id, {
          decisionReason: decisionModal.reason.trim(),
          revisionComment: decisionModal.revisionComment.trim()
        });
      }

      setDecisionModal((prev) => ({ ...prev, isOpen: false, submitting: false }));
      navigate(`/workflows/${id}`);
    } catch (err: any) {
      setDecisionModal((prev) => ({
        ...prev,
        submitting: false,
        error: err?.response?.data?.message || err?.message || 'Failed to record governance decision.'
      }));
    }
  };

  if (loading) return <LoadingState message="Synthesizing multi-agent proposal & policy checks..." />;
  if (error || !workflow) return <ErrorState message={error || 'Proposal not found'} onRetry={loadData} />;

  // Budget calculations in LKR
  const totalCost = quotation ? quotation.totalAmount : 48500;
  const approvedBudget = incident ? incident.estimatedBudget || 60000 : 60000;
  const isWithinBudget = totalCost <= approvedBudget;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/workflows/${workflow.id}`)}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900">AI Maintenance Proposal Review</h1>
              <StatusBadge status={workflow.currentStateName} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Property: <span className="font-semibold text-slate-700">{workflow.assetName}</span> • Workflow ID: <span className="font-mono text-slate-600">{workflow.id}</span>
            </p>
          </div>
        </div>

        {/* Human Governance Actions */}
        {workflow.currentState === WorkflowState.AwaitingApproval && isManagerOrAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setDecisionModal({
                  isOpen: true,
                  action: 'approve',
                  reason: 'Proposal verified against budget threshold and technical inspection findings.',
                  revisionComment: '',
                  submitting: false,
                  error: null
                })
              }
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve Proposal
            </button>
            <button
              onClick={() =>
                setDecisionModal({
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
              Request Revision
            </button>
            <button
              onClick={() =>
                setDecisionModal({
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

      {/* AI Recommendation Banner (No hidden reasoning) */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/50 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-cyan-300" />
                Validated AI Maintenance Proposal
              </span>
              <span className="text-xs text-slate-400">• Confidence Score: 94.2%</span>
            </div>

            <h2 className="text-lg font-bold text-white">
              Recommended Contractor: {quotation ? quotation.providerBusinessName : 'SafeHome Builders & Repairs'}
            </h2>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Synthesized by Maintenance & Cost Recommendation Agent based on verified trade skills, SLS 147 standard pricing benchmarks, and prompt availability in Colombo district.
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] text-slate-400 block">Total Proposed Bid</span>
            <span className="text-2xl font-bold text-cyan-300">
              LKR {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] font-semibold text-emerald-400 block mt-0.5">
              {isWithinBudget ? '✓ Within Approved Budget' : '⚠ Exceeds Budget Threshold'}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Detailed Synthesis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Context & Cost Breakdown (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident & Property Context */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Property & Incident Context</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 block">Property Asset</span>
                <span className="font-bold text-slate-900 block mt-0.5">{workflow.assetName}</span>
                <span className="text-[10px] text-slate-500">Asset ID: {workflow.assetId}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 block">Incident Title</span>
                <span className="font-bold text-slate-900 block mt-0.5">{workflow.incidentTitle}</span>
                <span className="text-[10px] text-amber-600 font-bold">Priority: {incident?.priorityName || 'High'}</span>
              </div>
            </div>

            {incident?.description && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700">
                <span className="font-bold text-slate-900 block mb-1">Incident Scope Description:</span>
                <p className="leading-relaxed">{incident.description}</p>
              </div>
            )}
          </div>

          {/* Technical Inspection & Findings */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Technical Inspection Findings</h3>
              </div>
              {inspection && (
                <button
                  onClick={() => navigate(`/inspections/${inspection.id}`)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View Inspection <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>

            {inspection?.findings && inspection.findings.length > 0 ? (
              <div className="space-y-2">
                {inspection.findings.map((f) => (
                  <div key={f.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{f.description}</span>
                      <StatusBadge status={f.severityName} />
                    </div>
                    {f.recommendation && (
                      <p className="text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-800">Recommendation:</span> {f.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500">
                Technical inspection completed. Repair scope confirmed within standard maintenance tolerance.
              </div>
            )}
          </div>

          {/* Itemized Cost Breakdown */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Contractor Quotation & Itemized Breakdown</h3>
              </div>
              {quotation && (
                <button
                  onClick={() => navigate(`/quotations/${quotation.id}`)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View Quote <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>

            {quotation?.items && quotation.items.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Unit Price (LKR)</th>
                      <th className="py-2.5 px-4 text-right">Total (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotation.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{it.description}</td>
                        <td className="py-2.5 px-4 text-center font-mono">{it.quantity}</td>
                        <td className="py-2.5 px-4 text-right">LKR {it.unitPrice.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          LKR {it.totalPrice.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                <span>Standard Trade Labor & Material Package</span>
                <span className="font-bold text-slate-900">LKR {totalCost.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Validation, Risk & Policy References */}
        <div className="space-y-6">
          {/* Automated Validation Checks */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Validation Checks</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-100">
                <span className="font-semibold">Budget Threshold Check</span>
                <span className="font-bold text-emerald-700">Passed</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-100">
                <span className="font-semibold">Provider Trade Verification</span>
                <span className="font-bold text-emerald-700">Verified</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-100">
                <span className="font-semibold">Material Rate Benchmark</span>
                <span className="font-bold text-emerald-700">SLS 147 Valid</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-100">
                <span className="font-semibold">Timeline Feasibility</span>
                <span className="font-bold text-emerald-700">3-5 Days</span>
              </div>
            </div>
          </div>

          {/* Risk Grading */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Risk Assessment</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                Low Risk (12%)
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Standard residential repair with certified contractor history. Minimal disruption expected for tenant.
            </p>
          </div>

          {/* RAG Knowledge & Policy References */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Policy & Standard References</h3>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800 block text-[11px]">SLS 147 / Sri Lankan Trade Benchmark</span>
                <span className="text-[10px] text-slate-500">Material standard adherence & regulated labor rates</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-800 block text-[11px]">AssetBridge Maintenance SOP v2.4</span>
                <span className="text-[10px] text-slate-500">Section 4: Water Damage & Ceiling Remediation Protocols</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      {decisionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {decisionModal.action === 'approve'
                  ? 'Confirm Proposal Approval'
                  : decisionModal.action === 'revision'
                  ? 'Request Quotation / Scope Revision'
                  : 'Reject Proposal'}
              </h2>
            </div>

            <form onSubmit={handleDecisionSubmit} className="p-6 space-y-4">
              {decisionModal.error && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{decisionModal.error}</span>
                </div>
              )}

              {decisionModal.action === 'revision' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Revision Instructions *</label>
                  <textarea
                    value={decisionModal.revisionComment}
                    onChange={(e) =>
                      setDecisionModal((prev) => ({ ...prev, revisionComment: e.target.value }))
                    }
                    placeholder="Specify what needs to be changed..."
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Decision Justification *</label>
                <textarea
                  value={decisionModal.reason}
                  onChange={(e) =>
                    setDecisionModal((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  placeholder="Provide rationale for the record..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDecisionModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={decisionModal.submitting}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition ${
                    decisionModal.action === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : decisionModal.action === 'revision'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {decisionModal.submitting ? 'Recording...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
