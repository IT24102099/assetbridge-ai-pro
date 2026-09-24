import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../components/common/Modal';
import { assetApi } from '../../lib/api/assetApi';
import { incidentApi } from '../../lib/api/incidentApi';
import { AssetResponseDto } from '../../types/asset';
import { IncidentCategory, IncidentPriority, CreateIncidentRequestDto } from '../../types/incident';
import {
  AlertTriangle,
  MapPin,
  X,
  Camera,
  Plus,
} from 'lucide-react';

interface ReportIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialAssetId?: string;
}

interface SelectedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeFormatted: string;
}

const CATEGORIES: IncidentCategory[] = [
  'Plumbing',
  'Electrical',
  'Roofing',
  'Structural',
  'HVAC',
  'Carpentry',
  'PestControl',
  'Painting',
  'General',
];

const PRIORITIES: { value: IncidentPriority; label: string; color: string }[] = [
  { value: 'Low', label: 'Low', color: 'border-slate-300 text-slate-700 hover:bg-slate-50' },
  { value: 'Medium', label: 'Medium', color: 'border-blue-300 text-blue-700 hover:bg-blue-50' },
  { value: 'High', label: 'High', color: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
  { value: 'Emergency', label: 'Emergency', color: 'border-red-300 text-red-700 hover:bg-red-50' },
];

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const ReportIncidentModal: React.FC<ReportIncidentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialAssetId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<AssetResponseDto[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [assetId, setAssetId] = useState(initialAssetId || '');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IncidentCategory>('Plumbing');
  const [priority, setPriority] = useState<IncidentPriority>('Medium');
  const [description, setDescription] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState<string>('');
  const [requiredByDate, setRequiredByDate] = useState<string>('');
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadAssets();
      setError(null);
    } else {
      // Clean up object URLs on modal close
      selectedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setSelectedPhotos([]);
    }
  }, [isOpen]);

  const loadAssets = async () => {
    try {
      setLoadingAssets(true);
      const res = await assetApi.getAssets({ pageSize: 50 });
      if (res.data) {
        setAssets(res.data.items);
        if (!assetId && res.data.items.length > 0) {
          setAssetId(res.data.items[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load assets list', err);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationDetails(
            (prev) =>
              `${prev ? prev + ' • ' : ''}GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
          );
        },
        () => {
          setLocationDetails((prev) => `${prev ? prev + ' • ' : ''}Ground floor / Main wing`);
        }
      );
    } else {
      setLocationDetails('Main premise area');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const filesArray = Array.from(e.target.files);
    const newPhotos: SelectedPhoto[] = [];

    for (const file of filesArray) {
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        setError(`"${file.name}" is an unsupported file type. Please select JPG, PNG, or WEBP images.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`"${file.name}" exceeds the 10MB maximum file size limit.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const sizeKb = Math.round(file.size / 1024);
      const sizeFormatted = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

      newPhotos.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
        name: file.name,
        sizeFormatted,
      });
    }

    setSelectedPhotos((prev) => [...prev, ...newPhotos]);
    // Reset file input so same file can be re-selected if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (id: string) => {
    setSelectedPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId) {
      setError('Please select a property asset.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError('Please fill in the incident title and description.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: CreateIncidentRequestDto = {
        assetId,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : undefined,
        requiredByUtc: requiredByDate ? new Date(requiredByDate).toISOString() : undefined,
        locationDetails: locationDetails.trim() || undefined,
      };

      const res = await incidentApi.createIncident(payload);

      // Attach evidence photos if any were selected
      if (res.data && selectedPhotos.length > 0) {
        for (const photo of selectedPhotos) {
          try {
            await incidentApi.addEvidence(res.data.id, {
              fileName: photo.name,
              fileUrl: photo.previewUrl,
              fileSizeBytes: photo.file.size,
              fileType: photo.file.type || 'image/jpeg',
              evidenceType: 'BeforeWork',
              caption: `Incident photo: ${photo.name}`,
            });
          } catch (evErr) {
            console.warn('Evidence upload warning:', evErr);
          }
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error('Failed to report incident', err);
      setError(err?.response?.data?.message || 'Failed to submit incident report. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Property Incident"
      description="Submit a maintenance or repair issue for immediate triage and AI planning."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Target Asset Dropdown */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Property Asset <span className="text-red-500">*</span>
          </label>
          <select
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            disabled={loadingAssets || !!initialAssetId}
            required
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          >
            {assets.length === 0 ? (
              <option value="">No registered properties found</option>
            ) : (
              assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.city}, {a.district}) — {a.propertyTypeName}
                </option>
              ))
            )}
          </select>
        </div>

        {/* 2. Category & Priority in 2 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IncidentCategory)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Priority Level <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITIES.map((p) => {
                const isSelected = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition text-center ${
                      isSelected
                        ? p.value === 'Emergency'
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : p.value === 'High'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : p.value === 'Medium'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-700 text-white border-slate-700 shadow-xs'
                        : p.color
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Title */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Incident Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Severe water leakage under kitchen sink"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* 4. Description */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Issue Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            placeholder="Describe the issue, when it started, symptoms, and any immediate impact..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
          />
        </div>

        {/* ============================================================ */}
        {/* 5. ADD PHOTOS / ADD MEDIA (Directly here per Wireframe)      */}
        {/* ============================================================ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Add Photos / Evidence
              </label>
              <p className="text-[11px] text-slate-500">
                Upload photos of the damaged area or maintenance concern
              </p>
            </div>
            {selectedPhotos.length > 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Add More
              </button>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Empty State: Prompt / Click to Add Photos */}
          {selectedPhotos.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-2xl p-5 text-center transition cursor-pointer bg-slate-50/60"
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition">
                <Camera className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition">
                + Add Photos / Media
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click or drag damage reference photos here
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <span className="px-2 py-0.5 bg-slate-200/80 rounded text-[10px] font-semibold text-slate-600">
                  JPG
                </span>
                <span className="px-2 py-0.5 bg-slate-200/80 rounded text-[10px] font-semibold text-slate-600">
                  PNG
                </span>
                <span className="px-2 py-0.5 bg-slate-200/80 rounded text-[10px] font-semibold text-slate-600">
                  WEBP
                </span>
                <span className="text-[10px] text-slate-400">• Up to 10MB</span>
              </div>
            </div>
          ) : (
            /* Selected Photos Grid with Previews & Remove controls */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {selectedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:border-slate-300 transition"
                >
                  <div className="h-24 w-full bg-slate-100 relative">
                    <img
                      src={photo.previewUrl}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Delete / Remove Button */}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-slate-900/70 hover:bg-red-600 text-white flex items-center justify-center transition shadow-xs"
                      title="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="p-2 bg-white">
                    <p className="text-[11px] font-bold text-slate-800 truncate" title={photo.name}>
                      {photo.name}
                    </p>
                    <p className="text-[10px] text-slate-400">{photo.sizeFormatted}</p>
                  </div>
                </div>
              ))}

              {/* Add More Card */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-full min-h-[96px] rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 transition p-2 bg-slate-50/50"
              >
                <Plus className="h-5 w-5 mb-1" />
                <span className="text-[11px] font-bold">Add Media</span>
              </button>
            </div>
          )}
        </div>

        {/* 6. Location Details & GPS Button */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Location within Property
            </label>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
            >
              <MapPin className="h-3 w-3" />
              Use Current Location
            </button>
          </div>
          <input
            type="text"
            placeholder="e.g., 2nd Floor Master Bathroom, near piping junction"
            value={locationDetails}
            onChange={(e) => setLocationDetails(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* 7. Budget & Target Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Estimated Budget (LKR)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Rs.
              </span>
              <input
                type="number"
                min="0"
                placeholder="Optional budget cap"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Required Resolution Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={requiredByDate}
                onChange={(e) => setRequiredByDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'Submitting & Attaching Photos...' : 'Submit Incident'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ReportIncidentModal;
