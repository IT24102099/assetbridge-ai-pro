import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';
import { inspectionApi } from '../../lib/api/inspectionApi';
import { FindingSeverity } from '../../types/inspection';

interface CreateFindingModalProps {
  isOpen: boolean;
  inspectionId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateFindingModal({ isOpen, inspectionId, onClose, onCreated }: CreateFindingModalProps) {
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<FindingSeverity>(FindingSeverity.Medium);
  const [recommendation, setRecommendation] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !recommendation.trim()) {
      setError('Description and Recommendation are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await inspectionApi.addFinding(inspectionId, {
        description: description.trim(),
        severity,
        recommendation: recommendation.trim(),
        evidenceReference: evidenceReference.trim() || undefined
      });

      if (res.success) {
        onCreated();
        onClose();
      } else {
        setError(res.message || 'Failed to record finding.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to record finding.');
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
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Record Inspection Finding</h3>
              <p className="text-[11px] text-slate-500">Document technical defect, severity level & repair recommendation</p>
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
          {/* Defect Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Defect Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Master bathroom cold water inlet pipe fractured behind ceramic wall tiling."
              disabled={submitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          {/* Severity Level */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Severity Level</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(parseInt(e.target.value) as FindingSeverity)}
              disabled={submitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 transition"
            >
              <option value={FindingSeverity.Low}>Low - Minor cosmetic defect</option>
              <option value={FindingSeverity.Medium}>Medium - Maintenance recommended soon</option>
              <option value={FindingSeverity.High}>High - Active damage or safety concern</option>
              <option value={FindingSeverity.Critical}>Critical - Emergency risk / urgent repair required</option>
            </select>
          </div>

          {/* Recommendation */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Contractor Recommendation / Action Required</label>
            <textarea
              rows={2}
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              placeholder="e.g. Excavate tile layer, replace 1.5m CPVC pipeline section, re-seal and tile waterproofing."
              disabled={submitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          {/* Evidence / Photo Reference */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Photo / Evidence Reference (Optional)</label>
            <input
              type="text"
              value={evidenceReference}
              onChange={(e) => setEvidenceReference(e.target.value)}
              placeholder="e.g. Photo-01.jpg, Moisture meter log 88%"
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
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2"
            >
              {submitting ? 'Recording...' : 'Add Finding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
