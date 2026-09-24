import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { representativeApi } from '../../lib/api/representativeApi';
import { providerApi } from '../../lib/api/providerApi';
import { RepresentativeResponseDto } from '../../types/representative';
import { ServiceProviderResponseDto } from '../../types/provider';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, EmptyState } from '../../components/common/FeedbackStates';
import {
  Users,
  Briefcase,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const VerificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [reps, setReps] = useState<RepresentativeResponseDto[]>([]);
  const [providers, setProviders] = useState<ServiceProviderResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const [repsRes, provRes] = await Promise.all([
        representativeApi.getRepresentatives({ pageSize: 50 }),
        providerApi.getProviders({ pageSize: 50 }),
      ]);

      if (repsRes.data) {
        setReps(repsRes.data.items.filter((r) => r.verificationStatus === 'Pending'));
      }
      if (provRes.data) {
        setProviders(provRes.data.items.filter((p) => p.verificationStatus === 'Pending'));
      }
    } catch (err) {
      console.error('Failed to load pending verifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleVerifyRep = async (repId: string, status: 'Verified' | 'Rejected') => {
    try {
      setActionLoadingId(repId);
      await representativeApi.updateVerification(repId, {
        status,
        notes: `Reviewed by ${user?.fullName || 'Manager'} on ${new Date().toLocaleDateString()}`,
      });
      await fetchVerifications();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Verification update failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVerifyProvider = async (providerId: string, status: 'Verified' | 'Rejected') => {
    try {
      setActionLoadingId(providerId);
      await providerApi.updateVerification(providerId, {
        status,
        notes: `Reviewed by ${user?.fullName || 'Manager'} on ${new Date().toLocaleDateString()}`,
      });
      await fetchVerifications();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Verification update failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return <LoadingState message="Loading pending credential verifications..." />;
  }

  const totalPending = reps.length + providers.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Credential Verifications</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Review and approve identification, trade certificates, and business registration documents
        </p>
      </div>

      {totalPending === 0 ? (
        <EmptyState
          title="All Profiles Verified"
          description="There are currently no representatives or service providers awaiting background review."
        />
      ) : (
        <div className="space-y-6">
          {/* Pending Representatives */}
          {reps.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Pending Local Representatives ({reps.length})
              </h2>

              <div className="space-y-3">
                {reps.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{r.fullName}</h3>
                        <StatusBadge status="Pending" size="sm" />
                      </div>
                      <p className="text-xs text-slate-500">
                        {r.city} • NIC: {r.nationalIdNumber || 'Pending'} • Phone: {r.phoneNumber}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Registered on {new Date(r.createdAtUtc).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/representatives/${r.id}`)}
                        className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition"
                      >
                        Inspect Docs
                      </button>
                      <button
                        onClick={() => handleVerifyRep(r.id, 'Verified')}
                        disabled={actionLoadingId === r.id}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleVerifyRep(r.id, 'Rejected')}
                        disabled={actionLoadingId === r.id}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Service Providers */}
          {providers.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-sky-600" />
                Pending Service Providers ({providers.length})
              </h2>

              <div className="space-y-3">
                {providers.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{p.businessName}</h3>
                        <StatusBadge status="Pending" size="sm" />
                      </div>
                      <p className="text-xs text-slate-500">
                        {p.city} • Contact: {p.contactPerson} • Phone: {p.phoneNumber}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Trade skills registered • Business Reg documents pending review
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/providers/${p.id}`)}
                        className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition"
                      >
                        Inspect Docs
                      </button>
                      <button
                        onClick={() => handleVerifyProvider(p.id, 'Verified')}
                        disabled={actionLoadingId === p.id}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleVerifyProvider(p.id, 'Rejected')}
                        disabled={actionLoadingId === p.id}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default VerificationsPage;
