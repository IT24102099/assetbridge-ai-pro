import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { incidentApi } from '../../lib/api/incidentApi';
import {
  IncidentResponseDto,
  IncidentStatus,
  IncidentEvidenceResponseDto,
} from '../../types/incident';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Tabs } from '../../components/common/Tabs';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import {
  ArrowLeft,
  CheckCircle2,
  Bot,
} from 'lucide-react';

const WORKFLOW_STEPS = [
  { key: 'Reported', label: 'Incident Reported', defaultTime: '07 Sep 2026 10:32' },
  { key: 'Validating', label: 'AI Analysis Completed', defaultTime: '07 Sep 2026 10:35' },
  { key: 'Planning', label: 'Preparing Plan', defaultTime: 'In Progress...' },
  { key: 'ProviderSelection', label: 'Waiting for Approval' },
  { key: 'InspectionPending', label: 'Provider Assigned' },
  { key: 'WorkInProgress', label: 'Work in Progress' },
  { key: 'Resolved', label: 'Completed' },
];

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<IncidentResponseDto | null>(null);
  const [evidence, setEvidence] = useState<IncidentEvidenceResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchIncidentDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [incRes, evRes] = await Promise.all([
        incidentApi.getIncidentById(id),
        incidentApi.getEvidence(id),
      ]);

      if (incRes.data) {
        setIncident(incRes.data);
      }
      if (evRes.data) {
        setEvidence(evRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load incident details', err);
      setError(err?.response?.data?.message || 'Failed to retrieve incident details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentDetails();
  }, [id]);

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    if (!id) return;
    try {
      setUpdatingStatus(true);
      await incidentApi.updateStatus(id, {
        newStatus,
        statusChangeReason: `Status updated to ${newStatus}`,
      });
      await fetchIncidentDetails();
    } catch (err: any) {
      console.error('Failed to update status', err);
      alert(err?.response?.data?.message || 'Failed to update incident status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading incident triage details & AI diagnostic telemetry..." />;
  }

  if (error || !incident) {
    return (
      <ErrorState
        message={error || 'Incident request not found.'}
        onRetry={fetchIncidentDetails}
      />
    );
  }

  const getStepIndex = (status: IncidentStatus) => {
    switch (status) {
      case 'Reported':
        return 0;
      case 'Validating':
        return 1;
      case 'Planning':
        return 2;
      case 'ProviderSelection':
        return 3;
      case 'InspectionPending':
        return 4;
      case 'WorkInProgress':
        return 5;
      case 'Resolved':
      case 'Closed':
        return 6;
      default:
        return 0;
    }
  };

  const currentStepIndex = getStepIndex(incident.status);

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'photos', label: `Photos (${evidence.length || 3})` },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/incidents')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Incidents
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">Workflow Status:</span>
          <select
            value={incident.status}
            onChange={(e) => handleStatusChange(e.target.value as IncidentStatus)}
            disabled={updatingStatus}
            className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="Reported">1. Incident Reported</option>
            <option value="Validating">2. AI Analysis Completed</option>
            <option value="Planning">3. Preparing Plan</option>
            <option value="ProviderSelection">4. Waiting for Approval</option>
            <option value="InspectionPending">5. Provider Assigned</option>
            <option value="WorkInProgress">6. Work in Progress</option>
            <option value="Resolved">7. Completed</option>
          </select>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Header matching Screen 6 & 7 wireframe: INC-1021 + Priority Badge + Subtitle */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                INC-{incident.id.slice(0, 4).toUpperCase()}
              </h1>
              <StatusBadge status={incident.priority} size="md" />
              <StatusBadge status={incident.status} size="md" />
            </div>
            <p className="text-xs font-bold text-slate-600">{incident.assetName}</p>
            <p className="text-sm font-semibold text-slate-800">{incident.title}</p>
          </div>
        </div>

        {/* 7-Step Visual Workflow Tracker matching Screen 6 wireframe */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Incident Tracking Timeline
          </p>
          <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {WORKFLOW_STEPS.map((step, idx) => {
              const isPassed = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={step.key} className="relative flex items-center justify-between">
                  {/* Indicator Dot */}
                  <div
                    className={`absolute -left-6 h-4 w-4 rounded-full flex items-center justify-center ring-4 ring-white ${
                      isPassed
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white animate-pulse'
                        : 'bg-slate-300'
                    }`}
                  >
                    {isPassed && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </div>

                  <div className="pl-2">
                    <p
                      className={`text-xs font-bold ${
                        isCurrent
                          ? 'text-blue-900'
                          : isPassed
                          ? 'text-emerald-900'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-400">
                    {isCurrent ? 'In Progress...' : isPassed ? step.defaultTime || 'Completed' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs Bar matching Screen 7 wireframe */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab 1: Details Table matching Screen 7 wireframe */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-500 w-36">Asset</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{incident.assetName}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-500">Category</td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{incident.category}</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-500">Reported On</td>
                    <td className="py-3 px-4 text-slate-700">
                      {new Date(incident.createdAtUtc).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-500">Description</td>
                    <td className="py-3 px-4 text-slate-800 leading-relaxed font-medium">
                      {incident.description}
                    </td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-500">Location</td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {incident.locationDetails || `${incident.assetCity}, Sri Lanka`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* AI Assistant Diagnostic Card */}
            <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  AI Triage & Recommendation
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Initial analysis completed: Suggested trade is <strong className="text-white">Certified {incident.category} Specialist</strong>.
                Estimated repair bracket is <strong className="text-white">LKR 12,000 — 25,000</strong>.
              </p>
              <button
                onClick={() => navigate('/ai-assistant')}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1"
              >
                Open AI Diagnostic Assistant →
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Photos Gallery */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            {evidence.length === 0 && (!incident.evidence || incident.evidence.length === 0) ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto mb-1">
                  <Bot className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">No damage evidence photos attached</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Photos submitted during incident reporting or during site inspections will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {(evidence.length > 0 ? evidence : incident.evidence).map((ev, idx) => (
                  <div
                    key={ev.id || idx}
                    className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition"
                  >
                    <div className="h-32 bg-slate-100 overflow-hidden relative">
                      <img
                        src={ev.fileUrl || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80'}
                        alt={ev.caption || ev.fileName || 'Evidence'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold rounded">
                        {ev.evidenceType || 'Photo'}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-bold text-slate-800 truncate" title={ev.fileName}>
                        {ev.fileName || `Evidence #${idx + 1}`}
                      </p>
                      {ev.caption && (
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{ev.caption}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {ev.createdAtUtc
                          ? new Date(ev.createdAtUtc).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Uploaded'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Timeline */}
        {activeTab === 'timeline' && (
          <div className="space-y-3 text-xs text-slate-600">
            <p>• Incident submitted to platform on {new Date(incident.createdAtUtc).toLocaleString()}</p>
            <p>• Automated agent dispatched triage telemetry.</p>
            <p>• Current operational status: <strong className="text-slate-900">{incident.status}</strong></p>
          </div>
        )}
      </div>
    </div>
  );
};
export default IncidentDetailPage;
