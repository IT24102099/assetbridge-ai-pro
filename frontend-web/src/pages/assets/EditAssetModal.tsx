import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../components/common/Modal';
import { assetApi } from '../../lib/api/assetApi';
import {
  AssetResponseDto,
  PropertyType,
  AssetStatus,
  UpdateAssetRequestDto,
  AssetMediaResponseDto,
} from '../../types/asset';
import {
  AlertTriangle,
  Plus,
  X,
  Star,
  Check,
  Trash2,
} from 'lucide-react';

interface EditAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asset: AssetResponseDto;
}

interface NewPhotoUpload {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  sizeFormatted: string;
  isThumbnail: boolean;
}

const PROPERTY_TYPES: PropertyType[] = [
  'SingleFamilyHouse',
  'Apartment',
  'Villa',
  'Commercial',
  'Land',
];

const ASSET_STATUSES: AssetStatus[] = [
  'Active',
  'UnderMaintenance',
  'Inactive',
  'Archived',
];

const SRI_LANKA_DISTRICTS = [
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Matale',
  'Nuwara Eliya',
  'Galle',
  'Matara',
  'Hambantota',
  'Jaffna',
  'Kurunegala',
  'Puttalam',
  'Anuradhapura',
  'Polonnaruwa',
  'Badulla',
  'Monaragala',
  'Ratnapura',
  'Kegalle',
];

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const EditAssetModal: React.FC<EditAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  asset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Asset Form fields
  const [name, setName] = useState(asset.name);
  const [propertyType, setPropertyType] = useState<PropertyType>(asset.propertyType);
  const [addressLine1, setAddressLine1] = useState(asset.addressLine1);
  const [addressLine2, setAddressLine2] = useState(asset.addressLine2 || '');
  const [city, setCity] = useState(asset.city);
  const [district, setDistrict] = useState(asset.district);
  const [postalCode, setPostalCode] = useState(asset.postalCode || '');
  const [description, setDescription] = useState(asset.description || '');
  const [latitude, setLatitude] = useState<string>(asset.latitude?.toString() || '');
  const [longitude, setLongitude] = useState<string>(asset.longitude?.toString() || '');
  const [status, setStatus] = useState<AssetStatus>(asset.status);

  // Existing Media & New Media state
  const [existingMedia, setExistingMedia] = useState<AssetMediaResponseDto[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhotoUpload[]>([]);

  useEffect(() => {
    if (isOpen && asset) {
      setName(asset.name);
      setPropertyType(asset.propertyType);
      setAddressLine1(asset.addressLine1);
      setAddressLine2(asset.addressLine2 || '');
      setCity(asset.city);
      setDistrict(asset.district);
      setPostalCode(asset.postalCode || '');
      setDescription(asset.description || '');
      setLatitude(asset.latitude?.toString() || '');
      setLongitude(asset.longitude?.toString() || '');
      setStatus(asset.status);
      setError(null);
      loadMedia();
    }
  }, [isOpen, asset]);

  const loadMedia = async () => {
    try {
      const res = await assetApi.getMedia(asset.id);
      if (res.data) {
        setExistingMedia(res.data);
      }
    } catch (err) {
      console.error('Failed to load asset media gallery', err);
    }
  };

  const handleSetExistingThumbnail = async (mediaId: string) => {
    try {
      await assetApi.setThumbnail(asset.id, mediaId);
      // Update local state: exactly one thumbnail
      setExistingMedia((prev) =>
        prev.map((m) => ({
          ...m,
          isThumbnail: m.id === mediaId,
        }))
      );
      // Also ensure any newly picked photos are not marked thumbnail
      setNewPhotos((prev) => prev.map((p) => ({ ...p, isThumbnail: false })));
    } catch (err: any) {
      console.error('Failed to set thumbnail', err);
      setError(err?.response?.data?.message || 'Failed to update thumbnail.');
    }
  };

  const handleDeleteExistingMedia = async (mediaId: string) => {
    try {
      await assetApi.deleteMedia(asset.id, mediaId);
      await loadMedia();
    } catch (err: any) {
      console.error('Failed to delete media', err);
      setError(err?.response?.data?.message || 'Failed to delete media image.');
    }
  };

  const handleNewFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const filesArray = Array.from(e.target.files);
    const addedPhotos: NewPhotoUpload[] = [];

    const hasAnyThumbnail =
      existingMedia.some((m) => m.isThumbnail) || newPhotos.some((p) => p.isThumbnail);

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

      // If no media existed at all, first one becomes thumbnail
      const isFirst = !hasAnyThumbnail && addedPhotos.length === 0 && newPhotos.length === 0 && existingMedia.length === 0;

      addedPhotos.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
        name: file.name,
        sizeFormatted,
        isThumbnail: isFirst,
      });
    }

    setNewPhotos((prev) => [...prev, ...addedPhotos]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveNewPhoto = (id: string) => {
    setNewPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSetNewThumbnail = (id: string) => {
    // Unmark existing media thumbnails
    setExistingMedia((prev) => prev.map((m) => ({ ...m, isThumbnail: false })));
    // Mark only target new photo as thumbnail
    setNewPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        isThumbnail: p.id === id,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !addressLine1.trim() || !city.trim()) {
      setError('Please provide the asset name, street address, and city.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: UpdateAssetRequestDto = {
        name: name.trim(),
        propertyType,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        district,
        postalCode: postalCode.trim() || undefined,
        description: description.trim() || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        status,
      };

      await assetApi.updateAsset(asset.id, payload);

      // Upload newly added photos if any
      if (newPhotos.length > 0) {
        for (const photo of newPhotos) {
          try {
            await assetApi.addMedia(asset.id, {
              fileName: photo.name,
              fileUrl: photo.previewUrl,
              fileSizeBytes: photo.file.size,
              fileType: photo.file.type || 'image/jpeg',
              isThumbnail: photo.isThumbnail,
              caption: photo.isThumbnail ? 'Primary Property Thumbnail' : 'Property Photo',
            });
          } catch (mediaErr) {
            console.warn('Asset media upload warning:', mediaErr);
          }
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error('Failed to update asset', err);
      setError(err?.response?.data?.message || 'Failed to update asset. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Property Asset"
      description="Update property details and manage media and cover thumbnail."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Asset / Property Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Property Type <span className="text-red-500">*</span>
            </label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as PropertyType)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              {PROPERTY_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {pt.replace(/([A-Z])/g, ' $1').trim()}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Operational Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AssetStatus)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              {ASSET_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              District <span className="text-red-500">*</span>
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            >
              {SRI_LANKA_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Address Line 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* PROPERTY MEDIA & THUMBNAIL MANAGEMENT                       */}
        {/* ============================================================ */}
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Property Media Gallery
              </label>
              <p className="text-[11px] text-slate-500">
                Manage property photos. Select exactly one thumbnail cover.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Upload Photos
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onChange={handleNewFileSelect}
            className="hidden"
          />

          {/* Media Grid (Existing Media + New Uploads) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {/* Existing Media Cards */}
            {existingMedia.map((media) => (
              <div
                key={media.id}
                className={`relative group rounded-xl border bg-white overflow-hidden shadow-xs transition ${
                  media.isThumbnail
                    ? 'border-blue-600 ring-2 ring-blue-500/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="h-24 w-full bg-slate-100 relative">
                  <img
                    src={media.fileUrl}
                    alt={media.fileName}
                    className="w-full h-full object-cover"
                  />

                  {/* Thumbnail Badge / Button */}
                  {media.isThumbnail ? (
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-bold rounded-md flex items-center gap-1 shadow-sm">
                      <Star className="h-2.5 w-2.5 fill-white" />
                      Thumbnail
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetExistingThumbnail(media.id)}
                      className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-slate-900/70 hover:bg-blue-600 text-white text-[9px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition shadow-sm"
                    >
                      Set as Thumbnail
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteExistingMedia(media.id)}
                    className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-slate-900/70 hover:bg-red-600 text-white flex items-center justify-center transition shadow-xs"
                    title="Delete media"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                <div className="p-2 bg-white">
                  <p className="text-[11px] font-bold text-slate-800 truncate" title={media.fileName}>
                    {media.fileName}
                  </p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-slate-400">
                      {Math.round(media.fileSizeBytes / 1024)} KB
                    </span>
                    {media.isThumbnail && (
                      <span className="text-[9px] font-bold text-blue-600 flex items-center gap-0.5">
                        <Check className="h-2.5 w-2.5" /> Cover
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* New Pending Uploads */}
            {newPhotos.map((photo) => (
              <div
                key={photo.id}
                className={`relative group rounded-xl border bg-white overflow-hidden shadow-xs transition ${
                  photo.isThumbnail
                    ? 'border-blue-600 ring-2 ring-blue-500/30'
                    : 'border-emerald-300 hover:border-emerald-400'
                }`}
              >
                <div className="h-24 w-full bg-slate-100 relative">
                  <img
                    src={photo.previewUrl}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                  />

                  {photo.isThumbnail ? (
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-bold rounded-md flex items-center gap-1 shadow-sm">
                      <Star className="h-2.5 w-2.5 fill-white" />
                      Thumbnail
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetNewThumbnail(photo.id)}
                      className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-slate-900/70 hover:bg-blue-600 text-white text-[9px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition shadow-sm"
                    >
                      Set as Thumbnail
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveNewPhoto(photo.id)}
                    className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-slate-900/70 hover:bg-red-600 text-white flex items-center justify-center transition shadow-xs"
                    title="Remove new photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                <div className="p-2 bg-emerald-50/50">
                  <p className="text-[11px] font-bold text-slate-800 truncate" title={photo.name}>
                    {photo.name} (New)
                  </p>
                  <span className="text-[10px] text-slate-400">{photo.sizeFormatted}</span>
                </div>
              </div>
            ))}

            {/* Add More Photos Card */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-full min-h-[96px] rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center justify-center text-slate-500 hover:text-blue-600 transition p-2 bg-slate-50/50"
            >
              <Plus className="h-5 w-5 mb-1" />
              <span className="text-[11px] font-bold">+ Upload Photo</span>
            </button>
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
            {submitting ? 'Saving Changes...' : 'Save & Update Property'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditAssetModal;
