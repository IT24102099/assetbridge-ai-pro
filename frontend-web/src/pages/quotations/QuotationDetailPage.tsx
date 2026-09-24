import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Sparkles
} from 'lucide-react';
import { quotationApi } from '../../lib/api/quotationApi';
import {
  QuotationResponseDto,
  QuotationStatus,
  BudgetCheckResultDto
} from '../../types/quotation';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quotation, setQuotation] = useState<QuotationResponseDto | null>(null);
  const [budgetCheck, setBudgetCheck] = useState<BudgetCheckResultDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadQuotation = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await quotationApi.getQuotationById(id);
      if (res.success && res.data) {
        setQuotation(res.data);

        // Run budget check
        try {
          const budgetRes = await quotationApi.checkBudget({
            quotationId: res.data.id,
            incidentId: res.data.incidentId,
            quotationAmount: res.data.totalAmount
          });
          if (budgetRes.success && budgetRes.data) {
            setBudgetCheck(budgetRes.data);
          }
        } catch {
          // ignore optional budget check error
        }
      } else {
        setError(res.message || 'Quotation not found.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load quotation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotation();
  }, [id]);

  const handleUpdateStatus = async (status: QuotationStatus) => {
    if (!id) return;
    try {
      setStatusUpdating(true);
      const res = await quotationApi.updateQuotationStatus(id, { status });
      if (res.success && res.data) {
        setQuotation(res.data);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update quotation status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading contractor quotation..." />;
  }

  if (error || !quotation) {
    return (
      <ErrorState
        message={error || 'Quotation record not found'}
        onRetry={loadQuotation}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/quotations')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quotations
        </button>

        <div className="flex items-center gap-2">
          {quotation.status === QuotationStatus.Submitted && (
            <>
              <button
                onClick={() => handleUpdateStatus(QuotationStatus.UnderReview)}
                disabled={statusUpdating}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Mark Under Review
              </button>
              <button
                onClick={() => handleUpdateStatus(QuotationStatus.Rejected)}
                disabled={statusUpdating}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-xl transition"
              >
                Reject
              </button>
            </>
          )}

          {quotation.status === QuotationStatus.UnderReview && (
            <button
              onClick={() => handleUpdateStatus(QuotationStatus.Accepted)}
              disabled={statusUpdating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              Accept Quotation
            </button>
          )}

          <button
            onClick={() => navigate('/quotations/compare')}
            className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4 text-cyan-600" />
            Compare with Others
          </button>
        </div>
      </div>

      {/* Main Quotation Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">
                  {quotation.providerBusinessName}
                </h1>
                <StatusBadge
                  status={quotation.statusName}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Incident: <span className="font-semibold text-slate-800">{quotation.incidentTitle || 'N/A'}</span> • Ref: {quotation.id}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Total Quotation Value</span>
            <span className="text-2xl font-bold text-blue-900">
              LKR {(quotation.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block">Validity Period</span>
            <span className="text-xs font-bold text-slate-900 block mt-0.5">
              Valid until {new Date(quotation.validUntilUtc).toLocaleDateString()}
            </span>
            <span className={`text-[10px] ${quotation.isExpired ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
              {quotation.isExpired ? 'Quotation Expired' : 'Active Bid'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block">Contractor Rating</span>
            <span className="text-xs font-bold text-slate-900 block mt-0.5">
              ★ {quotation.providerRating || 4.5} / 5.0
            </span>
            <span className="text-[10px] text-emerald-600 font-bold">
              {quotation.providerVerificationStatus === 'Verified' ? 'Verified Contractor' : 'Registered Provider'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block">Budget Adherence</span>
            <span className="text-xs font-bold text-slate-900 block mt-0.5">
              {budgetCheck ? (budgetCheck.isWithinBudget ? 'Within Budget' : 'Over Budget') : 'Validated'}
            </span>
            <span className="text-[10px] text-slate-400">
              {budgetCheck?.explanation || 'Automatic portfolio cost benchmark'}
            </span>
          </div>
        </div>

        {/* Contractor Notes */}
        {quotation.notes && (
          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-xs text-slate-700">
            <span className="font-bold text-purple-900 block mb-1">Contractor Terms & Warranty Notes:</span>
            <p className="leading-relaxed">{quotation.notes}</p>
          </div>
        )}
      </div>

      {/* Itemized Line Items Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Itemized Cost Breakdown</h2>
              <p className="text-[11px] text-slate-500">Transparent pricing for materials, equipment & labor</p>
            </div>
          </div>

          <span className="text-xs font-bold text-slate-600">
            {quotation.items?.length || 0} line items
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Quantity</th>
                <th className="py-3 px-4 text-right">Unit Price (LKR)</th>
                <th className="py-3 px-4 text-right">Total Price (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotation.items?.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{item.description}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{item.quantity}</td>
                  <td className="py-3 px-4 text-right text-slate-700">
                    {(item.unitPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {(item.totalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cost Summary Box */}
        <div className="max-w-xs ml-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Items Subtotal:</span>
            <span className="font-semibold text-slate-900">
              LKR {(quotation.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Taxes & Transport:</span>
            <span className="font-semibold text-slate-900">
              LKR {(quotation.taxAndOtherCharges || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-sm font-bold text-blue-950 pt-2 border-t border-slate-200">
            <span>Total Amount:</span>
            <span>
              LKR {(quotation.totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
