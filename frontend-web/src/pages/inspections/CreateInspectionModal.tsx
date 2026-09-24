import React, { useState, useEffect } from 'react';
import { X, ClipboardCheck, AlertCircle } from 'lucide-react';
import { inspectionApi } from '../../lib/api/inspectionApi';
import { incidentApi } from '../../lib/api/incidentApi';
import { providerApi } from '../../lib/api/providerApi';
import { IncidentResponseDto } from '../../types/incident';
import { ServiceProviderResponseDto } from '../../types/provider';

interface CreateInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateInspectionModal({ isOpen, onClose, onCreated }: CreateInspectionModalProps) {
  const [incidents, setIncidents] = useState<IncidentResponseDto[]>([]);
  const [providers, setProviders] = useState<ServiceProviderResponseDto[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [incidentId, setIncidentId] = useState('');
  const [inspectorProviderId, setInspectorProviderId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      // default scheduled date to tomorrow 9am
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      setScheduledAt(tomorrow.toISOString().slice(0, 16));
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
          setInspectorProviderId(provRes.data.items[0].id);
        }
      }
    } catch (err: any) {
      setError('Failed to load incidents or service providers.');
    } finally {
      setLoadingData(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentId || !inspectorProviderId || !scheduledAt) {
      setError('Please select an incident, inspector, and scheduled date/time.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await inspectionApi.createInspection({
        incidentId,
        inspectorProviderId,
        scheduledAtUtc: new Date(scheduledAt).toISOString(),
        notes: notes.trim() || undefined
      });

      if (res.success) {
        onCreated();
        onClose();
      } else {
        setError(res.message || 'Failed to schedule inspection.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to schedule inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Schedule Technical Inspection</h3>
              <p className="text-[11px] text-slate-500">Dispatch a certified inspector/contractor to assess an incident</p>
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
          {/* Incident Select */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Target Incident</label>
            <select
              value={incidentId}
              onChange={(e) => setIncidentId(e.target.value)}
              disabled={loadingData || submitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
              required
            >
              {incidents.length === 0 ? (
                <option value="">No incidents available</option>
              ) : (
                incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.title} ({inc.category} • {inc.priority})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Inspector / Provider Select */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Inspector / Service Contractor</label>
            <select
              value={inspectorProviderId}
              onChange={(e) => setInspectorProviderId(e.target.value)}
              disabled={loadingData || submitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
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

          {/* Scheduled Date & Time */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Scheduled Date & Time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              disabled={submitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          {/* Inspection Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Special Instructions / Scope Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please inspect roof waterproofing and structural timber framing after water ingress."
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
              {submitting ? 'Scheduling...' : 'Schedule Inspection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
