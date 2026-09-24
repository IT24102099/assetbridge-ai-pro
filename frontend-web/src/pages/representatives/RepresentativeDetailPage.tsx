import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { representativeApi } from '../../lib/api/representativeApi';
import { RepresentativeResponseDto } from '../../types/representative';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const RepresentativeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'Manager' || user?.role === 'Admin';

  const [rep, setRep] = useState<RepresentativeResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'assets' | 'availability' | 'documents' | 'history'>('profile');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  useEffect(() => {
    fetchRepresentative();
  }, [id]);

  const handleVerificationChange = async (status: 'Verified' | 'Rejected') => {
    if (!rep) return;
    try {
      setActionLoading(true);
      await representativeApi.updateVerification(rep.id, {
        status,
        notes: `Status updated to ${status} by ${user?.fullName || 'Manager'} on ${new Date().toLocaleDateString()}`,
      });
      await fetchRepresentative();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update verification status.');
    } finally {
      setActionLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar matching Screen 4 wireframe */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/representatives')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Representatives
        </button>

        <div className="flex items-center gap-2">
          {isManagerOrAdmin && rep.verificationStatus === 'Pending' && (
            <>
              <button
                onClick={() => handleVerificationChange('Verified')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50"
              >
                <UserCheck className="h-4 w-4" />
                Approve Verification
              </button>
              <button
                onClick={() => handleVerificationChange('Rejected')}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-50"
              >
                <UserX className="h-4 w-4" />
                Reject
              </button>
            </>
          )}

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 transition"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Profile Header Card matching Screen 4 wireframe */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="h-20 w-20 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-sm">
          {initial}
        </div>

        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{rep.fullName}</h1>
            <StatusBadge
              status={!rep.isActive ? 'Inactive' : rep.verificationStatus === 'Verified' ? 'Active' : 'Pending'}
              size="md"
            />
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
                <p className="font-bold text-slate-800">{rep.nationalIdNumber || '912345678V'}</p>
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
                  {rep.bio || 'Trusted local family contact for overseas real estate oversight.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Properties Managed by {rep.fullName}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div
                onClick={() => navigate('/assets')}
                className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer flex items-center gap-3 shadow-xs"
              >
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Nuwara Eliya Tea Estate Bungalow</h4>
                  <p className="text-[11px] text-slate-400">Nuwara Eliya • Active</p>
                </div>
              </div>

              <div
                onClick={() => navigate('/assets')}
                className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer flex items-center gap-3 shadow-xs"
              >
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Lotus Villa</h4>
                  <p className="text-[11px] text-slate-400">Colombo • Active</p>
                </div>
              </div>
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
            <h3 className="text-sm font-bold text-slate-900">Verification Documents</h3>
            <div className="space-y-2">
              <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="font-bold text-slate-800">National Identity Card (Front & Back)</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600">Verified</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="font-bold text-slate-800">Local Police Clearance Certificate</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600">Verified</span>
              </div>
            </div>
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
    </div>
  );
};
export default RepresentativeDetailPage;
