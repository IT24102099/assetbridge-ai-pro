import { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Building,
  Wrench,
  Layers
} from 'lucide-react';
import { maintenanceApi } from '../../lib/api/maintenanceApi';
import { quotationApi } from '../../lib/api/quotationApi';
import { MaintenanceJobResponseDto, MaintenanceJobStatus } from '../../types/maintenance';
import { QuotationResponseDto } from '../../types/quotation';
import { StatCard } from '../../components/common/StatCard';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';

export default function MaintenanceReportsPage() {
  const [jobs, setJobs] = useState<MaintenanceJobResponseDto[]>([]);
  const [quotations, setQuotations] = useState<QuotationResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [jobsRes, quotRes] = await Promise.all([
        maintenanceApi.getJobs({ pageSize: 100 }),
        quotationApi.getQuotations({ pageSize: 100 })
      ]);

      if (jobsRes.success && jobsRes.data) {
        setJobs(jobsRes.data.items || []);
      }
      if (quotRes.success && quotRes.data) {
        setQuotations(quotRes.data.items || []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load maintenance reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  if (loading) {
    return <LoadingState message="Generating maintenance cost analytics..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadReportData} />;
  }

  const completedJobs = jobs.filter(
    (j) => j.status === MaintenanceJobStatus.Completed || j.status === MaintenanceJobStatus.Closed
  );

  const totalSpentLkr = completedJobs.reduce(
    (acc, j) => acc + (j.actualCost || j.approvedBudget || 0),
    0
  );

  const totalApprovedBudgetLkr = jobs.reduce((acc, j) => acc + (j.approvedBudget || 0), 0);

  const avgJobCostLkr =
    completedJobs.length > 0 ? totalSpentLkr / completedJobs.length : 0;

  // Group by Provider
  const costByProvider: Record<string, number> = {};
  jobs.forEach((j) => {
    const prov = j.providerBusinessName || 'Unassigned';
    costByProvider[prov] = (costByProvider[prov] || 0) + (j.actualCost || j.approvedBudget || 0);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Maintenance Reports & Cost Analytics</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time expenditure tracking, contractor cost allocations, and budget variance in Sri Lankan Rupees (LKR)
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Maintenance Spend"
          value={`LKR ${totalSpentLkr.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          subtitle={`${completedJobs.length} completed work orders`}
          icon={DollarSign}
          variant="emerald"
        />
        <StatCard
          title="Average Cost / Job"
          value={`LKR ${avgJobCostLkr.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          subtitle="Mean repair expenditure"
          icon={TrendingUp}
          variant="blue"
        />
        <StatCard
          title="Committed Budget"
          value={`LKR ${totalApprovedBudgetLkr.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          subtitle={`${jobs.length} total work orders`}
          icon={Layers}
          variant="purple"
        />
        <StatCard
          title="Active Work In-Progress"
          value={jobs.filter((j) => j.status === MaintenanceJobStatus.InProgress).length}
          subtitle="Current contractor dispatches"
          icon={Wrench}
          variant="amber"
        />
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="No maintenance data available yet"
          description="Analytics will automatically calculate once maintenance jobs and quotations are processed in the system."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expenditure by Contractor Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Building className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Spend by Service Provider</h2>
                <p className="text-[11px] text-slate-500">Contractor allocations in LKR</p>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(costByProvider).map(([providerName, amount]) => {
                const pct = totalSpentLkr > 0 ? (amount / totalSpentLkr) * 100 : 0;
                return (
                  <div key={providerName} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800">{providerName}</span>
                      <span className="text-slate-900 font-bold">
                        LKR {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quotations vs Approved Spend Summary */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <PieChart className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Portfolio Budget Variance</h2>
                <p className="text-[11px] text-slate-500">Approved budget vs actual invoiced cost</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 font-bold block">Total Approved Budget</span>
                  <span className="text-sm font-bold text-slate-900">
                    LKR {totalApprovedBudgetLkr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold">
                  100% Authorized
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-emerald-700 font-bold block">Actual Completed Spend</span>
                  <span className="text-sm font-bold text-emerald-950">
                    LKR {totalSpentLkr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold">
                  {totalApprovedBudgetLkr > 0
                    ? `${((totalSpentLkr / totalApprovedBudgetLkr) * 100).toFixed(1)}% Utilized`
                    : '0%'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-center justify-between">
                <div>
                  <span className="text-purple-700 font-bold block">Submitted Quotations Value</span>
                  <span className="text-sm font-bold text-purple-950">
                    LKR {quotations.reduce((acc, q) => acc + (q.totalAmount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold">
                  {quotations.length} Bids Evaluated
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
