import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assetApi } from '../../lib/api/assetApi';
import { incidentApi } from '../../lib/api/incidentApi';
import { AssetResponseDto, AssetHistoryResponseDto, AssetMediaResponseDto } from '../../types/asset';
import { IncidentResponseDto } from '../../types/incident';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Tabs } from '../../components/common/Tabs';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import { ReportIncidentModal } from '../incidents/ReportIncidentModal';
import { EditAssetModal } from './EditAssetModal';
import {
  ArrowLeft,
  MapPin,
  PlusCircle,
  Building2,
  CheckCircle2,
  Edit2,
  UploadCloud,
  X,
  Check,
  AlertCircle,
  Star,
  Trash2,
} from 'lucide-react';

const DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80';

export const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<AssetResponseDto | null>(null);
  const [incidents, setIncidents] = useState<IncidentResponseDto[]>([]);
  const [history, setHistory] = useState<AssetHistoryResponseDto[]>([]);
  const [mediaList, setMediaList] = useState<AssetMediaResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Upload states in Media tab
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchAssetDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [assetRes, historyRes, incidentsRes, mediaRes] = await Promise.all([
        assetApi.getAssetById(id),
        assetApi.getAssetHistory(id),
        incidentApi.getIncidents({ assetId: id, pageSize: 20 }),
        assetApi.getMedia(id),
      ]);

      if (assetRes.data) {
        setAsset(assetRes.data);
      }
      if (historyRes.data) {
        setHistory(historyRes.data);
      }
      if (incidentsRes.data) {
        setIncidents(incidentsRes.data.items);
      }
      if (mediaRes.data) {
        setMediaList(mediaRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load asset details', err);
      setError(err?.response?.data?.message || 'Failed to load property details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetDetails();
  }, [id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadSuccess(null);
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        setUploadError('Please select a valid image file (JPG, PNG, WEBP).');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size exceeds the 10MB limit.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCancelSelection = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadError(null);
  };

  const handleUploadPhoto = async () => {
    if (!id || !selectedFile || !previewUrl) return;

    try {
      setIsUploading(true);
      setUploadError(null);

      const isFirst = mediaList.length === 0;

      await assetApi.addMedia(id, {
        fileName: selectedFile.name,
        fileUrl: previewUrl,
        fileSizeBytes: selectedFile.size,
        fileType: selectedFile.type || 'image/jpeg',
        isThumbnail: isFirst,
        caption: isFirst ? 'Primary Property Thumbnail' : 'Property Photo',
      });

      setUploadSuccess(`Photo "${selectedFile.name}" added to property media successfully!`);
      setSelectedFile(null);
      setPreviewUrl(null);
      await fetchAssetDetails();
    } catch (err: any) {
      console.error('Failed to upload asset media', err);
      setUploadError(err?.response?.data?.message || 'Failed to process image upload. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetThumbnail = async (mediaId: string) => {
    if (!id) return;
    try {
      await assetApi.setThumbnail(id, mediaId);
      setUploadSuccess('Cover thumbnail updated successfully!');
      // Update local media state to reflect the single thumbnail immediately
      setMediaList((prev) =>
        prev.map((m) => ({
          ...m,
          isThumbnail: m.id === mediaId,
        }))
      );
      if (asset) {
        const target = mediaList.find((m) => m.id === mediaId);
        if (target) {
          setAsset({ ...asset, thumbnailUrl: target.fileUrl });
        }
      }
    } catch (err: any) {
      console.error('Failed to update thumbnail', err);
      setUploadError(err?.response?.data?.message || 'Failed to update thumbnail cover image.');
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to remove this property photo?')) return;

    try {
      await assetApi.deleteMedia(id, mediaId);
      await fetchAssetDetails();
      setUploadSuccess('Property photo removed successfully.');
    } catch (err: any) {
      console.error('Failed to delete media', err);
      setUploadError(err?.response?.data?.message || 'Failed to delete photo.');
    }
  };

  if (loading) {
    return <LoadingState message="Loading property asset specifications..." />;
  }

  if (error || !asset) {
    return (
      <ErrorState
        message={error || 'Property asset not found.'}
        onRetry={fetchAssetDetails}
      />
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'location', label: 'Location' },
    { id: 'media', label: `Media (${mediaList.length})` },
    { id: 'history', label: 'History' },
    { id: 'incidents', label: `Incidents (${incidents.length})` },
  ];

  // Thumbnail / Cover image determination
  const thumbnailMedia = mediaList.find((m) => m.isThumbnail) || mediaList[0];
  const primaryPhotoUrl = thumbnailMedia?.fileUrl || asset.thumbnailUrl || DEFAULT_FALLBACK_IMAGE;

  // Secondary photos for the 3 thumbnails on the right
  const secondaryMedia = mediaList.filter((m) => m.id !== thumbnailMedia?.id).slice(0, 3);
  const overflowCount = Math.max(0, mediaList.length - 4);

  return (
    <div className="space-y-6">
      {/* Top Bar matching Screen 4 wireframe: Back link + Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/assets')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assets
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs px-3.5 py-1.5 rounded-xl border border-blue-200 transition"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Report Incident
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl shadow-xs transition"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      </div>

      {/* Main Detail Container matching Screen 4 wireframe */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Photo Gallery Grid matching Screen 4 wireframe (Large primary photo + 3 thumbnails with +3 badge) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Main Showcase Hero Image (Using Selected Thumbnail) */}
          <div className="md:col-span-3 h-64 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative group">
            <img
              src={primaryPhotoUrl}
              alt={asset.name}
              className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
              }}
            />
            <div className="absolute bottom-3 left-3 bg-slate-900/80 text-white text-[11px] font-semibold px-3 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1.5 shadow-sm">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              Primary Cover Thumbnail
            </div>
          </div>

          {/* Right Thumbnails Column */}
          <div className="grid grid-cols-3 md:grid-cols-1 gap-2.5">
            {secondaryMedia.map((m) => (
              <div
                key={m.id}
                onClick={() => handleSetThumbnail(m.id)}
                title="Click to set as cover thumbnail"
                className="h-19 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 cursor-pointer hover:border-blue-400 transition relative group"
              >
                <img src={m.fileUrl} alt={m.fileName} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px] text-white font-bold">
                  Set Cover
                </div>
              </div>
            ))}

            {/* Fallback slots if less than 3 secondary photos */}
            {secondaryMedia.length < 3 &&
              Array.from({ length: 3 - secondaryMedia.length }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  onClick={() => setActiveTab('media')}
                  className="h-19 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 text-xs font-bold cursor-pointer hover:bg-slate-100"
                >
                  <Building2 className="h-5 w-5 opacity-40" />
                </div>
              ))}

            {/* +X count overlay if more photos exist */}
            {overflowCount > 0 ? (
              <div
                onClick={() => setActiveTab('media')}
                className="h-19 bg-slate-900/90 text-white rounded-xl border border-slate-700 flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-slate-800 transition shadow-xs"
              >
                +{overflowCount} More
              </div>
            ) : null}
          </div>
        </div>

        {/* Title & Status Header matching Screen 4 wireframe */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{asset.name}</h1>
            <StatusBadge status={asset.status} size="md" />
          </div>
          <p className="text-xs text-slate-500 font-medium">{asset.propertyTypeName || 'Residential Property'}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            {asset.addressLine1}, {asset.city}, Sri Lanka
          </p>
        </div>

        {/* Tabs Bar matching Screen 4 wireframe */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab 1: Overview Key-Value Table */}
        {activeTab === 'overview' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-500 w-44">Asset ID</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    AS-{asset.city ? asset.city.slice(0, 3).toUpperCase() : 'PRP'}-{asset.id.slice(0, 4).toUpperCase()}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-500">Type</td>
                  <td className="py-3 px-4 text-slate-800 font-medium">{asset.propertyTypeName}</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-500">Address</td>
                  <td className="py-3 px-4 text-slate-800 font-medium">
                    {asset.addressLine1}, {asset.city}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-500">Owner</td>
                  <td className="py-3 px-4 text-slate-800 font-bold">{asset.ownerName || 'Verified Property Owner'}</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-500">Coordinates</td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {asset.latitude && asset.longitude
                      ? `${asset.latitude.toFixed(4)} N, ${asset.longitude.toFixed(4)} E`
                      : '6.9271 N, 79.8612 E'}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-500">Registered On</td>
                  <td className="py-3 px-4 text-slate-700">
                    {new Date(asset.createdAtUtc).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-500">Status</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-emerald-600">{asset.status}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Location */}
        {activeTab === 'location' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">District</span>
                <p className="font-bold text-slate-800 mt-0.5">{asset.district}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">City</span>
                <p className="font-bold text-slate-800 mt-0.5">{asset.city}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Postal Code</span>
                <p className="font-bold text-slate-800 mt-0.5">{asset.postalCode || 'N/A'}</p>
              </div>
            </div>

            <div className="h-48 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <MapPin className="h-7 w-7 text-blue-600 mx-auto mb-1" />
                <p className="text-xs font-bold text-slate-700">{asset.addressLine1}, {asset.city}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  GPS: {asset.latitude || '6.9271'}, {asset.longitude || '79.8612'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Media & Upload Functionality */}
        {activeTab === 'media' && (
          <div className="space-y-6">
            {/* Feedback Notifications */}
            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {/* Upload Box */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Add Property Photo
                </h3>
                <p className="text-xs text-slate-500">
                  Upload images of rooms, elevation, boundary walls, or roof setup (JPG, PNG, WEBP up to 10MB)
                </p>
              </div>

              {!selectedFile ? (
                <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-xl p-6 text-center cursor-pointer flex flex-col items-center justify-center bg-white transition block">
                  <UploadCloud className="h-8 w-8 text-blue-600 mb-1.5" />
                  <span className="text-xs font-bold text-slate-800">Click to browse or drag photo</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP • Up to 10MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="p-4 bg-white rounded-xl border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="h-16 w-16 rounded-lg object-cover border border-slate-200"
                      />
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-800">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={handleCancelSelection}
                      disabled={isUploading}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadPhoto}
                      disabled={isUploading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isUploading ? 'Uploading...' : 'Save & Upload Photo'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Media Gallery Grid */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                All Property Photos ({mediaList.length})
              </h3>

              {mediaList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <Building2 className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No property photos uploaded yet</p>
                  <p className="text-[11px] text-slate-400">Upload photos above to establish property media.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mediaList.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-xl border bg-white overflow-hidden shadow-xs group transition ${
                        m.isThumbnail
                          ? 'border-blue-600 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="h-40 overflow-hidden bg-slate-100 relative">
                        <img
                          src={m.fileUrl}
                          alt={m.fileName}
                          className="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                        />

                        {/* Thumbnail Status or Set as Thumbnail Action */}
                        {m.isThumbnail ? (
                          <span className="absolute top-2 left-2 px-2.5 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-md flex items-center gap-1 shadow-md">
                            <Star className="h-3 w-3 fill-white" />
                            Thumbnail
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetThumbnail(m.id)}
                            className="absolute top-2 left-2 px-2.5 py-1 bg-slate-900/80 hover:bg-blue-600 text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition shadow-md"
                          >
                            Set as Thumbnail
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(m.id)}
                          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-slate-900/80 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md"
                          title="Delete photo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="p-3 bg-white">
                        <p className="text-xs font-bold text-slate-800 truncate" title={m.fileName}>
                          {m.fileName}
                        </p>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                          <span>{Math.round(m.fileSizeBytes / 1024)} KB</span>
                          <span>
                            {new Date(m.createdAtUtc).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: History */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No history logs recorded yet.</p>
            ) : (
              history.map((h) => (
                <div key={h.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{h.eventTitle}</p>
                    <p className="text-slate-500 text-[11px]">{h.eventDescription}</p>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(h.createdAtUtc).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 5: Incidents */}
        {activeTab === 'incidents' && (
          <div className="space-y-3">
            {incidents.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-700">No active incidents for this asset</p>
              </div>
            ) : (
              incidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-blue-600">
                        INC-{inc.id.slice(0, 4).toUpperCase()}
                      </span>
                      <StatusBadge status={inc.priority} size="sm" />
                      <StatusBadge status={inc.status} size="sm" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">{inc.title}</p>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(inc.createdAtUtc).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Report Modal */}
      {isReportModalOpen && (
        <ReportIncidentModal
          isOpen={isReportModalOpen}
          initialAssetId={asset.id}
          onClose={() => setIsReportModalOpen(false)}
          onSuccess={() => {
            setIsReportModalOpen(false);
            fetchAssetDetails();
          }}
        />
      )}

      {/* Edit Asset Modal */}
      {isEditModalOpen && (
        <EditAssetModal
          isOpen={isEditModalOpen}
          asset={asset}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            fetchAssetDetails();
          }}
        />
      )}
    </div>
  );
};
export default AssetDetailPage;
