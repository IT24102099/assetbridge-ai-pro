import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Wrench,
  Check
} from 'lucide-react';
import { maintenanceApi } from '../../lib/api/maintenanceApi';
import {
  MaintenanceJobResponseDto,
  MaintenanceJobStatus
} from '../../types/maintenance';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';

const STAGES = [
  { status: MaintenanceJobStatus.Planned, label: 'Planned' },
  { status: MaintenanceJobStatus.Scheduled, label: 'Scheduled' },
  { status: MaintenanceJobStatus.InProgress, label: 'In Progress' },
  { status: MaintenanceJobStatus.Completed, label: 'Completed' },
  { status: MaintenanceJobStatus.Closed, label: 'Closed' }
];

export default function MaintenanceJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<MaintenanceJobResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<MaintenanceJobStatus>(MaintenanceJobStatus.InProgress);
  const [actualCost, setActualCost] = useState<number>(0);
  const [completionNotes, setCompletionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadJob = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await maintenanceApi.getJobById(id);
      if (res.success && res.data) {
        setJob(res.data);
        setActualCost(res.data.actualCost || res.data.approvedBudget || 0);
      } else {
        setError(res.message || 'Maintenance job not found.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load maintenance job.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
  }, [id]);

  const handleOpenStatusModal = (status: MaintenanceJobStatus) => {
    setTargetStatus(status);
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setUpdating(true);
      const res = await maintenanceApi.updateJobStatus(id, {
        status: targetStatus,
        actualCost: targetStatus === MaintenanceJobStatus.Completed ? Number(actualCost) : undefined,
        completedAtUtc: targetStatus === MaintenanceJobStatus.Completed ? new Date().toISOString() : undefined,
        completionNotes: completionNotes.trim() || undefined
      });

      if (res.success && res.data) {
        setJob(res.data);
        setIsStatusModalOpen(false);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update job status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading maintenance work order..." />;
  }

  if (error || !job) {
    return (
      <ErrorState
        message={error || 'Maintenance job record not found'}
        onRetry={loadJob}
      />
    );
  }

  const currentStageIndex = STAGES.findIndex((s) => s.status === job.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/maintenance/jobs')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Maintenance Jobs
        </button>

        <div className="flex items-center gap-2">
          {job.status === MaintenanceJobStatus.Scheduled && (
            <button
              onClick={() => handleOpenStatusModal(MaintenanceJobStatus.InProgress)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              Start Work Order
            </button>
          )}

          {job.status === MaintenanceJobStatus.InProgress && (
            <button
              onClick={() => handleOpenStatusModal(MaintenanceJobStatus.Completed)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              Mark Job Completed
            </button>
          )}

          {job.status === MaintenanceJobStatus.Completed && (
            <button
              onClick={() => handleOpenStatusModal(MaintenanceJobStatus.Closed)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              Close & Archive Job
            </button>
          )}
        </div>
      </div>

      {/* Main Job Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">{job.title}</h1>
                <StatusBadge
                  status={job.statusName}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Incident: <span className="font-semibold text-slate-800">{job.incidentTitle || 'N/A'}</span> • Job Ref: {job.id}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Approved Budget</span>
            <span className="text-2xl font-bold text-slate-900">
              LKR {(job.approvedBudget || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            {job.actualCost !== undefined && job.actualCost !== null && (
              <span className="text-xs font-bold text-emerald-600 block mt-0.5">
                Actual Invoiced: LKR {job.actualCost.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Visual Progress Tracker matching Stage Machine */}
        <div className="pt-2">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 w-full z-0" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 z-0 transition-all duration-500"
              style={{
                width: `${(Math.max(0, currentStageIndex) / (STAGES.length - 1)) * 100}%`
              }}
            />

            {STAGES.map((stage, idx) => {
              const isPassed = idx <= currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div key={stage.status} className="flex flex-col items-center relative z-10">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition ${
                      isPassed
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-white border-2 border-slate-300 text-slate-400'
                    }`}
                  >
                    {isPassed ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[11px] font-bold mt-2 ${
                      isCurrent ? 'text-blue-700' : isPassed ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block">Assigned Contractor</span>
            <span className="text-xs font-bold text-slate-900 block mt-0.5">
              {job.providerBusinessName}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">Verified Service Provider</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block">Schedule Window</span>
            <span className="text-xs font-bold text-slate-900 block mt-0.5">
              {new Date(job.scheduledStartUtc).toLocaleDateString()} - {new Date(job.scheduledEndUtc).toLocaleDateString()}
            </span>
            <span className="text-[10px] text-slate-400">Target repair timeframe</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block">Completed Timestamp</span>
            <span className="text-xs font-bold text-slate-900 block mt-0.5">
              {job.completedAtUtc ? new Date(job.completedAtUtc).toLocaleString() : 'In Progress'}
            </span>
            <span className="text-[10px] text-slate-400">Final handoff record</span>
          </div>
        </div>

        {/* Scope and Instructions */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Job Scope & Work Instructions</h2>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
            {job.description}
          </div>
        </div>

        {/* Completion Notes if available */}
        {job.completionNotes && (
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs text-slate-700 space-y-1">
            <span className="font-bold text-emerald-900 block">Contractor Completion Report:</span>
            <p className="leading-relaxed">{job.completionNotes}</p>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Update Job Milestone</h3>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4 mt-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Target Status</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(parseInt(e.target.value) as MaintenanceJobStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800"
                >
                  <option value={MaintenanceJobStatus.InProgress}>In Progress (Work started)</option>
                  <option value={MaintenanceJobStatus.Completed}>Completed (Work finished)</option>
                  <option value={MaintenanceJobStatus.Closed}>Closed & Archived</option>
                  <option value={MaintenanceJobStatus.Cancelled}>Cancelled</option>
                </select>
              </div>

              {targetStatus === MaintenanceJobStatus.Completed && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Actual Final Cost (LKR)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={actualCost}
                    onChange={(e) => setActualCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Completion / Milestone Notes</label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Repairs completed according to specifications. Pressure test passed at 4.5 bar."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {updating ? 'Saving...' : 'Save Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
