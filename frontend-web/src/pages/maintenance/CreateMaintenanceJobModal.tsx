import React, { useState, useEffect } from 'react';
import { X, Wrench, AlertCircle } from 'lucide-react';
import { maintenanceApi } from '../../lib/api/maintenanceApi';
import { incidentApi } from '../../lib/api/incidentApi';
import { providerApi } from '../../lib/api/providerApi';
import { IncidentResponseDto } from '../../types/incident';
import { ServiceProviderResponseDto } from '../../types/provider';

interface CreateMaintenanceJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateMaintenanceJobModal({ isOpen, onClose, onCreated }: CreateMaintenanceJobModalProps) {
  const [incidents, setIncidents] = useState<IncidentResponseDto[]>([]);
  const [providers, setProviders] = useState<ServiceProviderResponseDto[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [incidentId, setIncidentId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [approvedBudget, setApprovedBudget] = useState<number>(50000);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      const start = new Date();
      start.setDate(start.getDate() + 2);
      start.setHours(9, 0, 0, 0);

      const end = new Date();
      end.setDate(end.getDate() + 4);
      end.setHours(17, 0, 0, 0);

      setScheduledStart(start.toISOString().slice(0, 16));
      setScheduledEnd(end.toISOString().slice(0, 16));
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
          setTitle(`Repair: ${incRes.data.items[0].title}`);
          setDescription(`Complete repair work for ${incRes.data.items[0].title}`);
        }
      }
      if (provRes.success && provRes.data) {
        setProviders(provRes.data.items || []);
        if (provRes.data.items?.length > 0) {
          setProviderId(provRes.data.items[0].id);
        }
      }
    } catch {
      setError('Failed to load incidents or service providers.');
    } finally {
      setLoadingData(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentId || !providerId || !title.trim() || !description.trim()) {
      setError('Please fill in all required job fields.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await maintenanceApi.createJob({
        incidentId,
        providerId,
        title: title.trim(),
        description: description.trim(),
        scheduledStartUtc: new Date(scheduledStart).toISOString(),
        scheduledEndUtc: new Date(scheduledEnd).toISOString(),
        approvedBudget: Number(approvedBudget || 0)
      });

      if (res.success) {
        onCreated();
        onClose();
      } else {
        setError(res.message || 'Failed to create maintenance job.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create maintenance job.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Maintenance Job</h3>
              <p className="text-[11px] text-slate-500">Dispatch approved maintenance work to a contractor</p>
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
          {/* Incident */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Target Incident</label>
            <select
              value={incidentId}
              onChange={(e) => {
                setIncidentId(e.target.value);
                const inc = incidents.find((i) => i.id === e.target.value);
                if (inc) {
                  setTitle(`Repair: ${inc.title}`);
                  setDescription(`Complete repair work for ${inc.title}`);
                }
              }}
              disabled={loadingData || submitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
              required
            >
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.title} ({inc.category})
                </option>
              ))}
            </select>
          </div>

          {/* Provider */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Assigned Contractor / Provider</label>
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              disabled={loadingData || submitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
              required
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.businessName} ({p.city} • ★{p.rating})
                </option>
              ))}
            </select>
          </div>

          {/* Job Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Job Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Roof Tile Waterproofing & Membrane Re-sealing"
              disabled={submitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Scheduled Start</label>
              <input
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                disabled={submitting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Scheduled End</label>
              <input
                type="datetime-local"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                disabled={submitting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Approved Budget */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Approved Budget (LKR)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={approvedBudget}
              onChange={(e) => setApprovedBudget(parseFloat(e.target.value) || 0)}
              disabled={submitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Scope of Work & Instructions</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed instructions for contractor..."
              disabled={submitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
              required
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
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2"
            >
              {submitting ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
