import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { incidentApi } from '../../lib/api/incidentApi';
import {
  IncidentResponseDto,
  IncidentCategory,
  IncidentPriority,
  IncidentStatus,
} from '../../types/incident';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/FeedbackStates';
import { ReportIncidentModal } from './ReportIncidentModal';
import {
  PlusCircle,
  Search,
  Building2,
  ArrowRight,
} from 'lucide-react';

const CATEGORIES: { value: IncidentCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'Plumbing', label: 'Plumbing' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Roofing', label: 'Roofing' },
  { value: 'Structural', label: 'Structural' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'Carpentry', label: 'Carpentry' },
  { value: 'PestControl', label: 'Pest Control' },
  { value: 'Painting', label: 'Painting' },
  { value: 'General', label: 'General' },
];

const PRIORITIES: { value: IncidentPriority | ''; label: string }[] = [
  { value: '', label: 'All Priorities' },
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Emergency', label: 'Emergency' },
];

const STATUSES: { value: IncidentStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'Reported', label: 'Reported' },
  { value: 'Validating', label: 'Validating' },
  { value: 'Planning', label: 'Planning' },
  { value: 'ProviderSelection', label: 'Provider Selection' },
  { value: 'InspectionPending', label: 'Inspection Pending' },
  { value: 'WorkInProgress', label: 'Work In Progress' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export const IncidentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<IncidentResponseDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory | ''>('');
  const [selectedPriority, setSelectedPriority] = useState<IncidentPriority | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus | ''>('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await incidentApi.getIncidents({
        pageNumber: page,
        pageSize,
        searchTerm: searchTerm.trim() || undefined,
        category: selectedCategory || undefined,
        priority: selectedPriority || undefined,
        status: selectedStatus || undefined,
      });

      if (res.data) {
        setIncidents(res.data.items);
        setTotalCount(res.data.totalCount);
      }
    } catch (err: any) {
      console.error('Failed to load incidents', err);
      setError(err?.response?.data?.message || 'Failed to retrieve property incidents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, selectedCategory, selectedPriority, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchIncidents();
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Incident Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track, report and resolve property maintenance requests with AI triage
          </p>
        </div>
        <button
          onClick={() => setIsReportModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition"
        >
          <PlusCircle className="h-4 w-4" />
          Report Incident
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by incident title, details, or asset..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value as IncidentCategory | '');
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => {
              setSelectedPriority(e.target.value as IncidentPriority | '');
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as IncidentStatus | '');
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <LoadingState message="Loading maintenance incidents..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchIncidents} />
      ) : incidents.length === 0 ? (
        <EmptyState
          title="No incidents found"
          description="There are no active or historical incidents matching your search filters."
          actionLabel="Report an Incident"
          onAction={() => setIsReportModalOpen(true)}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Incident / ID</th>
                  <th className="py-3.5 px-4">Property Asset</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Reported Date</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <span className="font-mono text-[11px] font-bold text-blue-600">
                          INC-{incident.id.slice(0, 6).toUpperCase()}
                        </span>
                        <p className="font-bold text-slate-900 text-xs line-clamp-1">
                          {incident.title}
                        </p>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold">{incident.assetName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 pl-5">{incident.assetCity}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {incident.category}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <StatusBadge status={incident.priority} size="sm" />
                    </td>

                    <td className="py-4 px-4">
                      <StatusBadge status={incident.status} size="sm" />
                    </td>

                    <td className="py-4 px-4 text-slate-500 text-[11px]">
                      {new Date(incident.createdAtUtc).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/incidents/${incident.id}`);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
                      >
                        View <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Showing <span className="font-bold text-slate-800">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-slate-800">{Math.min(page * pageSize, totalCount)}</span> of{' '}
              <span className="font-bold text-slate-800">{totalCount}</span> incidents
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-40 transition"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-slate-700 px-3 py-1.5">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <ReportIncidentModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSuccess={() => {
            setIsReportModalOpen(false);
            fetchIncidents();
          }}
        />
      )}
    </div>
  );
};
export default IncidentListPage;
