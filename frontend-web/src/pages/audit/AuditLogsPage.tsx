import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Activity,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers
} from 'lucide-react';
import { auditApi } from '../../lib/api/auditApi';
import {
  AuditEventDto,
  AuditEventType
} from '../../types/workflow';
import { StatCard } from '../../components/common/StatCard';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';

export default function AuditLogsPage() {
  const [auditEvents, setAuditEvents] = useState<AuditEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 15;

  // Selected event for metadata view
  const [selectedEvent, setSelectedEvent] = useState<AuditEventDto | null>(null);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await auditApi.getAuditEvents({
        eventType: eventTypeFilter !== 'all' ? (parseInt(eventTypeFilter) as AuditEventType) : undefined,
        pageNumber: currentPage,
        pageSize
      });

      if (res.success && res.data) {
        setAuditEvents(res.data.items || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.totalCount || 0);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [eventTypeFilter, currentPage]);

  const filtered = auditEvents.filter((evt) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      evt.description.toLowerCase().includes(query) ||
      evt.eventTypeName.toLowerCase().includes(query) ||
      evt.userName?.toLowerCase().includes(query) ||
      evt.correlationId.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-purple-600" />
            Governance Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Append-oriented governance audit trail for multi-agent workflows, human approvals & system actions
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Audit Events"
          value={totalCount || auditEvents.length}
          subtitle="Recorded ledger events"
          icon={Activity}
          variant="purple"
        />
        <StatCard
          title="Security & Integrity"
          value="Append-Only"
          subtitle="Immutable governance trail"
          icon={ShieldCheck}
          variant="emerald"
        />
        <StatCard
          title="Human Decisions"
          value={auditEvents.filter((e) => e.eventType === AuditEventType.ApprovalApproved || e.eventType === AuditEventType.ApprovalRejected).length}
          subtitle="Manager governance actions"
          icon={ShieldCheck}
          variant="amber"
        />
        <StatCard
          title="Agent Executions"
          value={auditEvents.filter((e) => e.eventType === AuditEventType.AgentRunCompleted || e.eventType === AuditEventType.ToolExecuted).length}
          subtitle="Autonomous agent actions"
          icon={Layers}
          variant="blue"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by actor, description, correlation ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="w-full sm:w-60">
          <select
            value={eventTypeFilter}
            onChange={(e) => {
              setEventTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="all">All Event Types</option>
            <option value={AuditEventType.WorkflowCreated.toString()}>Workflow Created</option>
            <option value={AuditEventType.StateTransitioned.toString()}>State Transitioned</option>
            <option value={AuditEventType.ApprovalRequested.toString()}>Approval Requested</option>
            <option value={AuditEventType.ApprovalApproved.toString()}>Approval Approved</option>
            <option value={AuditEventType.ApprovalRejected.toString()}>Approval Rejected</option>
            <option value={AuditEventType.RevisionRequested.toString()}>Revision Requested</option>
            <option value={AuditEventType.AgentRunStarted.toString()}>Agent Run Started</option>
            <option value={AuditEventType.AgentRunCompleted.toString()}>Agent Run Completed</option>
            <option value={AuditEventType.ToolExecuted.toString()}>Tool Executed</option>
            <option value={AuditEventType.FollowUpScheduled.toString()}>Follow-up Scheduled</option>
            <option value={AuditEventType.SecurityViolation.toString()}>Security Violation</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <LoadingState message="Loading governance audit trail..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadAuditLogs} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No audit events found"
          description={
            searchQuery || eventTypeFilter !== 'all'
              ? 'Try changing your search query or event filter criteria.'
              : 'Audit events will record automatically as workflow actions occur.'
          }
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Event Type</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Correlation ID</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 text-right">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{evt.eventTypeName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {evt.id.slice(0, 8)}...</span>
                    </td>

                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {evt.description}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700 block">{evt.userName || 'System Engine'}</span>
                      {evt.userId && (
                        <span className="text-[10px] text-slate-400 font-mono">UID: {evt.userId.slice(0, 8)}...</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {evt.correlationId || 'N/A'}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <span>{new Date(evt.createdAtUtc).toLocaleDateString()}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {new Date(evt.createdAtUtc).toLocaleTimeString()}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {evt.metadataJson ? (
                        <button
                          onClick={() => setSelectedEvent(evt)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] font-bold rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Info className="h-3 w-3" />
                          JSON
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
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
                Page {currentPage} of {totalPages} ({totalCount} total audit records)
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

      {/* Metadata JSON Viewer Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Audit Event Metadata</h3>
                <p className="text-xs text-slate-500">{selectedEvent.eventTypeName} • {selectedEvent.id}</p>
              </div>
            </div>

            <div className="p-6">
              <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-72">
                {JSON.stringify(JSON.parse(selectedEvent.metadataJson || '{}'), null, 2)}
              </pre>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
