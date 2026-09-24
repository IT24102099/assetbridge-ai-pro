import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { inspectionApi } from '../../lib/api/inspectionApi';
import { InspectionResponseDto, InspectionStatus, FindingSeverity } from '../../types/inspection';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';
import CreateInspectionModal from './CreateInspectionModal';

export default function InspectionListPage() {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<InspectionResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadInspections = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await inspectionApi.getInspections({ pageSize: 50 });
      if (res.success && res.data) {
        setInspections(res.data.items || []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load inspections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, []);

  // Filtered Inspections
  const filtered = inspections.filter((insp) => {
    const matchesSearch =
      !searchQuery ||
      insp.incidentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insp.inspectorBusinessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (insp.summary && insp.summary.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || insp.status.toString() === statusFilter;

    const matchesSeverity =
      severityFilter === 'all' ||
      (insp.estimatedSeverity !== undefined && insp.estimatedSeverity !== null && insp.estimatedSeverity.toString() === severityFilter);

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Technical Inspections</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage physical site assessments, technical defect findings & repair recommendations
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Schedule Inspection
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by incident title, inspector name, or defect notes..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-44">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="all">All Statuses</option>
            <option value={InspectionStatus.Scheduled.toString()}>Scheduled</option>
            <option value={InspectionStatus.InProgress.toString()}>In Progress</option>
            <option value={InspectionStatus.Completed.toString()}>Completed</option>
            <option value={InspectionStatus.Cancelled.toString()}>Cancelled</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div className="w-full md:w-44">
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="all">All Severities</option>
            <option value={FindingSeverity.Low.toString()}>Low Severity</option>
            <option value={FindingSeverity.Medium.toString()}>Medium Severity</option>
            <option value={FindingSeverity.High.toString()}>High Severity</option>
            <option value={FindingSeverity.Critical.toString()}>Critical Severity</option>
          </select>
        </div>
      </div>

      {/* Inspections Table */}
      {loading ? (
        <LoadingState message="Loading inspection records..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadInspections} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No inspections found"
          description={
            searchQuery || statusFilter !== 'all' || severityFilter !== 'all'
              ? 'Try changing your search parameters or filter criteria.'
              : 'Schedule your first technical inspection to assess property damage.'
          }
          actionLabel="+ Schedule Inspection"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Inspection / Incident</th>
                  <th className="py-3.5 px-4">Inspector / Contractor</th>
                  <th className="py-3.5 px-4">Scheduled Date</th>
                  <th className="py-3.5 px-4">Findings</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((insp) => (
                  <tr key={insp.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {insp.incidentTitle || 'Incident Inspection'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {insp.id.slice(0, 8)}...
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800">
                      {insp.inspectorBusinessName || 'Assigned Contractor'}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(insp.scheduledAtUtc).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px]">
                          {insp.findings?.length || 0} finding(s)
                        </span>
                        {insp.estimatedSeverity && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              insp.estimatedSeverity === FindingSeverity.Critical
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : insp.estimatedSeverity === FindingSeverity.High
                                ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {insp.estimatedSeverity === FindingSeverity.Critical
                              ? 'Critical'
                              : insp.estimatedSeverity === FindingSeverity.High
                              ? 'High'
                              : insp.estimatedSeverity === FindingSeverity.Medium
                              ? 'Medium'
                              : 'Low'}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge
                        status={insp.statusName}
                      />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/inspections/${insp.id}`)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Numbered Pagination matching Wireframe */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} inspections
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CreateInspectionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadInspections}
      />
    </div>
  );
}
