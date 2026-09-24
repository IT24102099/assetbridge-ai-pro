import React, { useState, useEffect } from 'react';
import { X, FileText, Plus, Trash2, AlertCircle } from 'lucide-react';
import { quotationApi } from '../../lib/api/quotationApi';
import { incidentApi } from '../../lib/api/incidentApi';
import { providerApi } from '../../lib/api/providerApi';
import { IncidentResponseDto } from '../../types/incident';
import { ServiceProviderResponseDto } from '../../types/provider';
import { CreateQuotationItemRequestDto } from '../../types/quotation';

interface CreateQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateQuotationModal({ isOpen, onClose, onCreated }: CreateQuotationModalProps) {
  const [incidents, setIncidents] = useState<IncidentResponseDto[]>([]);
  const [providers, setProviders] = useState<ServiceProviderResponseDto[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [incidentId, setIncidentId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [taxAndOtherCharges, setTaxAndOtherCharges] = useState<number>(0);

  const [items, setItems] = useState<CreateQuotationItemRequestDto[]>([
    { description: 'Labour & Technical Service', quantity: 1, unitPrice: 15000 },
    { description: 'Replacement Materials & Components', quantity: 1, unitPrice: 25000 }
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      // default validity 30 days
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      setValidUntil(thirtyDays.toISOString().slice(0, 10));
    }
  }, [isOpen]);

  const loadOptions = async () => {
    try {
      setLoadingData(true);
      const [incRes, provRes] = await Promise.all([
        incidentApi.getIncidents({ pageSize: 50 }),
        providerApi.getProviders({ pageSize: 50 })
      ]);

      if (incRes.success && incRes.data) {
        setIncidents(incRes.data.items || []);
        if (incRes.data.items?.length > 0) {
          setIncidentId(incRes.data.items[0].id);
        }
      }
      if (provRes.success && provRes.data) {
        setProviders(provRes.data.items || []);
        if (provRes.data.items?.length > 0) {
          setProviderId(provRes.data.items[0].id);
        }
      }
    } catch (err: any) {
      setError('Failed to load incidents or service providers.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof CreateQuotationItemRequestDto, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice || 0), 0);
  const grandTotal = subtotal + Number(taxAndOtherCharges || 0);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentId || !providerId || !validUntil) {
      setError('Please select an incident, service provider, and quotation validity date.');
      return;
    }

    if (items.some((it) => !it.description.trim() || it.quantity <= 0 || it.unitPrice < 0)) {
      setError('All quotation line items must have a description, positive quantity, and valid unit price.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await quotationApi.createQuotation({
        incidentId,
        providerId,
        validUntilUtc: new Date(validUntil).toISOString(),
        notes: notes.trim() || undefined,
        taxAndOtherCharges: Number(taxAndOtherCharges || 0),
        items: items.map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice)
        }))
      });

      if (res.success) {
        onCreated();
        onClose();
      } else {
        setError(res.message || 'Failed to submit quotation.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to submit quotation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Contractor Quotation</h3>
              <p className="text-[11px] text-slate-500">Itemized maintenance cost estimate in LKR</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="my-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Incident */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Target Incident</label>
              <select
                value={incidentId}
                onChange={(e) => setIncidentId(e.target.value)}
                disabled={loadingData || submitting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
                required
              >
                {incidents.length === 0 ? (
                  <option value="">No incidents available</option>
                ) : (
                  incidents.map((inc) => (
                    <option key={inc.id} value={inc.id}>
                      {inc.title} ({inc.category})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Provider */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Contractor / Provider</label>
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                disabled={loadingData || submitting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
                required
              >
                {providers.length === 0 ? (
                  <option value="">No providers available</option>
                ) : (
                  providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.businessName} ({p.city} • ★{p.rating})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Validity Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Valid Until Date</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                disabled={submitting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
                required
              />
            </div>

            {/* Tax and Other charges */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Taxes & Transport Charges (LKR)</label>
              <input
                type="number"
                min="0"
                step="500"
                value={taxAndOtherCharges}
                onChange={(e) => setTaxAndOtherCharges(parseFloat(e.target.value) || 0)}
                disabled={submitting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">Itemized Line Items (LKR)</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Item description (e.g. CPVC pipe 1.5m, Labor)"
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 1)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 text-center focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      min="0"
                      step="500"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 text-right focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="w-28 text-right text-xs font-bold text-slate-900 pr-1">
                    LKR {(item.quantity * item.unitPrice).toLocaleString()}
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Subtotal and Grand Total Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Items Subtotal:</span>
              <span className="font-semibold text-slate-900">LKR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taxes & Other Charges:</span>
              <span className="font-semibold text-slate-900">LKR {Number(taxAndOtherCharges || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-blue-900 pt-2 border-t border-slate-200">
              <span>Grand Total:</span>
              <span>LKR {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Scope Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Contractor Notes & Terms</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Includes 1-year warranty on CPVC piping work. Payment upon milestone completion."
              disabled={submitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || incidents.length === 0 || providers.length === 0}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2"
            >
              {submitting ? 'Submitting...' : 'Submit Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
