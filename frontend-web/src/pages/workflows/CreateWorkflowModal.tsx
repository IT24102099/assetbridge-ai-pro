import React, { useState, useEffect } from 'react';
import { X, GitMerge, AlertCircle, Building } from 'lucide-react';
import { workflowApi } from '../../lib/api/workflowApi';
import { incidentApi } from '../../lib/api/incidentApi';
import { IncidentResponseDto } from '../../types/incident';

interface CreateWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateWorkflowModal({ isOpen, onClose, onCreated }: CreateWorkflowModalProps) {
  const [incidents, setIncidents] = useState<IncidentResponseDto[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [initialNotes, setInitialNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadIncidents();
    }
  }, [isOpen]);

  const loadIncidents = async () => {
    try {
      setLoadingData(true);
      setError(null);
      const res = await incidentApi.getIncidents({ pageSize: 50 });
      if (res.success && res.data) {
        setIncidents(res.data.items || []);
        if (res.data.items?.length > 0) {
          setSelectedIncidentId(res.data.items[0].id);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load open incidents.');
    } finally {
      setLoadingData(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentId) {
      setError('Please select an incident to initiate workflow.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await workflowApi.createWorkflow({
        incidentId: selectedIncidentId,
        initialNotes: initialNotes.trim() || undefined
      });

      if (res.success) {
        onCreated();
        onClose();
      } else {
        setError(res.message || 'Failed to initiate workflow.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to initiate workflow.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <GitMerge className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Initiate Workflow</h2>
              <p className="text-xs text-slate-500">Kick off deterministic 15-state orchestration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Target Incident *</label>
            {loadingData ? (
              <p className="text-xs text-slate-400">Loading open incidents...</p>
            ) : incidents.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                No incidents available. Create an incident first under Member 1.
              </p>
            ) : (
              <select
                value={selectedIncidentId}
                onChange={(e) => setSelectedIncidentId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
              >
                {incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.title} ({inc.assetName || 'Asset'}) • Priority: {inc.priorityName || inc.priority}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedIncident && (
            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-blue-900 font-bold">
                <Building className="h-3.5 w-3.5" />
                <span>{selectedIncident.assetName}</span>
              </div>
              <p className="text-slate-600 text-[11px]">{selectedIncident.description}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Initial Governance Notes</label>
            <textarea
              value={initialNotes}
              onChange={(e) => setInitialNotes(e.target.value)}
              placeholder="e.g. High priority ceiling leak repair requiring expedited inspection and quotation comparison."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || incidents.length === 0}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-2"
            >
              {submitting ? 'Initiating...' : 'Initiate Workflow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
