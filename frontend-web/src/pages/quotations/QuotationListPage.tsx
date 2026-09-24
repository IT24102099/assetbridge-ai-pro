import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { quotationApi } from '../../lib/api/quotationApi';
import { QuotationResponseDto, QuotationStatus } from '../../types/quotation';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';
import CreateQuotationModal from './CreateQuotationModal';

export default function QuotationListPage() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<QuotationResponseDto[]>([]);
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

  const loadQuotations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await quotationApi.getQuotations({ pageSize: 50 });
      if (res.success && res.data) {
        setQuotations(res.data.items || []);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load quotations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  const filtered = quotations.filter((q) => {
    const matchesSearch =
      !searchQuery ||
      q.providerBusinessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.incidentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.notes && q.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || q.status.toString() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contractor Quotations</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review itemized pricing, warranty terms, and compare competitive bids in Sri Lankan Rupees (LKR)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/quotations/compare')}
            className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4 text-cyan-600" />
            Compare Quotations
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create Quotation
          </button>
        </div>
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
            placeholder="Search by provider name, incident title, or quotation notes..."
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
            <option value={QuotationStatus.Draft.toString()}>Draft</option>
            <option value={QuotationStatus.Submitted.toString()}>Submitted</option>
            <option value={QuotationStatus.UnderReview.toString()}>Under Review</option>
            <option value={QuotationStatus.Accepted.toString()}>Accepted</option>
            <option value={QuotationStatus.Rejected.toString()}>Rejected</option>
            <option value={QuotationStatus.Expired.toString()}>Expired</option>
          </select>
        </div>
      </div>

      {/* Quotations Table */}
      {loading ? (
        <LoadingState message="Loading quotation records..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadQuotations} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No quotations found"
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try changing your search keywords or filter criteria.'
              : 'Service providers can submit itemized estimates for inspection findings.'
          }
          actionLabel="+ Create Quotation"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Provider / Contractor</th>
                  <th className="py-3.5 px-4">Incident / Asset</th>
                  <th className="py-3.5 px-4">Line Items</th>
                  <th className="py-3.5 px-4">Total (LKR)</th>
                  <th className="py-3.5 px-4">Validity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((quot) => (
                  <tr key={quot.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {quot.providerBusinessName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ★ {quot.providerRating || 4.5} rating
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">
                        {quot.incidentTitle || 'Incident Repair'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Ref: {quot.id.slice(0, 8)}...
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[11px]">
                        {quot.items?.length || 0} items
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">
                        LKR {(quot.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      {quot.taxAndOtherCharges > 0 && (
                        <span className="text-[10px] text-slate-400 block">
                          incl. LKR {quot.taxAndOtherCharges.toLocaleString()} tax/fee
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold ${
                          quot.isExpired ? 'text-red-600' : 'text-slate-700'
                        }`}
                      >
                        {new Date(quot.validUntilUtc).toLocaleDateString()}
                      </span>
                      {quot.isExpired && (
                        <span className="text-[10px] text-red-500 font-bold block">Expired</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge
                        status={quot.statusName}
                      />
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/quotations/${quot.id}`)}
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
              {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} quotations
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
      <CreateQuotationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadQuotations}
      />
    </div>
  );
}
