import React, { useState, useEffect } from 'react';
import { assetApi } from '../../lib/api/assetApi';
import { incidentApi } from '../../lib/api/incidentApi';
import { AssetResponseDto } from '../../types/asset';
import { IncidentResponseDto } from '../../types/incident';
import { StatCard } from '../../components/common/StatCard';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import {
  Download,
  Building2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export const OwnerReportsPage: React.FC = () => {
  const [assets, setAssets] = useState<AssetResponseDto[]>([]);
  const [incidents, setIncidents] = useState<IncidentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('YearToDate');

  useEffect(() => {
    const loadReportData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [assetsRes, incRes] = await Promise.all([
          assetApi.getAssets({ pageSize: 50 }),
          incidentApi.getIncidents({ pageSize: 100 }),
        ]);

        if (assetsRes.data) setAssets(assetsRes.data.items);
        if (incRes.data) setIncidents(incRes.data.items);
      } catch (err: any) {
        console.error('Failed to load report data', err);
        setError(err?.response?.data?.message || 'Failed to generate property portfolio reports.');
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, []);

  if (loading) {
    return <LoadingState message="Generating portfolio analytics & expense summaries..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  const totalAssets = assets.length;
  const totalIncidents = incidents.length;
  const resolvedCount = incidents.filter((i) => i.status === 'Resolved' || i.status === 'Closed').length;
  const resolutionRate = totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 100;

  // Category breakdown
  const categoryCounts = incidents.reduce((acc: Record<string, number>, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {});

  const handleExport = (format: 'PDF' | 'CSV') => {
    alert(`Exporting AssetBridge Property & Maintenance Report in ${format} format...`);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Portfolio & Incident Reports</h1>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive property health metrics, maintenance expenditures, and resolution audit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="ThisMonth">This Month</option>
            <option value="LastQuarter">Last Quarter</option>
            <option value="YearToDate">Year to Date (2026)</option>
            <option value="AllTime">All Time</option>
          </select>

          <button
            onClick={() => handleExport('PDF')}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Managed Assets"
          value={totalAssets}
          subtitle="Registered real estate"
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Logged Incidents"
          value={totalIncidents}
          subtitle="Triage cases"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Resolution Rate"
          value={`${resolutionRate}%`}
          subtitle="Cases closed successfully"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Avg Triage Speed"
          value="< 2.4 hrs"
          subtitle="AI & Representative"
          icon={TrendingUp}
          color="indigo"
        />
      </div>

      {/* 2-Column Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Distribution by Category */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Incident Distribution by Trade</h3>
          <div className="space-y-3 pt-2">
            {Object.keys(categoryCounts).length === 0 ? (
              <p className="text-xs text-slate-500">No incident categories recorded yet.</p>
            ) : (
              Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = Math.round((count / totalIncidents) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{cat}</span>
                      <span className="text-slate-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Property Portfolio Health Table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Property Health Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="pb-2">Property Name</th>
                  <th className="pb-2">Location</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Incidents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-bold text-slate-800">{asset.name}</td>
                    <td className="py-2.5 text-slate-500">
                      {asset.city}, {asset.district}
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {asset.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-700">
                      {asset.activeIncidentCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
export default OwnerReportsPage;
