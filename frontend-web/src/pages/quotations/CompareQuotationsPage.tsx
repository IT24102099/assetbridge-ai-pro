import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { quotationApi } from '../../lib/api/quotationApi';
import { incidentApi } from '../../lib/api/incidentApi';
import { IncidentResponseDto } from '../../types/incident';
import {
  QuotationComparisonResultDto
} from '../../types/quotation';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';

export default function CompareQuotationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialIncidentId = searchParams.get('incidentId') || '';

  const [incidents, setIncidents] = useState<IncidentResponseDto[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(initialIncidentId);
  const [comparisonResult, setComparisonResult] = useState<QuotationComparisonResultDto | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const res = await incidentApi.getIncidents({ pageSize: 50 });
      if (res.success && res.data) {
        setIncidents(res.data.items || []);
        if (!selectedIncidentId && res.data.items?.length > 0) {
          setSelectedIncidentId(res.data.items[0].id);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (selectedIncidentId) {
      runComparison(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  const runComparison = async (incidentId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await quotationApi.compareQuotations({ incidentId });
      if (res.success && res.data) {
        setComparisonResult(res.data);
      } else {
        setComparisonResult(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to compare quotations.');
      setComparisonResult(null);
    } finally {
      setLoading(false);
    }
  };

  const recommendedCandidate = comparisonResult?.candidates?.find(
    (c) => c.quotationId === comparisonResult.recommendedQuotationId
  ) || comparisonResult?.candidates?.[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/quotations')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Quotations
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Quotation Comparison & AI Recommendation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Side-by-side cost analysis, warranty terms, and deterministic value scoring in LKR
          </p>
        </div>

        {/* Incident Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Incident:</label>
          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.title} ({inc.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Analyzing competitive bids and calculating cost efficiency..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => selectedIncidentId && runComparison(selectedIncidentId)} />
      ) : !comparisonResult || comparisonResult.candidates.length === 0 ? (
        <EmptyState
          title="No quotations to compare"
          description="At least one contractor quotation is required for this incident to run comparison analytics."
          actionLabel="Go to Quotations"
          onAction={() => navigate('/quotations')}
        />
      ) : (
        <>
          {/* AI Recommendation Banner */}
          {recommendedCandidate && (
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/50 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                    Recommended Choice
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      {recommendedCandidate.providerBusinessName}
                      <span className="text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        {recommendedCandidate.comparisonScore.toFixed(1)}% Match Score
                      </span>
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Estimated Cost: <strong className="text-cyan-300 text-sm">LKR {recommendedCandidate.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
                      Why this option is recommended:
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {recommendedCandidate.comparisonReasons.map((reason, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="text-right flex flex-col items-start md:items-end justify-between gap-4 shrink-0">
                  <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/10 text-right w-full md:w-auto">
                    <span className="text-[11px] text-slate-300 block">Lowest Bid in Portfolio</span>
                    <span className="text-lg font-bold text-white">
                      LKR {comparisonResult.lowestQuotationAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">
                      Evaluated {comparisonResult.quotationsEvaluatedCount} competing contractor bids
                    </span>
                  </div>

                  <button
                    onClick={() => navigate(`/quotations/${recommendedCandidate.quotationId}`)}
                    className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition w-full md:w-auto"
                  >
                    View Recommended Quotation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Side-by-Side Comparison Cards */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-3">All Evaluated Quotations ({comparisonResult.candidates.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {comparisonResult.candidates.map((cand) => {
                const isRec = cand.quotationId === comparisonResult.recommendedQuotationId;
                return (
                  <div
                    key={cand.quotationId}
                    className={`bg-white rounded-3xl p-5 border transition flex flex-col justify-between shadow-xs ${
                      isRec
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{cand.providerBusinessName}</h3>
                            {isRec && (
                              <span className="h-5 px-1.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center">
                                Top Pick
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-amber-500 font-bold flex items-center gap-0.5">
                              ★ {cand.providerRating || 4.5}
                            </span>
                            <span className="text-[11px] text-slate-400">•</span>
                            <span className="text-[11px] font-semibold text-emerald-600">
                              {cand.providerVerificationStatus === 'Verified' ? 'Verified Provider' : 'Registered'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-blue-600 block">
                            {cand.comparisonScore.toFixed(0)}%
                          </span>
                          <span className="text-[10px] text-slate-400">Score</span>
                        </div>
                      </div>

                      {/* Price Section */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Total Price</span>
                        <span className="text-lg font-bold text-slate-900 block">
                          LKR {cand.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className={cand.isLowestCost ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                            {cand.isLowestCost ? '✓ Lowest Cost Bid' : `+LKR ${cand.differenceFromLowest.toLocaleString()} vs lowest`}
                          </span>
                          <span className={cand.isWithinBudget ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                            {cand.isWithinBudget ? 'Within Budget' : 'Over Target'}
                          </span>
                        </div>
                      </div>

                      {/* Factors Checklist */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Evaluation Factors</span>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {cand.comparisonReasons.map((r, idx) => (
                            <li key={idx} className="flex items-center gap-1.5 text-[11px]">
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <button
                        onClick={() => navigate(`/quotations/${cand.quotationId}`)}
                        className={`w-full py-2 text-xs font-bold rounded-xl transition ${
                          isRec
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        View Full Breakdown
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
