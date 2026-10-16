import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  FileText,
  DollarSign,
  Wrench,
  Camera,
  RotateCcw,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { workflowApi } from '../../lib/api/workflowApi';
import {
  PropertyWorkflowAssistantDto,
  WorkflowAiAskResponseDto
} from '../../types/workflow';
import { SafeImage } from '../common/SafeImage';
import { Modal } from '../common/Modal';
import { LoadingState, ErrorState } from '../common/FeedbackStates';

interface PropertyWorkflowAssistantProps {
  assetId: string;
}

export const PropertyWorkflowAssistant: React.FC<PropertyWorkflowAssistantProps> = ({ assetId }) => {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'Manager' || user?.role === 'Admin';
  const isOwner = user?.role === 'Owner';

  const [data, setData] = useState<PropertyWorkflowAssistantDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded incident card IDs
  const [expandedIncidents, setExpandedIncidents] = useState<Record<string, boolean>>({});

  // Collapsible supporting telemetry
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Proposal Modals
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<'Approve' | 'Reject'>('Approve');
  const [proposalNotes, setProposalNotes] = useState('');
  const [decisionComments, setDecisionComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [proposalActionMessage, setProposalActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ask Assistant State
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [askResponse, setAskResponse] = useState<WorkflowAiAskResponseDto | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await workflowApi.getPropertyAssistant(assetId);
      if (res.data) {
        setData(res.data);
        // Expand first incident by default if available
        if (res.data.incidents.length > 0) {
          setExpandedIncidents({ [res.data.incidents[0].id]: true });
        }
      }
    } catch (err: any) {
      console.error('Failed to load property workflow assistant data', err);
      setError(err?.response?.data?.message || 'Failed to aggregate property workflow intelligence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) {
      fetchData();
    }
  }, [assetId]);

  const toggleIncident = (id: string) => {
    setExpandedIncidents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSendProposal = async () => {
    if (!data?.activeWorkflowId) return;
    try {
      setIsSubmittingProposal(true);
      setProposalActionMessage(null);
      const res = await workflowApi.sendProposalToOwner(data.activeWorkflowId, {
        quotationId: data.proposedQuotationId || (data.quotations[0]?.id ?? null),
        proposalNotes: proposalNotes.trim() || undefined
      });
      if (res.data) {
        setProposalActionMessage({
          type: 'success',
          text: `Proposal of LKR ${data.proposedAmountLkr ? data.proposedAmountLkr.toLocaleString() : 'quoted amount'} successfully dispatched to ${data.ownerName}.`
        });
        setIsSendModalOpen(false);
        setProposalNotes('');
        await fetchData();
      }
    } catch (err: any) {
      console.error('Failed to send proposal', err);
      setProposalActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to send proposal to owner.'
      });
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const handleOwnerDecision = async () => {
    if (!data?.activeWorkflowId) return;
    if (decisionType === 'Reject' && !rejectionReason.trim() && !decisionComments.trim()) {
      setProposalActionMessage({
        type: 'error',
        text: 'Please provide a specific rejection reason or note so the team can prepare alternatives.'
      });
      return;
    }

    try {
      setIsSubmittingProposal(true);
      setProposalActionMessage(null);
      const res = await workflowApi.processOwnerProposalDecision(data.activeWorkflowId, {
        decision: decisionType,
        rejectionReason: decisionType === 'Reject' ? rejectionReason.trim() : undefined,
        comments: decisionComments.trim() || undefined
      });
      if (res.data) {
        setProposalActionMessage({
          type: 'success',
          text: decisionType === 'Approve'
            ? 'Proposal successfully accepted! Local property manager has been notified to schedule execution.'
            : 'Proposal rejected. AI Assistant has generated 4 alternative pathways for manager review.'
        });
        setIsDecisionModalOpen(false);
        setRejectionReason('');
        setDecisionComments('');
        await fetchData();
      }
    } catch (err: any) {
      console.error('Failed to record owner decision', err);
      setProposalActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to record decision.'
      });
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const handleAskQuestion = async (qText?: string) => {
    const query = qText || question;
    if (!query.trim() || !data?.activeWorkflowId) return;

    try {
      setIsAsking(true);
      setAskError(null);
      const res = await workflowApi.askWorkflowAgent(data.activeWorkflowId, query.trim());
      if (res.data) {
        setAskResponse(res.data);
      }
    } catch (err: any) {
      console.error('Failed to ask assistant', err);
      setAskError(err?.response?.data?.message || 'AI Assistant service is currently busy. Please retry.');
    } finally {
      setIsAsking(false);
    }
  };

  if (loading) {
    return <LoadingState message="Correlating property records and generating intelligent assistant overview..." />;
  }

  if (error || !data) {
    return <ErrorState message={error || 'Unable to load assistant.'} onRetry={fetchData} />;
  }

  const primaryQuotation = data.quotations[0];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Toast / Banner Messages */}
      {proposalActionMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
            proposalActionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {proposalActionMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{proposalActionMessage.text}</span>
          </div>
          <button
            onClick={() => setProposalActionMessage(null)}
            className="text-slate-400 hover:text-slate-700 ml-4 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Header Overview & Human Governance Status Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
              <SafeImage
                src={data.thumbnailUrl || undefined}
                alt={data.assetName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {data.assetCode}
                </span>
                <h2 className="text-lg font-bold text-slate-900">{data.assetName}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {data.propertyTypeName}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {data.address}, {data.district} • Owner: <span className="font-semibold text-slate-700">{data.ownerName}</span> ({data.ownerEmail})
              </p>
              <p className="text-[11px] text-slate-500">
                Authorized Local Representative: <span className="font-semibold text-slate-700">{data.authorizedRepresentativeName}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 self-stretch md:self-auto border-t md:border-t-0 pt-3 md:pt-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Workflow Stage:</span>
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                {data.currentStageLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Governance:</span>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                Action pending with {data.responsibleRole}
              </span>
            </div>
          </div>
        </div>

        {/* Plain Language Executive Summary */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
          <Bot className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 leading-relaxed flex-1">
            <span className="font-bold text-slate-900">Current Property Assessment: </span>
            {data.plainLanguageSummary}
          </div>
          <button
            onClick={fetchData}
            title="Refresh Intelligence"
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Categorized Intelligence Matrix: Confirmed Facts vs AI Recommendations vs Missing Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Confirmed Database Facts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Confirmed Database Facts</h3>
            </div>
            <ul className="space-y-2">
              {data.confirmedFacts.map((fact, idx) => (
                <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            Source: Authoritative PostgreSQL records
          </div>
        </div>

        {/* AI Recommendations & Next Best Action */}
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">Next Permitted Action</h3>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                {Math.round(data.recommendedNextAction.confidence_score * 100)}% Confidence
              </span>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900">{data.recommendedNextAction.title}</h4>
              <p className="text-xs text-slate-600 leading-normal">{data.recommendedNextAction.description}</p>
              <div className="p-2 rounded-lg bg-white/70 border border-indigo-100/80 text-[11px] text-indigo-950 mt-2">
                <span className="font-bold">Why it matters: </span>
                {data.recommendedNextAction.why_it_matters}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center justify-between">
            <span className="text-[10px] font-mono text-indigo-500">{data.recommendedNextAction.action_code}</span>
            {isManagerOrAdmin && data.proposalStatus === 'Draft' && data.proposedQuotationId && (
              <button
                onClick={() => setIsSendModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <Send className="h-3 w-3" />
                Send Proposal to Owner
              </button>
            )}
          </div>
        </div>

        {/* Missing Information & Human Governance Attention */}
        <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">Items Needing Attention</h3>
            </div>
            {data.missingInformation.length > 0 ? (
              <ul className="space-y-2">
                {data.missingInformation.map((item, idx) => (
                  <li key={idx} className="text-xs text-amber-900 flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-600">All required property media, inspection records, and quotations are present.</p>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-amber-100 text-[10px] text-amber-700 font-medium">
            Enforces Section 9.1 deterministic validation
          </div>
        </div>
      </div>

      {/* 3. Proposal Lifecycle Action Center (Phase 7) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Manager-to-Owner Proposal Lifecycle
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Formal quotation governance: Components 1–3 operations → AI summary → Manager review → Owner decision.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Proposal State:</span>
            {data.proposalStatus === 'Draft' && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Ready to Send
              </span>
            )}
            {data.proposalStatus === 'SentToOwner' && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Sent to Owner ({data.ownerName})
              </span>
            )}
            {data.proposalStatus === 'ApprovedByOwner' && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Accepted by Owner
              </span>
            )}
            {data.proposalStatus === 'RejectedByOwner' && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                Revision Requested by Owner
              </span>
            )}
          </div>
        </div>

        {/* Lifecycle Active Action Banner */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-900">
              {data.proposedAmountLkr ? (
                <span>Proposed Contractor Bid: LKR {data.proposedAmountLkr.toLocaleString()} ({data.proposedProviderName})</span>
              ) : (
                <span>No active proposal quotation selected.</span>
              )}
            </div>
            {data.ownerRejectionReason && (
              <div className="text-xs text-rose-700 font-medium">
                Owner Rejection Reason: <span className="font-bold">"{data.ownerRejectionReason}"</span>
              </div>
            )}
            {data.ownerComments && (
              <div className="text-[11px] text-slate-500">
                Owner Feedback: "{data.ownerComments}"
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Manager Action: Send Proposal */}
            {isManagerOrAdmin && data.proposalStatus === 'Draft' && (
              <button
                onClick={() => setIsSendModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-2"
              >
                <Send className="h-3.5 w-3.5" />
                Send Formal Proposal to Owner
              </button>
            )}

            {/* Owner Action: Accept or Reject */}
            {(isOwner || isManagerOrAdmin) && (data.proposalStatus === 'SentToOwner' || data.currentWorkflowState === 'AwaitingApproval') && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setDecisionType('Approve');
                    setIsDecisionModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  Accept Proposal
                </button>
                <button
                  onClick={() => {
                    setDecisionType('Reject');
                    setIsDecisionModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject / Request Revision
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Phase 7 Rejection Alternatives (Generated when proposal is rejected) */}
        {data.rejectionAlternatives && data.rejectionAlternatives.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                AI Practical Alternatives (Grounded in Property & Contractor Records)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.rejectionAlternatives.map((alt, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/40 hover:bg-purple-50 transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                      {alt.alternativeType}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{alt.estimatedCostRangeLkr}</span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">{alt.title}</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">{alt.rationale}</p>
                  <div className="pt-2 border-t border-purple-100/80 flex items-center justify-between">
                    <span className="text-[10px] text-purple-700 font-semibold">
                      Feasibility: {Math.round(alt.feasibilityScore * 100)}%
                    </span>
                    <span className="text-[10px] font-mono font-bold text-purple-900">
                      {alt.actionCode}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Correlated Incidents, Inspections & Quotations List (Phase 5) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Property Incidents & Operational History</h3>
            <p className="text-xs text-slate-500">
              Correlated across inspections, maintenance work orders, and itemized quotations.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
            {data.incidents.length} Incident(s) Logged
          </span>
        </div>

        {data.incidents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No incidents reported for this property. All building continuity systems nominal.
          </div>
        ) : (
          <div className="space-y-3">
            {data.incidents.map((inc) => {
              const isExpanded = !!expandedIncidents[inc.id];
              const relatedInspections = data.inspections.filter(i => i.incidentId === inc.id);
              const relatedJobs = data.maintenanceJobs.filter(j => j.incidentId === inc.id);
              const relatedQuotations = data.quotations.filter(q => q.incidentId === inc.id);

              return (
                <div
                  key={inc.id}
                  className="border border-slate-200 rounded-xl overflow-hidden transition bg-white hover:border-slate-300"
                >
                  {/* Incident Header Accordion Bar */}
                  <div
                    onClick={() => toggleIncident(inc.id)}
                    className="p-4 flex items-center justify-between cursor-pointer bg-slate-50/50 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100/70 text-blue-700">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{inc.title}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            {inc.categoryName}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {inc.priorityName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{inc.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-600">
                        {inc.statusName}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Incident Details */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-100 space-y-4 text-xs">
                      {/* Evidence Photo Strip */}
                      {inc.evidenceUrls && inc.evidenceUrls.length > 0 && (
                        <div>
                          <span className="font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
                            <Camera className="h-3.5 w-3.5 text-slate-500" />
                            Inspection & Incident Evidence ({inc.evidenceUrls.length} photos)
                          </span>
                          <div className="flex items-center gap-2 overflow-x-auto pb-2">
                            {inc.evidenceUrls.map((url, eIdx) => (
                              <div
                                key={eIdx}
                                className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0"
                              >
                                <SafeImage src={url} alt={`Evidence ${eIdx + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Linked Inspection Findings */}
                      <div>
                        <span className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-slate-500" />
                          On-Site Inspection Findings
                        </span>
                        {relatedInspections.length > 0 ? (
                          <div className="space-y-2">
                            {relatedInspections.map((ins) => (
                              <div key={ins.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                  <span>Inspector: <strong className="text-slate-800">{ins.inspectorName}</strong></span>
                                  <span>{new Date(ins.scheduledDate).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-slate-700 mt-1">{ins.findingsSummary || 'Routine inspection conducted.'}</p>
                                {ins.defectDescriptions.length > 0 && (
                                  <div className="mt-1.5 text-[11px] text-rose-700 font-medium">
                                    Defects identified: {ins.defectDescriptions.join('; ')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 italic">No formal inspection scheduled or completed for this incident.</p>
                        )}
                      </div>

                      {/* Linked Quotations */}
                      <div>
                        <span className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-slate-500" />
                          Contractor Quotations & Cost Comparison
                        </span>
                        {relatedQuotations.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {relatedQuotations.map((q) => (
                              <div key={q.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900">{q.providerName}</span>
                                  <span className="font-bold text-blue-700">LKR {q.totalAmount.toLocaleString()}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                  Status: <span className="font-semibold">{q.status}</span> • {q.itemCount} item(s) • Warranty: {q.warrantyMonths} mo.
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-400 italic">Awaiting contractor quotation submission.</p>
                        )}
                      </div>

                      {/* Linked Maintenance Jobs (Phase 5E) */}
                      {relatedJobs.length > 0 && (
                        <div>
                          <span className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                            <Wrench className="h-3.5 w-3.5 text-slate-500" />
                            Linked Maintenance Work Orders ({relatedJobs.length})
                          </span>
                          <div className="space-y-1.5">
                            {relatedJobs.map((j) => (
                              <div key={j.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                                <div>
                                  <div className="font-bold text-slate-900">{j.title}</div>
                                  <div className="text-[11px] text-slate-500">
                                    Provider: {j.providerName} • Status: {j.status}
                                    {j.isOverdue && <span className="text-rose-600 font-bold ml-1.5">(Overdue)</span>}
                                  </div>
                                </div>
                                {j.actualCost && (
                                  <span className="font-bold text-slate-800">LKR {j.actualCost.toLocaleString()}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Interactive "Ask Assistant" Q&A (Phase 6) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-600" />
            Ask Property Workflow Assistant
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Query real incidents, inspections, quotations, and next permitted actions grounded in authoritative database facts.
          </p>
        </div>

        {/* Quick Question Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            'What incidents have occurred at this property?',
            'Who is responsible for each incident?',
            'Which quotations have been received?',
            'What needs the manager attention?'
          ].map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAskQuestion(prompt)}
              className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition font-medium"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Question Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
            placeholder="Ask a question about this property, e.g., 'What is the best permitted next action?'"
            className="flex-1 px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleAskQuestion()}
            disabled={isAsking || !question.trim()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0"
          >
            {isAsking ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Ask
          </button>
        </div>

        {/* Ask Response Display */}
        {askError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {askError}
          </div>
        )}

        {askResponse && (
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2 text-xs animate-in fade-in">
            <div className="font-bold text-blue-950 flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-600" />
              <span>Response:</span>
            </div>
            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{askResponse.answer}</p>
            {askResponse.suggested_next_step && (
              <div className="mt-2 pt-2 border-t border-blue-200/80 text-[11px] text-blue-900 font-medium">
                <strong>Suggested Next Action: </strong>
                {askResponse.suggested_next_step} ({askResponse.suggested_role || 'Property Manager'})
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Supporting Technical Detail Toggle (Phase 4 Simplification) */}
      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
        <div
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">
              Supporting Technical Execution & Audit Telemetry ({data.auditEventsCount} Audit Events, {data.activeFollowUpsCount} Follow-ups)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">
              {showTechnicalDetails ? 'Hide technical logs' : 'View execution timeline & audit history'}
            </span>
            {showTechnicalDetails ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
          </div>
        </div>

        {showTechnicalDetails && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 text-xs animate-in fade-in">
            {data.recentAuditHighlight && (
              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">Recent Audit Highlight:</span>
                <p className="text-slate-600">{data.recentAuditHighlight}</p>
              </div>
            )}

            {data.followUpTasks.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-slate-700 block">Warranty & Preventive Maintenance Tasks:</span>
                <div className="space-y-1.5">
                  {data.followUpTasks.map((t) => (
                    <div key={t.id} className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800">{t.title}</div>
                        <div className="text-[11px] text-slate-500">{t.description}</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {t.statusName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
              <span>Workflow Engine: Section 9.1 Deterministic State Machine</span>
              {data.activeWorkflowId && (
                <a
                  href={`/workflows/${data.activeWorkflowId}`}
                  className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
                >
                  Open Full Workflow Timeline Screen
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Manager Send Proposal Modal */}
      <Modal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        title="Send Maintenance Proposal to Overseas Owner"
        subtitle={`Dispatches formal contractor proposal for ${data.assetName}`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Recipient Owner:</span>
              <span className="font-bold text-slate-900">{data.ownerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contractor / Provider:</span>
              <span className="font-bold text-slate-900">{data.proposedProviderName || primaryQuotation?.providerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Quotation Total:</span>
              <span className="font-bold text-blue-700 text-sm">
                LKR {data.proposedAmountLkr ? data.proposedAmountLkr.toLocaleString() : primaryQuotation?.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Manager Notes & Recommendations (Visible to Owner):</label>
            <textarea
              rows={3}
              value={proposalNotes}
              onChange={(e) => setProposalNotes(e.target.value)}
              placeholder="e.g., CIDA-registered contractor with verified warranty and prompt 5-day timeline. Meets roof repair standards."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSendModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmittingProposal}
              onClick={handleSendProposal}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold flex items-center gap-2"
            >
              {isSubmittingProposal && <RotateCcw className="h-3.5 w-3.5 animate-spin" />}
              Confirm & Dispatch Proposal
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Owner Decision Modal (Accept or Reject) */}
      <Modal
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        title={decisionType === 'Approve' ? 'Accept Maintenance Proposal' : 'Reject Proposal & Request Revision'}
        subtitle={`Property: ${data.assetName}`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Proposed Amount:</span>
              <span className="font-bold text-slate-900">
                LKR {data.proposedAmountLkr ? data.proposedAmountLkr.toLocaleString() : primaryQuotation?.totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Selected Provider:</span>
              <span className="font-bold text-slate-900">{data.proposedProviderName || primaryQuotation?.providerName}</span>
            </div>
          </div>

          {decisionType === 'Reject' && (
            <div>
              <label className="block text-rose-800 font-bold mb-1">
                Reason for Rejection (Required):
              </label>
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Quotation exceeds budget or timeline too long"
                className="w-full px-3 py-2 border border-rose-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                The AI assistant will analyze this reason against contractor records to propose 4 practical alternatives.
              </p>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {decisionType === 'Approve' ? 'Additional Instructions or Comments (Optional):' : 'Additional Feedback:'}
            </label>
            <textarea
              rows={2}
              value={decisionComments}
              onChange={(e) => setDecisionComments(e.target.value)}
              placeholder="e.g., Please ensure work starts before the weekend."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDecisionModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmittingProposal}
              onClick={handleOwnerDecision}
              className={`px-4 py-2 rounded-xl text-white font-bold flex items-center gap-2 ${
                decisionType === 'Approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSubmittingProposal && <RotateCcw className="h-3.5 w-3.5 animate-spin" />}
              {decisionType === 'Approve' ? 'Confirm Acceptance' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
