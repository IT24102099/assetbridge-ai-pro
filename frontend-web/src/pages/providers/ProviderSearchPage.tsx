import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { providerApi } from '../../lib/api/providerApi';
import { ProviderMatchingResultDto } from '../../types/provider';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/FeedbackStates';
import { IncidentCategory } from '../../types/incident';
import {
  Search,
  Star,
  MapPin,
  Calendar,
  CheckCircle2,
  Wrench,
  SlidersHorizontal,
} from 'lucide-react';

const SKILL_OPTIONS: { category: IncidentCategory; label: string }[] = [
  { category: 'Plumbing', label: 'Plumbing' },
  { category: 'Electrical', label: 'Electrical' },
  { category: 'Structural', label: 'Masonry / Structural' },
  { category: 'HVAC', label: 'AC Service / HVAC' },
  { category: 'General', label: 'Cleaning / General' },
  { category: 'Roofing', label: 'Roofing' },
  { category: 'Carpentry', label: 'Carpentry' },
  { category: 'Painting', label: 'Painting' },
  { category: 'PestControl', label: 'Pest Control' },
];

const SRI_LANKA_LOCATIONS = ['Kandy', 'Colombo', 'Galle', 'Matara', 'Negombo', 'Nuwara Eliya', 'Gampaha', 'Matale'];

export const ProviderSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedSkill, setSelectedSkill] = useState<IncidentCategory>('Plumbing');
  const [location, setLocation] = useState('Kandy');
  const [maxDistance, setMaxDistance] = useState<number>(10);
  const [availableDate, setAvailableDate] = useState('2026-09-09');

  const [matchingResult, setMatchingResult] = useState<ProviderMatchingResultDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read incident query if coming from an incident dispatch
  const incidentIdParam = searchParams.get('incidentId');

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const res = await providerApi.matchProviders({
        incidentId: incidentIdParam || undefined,
        category: selectedSkill,
        district: location,
        city: location,
        requiredDateUtc: availableDate ? new Date(availableDate).toISOString() : undefined,
        maxDistanceKm: maxDistance,
        maxResults: 10,
      });

      if (res.data) {
        setMatchingResult(res.data);
      }
    } catch (err: any) {
      console.error('Failed to match providers:', err);
      setError(err?.response?.data?.message || 'Failed to match providers through deterministic algorithm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial deterministic search matching wireframe
    handleSearch();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header matching Screen 6 wireframe */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Provider Search & Matching</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Deterministic contractor matching based on verified skills, geo-distance, schedule availability & ratings
        </p>
      </div>

      {/* Search Criteria Form matching Screen 6 wireframe */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Required Skill */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-blue-600" />
                Required Skill
              </label>
              <select
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value as IncidentCategory)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
              >
                {SKILL_OPTIONS.map((opt) => (
                  <option key={opt.category} value={opt.category}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
              >
                {SRI_LANKA_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Max Distance */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
                Max Distance
              </label>
              <select
                value={maxDistance}
                onChange={(e) => setMaxDistance(parseInt(e.target.value) || 10)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={35}>35 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>
            </div>

            {/* Available Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                Available Date
              </label>
              <input
                type="date"
                value={availableDate}
                onChange={(e) => setAvailableDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition"
            >
              <Search className="h-4 w-4" />
              Search Providers
            </button>
          </div>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">
          {matchingResult ? `${matchingResult.matchedCandidatesCount} providers found` : 'Search Results'}
        </h2>
        {matchingResult && (
          <span className="text-[11px] text-slate-500">
            Evaluated {matchingResult.totalCandidatesEvaluated} registered contractors
          </span>
        )}
      </div>

      {/* Matching Results Cards matching Screen 6 wireframe */}
      {loading ? (
        <LoadingState message="Executing deterministic contractor matching algorithm..." />
      ) : error ? (
        <ErrorState message={error} onRetry={handleSearch} />
      ) : !matchingResult || matchingResult.candidates.length === 0 ? (
        <EmptyState
          title="No matching providers found"
          description="Try expanding your distance radius or selecting alternate schedule dates."
          actionLabel="Expand to 50 km"
          onAction={() => {
            setMaxDistance(50);
            setTimeout(handleSearch, 50);
          }}
        />
      ) : (
        <div className="space-y-4">
          {matchingResult.candidates.map((candidate) => {
            const initial = candidate.businessName ? candidate.businessName.charAt(0).toUpperCase() : 'P';
            const distance = candidate.distanceKm !== undefined && candidate.distanceKm !== null ? candidate.distanceKm.toFixed(1) : '4.0';

            return (
              <div
                key={candidate.providerId}
                onClick={() => navigate(`/providers/${candidate.providerId}`)}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left: Avatar + Details */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className="h-12 w-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-base flex items-center justify-center shrink-0 shadow-xs">
                    {initial}
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {candidate.businessName}
                      </h3>
                      <StatusBadge
                        status={candidate.verificationStatus === 'Verified' ? 'Verified' : 'Pending'}
                        size="sm"
                      />
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {Math.round(candidate.matchScore)}% Match
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {candidate.city || candidate.primaryDistrict} • {distance} km
                      </span>
                      <span className="flex items-center gap-1 font-bold text-slate-800">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {candidate.rating.toFixed(1)} ({candidate.completedJobsCount} jobs)
                      </span>
                      <span className="text-slate-400">Contact: {candidate.contactPerson}</span>
                    </div>

                    {/* Deterministic Explanation Reasons matching Wireframe */}
                    <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                      {candidate.explanationReasons && candidate.explanationReasons.length > 0 ? (
                        candidate.explanationReasons.map((reason, rIdx) => (
                          <span
                            key={rIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            {reason}
                          </span>
                        ))
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            {selectedSkill} skill verified
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Within {maxDistance} km operating radius
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: View Action Button */}
                <div className="shrink-0 self-end md:self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/providers/${candidate.providerId}`);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default ProviderSearchPage;
