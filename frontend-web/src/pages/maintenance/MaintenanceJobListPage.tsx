import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { maintenanceApi } from '../../lib/api/maintenanceApi';
import { MaintenanceJobResponseDto, MaintenanceJobStatus } from '../../types/maintenance';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';
import CreateMaintenanceJobModal from './CreateMaintenanceJobModal';

export default function MaintenanceJobListPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<MaintenanceJobResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await maintenanceApi.getJobs({ pageSize: 50 });
      if (res.success && res.data) {
        setJobs(res.data.items || []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load maintenance jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const filtered = jobs.filter((j) => {
    const matchesSearch =
      !searchQuery ||
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.providerBusinessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.incidentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || j.status.toString() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Maintenance Work Orders</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track ongoing repairs, contractor milestones, schedule deadlines & completed maintenance jobs
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Create Maintenance Job
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by job title, provider, incident, or description..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="all">All Statuses</option>
            <option value={MaintenanceJobStatus.Planned.toString()}>Planned</option>
            <option value={MaintenanceJobStatus.Scheduled.toString()}>Scheduled</option>
            <option value={MaintenanceJobStatus.InProgress.toString()}>In Progress</option>
            <option value={MaintenanceJobStatus.Completed.toString()}>Completed</option>
            <option value={MaintenanceJobStatus.Cancelled.toString()}>Cancelled</option>
            <option value={MaintenanceJobStatus.Closed.toString()}>Closed</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      {loading ? (
        <LoadingState message="Loading maintenance work orders..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadJobs} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No maintenance jobs found"
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try changing your search parameters or filter criteria.'
              : 'Create a maintenance job from an approved incident quotation to begin repairs.'
          }
          actionLabel="+ Create Maintenance Job"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Job Title / Incident</th>
                  <th className="py-3.5 px-4">Assigned Contractor</th>
                  <th className="py-3.5 px-4">Schedule</th>
                  <th className="py-3.5 px-4">Budget / Cost (LKR)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">{job.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Incident: {job.incidentTitle || 'N/A'} • ID: {job.id.slice(0, 8)}...
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {job.providerBusinessName}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{new Date(job.scheduledStartUtc).toLocaleDateString()}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">
                        LKR {(job.approvedBudget || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      {job.actualCost !== undefined && job.actualCost !== null && (
                        <span className="text-[10px] text-emerald-600 font-bold block">
                          Actual: LKR {job.actualCost.toLocaleString()}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge
                        status={job.statusName}
                      />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/maintenance/jobs/${job.id}`)}
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

          {/* Numbered Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} jobs
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
      <CreateMaintenanceJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadJobs}
      />
    </div>
  );
}
