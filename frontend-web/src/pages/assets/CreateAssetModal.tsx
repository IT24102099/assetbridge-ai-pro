import React, { useState, useRef } from 'react';
import { Modal } from '../../components/common/Modal';
import { assetApi } from '../../lib/api/assetApi';
import { PropertyType, CreateAssetRequestDto } from '../../types/asset';
import {
  AlertTriangle,
  Camera,
  Plus,
  X,
  Star,
  Check,
} from 'lucide-react';

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SelectedAssetPhoto {
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

export const CreateAssetModal: React.FC<CreateAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('SingleFamilyHouse');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('Colombo');
  const [district, setDistrict] = useState('Colombo');
  const [postalCode, setPostalCode] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<string>('6.9271');
  const [longitude, setLongitude] = useState<string>('79.8612');

  // Media state
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedAssetPhoto[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const filesArray = Array.from(e.target.files);
    const newPhotos: SelectedAssetPhoto[] = [];

    // Determine if we already have a thumbnail
    const hasExistingThumbnail = selectedPhotos.some((p) => p.isThumbnail);

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        setError(`"${file.name}" is an unsupported file type. Please select JPG, PNG, or WEBP images.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`"${file.name}" exceeds the 10MB maximum file size limit.`);
        continue;
      }

      // Avoid exact duplicate file names
      if (selectedPhotos.some((p) => p.name === file.name && p.file.size === file.size)) {
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const sizeKb = Math.round(file.size / 1024);
      const sizeFormatted = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

      // If no thumbnail exists, make the very first added photo the thumbnail
      const isFirst = !hasExistingThumbnail && newPhotos.length === 0 && selectedPhotos.length === 0;

      newPhotos.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
        name: file.name,
        sizeFormatted,
        isThumbnail: isFirst,
      });
    }

    setSelectedPhotos((prev) => {
      const updated = [...prev, ...newPhotos];
      // Guarantee exactly one thumbnail if photos exist
      if (updated.length > 0 && !updated.some((p) => p.isThumbnail)) {
        updated[0].isThumbnail = true;
      }
      return updated;
    });

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
      const filtered = prev.filter((p) => p.id !== id);
      // If we removed the thumbnail and others remain, promote the first one to thumbnail
      if (target?.isThumbnail && filtered.length > 0) {
        filtered[0].isThumbnail = true;
      }
      return filtered;
    });
  };

  const handleSetThumbnail = (id: string) => {
    // Single Thumbnail Rule: Strictly mark only the selected ID as thumbnail
    setSelectedPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        isThumbnail: p.id === id,
      }))
    );
  };

  const resetForm = () => {
    selectedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setSelectedPhotos([]);
    setName('');
    setPropertyType('SingleFamilyHouse');
    setAddressLine1('');
    setAddressLine2('');
    setCity('Colombo');
    setDistrict('Colombo');
    setPostalCode('');
    setDescription('');
    setLatitude('6.9271');
    setLongitude('79.8612');
    setError(null);
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

      const payload: CreateAssetRequestDto = {
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
      };

      const res = await assetApi.createAsset(payload);

      // Upload and associate all selected property media
      if (res.data && selectedPhotos.length > 0) {
        for (const photo of selectedPhotos) {
          try {
            await assetApi.addMedia(res.data.id, {
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

      resetForm();
      onSuccess();
    } catch (err: any) {
      console.error('Failed to register property', err);
      setError(err?.response?.data?.message || 'Failed to create asset. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Add New Property Asset"
      description="Register a residential or commercial asset to enable automated remote maintenance."
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
              placeholder="e.g., Lotus Villa 04 or Colombo Penthouse 8B"
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

          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Address Line 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., 45/2 Havelock Road"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Address Line 2 (Optional)
            </label>
            <input
              type="text"
              placeholder="Apartment, Suite, Unit, etc."
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Colombo 05"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Postal Code
            </label>
            <input
              type="text"
              placeholder="e.g., 00500"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              GPS Coordinates (Lat / Lng)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Latitude"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-1/2 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              <input
                type="text"
                placeholder="Longitude"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-1/2 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Key features, caretaker access details, emergency shut-off notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* PROPERTY MEDIA & THUMBNAIL UPLOAD SECTION                   */}
        {/* ============================================================ */}
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Property Media
              </label>
              <p className="text-[11px] text-slate-500">
                Upload photos of this property. Select one as the primary thumbnail.
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

          {/* Empty Upload State */}
          {selectedPhotos.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-2xl p-5 text-center transition cursor-pointer bg-slate-50/60"
            >
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition">
                <Camera className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition">
                + Add Asset Photos
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Upload photos of this property
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
                <span className="text-[10px] text-slate-400">• Up to 10MB each</span>
              </div>
            </div>
          ) : (
            /* Selected Photos Grid with Previews, Thumbnail Badge & Set as Thumbnail */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {selectedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className={`relative group rounded-xl border bg-white overflow-hidden shadow-xs transition ${
                    photo.isThumbnail
                      ? 'border-blue-600 ring-2 ring-blue-500/30'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="h-24 w-full bg-slate-100 relative">
                    <img
                      src={photo.previewUrl}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />

                    {/* Thumbnail Badge (if selected) */}
                    {photo.isThumbnail ? (
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-bold rounded-md flex items-center gap-1 shadow-sm">
                        <Star className="h-2.5 w-2.5 fill-white" />
                        Thumbnail
                      </span>
                    ) : (
                      /* Set as Thumbnail Button */
                      <button
                        type="button"
                        onClick={() => handleSetThumbnail(photo.id)}
                        className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-slate-900/70 hover:bg-blue-600 text-white text-[9px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition shadow-sm"
                      >
                        Set as Thumbnail
                      </button>
                    )}

                    {/* Remove Photo Button */}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-slate-900/70 hover:bg-red-600 text-white flex items-center justify-center transition shadow-xs"
                      title="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="p-2 bg-white">
                    <p className="text-[11px] font-bold text-slate-800 truncate" title={photo.name}>
                      {photo.name}
                    </p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-slate-400">{photo.sizeFormatted}</span>
                      {photo.isThumbnail && (
                        <span className="text-[9px] font-bold text-blue-600 flex items-center gap-0.5">
                          <Check className="h-2.5 w-2.5" /> Cover
                        </span>
                      )}
                    </div>
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
                <span className="text-[11px] font-bold">+ Add More</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
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
            {submitting ? 'Registering & Uploading Media...' : 'Save & Register Property'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateAssetModal;
