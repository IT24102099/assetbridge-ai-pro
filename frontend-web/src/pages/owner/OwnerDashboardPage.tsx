import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { assetApi } from '../../lib/api/assetApi';
import { incidentApi } from '../../lib/api/incidentApi';
import { AssetResponseDto } from '../../types/asset';
import { IncidentResponseDto } from '../../types/incident';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import {
  Home,
  AlertCircle,
  Clock,
  CheckCircle2,
  PlusCircle,
  Bot,
  MapPin,
} from 'lucide-react';
import { ReportIncidentModal } from '../incidents/ReportIncidentModal';

export const OwnerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assets, setAssets] = useState<AssetResponseDto[]>([]);
  const [incidents, setIncidents] = useState<IncidentResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [assetsRes, incidentsRes] = await Promise.all([
        assetApi.getAssets({ pageSize: 10 }),
        incidentApi.getIncidents({ pageSize: 10 }),
      ]);

      if (assetsRes.data) {
        setAssets(assetsRes.data.items);
      }
      if (incidentsRes.data) {
        setIncidents(incidentsRes.data.items);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data', err);
      setError(err?.response?.data?.message || 'Failed to load portfolio dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Dynamic metrics from actual API data
  const totalAssets = assets.length;
  const openIncidents = incidents.filter(
    (i) => i.status !== 'Resolved' && i.status !== 'Closed' && i.status !== 'Cancelled'
  ).length;
  const pendingApprovals = incidents.filter(
    (i) => i.status === 'Validating' || i.status === 'Planning' || i.status === 'ProviderSelection'
  ).length;
  const completedIncidents = incidents.filter(
    (i) => i.status === 'Resolved' || i.status === 'Closed'
  ).length;

  if (loading) {
    return <LoadingState message="Loading your asset portfolio & active maintenance tasks..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboardData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header Greeting matching Screen 2 wireframe: "Good evening, [actual user name]!" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {getGreeting()}, {user?.fullName || 'Property Owner'}!
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview of your property portfolio and ongoing maintenance tasks
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition"
          >
            <PlusCircle className="h-4 w-4" />
            Report Incident
          </button>
        </div>
      </div>

      {/* 4 Metric Cards matching Screen 2 wireframe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: My Assets */}
        <div
          onClick={() => navigate('/assets')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-4"
        >
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Home className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">{totalAssets}</div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">My Assets</p>
          </div>
        </div>

        {/* Card 2: Open Incidents */}
        <div
          onClick={() => navigate('/incidents')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-4"
        >
          <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">{openIncidents}</div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Open Incidents</p>
          </div>
        </div>

        {/* Card 3: Pending Approvals */}
        <div
          onClick={() => navigate('/incidents')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-4"
        >
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">{pendingApprovals}</div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Pending Approvals</p>
          </div>
        </div>

        {/* Card 4: Completed Incidents */}
        <div
          onClick={() => navigate('/incidents')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-4"
        >
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">{completedIncidents}</div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Completed Incidents</p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Content: Recent Incidents (Left) + AI Assistant & Portfolio (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Incidents List matching Screen 2 wireframe */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Recent Incidents</h2>
            <button
              onClick={() => navigate('/incidents')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {incidents.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-700 text-xs">No active incidents reported</p>
                <p className="text-[11px] text-slate-400 mt-0.5">All properties operate normally.</p>
              </div>
            ) : (
              incidents.slice(0, 5).map((incident) => (
                <div
                  key={incident.id}
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                  className="p-4 hover:bg-slate-50/80 transition cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {incident.title} - {incident.assetName}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      INC-{incident.id.slice(0, 4).toUpperCase()} •{' '}
                      {new Date(incident.createdAtUtc).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <StatusBadge status={incident.priority} size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: AI Assistant & Quick Actions */}
        <div className="space-y-6">
          {/* AI Assistant Quick Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700 space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Bot className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold tracking-wider uppercase text-cyan-400">
                AI Assistant
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold">Diagnose Incident Instantly</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Ask questions, retrieve maintenance manuals, or get automated trade recommendations.
              </p>
            </div>

            <button
              onClick={() => navigate('/ai-assistant')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition"
            >
              <Bot className="h-4 w-4" />
              Ask AI Assistant
            </button>
          </div>

          {/* Quick Portfolio Properties Snapshot */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">Portfolio Properties</h3>
              <button
                onClick={() => navigate('/assets')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
              >
                All ({assets.length})
              </button>
            </div>

            <div className="space-y-2">
              {assets.slice(0, 3).map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => navigate(`/assets/${asset.id}`)}
                  className="p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{asset.name}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-300" />
                      {asset.city}, Sri Lanka
                    </p>
                  </div>
                  <StatusBadge status={asset.status} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Report Incident Modal */}
      {isReportModalOpen && (
        <ReportIncidentModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSuccess={() => {
            setIsReportModalOpen(false);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
};
export default OwnerDashboardPage;
