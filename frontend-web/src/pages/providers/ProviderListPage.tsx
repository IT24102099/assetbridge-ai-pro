import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { providerApi } from '../../lib/api/providerApi';
import { ServiceProviderResponseDto } from '../../types/provider';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/FeedbackStates';
import { CreateProviderModal } from './CreateProviderModal';
import {
  Search,
  PlusCircle,
  MapPin,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SKILL_FILTERS = [
  { value: '', label: 'All Skills' },
  { value: 'Plumbing', label: 'Plumbing' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Masonry', label: 'Masonry' },
  { value: 'AC Service', label: 'AC Service' },
  { value: 'Cleaning', label: 'Cleaning' },
  { value: 'Roofing', label: 'Roofing' },
  { value: 'Carpentry', label: 'Carpentry' },
  { value: 'Painting', label: 'Painting' },
  { value: 'PestControl', label: 'Pest Control' },
];

export const ProviderListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'Manager' || user?.role === 'Admin';

  const [providers, setProviders] = useState<ServiceProviderResponseDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await providerApi.getProviders({
        pageNumber: page,
        pageSize,
        searchTerm: searchTerm.trim() || undefined,
        category: selectedSkill || undefined,
        status: selectedStatus || undefined,
      });

      if (res.data) {
        setProviders(res.data.items);
        setTotalCount(res.data.totalCount);
      }
    } catch (err: any) {
      console.error('Failed to fetch providers:', err);
      setError(err?.response?.data?.message || 'Failed to retrieve service providers list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [page, selectedSkill, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProviders();
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header Bar matching Member 2 Wireframe */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Service Provider List</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Directory of verified contractors and trade specialists across Sri Lanka
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/providers/search')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition"
          >
            <Search className="h-4 w-4" />
            Match Providers
          </button>
          {isManagerOrAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition"
            >
              <PlusCircle className="h-4 w-4" />
              Add Provider
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar matching Wireframe */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search providers by company, contact, or trade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedSkill}
            onChange={(e) => {
              setSelectedSkill(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            {SKILL_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            <option value="">All Status</option>
            <option value="Verified">Verified</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Unverified</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table Content matching Wireframe */}
      {loading ? (
        <LoadingState message="Loading service providers..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchProviders} />
      ) : providers.length === 0 ? (
        <EmptyState
          title="No service providers found"
          description="There are no contractors matching your search criteria."
          actionLabel={isManagerOrAdmin ? 'Register First Provider' : undefined}
          onAction={isManagerOrAdmin ? () => setIsAddModalOpen(true) : undefined}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Company / Name</th>
                  <th className="py-3.5 px-4">Skill(s)</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Rating</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {providers.map((p) => {
                  const initial = p.businessName ? p.businessName.charAt(0).toUpperCase() : 'P';
                  const primarySkill =
                    p.skills && p.skills.length > 0
                      ? p.skills.map((s) => s.skillName).join(', ')
                      : 'General Maintenance';

                  const statusDisplay =
                    !p.isActive
                      ? 'Inactive'
                      : p.verificationStatus === 'Verified'
                      ? 'Verified'
                      : p.verificationStatus === 'Pending'
                      ? 'Pending'
                      : 'Unverified';

                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/providers/${p.id}`)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 shadow-xs">
                            {initial}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{p.businessName}</p>
                            <p className="text-[11px] text-slate-400">Contact: {p.contactPerson}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-semibold text-slate-800 line-clamp-1">{primarySkill}</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="font-semibold">{p.city || p.primaryDistrict}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 font-bold text-slate-900">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{p.rating.toFixed(1)}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({p.completedJobsCount} jobs)</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={statusDisplay} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/providers/${p.id}`);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-xs font-bold transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Wireframe Numbered Pagination: < 1 2 3 4 5 > */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50/50">
              <p className="text-xs text-slate-500">
                Showing <span className="font-bold text-slate-800">{(page - 1) * pageSize + 1}</span> to{' '}
                <span className="font-bold text-slate-800">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                <span className="font-bold text-slate-800">{totalCount}</span> providers
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => setPage(num)}
                    className={`h-8 w-8 rounded-lg text-xs font-bold transition ${
                      page === num
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {num}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-8 w-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <CreateProviderModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchProviders();
          }}
        />
      )}
    </div>
  );
};
export default ProviderListPage;
