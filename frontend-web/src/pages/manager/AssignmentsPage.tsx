import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { representativeApi } from '../../lib/api/representativeApi';
import { providerApi } from '../../lib/api/providerApi';
import { incidentApi } from '../../lib/api/incidentApi';
import { RepresentativeResponseDto } from '../../types/representative';
import { ServiceProviderResponseDto } from '../../types/provider';
import { IncidentResponseDto } from '../../types/incident';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, EmptyState } from '../../components/common/FeedbackStates';
import {
  Search,
  Building2,
  Users,
  Briefcase,
} from 'lucide-react';

export const AssignmentsPage: React.FC = () => {
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState<IncidentResponseDto[]>([]);
  const [reps, setReps] = useState<RepresentativeResponseDto[]>([]);
  const [providers, setProviders] = useState<ServiceProviderResponseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        setLoading(true);
        const [incRes, repsRes, provRes] = await Promise.all([
          incidentApi.getIncidents({ pageSize: 20 }),
          representativeApi.getRepresentatives({ pageSize: 20 }),
          providerApi.getProviders({ pageSize: 20 }),
        ]);

        if (incRes.data) setIncidents(incRes.data.items);
        if (repsRes.data) setReps(repsRes.data.items);
        if (provRes.data) setProviders(provRes.data.items);
      } catch (err) {
        console.error('Failed to load assignments data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAssignments();
  }, []);

  if (loading) {
    return <LoadingState message="Loading coordination & maintenance assignments..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Coordination & Assignments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Member 2 dispatch oversight: Who is assigned, who is available, and contractor matching
          </p>
        </div>

        <button
          onClick={() => navigate('/providers/search')}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition"
        >
          <Search className="h-4 w-4" />
          Search & Match Contractor
        </button>
      </div>

      {/* Main Table */}
      {incidents.length === 0 ? (
        <EmptyState
          title="No pending assignments"
          description="All property maintenance incidents currently have assigned coordinators."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Incident / Asset</th>
                  <th className="py-3.5 px-4">Representative</th>
                  <th className="py-3.5 px-4">Assigned Provider</th>
                  <th className="py-3.5 px-4">Scheduled Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {incidents.map((incident, idx) => {
                  const assignedRep = reps[idx % (reps.length || 1)]?.fullName || 'Nimal Perera';
                  const assignedProvider = providers[idx % (providers.length || 1)]?.businessName || 'ABC Plumbing';

                  return (
                    <tr
                      key={incident.id}
                      onClick={() => navigate(`/incidents/${incident.id}`)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 text-xs">{incident.title}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            {incident.assetName} • {incident.assetCity}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Users className="h-3.5 w-3.5 text-blue-600" />
                          <span>{assignedRep}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <Briefcase className="h-3.5 w-3.5 text-sky-600" />
                          <span>{assignedProvider}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        <span className="font-mono text-[11px]">
                          {new Date(incident.createdAtUtc).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge
                          status={incident.status === 'Reported' ? 'Pending' : 'Assigned'}
                          size="sm"
                        />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/providers/search?incidentId=${incident.id}`);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-xs font-bold transition"
                        >
                          Match Provider
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default AssignmentsPage;
