import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardCheck,
  Calendar,
  AlertTriangle,
  FileText,
  Plus,
  Trash2
} from 'lucide-react';
import { inspectionApi } from '../../lib/api/inspectionApi';
import {
  InspectionResponseDto,
  InspectionFindingResponseDto,
  InspectionStatus,
  FindingSeverity
} from '../../types/inspection';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import CreateFindingModal from './CreateFindingModal';

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState<InspectionResponseDto | null>(null);
  const [findings, setFindings] = useState<InspectionFindingResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddFindingOpen, setIsAddFindingOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadInspection = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await inspectionApi.getInspectionById(id);
      if (res.success && res.data) {
        setInspection(res.data);
        setFindings(res.data.findings || []);
      } else {
        setError(res.message || 'Inspection not found.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load inspection details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspection();
  }, [id]);

  const handleUpdateStatus = async (newStatus: InspectionStatus) => {
    if (!id) return;
    try {
      setStatusUpdating(true);
      const res = await inspectionApi.updateInspectionStatus(id, {
        status: newStatus,
        completedAtUtc: newStatus === InspectionStatus.Completed ? new Date().toISOString() : undefined,
        summary: inspection?.summary || 'Status updated via web dashboard'
      });
      if (res.success && res.data) {
        setInspection(res.data);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update inspection status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDeleteFinding = async (findingId: string) => {
    if (!id || !confirm('Are you sure you want to delete this inspection finding?')) return;
    try {
      const res = await inspectionApi.removeFinding(id, findingId);
      if (res.success) {
        setFindings((prev) => prev.filter((f) => f.id !== findingId));
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to remove finding.');
    }
  };

  if (loading) {
    return <LoadingState message="Loading inspection details..." />;
  }

  if (error || !inspection) {
    return (
      <ErrorState
        message={error || 'Inspection record not found'}
        onRetry={loadInspection}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/inspections')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inspections
        </button>

        <div className="flex items-center gap-2">
          {inspection.status === InspectionStatus.Scheduled && (
            <button
              onClick={() => handleUpdateStatus(InspectionStatus.InProgress)}
              disabled={statusUpdating}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              Start Inspection
            </button>
          )}

          {inspection.status === InspectionStatus.InProgress && (
            <button
              onClick={() => handleUpdateStatus(InspectionStatus.Completed)}
              disabled={statusUpdating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              Mark Completed
            </button>
          )}

          <button
            onClick={() => navigate('/quotations')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
          >
            <FileText className="h-4 w-4" />
            Create Quotation
          </button>
        </div>
      </div>

      {/* Main Inspection Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">
                  {inspection.incidentTitle || 'Site Technical Inspection'}
                </h1>
                <StatusBadge
                  status={inspection.statusName}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Inspection Ref: {inspection.id} • Incident Ref: {inspection.incidentId}
              </p>
            </div>
          </div>

          <div className="text-right flex flex-col items-start md:items-end">
            <span className="text-[11px] text-slate-400">Scheduled Date & Time</span>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              {new Date(inspection.scheduledAtUtc).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block">Inspector / Contractor</span>
            <span className="text-xs font-bold text-slate-900 block mt-0.5">
              {inspection.inspectorBusinessName || 'Assigned Contractor'}
            </span>
            <span className="text-[10px] text-slate-400">Verified Trade Provider</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block">Assessed Severity</span>
            <span className="text-xs font-bold text-slate-900 block mt-0.5">
              {inspection.estimatedSeverity !== undefined && inspection.estimatedSeverity !== null
                ? FindingSeverity[inspection.estimatedSeverity] || 'Medium'
                : 'Pending Assessment'}
            </span>
            <span className="text-[10px] text-slate-400">Based on site damage</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block">Completion Time</span>
            <span className="text-xs font-bold text-slate-900 block mt-0.5">
              {inspection.completedAtUtc
                ? new Date(inspection.completedAtUtc).toLocaleDateString()
                : 'Not yet completed'}
            </span>
            <span className="text-[10px] text-slate-400">Report status</span>
          </div>
        </div>

        {/* Scope Notes */}
        {inspection.notes && (
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs text-slate-700">
            <span className="font-bold text-blue-900 block mb-1">Inspection Notes & Scope:</span>
            <p className="leading-relaxed">{inspection.notes}</p>
          </div>
        )}
      </div>

      {/* Findings Section */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Technical Findings & Recommendations</h2>
              <p className="text-[11px] text-slate-500">Defects identified on-site and required corrective actions</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddFindingOpen(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Finding
          </button>
        </div>

        {findings.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <AlertTriangle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No findings recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              Click "+ Add Finding" to document identified defect symptoms, severity grades, and repair recommendations.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {findings.map((finding, idx) => (
              <div
                key={finding.id}
                className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2 hover:bg-slate-100/70 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="h-6 w-6 rounded-lg bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{finding.description}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        finding.severity === FindingSeverity.Critical
                          ? 'bg-red-100 text-red-800'
                          : finding.severity === FindingSeverity.High
                          ? 'bg-orange-100 text-orange-800'
                          : finding.severity === FindingSeverity.Medium
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {finding.severityName || 'Medium'} Severity
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteFinding(finding.id)}
                    className="text-slate-400 hover:text-red-600 transition p-1"
                    title="Remove finding"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="pl-8 text-xs space-y-1">
                  <p className="text-slate-700">
                    <strong className="text-slate-900">Recommendation:</strong> {finding.recommendation}
                  </p>
                  {finding.evidenceReference && (
                    <p className="text-[11px] text-slate-500">
                      <strong className="text-slate-600">Evidence reference:</strong> {finding.evidenceReference}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Finding Modal */}
      {id && (
        <CreateFindingModal
          isOpen={isAddFindingOpen}
          inspectionId={id}
          onClose={() => setIsAddFindingOpen(false)}
          onCreated={loadInspection}
        />
      )}
    </div>
  );
}
