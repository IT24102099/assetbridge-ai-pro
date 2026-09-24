import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  Plus,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { followUpApi } from '../../lib/api/followUpApi';
import { assetApi } from '../../lib/api/assetApi';
import {
  FollowUpTaskDto,
  FollowUpStatus,
  FollowUpPriority
} from '../../types/workflow';
import { AssetResponseDto } from '../../types/asset';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';

export default function FollowUpContinuityPage() {
  const [tasks, setTasks] = useState<FollowUpTaskDto[]>([]);
  const [assets, setAssets] = useState<AssetResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Schedule Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    assetId: '',
    title: '',
    description: '',
    dueDate: '',
    priority: FollowUpPriority.Medium,
    submitting: false,
    error: null as string | null
  });

  // Complete / Update Modal
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    task: FollowUpTaskDto | null;
    targetStatus: FollowUpStatus;
    notes: string;
    submitting: boolean;
    error: string | null;
  }>({
    isOpen: false,
    task: null,
    targetStatus: FollowUpStatus.Completed,
    notes: '',
    submitting: false,
    error: null
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksRes, assetsRes] = await Promise.all([
        followUpApi.getFollowUps({ pageSize: 50 }),
        assetApi.getAssets({ pageSize: 50 })
      ]);

      if (tasksRes.success && tasksRes.data) {
        setTasks(tasksRes.data.items || []);
      }
      if (assetsRes.success && assetsRes.data) {
        const assetList = assetsRes.data.items || [];
        setAssets(assetList);
        if (assetList.length > 0) {
          setCreateForm((prev) => ({ ...prev, assetId: assetList[0].id }));
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load continuity tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.assetId || !createForm.title || !createForm.dueDate) {
      setCreateForm((prev) => ({ ...prev, error: 'Please fill in all required fields.' }));
      return;
    }

    try {
      setCreateForm((prev) => ({ ...prev, submitting: true, error: null }));
      const res = await followUpApi.createFollowUp({
        assetId: createForm.assetId,
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        dueDateUtc: new Date(createForm.dueDate).toISOString(),
        priority: createForm.priority
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        setCreateForm({
          assetId: assets[0]?.id || '',
          title: '',
          description: '',
          dueDate: '',
          priority: FollowUpPriority.Medium,
          submitting: false,
          error: null
        });
        loadData();
      } else {
        setCreateForm((prev) => ({ ...prev, submitting: false, error: res.message || 'Failed to schedule task.' }));
      }
    } catch (err: any) {
      setCreateForm((prev) => ({
        ...prev,
        submitting: false,
        error: err?.response?.data?.message || err?.message || 'Failed to schedule task.'
      }));
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModal.task) return;

    try {
      setStatusModal((prev) => ({ ...prev, submitting: true, error: null }));
      const res = await followUpApi.updateFollowUpStatus(statusModal.task.id, {
        status: statusModal.targetStatus,
        resolutionNotes: statusModal.notes.trim() || undefined
      });

      if (res.success) {
        setStatusModal({ isOpen: false, task: null, targetStatus: FollowUpStatus.Completed, notes: '', submitting: false, error: null });
        loadData();
      } else {
        setStatusModal((prev) => ({ ...prev, submitting: false, error: res.message || 'Failed to update status.' }));
      }
    } catch (err: any) {
      setStatusModal((prev) => ({
        ...prev,
        submitting: false,
        error: err?.response?.data?.message || err?.message || 'Failed to update status.'
      }));
    }
  };

  const filtered = tasks.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status.toString() === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority.toString() === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const pendingCount = tasks.filter((t) => t.status === FollowUpStatus.Pending || t.status === FollowUpStatus.Scheduled).length;
  const overdueCount = tasks.filter((t) => t.isOverdue).length;
  const completedCount = tasks.filter((t) => t.status === FollowUpStatus.Completed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <RotateCcw className="h-6 w-6 text-emerald-600" />
            Property Continuity & Follow-Up Tasks
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Post-maintenance warranty tracking, preventive inspections, and ongoing property health
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Schedule Follow-Up
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Scheduled Checkups"
          value={pendingCount}
          subtitle="Upcoming preventive visits"
          icon={Calendar}
          variant="blue"
        />
        <StatCard
          title="Overdue Tasks"
          value={overdueCount}
          subtitle="Attention required"
          icon={AlertTriangle}
          variant="red"
        />
        <StatCard
          title="Resolved / Verified"
          value={completedCount}
          subtitle="Warranty closed out"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title="Monitored Assets"
          value={assets.length}
          subtitle="Active portfolio properties"
          icon={Building}
          variant="purple"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search continuity tasks, properties..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="all">All Statuses</option>
            <option value={FollowUpStatus.Pending.toString()}>Pending</option>
            <option value={FollowUpStatus.Scheduled.toString()}>Scheduled</option>
            <option value={FollowUpStatus.InProgress.toString()}>In Progress</option>
            <option value={FollowUpStatus.Completed.toString()}>Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="all">All Priorities</option>
            <option value={FollowUpPriority.Low.toString()}>Low</option>
            <option value={FollowUpPriority.Medium.toString()}>Medium</option>
            <option value={FollowUpPriority.High.toString()}>High</option>
            <option value={FollowUpPriority.Urgent.toString()}>Urgent</option>
          </select>
        </div>
      </div>

      {/* Continuity Tasks Table */}
      {loading ? (
        <LoadingState message="Loading property continuity tasks..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No continuity tasks found"
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try changing your search parameters or filter criteria.'
              : 'Schedule post-repair warranty checks or annual HVAC & roof inspections.'
          }
          actionLabel="+ Schedule Follow-Up"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Task / Focus</th>
                  <th className="py-3.5 px-4">Property Asset</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">{task.title}</span>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{task.description}</p>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {task.assetName}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{new Date(task.dueDateUtc).toLocaleDateString()}</span>
                      </div>
                      {task.isOverdue && (
                        <span className="text-[10px] text-red-600 font-bold block">Overdue</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          task.priority === FollowUpPriority.Urgent
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : task.priority === FollowUpPriority.High
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {task.priorityName}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={task.statusName} />
                    </td>

                    <td className="py-3 px-4 text-right">
                      {task.status !== FollowUpStatus.Completed && (
                        <button
                          onClick={() =>
                            setStatusModal({
                              isOpen: true,
                              task,
                              targetStatus: FollowUpStatus.Completed,
                              notes: '',
                              submitting: false,
                              error: null
                            })
                          }
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Mark Done
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {currentPage} of {totalPages} ({filtered.length} total tasks)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Follow-Up Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Schedule Continuity Task</h2>
                  <p className="text-xs text-slate-500">Post-maintenance warranty check or preventive service</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {createForm.error && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{createForm.error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Property Asset *</label>
                <select
                  value={createForm.assetId}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, assetId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.city || 'Property'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Task Headline *</label>
                <input
                  type="text"
                  placeholder="e.g. 6-Month Ceiling Waterproofing Warranty Inspection"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Target Due Date *</label>
                  <input
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Priority Level</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, priority: parseInt(e.target.value) as FollowUpPriority }))
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value={FollowUpPriority.Low}>Low</option>
                    <option value={FollowUpPriority.Medium}>Medium</option>
                    <option value={FollowUpPriority.High}>High</option>
                    <option value={FollowUpPriority.Urgent}>Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Scope & Warranty Instructions</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Inspect ceiling plaster and pipe seals to ensure zero secondary seepage under 12-month contractor guarantee."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createForm.submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  {createForm.submitting ? 'Scheduling...' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Task Modal */}
      {statusModal.isOpen && statusModal.task && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Mark Continuity Task Completed</h3>
            <p className="text-xs text-slate-500">{statusModal.task.title} • {statusModal.task.assetName}</p>

            <form onSubmit={handleStatusSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Verification Notes</label>
                <textarea
                  value={statusModal.notes}
                  onChange={(e) => setStatusModal((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Verified by site visit; no leak recurrence found. Warranty confirmed active."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModal({ isOpen: false, task: null, targetStatus: FollowUpStatus.Completed, notes: '', submitting: false, error: null })}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusModal.submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
                >
                  {statusModal.submitting ? 'Updating...' : 'Confirm Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
