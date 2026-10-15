import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { representativeApi } from '../../lib/api/representativeApi';
import { RepresentativeResponseDto, RepresentativeDocumentResponseDto } from '../../types/representative';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import { EditRepresentativeModal } from './EditRepresentativeModal';
import {
  ArrowLeft,
  Edit3,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Building2,
  FileText,
  CheckCircle2,
  UserCheck,
  UserX,
  UploadCloud,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const RepresentativeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rep, setRep] = useState<RepresentativeResponseDto | null>(null);
  const isManagerOrAdmin = user?.role === 'Manager' || user?.role === 'Admin';
  const isSelf = !!(user?.id && rep?.userId && user.id === rep.userId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'assets' | 'availability' | 'documents' | 'history'>('profile');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Verification Documents State
  const [documents, setDocuments] = useState<RepresentativeDocumentResponseDto[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState<string>('NationalId');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Review Modal State
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    doc: RepresentativeDocumentResponseDto | null;
    decision: 'Verified' | 'Rejected';
    notes: string;
    loading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    doc: null,
    decision: 'Verified',
    notes: '',
    loading: false,
    error: null,
  });

  const fetchRepresentative = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await representativeApi.getRepresentativeById(id);
      if (res.data) {
        setRep(res.data);
      } else {
        setError('Representative profile not found.');
      }
    } catch (err: any) {
      console.error('Failed to load representative:', err);
      setError(err?.response?.data?.message || 'Failed to retrieve representative details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    if (!id) return;
    try {
      setDocsLoading(true);
      const res = await representativeApi.getDocuments(id);
      if (res.data) {
        setDocuments(res.data);
      }
    } catch (err) {
      console.warn('Failed to load documents:', err);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    fetchRepresentative();
    fetchDocuments();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments();
    }
  }, [activeTab]);

  const handleVerificationChange = async (status: 'Verified' | 'Rejected') => {
    if (!rep) return;
    try {
      setActionLoading(true);
      await representativeApi.updateVerification(rep.id, {
        status,
        notes: `Status updated to ${status} by ${user?.fullName || 'Manager'} on ${new Date().toLocaleDateString()}`,
      });
      await Promise.all([fetchRepresentative(), fetchDocuments()]);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update verification status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !uploadFile) {
      setUploadError('Please select a document file to upload.');
      return;
    }

    if (uploadFile.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds the 10 MB maximum limit.');
      return;
    }

    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileExt = '.' + uploadFile.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      setUploadError('Only PDF, JPG, and PNG documents are supported.');
      return;
    }

    try {
      setUploadLoading(true);
      setUploadError(null);
      await representativeApi.uploadDocument(id, uploadFile, uploadDocType);
      setIsUploadModalOpen(false);
      setUploadFile(null);
      await Promise.all([fetchDocuments(), fetchRepresentative()]);
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || 'Failed to upload verification document.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reviewModal.doc) return;

    try {
      setReviewModal((prev) => ({ ...prev, loading: true, error: null }));
      await representativeApi.reviewDocument(id, reviewModal.doc.id, {
        status: reviewModal.decision,
        notes: reviewModal.notes.trim() || undefined,
      });
      setReviewModal({
        isOpen: false,
        doc: null,
        decision: 'Verified',
        notes: '',
        loading: false,
        error: null,
      });
      await Promise.all([fetchDocuments(), fetchRepresentative()]);
    } catch (err: any) {
      setReviewModal((prev) => ({
        ...prev,
        loading: false,
        error: err?.response?.data?.message || 'Failed to record document review.',
      }));
    }
  };

  if (loading) {
    return <LoadingState message="Loading representative profile..." />;
  }

  if (error || !rep) {
    return (
      <ErrorState
        message={error || 'Representative not found.'}
        onRetry={() => navigate('/representatives')}
      />
    );
  }

  const initial = rep.fullName ? rep.fullName.charAt(0).toUpperCase() : 'R';
  const currentStatus =
    !rep.isActive || rep.verificationStatus === 'Rejected' || rep.verificationStatus === 'Suspended'
      ? 'Unverified'
      : rep.verificationStatus === 'Verified'
      ? 'Verified'
      : 'Pending';

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/representatives')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Representatives
        </button>

        <button
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 transition"
        >
          <Edit3 className="h-4 w-4" />
          Edit
        </button>
      </div>

      {/* Manager Verification Control Panel */}
      {isManagerOrAdmin && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Status:</span>
            <StatusBadge status={currentStatus} size="sm" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Verification Action:</span>
            <button
              onClick={() => handleVerificationChange('Verified')}
              disabled={actionLoading || currentStatus === 'Verified'}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Approve
            </button>
            <button
              onClick={() => handleVerificationChange('Rejected')}
              disabled={actionLoading || currentStatus === 'Unverified'}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              <UserX className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Profile Header Card matching Screen 4 wireframe */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="h-20 w-20 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-sm">
          {initial}
        </div>

        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{rep.fullName}</h1>
            <StatusBadge status={currentStatus} size="md" />
          </div>

          <p className="text-xs font-semibold text-blue-600">Local Representative</p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              {rep.phoneNumber}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              {rep.email}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {rep.city ? `${rep.city}, Sri Lanka` : `${rep.district}, Sri Lanka`}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation matching Screen 4 wireframe */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'profile', label: 'Profile' },
          { id: 'assets', label: 'Assigned Assets' },
          { id: 'availability', label: 'Availability' },
          { id: 'documents', label: 'Documents' },
          { id: 'history', label: 'History' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Representative Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  NIC / ID
                </span>
                <p className="font-bold text-slate-800">{rep.nationalIdNumber || 'Not provided'}</p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  Physical Address
                </span>
                <p className="font-bold text-slate-800">{rep.address || `${rep.city}, Sri Lanka`}</p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  Preferred Areas
                </span>
                <p className="font-bold text-slate-800">
                  {rep.city === 'Kandy'
                    ? 'Kandy, Peradeniya, Katugastota'
                    : rep.city === 'Colombo'
                    ? 'Colombo 01-15, Dehiwala, Mount Lavinia'
                    : `${rep.district} district and adjoining zones`}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  Skills & Capabilities
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px]">
                    General Inspection
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px]">
                    Site Visit
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px]">
                    Coordination
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  Verification Status
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      rep.verificationStatus === 'Verified'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : rep.verificationStatus === 'Pending'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {rep.verificationStatus}
                  </span>
                  {rep.verificationNotes && (
                    <span className="text-[11px] text-slate-400">({rep.verificationNotes})</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  Joined On
                </span>
                <p className="font-bold text-slate-800">
                  {new Date(rep.createdAtUtc).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className="md:col-span-2">
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  Notes & Bio
                </span>
                <p className="text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed font-medium">
                  {rep.bio || 'Not provided'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Properties Managed by {rep.fullName}</h3>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 text-center">
              <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No property assigned</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Properties assigned to this representative for inspections will appear here.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'availability' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">On-Site Visit Availability</h3>
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-800 space-y-1">
              <p className="font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Active on Ground
              </p>
              <p className="text-[11px] text-emerald-700">
                Available for routine scheduled inspections Monday through Saturday (08:00 - 17:00).
              </p>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Verification Documents ({documents.length})</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official identity records and police clearances required for on-site authorization
                </p>
              </div>

              {(isManagerOrAdmin || isSelf) && (
                <button
                  onClick={() => {
                    setUploadError(null);
                    setUploadFile(null);
                    setIsUploadModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition self-start sm:self-auto"
                >
                  <UploadCloud className="h-4 w-4" />
                  Upload Document
                </button>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold">Trust & Identity Security Standard</span>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Uploaded documents are placed in <strong>Pending Review</strong> status. Authorized management verification is required before on-site property access is granted.
                </p>
              </div>
            </div>

            {docsLoading ? (
              <LoadingState message="Loading verification documents..." />
            ) : documents.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 text-center space-y-3">
                <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                <div>
                  <h4 className="text-xs font-bold text-slate-700">No verification documents uploaded yet</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload National Identity Card (NIC) or Police Clearance Certificate to initiate verification.
                  </p>
                </div>
                {(isManagerOrAdmin || isSelf) && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    Upload Document Now
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => {
                  const isVerified = doc.status === 'Verified';
                  const isRejected = doc.status === 'Rejected';
                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isVerified ? 'bg-emerald-50 text-emerald-600' : isRejected ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{doc.documentTypeName}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {doc.fileName} • {(doc.fileSizeBytes / 1024).toFixed(0)} KB • Uploaded on {new Date(doc.uploadedAtUtc).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isVerified
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isRejected
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {isVerified ? (
                              <CheckCircle className="h-3.5 w-3.5" />
                            ) : isRejected ? (
                              <XCircle className="h-3.5 w-3.5" />
                            ) : (
                              <Clock className="h-3.5 w-3.5" />
                            )}
                            {doc.status}
                          </span>

                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </a>

                          {isManagerOrAdmin && (
                            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
                              <button
                                onClick={() =>
                                  setReviewModal({
                                    isOpen: true,
                                    doc,
                                    decision: 'Verified',
                                    notes: 'Document details verified against official Sri Lanka records.',
                                    loading: false,
                                    error: null,
                                  })
                                }
                                disabled={isVerified}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[11px] font-bold rounded-lg transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  setReviewModal({
                                    isOpen: true,
                                    doc,
                                    decision: 'Rejected',
                                    notes: '',
                                    loading: false,
                                    error: null,
                                  })
                                }
                                disabled={isRejected}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-[11px] font-bold rounded-lg transition"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {doc.reviewerNotes && (
                        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex items-start gap-1.5 bg-slate-50/50 p-2.5 rounded-xl">
                          <span className="font-bold text-slate-700 shrink-0">Review Note:</span>
                          <span>{doc.reviewerNotes}</span>
                          {doc.reviewedBy && (
                            <span className="text-slate-400 ml-auto italic">Reviewed by {doc.reviewedBy}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Inspection & Activity History</h3>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Site Inspection Completed</p>
                  <p className="text-[11px] text-slate-400">INC-1021 Kitchen Ceiling Damage inspection</p>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">17 Sep 2026</span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Property Key Handover</p>
                  <p className="text-[11px] text-slate-400">Annual maintenance audit visit</p>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">10 Aug 2026</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditRepresentativeModal
          isOpen={isEditModalOpen}
          representative={rep}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            fetchRepresentative();
          }}
        />
      )}

      {/* Document Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Upload Verification Document</h3>
                  <p className="text-[11px] text-slate-500">Representative identity & trust credentials</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4">
              {uploadError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Document Type *</label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="NationalId">National Identity Card (Front & Back)</option>
                  <option value="PoliceClearance">Local Police Clearance Certificate</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Select Document File (PDF, JPG, PNG - Max 10MB) *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
                Uploaded documents will be reviewed by an authorized operations manager before granting on-ground inspection permissions.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={uploadLoading}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading || !uploadFile}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition"
                >
                  {uploadLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Upload Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Document Modal */}
      {reviewModal.isOpen && reviewModal.doc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                  reviewModal.decision === 'Verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}>
                  {reviewModal.decision === 'Verified' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {reviewModal.decision === 'Verified' ? 'Approve Verification Document' : 'Reject Verification Document'}
                  </h3>
                  <p className="text-[11px] text-slate-500">{reviewModal.doc.documentTypeName}</p>
                </div>
              </div>
              <button
                onClick={() => setReviewModal((prev) => ({ ...prev, isOpen: false }))}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="p-5 space-y-4">
              {reviewModal.error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{reviewModal.error}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                <span className="font-bold text-slate-700">Document: {reviewModal.doc.fileName}</span>
                <p className="text-[11px] text-slate-500">
                  Decision will update the verification status and notify the local representative.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  {reviewModal.decision === 'Verified' ? 'Verification Notes / Reference' : 'Rejection Reason (Required)'} *
                </label>
                <textarea
                  rows={3}
                  required={reviewModal.decision === 'Rejected'}
                  placeholder={
                    reviewModal.decision === 'Verified'
                      ? 'e.g. Verified with Department of Registration of Persons / Police Division records.'
                      : 'e.g. Scanned copy is illegible or document validity period has expired.'
                  }
                  value={reviewModal.notes}
                  onChange={(e) => setReviewModal((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setReviewModal((prev) => ({ ...prev, isOpen: false }))}
                  disabled={reviewModal.loading}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewModal.loading}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition ${
                    reviewModal.decision === 'Verified'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {reviewModal.loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm {reviewModal.decision}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default RepresentativeDetailPage;
