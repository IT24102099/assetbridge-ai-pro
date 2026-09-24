import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  ClipboardCheck,
  FileText,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Layers,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { inspectionApi } from '../../lib/api/inspectionApi';
import { quotationApi } from '../../lib/api/quotationApi';
import { maintenanceApi } from '../../lib/api/maintenanceApi';
import { InspectionResponseDto, InspectionStatus } from '../../types/inspection';
import { QuotationResponseDto, QuotationStatus } from '../../types/quotation';
import { MaintenanceJobResponseDto, MaintenanceJobStatus } from '../../types/maintenance';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';

export default function MaintenanceDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inspections, setInspections] = useState<InspectionResponseDto[]>([]);
  const [quotations, setQuotations] = useState<QuotationResponseDto[]>([]);
  const [jobs, setJobs] = useState<MaintenanceJobResponseDto[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [inspRes, quotRes, jobsRes] = await Promise.all([
        inspectionApi.getInspections({ pageSize: 50 }),
        quotationApi.getQuotations({ pageSize: 50 }),
        maintenanceApi.getJobs({ pageSize: 50 })
      ]);

      if (inspRes.success && inspRes.data) {
        setInspections(inspRes.data.items || []);
      }
      if (quotRes.success && quotRes.data) {
        setQuotations(quotRes.data.items || []);
      }
      if (jobsRes.success && jobsRes.data) {
        setJobs(jobsRes.data.items || []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load maintenance dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Calculate live KPIs
  const pendingInspections = inspections.filter(
    (i) => i.status === InspectionStatus.Scheduled || i.status === InspectionStatus.InProgress
  ).length;

  const pendingQuotations = quotations.filter(
    (q) => q.status === QuotationStatus.Submitted || q.status === QuotationStatus.UnderReview
  ).length;

  const activeJobs = jobs.filter(
    (j) => j.status === MaintenanceJobStatus.InProgress || j.status === MaintenanceJobStatus.Scheduled
  ).length;

  const completedJobs = jobs.filter(
    (j) => j.status === MaintenanceJobStatus.Completed || j.status === MaintenanceJobStatus.Closed
  ).length;

  const totalSpentLkr = jobs
    .filter((j) => j.status === MaintenanceJobStatus.Completed)
    .reduce((acc, j) => acc + (j.actualCost || j.approvedBudget || 0), 0);

  if (loading) {
    return <LoadingState message="Loading maintenance & inspection portfolio..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Maintenance & Inspections</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time inspection oversight, quotation comparison, and job execution for {user?.fullName || 'AssetBridge Portfolio'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/inspections')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <ClipboardCheck className="h-4 w-4 text-slate-600" />
            Inspections
          </button>
          <button
            onClick={() => navigate('/quotations/compare')}
            className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4 text-cyan-600" />
            Compare Quotes
          </button>
          <button
            onClick={() => navigate('/maintenance/jobs')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
          >
            <Wrench className="h-4 w-4" />
            All Jobs
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Inspections"
          value={pendingInspections}
          subtitle="Scheduled on-site reviews"
          icon={ClipboardCheck}
          variant="blue"
        />
        <StatCard
          title="Active Maintenance Jobs"
          value={activeJobs}
          subtitle="In progress / scheduled repairs"
          icon={Wrench}
          variant="amber"
        />
        <StatCard
          title="Pending Quotations"
          value={pendingQuotations}
          subtitle="Awaiting comparison & review"
          icon={FileText}
          variant="purple"
        />
        <StatCard
          title="Completed Jobs"
          value={completedJobs}
          subtitle={`Total LKR ${totalSpentLkr.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          icon={CheckCircle2}
          variant="emerald"
        />
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Maintenance Jobs */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Active Maintenance Jobs</h2>
                  <p className="text-[11px] text-slate-500">Live repairs & contractor assignments</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/maintenance/jobs')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {jobs.length === 0 ? (
              <EmptyState
                title="No active maintenance jobs"
                description="Create or assign a maintenance job from an approved incident quotation."
              />
            ) : (
              <div className="space-y-3">
                {jobs.slice(0, 4).map((job) => (
                  <div
                    key={job.id}
                    onClick={() => navigate(`/maintenance/jobs/${job.id}`)}
                    className="p-3.5 rounded-2xl bg-slate-50/70 hover:bg-slate-100 border border-slate-100 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{job.title}</span>
                        <StatusBadge
                          status={job.statusName}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {job.providerBusinessName} • Incident: {job.incidentTitle || 'N/A'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          LKR {(job.approvedBudget || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(job.scheduledStartUtc).toLocaleDateString()}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tracking {jobs.length} total work orders</span>
            <span className="font-semibold text-slate-700">LKR {totalSpentLkr.toLocaleString()} Completed</span>
          </div>
        </div>

        {/* AI & Quick Insights */}
        <div className="space-y-6">
          {/* AI Quotation Optimizer Promo */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-cyan-400">
              <Sparkles className="h-5 w-5" />
              <h3 className="text-xs font-bold uppercase tracking-wider">AI Cost Optimizer</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Compare multiple contractor quotes with verified Sri Lankan material catalog benchmarks, warranty terms, and budget adherence.
            </p>
            <button
              onClick={() => navigate('/quotations/compare')}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Compare Incident Quotations
            </button>
          </div>

          {/* Quick Links Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Maintenance Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/quotations')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-left transition border border-slate-100"
              >
                <FileText className="h-4 w-4 text-blue-600 mb-1" />
                <p className="text-xs font-bold text-slate-800">Quotations</p>
                <p className="text-[10px] text-slate-400">{quotations.length} records</p>
              </button>
              <button
                onClick={() => navigate('/maintenance/catalog')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-left transition border border-slate-100"
              >
                <Layers className="h-4 w-4 text-purple-600 mb-1" />
                <p className="text-xs font-bold text-slate-800">Price Catalog</p>
                <p className="text-[10px] text-slate-400">LKR benchmark</p>
              </button>
              <button
                onClick={() => navigate('/inspections')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-left transition border border-slate-100"
              >
                <ClipboardCheck className="h-4 w-4 text-emerald-600 mb-1" />
                <p className="text-xs font-bold text-slate-800">Inspections</p>
                <p className="text-[10px] text-slate-400">{inspections.length} recorded</p>
              </button>
              <button
                onClick={() => navigate('/maintenance/reports')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-left transition border border-slate-100"
              >
                <TrendingUp className="h-4 w-4 text-amber-600 mb-1" />
                <p className="text-xs font-bold text-slate-800">Cost Reports</p>
                <p className="text-[10px] text-slate-400">Analytics</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Recent Inspections & Recent Quotations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inspections */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent Inspections</h2>
                <p className="text-[11px] text-slate-500">On-site technical assessments</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/inspections')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {inspections.length === 0 ? (
            <EmptyState
              title="No inspections found"
              description="Schedule a technical site inspection for reported property incidents."
            />
          ) : (
            <div className="space-y-3">
              {inspections.slice(0, 4).map((insp) => (
                <div
                  key={insp.id}
                  onClick={() => navigate(`/inspections/${insp.id}`)}
                  className="p-3.5 rounded-2xl bg-slate-50/70 hover:bg-slate-100 border border-slate-100 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {insp.incidentTitle || 'Incident Inspection'}
                      </span>
                      <StatusBadge
                        status={insp.statusName}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Inspector: {insp.inspectorBusinessName || 'Assigned Contractor'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-slate-600 block">
                      {new Date(insp.scheduledAtUtc).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-blue-600 font-bold">
                      {insp.findings?.length || 0} findings
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quotations */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Submitted Quotations</h2>
                <p className="text-[11px] text-slate-500">Contractor pricing & estimates</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/quotations')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {quotations.length === 0 ? (
            <EmptyState
              title="No quotations received"
              description="Service providers can submit itemized estimates for inspection findings."
            />
          ) : (
            <div className="space-y-3">
              {quotations.slice(0, 4).map((quot) => (
                <div
                  key={quot.id}
                  onClick={() => navigate(`/quotations/${quot.id}`)}
                  className="p-3.5 rounded-2xl bg-slate-50/70 hover:bg-slate-100 border border-slate-100 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {quot.providerBusinessName}
                      </span>
                      <StatusBadge
                        status={quot.statusName}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Incident: {quot.incidentTitle || 'N/A'} • {quot.items?.length || 0} line items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">
                      LKR {(quot.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      Valid until {new Date(quot.validUntilUtc).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
