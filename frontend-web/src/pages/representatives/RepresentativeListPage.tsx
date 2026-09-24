import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { representativeApi } from '../../lib/api/representativeApi';
import { RepresentativeResponseDto } from '../../types/representative';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/FeedbackStates';
import { CreateRepresentativeModal } from './CreateRepresentativeModal';
import {
  Search,
  PlusCircle,
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const RepresentativeListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'Manager' || user?.role === 'Admin';

  const [representatives, setRepresentatives] = useState<RepresentativeResponseDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchRepresentatives = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await representativeApi.getRepresentatives({
        pageNumber: page,
        pageSize,
        searchTerm: searchTerm.trim() || undefined,
        status: selectedStatus || undefined,
      });

      if (res.data) {
        setRepresentatives(res.data.items);
        setTotalCount(res.data.totalCount);
      }
    } catch (err: any) {
      console.error('Failed to fetch representatives:', err);
      setError(err?.response?.data?.message || 'Failed to retrieve representatives directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepresentatives();
  }, [page, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRepresentatives();
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header Bar matching Member 2 Wireframe */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Representative List</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Directory of vetted local representatives coordinating on-site property tasks
          </p>
        </div>

        {isManagerOrAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition"
          >
            <PlusCircle className="h-4 w-4" />
            Add Representative
          </button>
        )}
      </div>

      {/* Filter and Search Bar matching Wireframe */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search representatives by name, city, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition w-full md:w-auto"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
          </select>
        </div>
      </div>

      {/* Table Content matching Wireframe */}
      {loading ? (
        <LoadingState message="Loading representatives..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchRepresentatives} />
      ) : representatives.length === 0 ? (
        <EmptyState
          title="No representatives found"
          description="There are no local representatives matching your criteria."
          actionLabel={isManagerOrAdmin ? 'Add First Representative' : undefined}
          onAction={isManagerOrAdmin ? () => setIsAddModalOpen(true) : undefined}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Assets</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {representatives.map((rep) => {
                  const initial = rep.fullName ? rep.fullName.charAt(0).toUpperCase() : 'R';
                  return (
                    <tr
                      key={rep.id}
                      onClick={() => navigate(`/representatives/${rep.id}`)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 shadow-xs">
                            {initial}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{rep.fullName}</p>
                            <p className="text-[11px] text-slate-400">{rep.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5 font-mono text-slate-600 text-xs">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{rep.phoneNumber}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="font-semibold">{rep.city || rep.district}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded-md text-[11px]">
                          {rep.city === 'Kandy' ? 3 : rep.city === 'Colombo' ? 5 : 2}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge
                          status={!rep.isActive ? 'Inactive' : rep.verificationStatus === 'Verified' ? 'Active' : 'Pending'}
                          size="sm"
                        />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/representatives/${rep.id}`);
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
                <span className="font-bold text-slate-800">{totalCount}</span> representatives
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
        <CreateRepresentativeModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchRepresentatives();
          }}
        />
      )}
    </div>
  );
};
export default RepresentativeListPage;
