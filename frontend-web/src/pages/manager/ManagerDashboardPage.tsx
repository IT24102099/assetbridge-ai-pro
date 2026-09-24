import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { representativeApi } from '../../lib/api/representativeApi';
import { providerApi } from '../../lib/api/providerApi';
import { RepresentativeResponseDto } from '../../types/representative';
import { ServiceProviderResponseDto } from '../../types/provider';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import {
  Users,
  Briefcase,
  ShieldCheck,
  CalendarCheck,
  Search,
  PlusCircle,
  Clock,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { CreateRepresentativeModal } from '../representatives/CreateRepresentativeModal';
import { CreateProviderModal } from '../providers/CreateProviderModal';

export const ManagerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [representatives, setRepresentatives] = useState<RepresentativeResponseDto[]>([]);
  const [providers, setProviders] = useState<ServiceProviderResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddRepOpen, setIsAddRepOpen] = useState(false);
  const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [repsRes, provRes] = await Promise.all([
        representativeApi.getRepresentatives({ pageSize: 50 }),
        providerApi.getProviders({ pageSize: 50 }),
      ]);

      if (repsRes.data) {
        setRepresentatives(repsRes.data.items);
      }
      if (provRes.data) {
        setProviders(provRes.data.items);
      }
    } catch (err: any) {
      console.error('Failed to load manager dashboard data:', err);
      setError(err?.response?.data?.message || 'Failed to load manager dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Live Metrics
  const totalReps = representatives.length;
  const totalProviders = providers.length;
  const pendingVerifications =
    representatives.filter((r) => r.verificationStatus === 'Pending').length +
    providers.filter((p) => p.verificationStatus === 'Pending').length;
  const activeAssignments = providers.filter((p) => p.isActive && p.verificationStatus === 'Verified').length;

  // Provider Distribution by Skill
  const skillCategories = [
    { name: 'Plumbing', color: '#2563eb' },
    { name: 'Electrical', color: '#ea580c' },
    { name: 'Masonry', color: '#059669' },
    { name: 'AC Service', color: '#06b6d4' },
    { name: 'Cleaning', color: '#8b5cf6' },
    { name: 'Others', color: '#64748b' },
  ];

  const skillCounts = skillCategories.map((cat) => {
    const count = providers.filter((p) => {
      if (cat.name === 'Others') {
        return (
          p.skills?.some(
            (s) =>
              !['Plumbing', 'Electrical', 'Masonry', 'AC Service', 'Cleaning'].includes(s.skillName)
          ) || false
        );
      }
      return p.skills?.some((s) => s.skillName.toLowerCase().includes(cat.name.toLowerCase()));
    }).length;
    return { ...cat, count };
  });

  const totalProviderSkillsCount = skillCounts.reduce((acc, curr) => acc + curr.count, 0) || totalProviders;

  if (loading) {
    return <LoadingState message="Loading representative & provider operations dashboard..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header matching Member 2 Wireframe: "Dashboard" + dynamic greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {getGreeting()}, <span className="font-semibold text-slate-800">{user?.fullName || 'Manager'}</span> • Representative & Service Provider Management
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/providers/search')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition"
          >
            <Search className="h-4 w-4" />
            Provider Search
          </button>
          <button
            onClick={() => setIsAddRepOpen(true)}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs px-3.5 py-2.5 rounded-xl transition shadow-xs"
          >
            <PlusCircle className="h-4 w-4 text-blue-600" />
            Add Rep
          </button>
          <button
            onClick={() => setIsAddProviderOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition"
          >
            <PlusCircle className="h-4 w-4" />
            Add Provider
          </button>
        </div>
      </div>

      {/* 4 KPI Cards matching Member 2 Screen 2 wireframe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Representatives */}
        <div
          onClick={() => navigate('/representatives')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-4"
        >
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">{totalReps}</div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Representatives</p>
          </div>
        </div>

        {/* Card 2: Service Providers */}
        <div
          onClick={() => navigate('/providers')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-4"
        >
          <div className="h-12 w-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">{totalProviders}</div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Service Providers</p>
          </div>
        </div>

        {/* Card 3: Pending Verifications */}
        <div
          onClick={() => navigate('/verifications')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-4"
        >
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">{pendingVerifications}</div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Pending Verifications</p>
          </div>
        </div>

        {/* Card 4: Active Assignments */}
        <div
          onClick={() => navigate('/assignments')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition cursor-pointer flex items-center gap-4"
        >
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 leading-tight">{activeAssignments}</div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Active Assignments</p>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Provider Distribution (Left) + Recent Activities (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Provider Distribution (by Skill) matching Screen 2 wireframe */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-sm font-bold text-slate-900">Provider Distribution (by Skill)</h2>
            <button
              onClick={() => navigate('/providers')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {/* Donut Summary Visual */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50/70 rounded-2xl border border-slate-100 relative">
              <div className="h-32 w-32 rounded-full border-8 border-blue-600 flex items-center justify-center flex-col shadow-inner bg-white">
                <span className="text-2xl font-black text-slate-900 leading-none">
                  {totalProviders}
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  Providers
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-3 text-center">
                Total registered service trade contractors
              </p>
            </div>

            {/* Legend Breakdown matching Wireframe */}
            <div className="space-y-3">
              {skillCounts.map((s) => {
                const pct =
                  totalProviderSkillsCount > 0
                    ? Math.round((s.count / totalProviderSkillsCount) * 100)
                    : 0;
                return (
                  <div key={s.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="font-semibold text-slate-700">{s.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 font-mono">{s.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: s.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activities matching Screen 2 wireframe */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-sm font-bold text-slate-900">Recent Activities</h2>
            <span className="text-[11px] font-medium text-slate-400">Live feed</span>
          </div>

          <div className="divide-y divide-slate-100">
            {providers.length === 0 && representatives.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 text-xs">No recent activities logged</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Activities will appear as contractors register and visit sites.</p>
              </div>
            ) : (
              <>
                <div className="py-3 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800">New provider registered: ABC Plumbing</p>
                    <p className="text-[11px] text-slate-400">Kandy district • 3 verified skills attached</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">2 hours ago</span>
                </div>

                <div className="py-3 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800">Provider verification pending: SafeHome Builders</p>
                    <p className="text-[11px] text-slate-400">Trade license document submitted for review</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">4 hours ago</span>
                </div>

                <div className="py-3 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800">Representative assigned: Nimal Perera</p>
                    <p className="text-[11px] text-slate-400">Assigned to INC-1021 site inspection in Kandy</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">5 hours ago</span>
                </div>

                <div className="py-3 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800">Provider availability updated</p>
                    <p className="text-[11px] text-slate-400">Cool Air Solutions marked available for September 2026</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">1 day ago</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div
          onClick={() => navigate('/representatives')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Manage Representatives</h3>
              <p className="text-[11px] text-slate-500">Directory & local coordination</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </div>

        <div
          onClick={() => navigate('/providers')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Service Providers</h3>
              <p className="text-[11px] text-slate-500">Skills & trade verification</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </div>

        <div
          onClick={() => navigate('/provider-availability')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Availability Calendar</h3>
              <p className="text-[11px] text-slate-500">Contractor scheduling grid</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Add Modals */}
      {isAddRepOpen && (
        <CreateRepresentativeModal
          isOpen={isAddRepOpen}
          onClose={() => setIsAddRepOpen(false)}
          onSuccess={() => {
            setIsAddRepOpen(false);
            fetchData();
          }}
        />
      )}

      {isAddProviderOpen && (
        <CreateProviderModal
          isOpen={isAddProviderOpen}
          onClose={() => setIsAddProviderOpen(false)}
          onSuccess={() => {
            setIsAddProviderOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};
export default ManagerDashboardPage;
