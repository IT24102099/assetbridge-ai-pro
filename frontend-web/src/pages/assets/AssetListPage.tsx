import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assetApi } from '../../lib/api/assetApi';
import { AssetResponseDto, PropertyType, AssetStatus } from '../../types/asset';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/FeedbackStates';
import { CreateAssetModal } from './CreateAssetModal';
import { PlusCircle, Search, MapPin, Building2, ChevronLeft, ChevronRight } from 'lucide-react';

const PROPERTY_TYPES: { value: PropertyType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'SingleFamilyHouse', label: 'Single Family House' },
  { value: 'Apartment', label: 'Apartment' },
  { value: 'Villa', label: 'Villa' },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'Land', label: 'Land' },
];

const SRI_LANKA_LOCATIONS = [
  { value: '', label: 'All Locations' },
  { value: 'Kandy', label: 'Kandy' },
  { value: 'Colombo', label: 'Colombo' },
  { value: 'Matale', label: 'Matale' },
  { value: 'Nuwara Eliya', label: 'Nuwara Eliya' },
  { value: 'Galle', label: 'Galle' },
  { value: 'Gampaha', label: 'Gampaha' },
];

const STATUS_FILTERS: { value: AssetStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'UnderMaintenance', label: 'Under Maintenance' },
  { value: 'Inactive', label: 'Inactive' },
];

export const AssetListPage: React.FC = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<AssetResponseDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<PropertyType | ''>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | ''>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await assetApi.getAssets({
        pageNumber: page,
        pageSize,
        searchTerm: searchTerm.trim() || undefined,
        propertyType: selectedType || undefined,
        district: selectedLocation || undefined,
        status: selectedStatus || undefined,
      });

      if (res.data) {
        setAssets(res.data.items);
        setTotalCount(res.data.totalCount);
      }
    } catch (err: any) {
      console.error('Failed to fetch assets', err);
      setError(err?.response?.data?.message || 'Failed to load property assets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [page, selectedType, selectedLocation, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAssets();
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar matching Screen 3 wireframe */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </form>

        {/* 3 Dropdown Filters matching Screen 3 wireframe */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value as PropertyType | '');
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            {PROPERTY_TYPES.map((pt) => (
              <option key={pt.value} value={pt.value}>
                {pt.label}
              </option>
            ))}
          </select>

          <select
            value={selectedLocation}
            onChange={(e) => {
              setSelectedLocation(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            {SRI_LANKA_LOCATIONS.map((loc) => (
              <option key={loc.value} value={loc.value}>
                {loc.label}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as AssetStatus | '');
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* + Add Asset Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 transition shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            Add Asset
          </button>
        </div>
      </div>

      {/* Main Asset List Items matching Screen 3 wireframe */}
      {loading ? (
        <LoadingState message="Loading your real estate assets..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAssets} />
      ) : assets.length === 0 ? (
        <EmptyState
          title="No properties found"
          description="You haven't registered any property matching the selected criteria."
          actionLabel="Register First Property"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {assets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => navigate(`/assets/${asset.id}`)}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              {/* Left side: Thumbnail + Title + Subtitle + Location */}
              <div className="flex items-center gap-4 min-w-0">
                {/* Thumbnail matching wireframe */}
                <div className="h-16 w-20 rounded-xl bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center text-slate-400">
                  {asset.thumbnailUrl ? (
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Building2 className="h-7 w-7 opacity-50 text-slate-400" />
                  )}
                </div>

                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{asset.name}</h3>
                  <p className="text-xs text-slate-500">{asset.propertyTypeName || 'Residential Property'}</p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    {asset.city}, Sri Lanka
                  </p>
                </div>
              </div>

              {/* Right side: Status Badge + View Button */}
              <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                <StatusBadge status={asset.status} size="md" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/assets/${asset.id}`);
                  }}
                  className="px-4 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-xs font-bold transition"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Wireframe Numbered Pagination: < 1 2 3 > */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-4">
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
      )}

      {/* Add Asset Modal */}
      {isAddModalOpen && (
        <CreateAssetModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchAssets();
          }}
        />
      )}
    </div>
  );
};
export default AssetListPage;
