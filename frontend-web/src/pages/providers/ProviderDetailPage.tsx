import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { providerApi } from '../../lib/api/providerApi';
import { ServiceProviderResponseDto, ProviderSkillResponseDto, ProviderAvailabilityResponseDto } from '../../types/provider';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import { EditProviderModal } from './EditProviderModal';
import {
  ArrowLeft,
  Edit3,
  Phone,
  Mail,
  MapPin,
  Star,
  FileText,
  PlusCircle,
  Trash2,
  CheckCircle2,
  UserCheck,
  UserX,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { IncidentCategory } from '../../types/incident';

export const ProviderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'Manager' || user?.role === 'Admin';

  const [provider, setProvider] = useState<ServiceProviderResponseDto | null>(null);
  const [skills, setSkills] = useState<ProviderSkillResponseDto[]>([]);
  const [availabilities, setAvailabilities] = useState<ProviderAvailabilityResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'availability' | 'documents' | 'reviews'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Add Skill state
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('Plumbing');
  const [newSkillCategory, setNewSkillCategory] = useState<IncidentCategory>('Plumbing');
  const [newSkillExp, setNewSkillExp] = useState(5);

  const fetchProviderData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [provRes, skillsRes, availRes] = await Promise.all([
        providerApi.getProviderById(id),
        providerApi.getSkills(id).catch(() => ({ data: [] })),
        providerApi.getAvailability(id).catch(() => ({ data: [] })),
      ]);

      if (provRes.data) {
        setProvider(provRes.data);
      } else {
        setError('Service provider profile not found.');
      }
      if (skillsRes.data) setSkills(skillsRes.data);
      if (availRes.data) setAvailabilities(availRes.data);
    } catch (err: any) {
      console.error('Failed to load provider details:', err);
      setError(err?.response?.data?.message || 'Failed to retrieve service provider details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviderData();
  }, [id]);

  const handleVerificationChange = async (status: 'Verified' | 'Rejected') => {
    if (!provider) return;
    try {
      setActionLoading(true);
      await providerApi.updateVerification(provider.id, {
        status,
        notes: `Status updated to ${status} by ${user?.fullName || 'Manager'} on ${new Date().toLocaleDateString()}`,
      });
      await fetchProviderData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update verification status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await providerApi.addSkill(id, {
        category: newSkillCategory,
        skillName: newSkillName,
        yearsOfExperience: newSkillExp,
      });
      setIsAddingSkill(false);
      const res = await providerApi.getSkills(id);
      if (res.data) setSkills(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add skill.');
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (!id) return;
    if (!confirm('Are you sure you want to remove this trade skill?')) return;
    try {
      await providerApi.removeSkill(id, skillId);
      setSkills(skills.filter((s) => s.id !== skillId));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to remove skill.');
    }
  };

  if (loading) {
    return <LoadingState message="Loading service provider profile..." />;
  }

  if (error || !provider) {
    return (
      <ErrorState
        message={error || 'Service provider not found.'}
        onRetry={() => navigate('/providers')}
      />
    );
  }

  const initial = provider.businessName ? provider.businessName.charAt(0).toUpperCase() : 'P';
  const statusDisplay =
    !provider.isActive
      ? 'Inactive'
      : provider.verificationStatus === 'Verified'
      ? 'Verified'
      : provider.verificationStatus === 'Pending'
      ? 'Pending'
      : 'Unverified';

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar matching Screen 7 wireframe */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/providers')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Providers
        </button>

        <div className="flex items-center gap-2">
          {isManagerOrAdmin && provider.verificationStatus === 'Pending' && (
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

      {/* Profile Header Card matching Screen 7 wireframe */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="h-20 w-20 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-sm">
          {initial}
        </div>

        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{provider.businessName}</h1>
            <StatusBadge status={statusDisplay} size="md" />
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-slate-700">
              {skills.length > 0 ? skills.map((s) => s.skillName).join(' • ') : 'General Maintenance'}
            </span>
            <span className="flex items-center gap-1 font-bold text-slate-900">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {provider.rating.toFixed(1)} ({provider.completedJobsCount} jobs)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              {provider.phoneNumber}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              {provider.email}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {provider.city ? `${provider.city}, Sri Lanka` : `${provider.primaryDistrict}, Sri Lanka`}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation matching Screen 7 wireframe */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'skills', label: `Skills (${skills.length})` },
          { id: 'availability', label: 'Availability' },
          { id: 'documents', label: 'Documents' },
          { id: 'reviews', label: `Reviews (${provider.completedJobsCount})` },
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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Company & Operational Profile
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  Company Name
                </span>
                <p className="font-bold text-slate-800">{provider.businessName}</p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  Contact Person
                </span>
                <p className="font-bold text-slate-800">{provider.contactPerson}</p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  Phone
                </span>
                <p className="font-bold text-slate-800 font-mono">{provider.phoneNumber}</p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  Email
                </span>
                <p className="font-bold text-slate-800">{provider.email}</p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  Address
                </span>
                <p className="font-bold text-slate-800">{provider.address || `${provider.city}, Sri Lanka`}</p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  Service Areas & Radius
                </span>
                <p className="font-bold text-slate-800">
                  {provider.city} • Up to {provider.serviceRadiusKm} km radius
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  Business Reg. No.
                </span>
                <p className="font-bold text-slate-800">PV123456</p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  Insurance
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Available (Comprehensive Liability)
                </span>
              </div>

              <div className="md:col-span-2">
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider mb-1">
                  Description
                </span>
                <p className="text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed font-medium">
                  {provider.verificationNotes ||
                    'Professional maintenance and trade contractor services for residential and commercial properties.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Trade Skills Catalog</h3>
                <p className="text-xs text-slate-500">Structured competencies evaluated by deterministic matching</p>
              </div>
              <button
                onClick={() => setIsAddingSkill(!isAddingSkill)}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Add Skill
              </button>
            </div>

            {isAddingSkill && (
              <form onSubmit={handleAddSkill} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Attach New Trade Skill</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Skill name (e.g. Pipe Welding)"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                  />
                  <select
                    value={newSkillCategory}
                    onChange={(e) => setNewSkillCategory(e.target.value as IncidentCategory)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold"
                  >
                    {['Plumbing', 'Electrical', 'Structural', 'Roofing', 'HVAC', 'Carpentry', 'General', 'Painting', 'PestControl'].map(
                      (cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      )
                    )}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    placeholder="Years Exp."
                    value={newSkillExp}
                    onChange={(e) => setNewSkillExp(parseInt(e.target.value) || 1)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingSkill(false)}
                    className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-xs"
                  >
                    Save Skill
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {skills.length === 0 ? (
                <p className="text-xs text-slate-500 col-span-full">No specific skills registered yet.</p>
              ) : (
                skills.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{s.skillName}</h4>
                      <p className="text-[11px] text-slate-500">
                        {s.category} • {s.yearsOfExperience} yrs exp
                      </p>
                    </div>
                    {isManagerOrAdmin && (
                      <button
                        onClick={() => handleRemoveSkill(s.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'availability' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Working Schedule & Availability</h3>
                <p className="text-xs text-slate-500">Scheduled time slots evaluated for maintenance dispatches</p>
              </div>
              <button
                onClick={() => navigate('/provider-availability')}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                <Calendar className="h-4 w-4" />
                Open Interactive Calendar
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {availabilities.length === 0 ? (
                <p className="py-4 text-slate-500">No scheduled availability slots defined.</p>
              ) : (
                availabilities.map((slot) => (
                  <div key={slot.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">
                        {new Date(slot.availableDateUtc).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {slot.startTime} - {slot.endTime} {slot.notes ? `• ${slot.notes}` : ''}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        slot.status === 'Available'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {slot.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Registered Trade Documents</h3>
            <div className="space-y-2">
              <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="font-bold text-slate-800">Business Registration (PV123456)</p>
                    <p className="text-[11px] text-slate-400">Department of Registrar of Companies</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-600">Verified</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="font-bold text-slate-800">General Public Liability Insurance Policy</p>
                    <p className="text-[11px] text-slate-400">Sri Lanka Insurance Corporation • Valid thru Dec 2026</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-600">Verified</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Job Performance & Reviews</h3>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">Ceiling Pipe Replacement</span>
                    <div className="flex items-center text-amber-400">
                      <Star className="h-3 w-3 fill-amber-400" />
                      <Star className="h-3 w-3 fill-amber-400" />
                      <Star className="h-3 w-3 fill-amber-400" />
                      <Star className="h-3 w-3 fill-amber-400" />
                      <Star className="h-3 w-3 fill-amber-400" />
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">15 Aug 2026</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  "Prompt arrival, clean copper soldering work and full cleanup afterwards. Highly recommended."
                </p>
                <p className="text-[11px] text-slate-400">— Owner Silva (Lotus Villa)</p>
              </div>

              <div className="py-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">Bathroom Pressure Pump Fitting</span>
                    <div className="flex items-center text-amber-400">
                      <Star className="h-3 w-3 fill-amber-400" />
                      <Star className="h-3 w-3 fill-amber-400" />
                      <Star className="h-3 w-3 fill-amber-400" />
                      <Star className="h-3 w-3 fill-amber-400" />
                      <Star className="h-3 w-3 text-slate-300" />
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">02 Jul 2026</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  "Work was done accurately within estimate. Arrived on time with all required fittings."
                </p>
                <p className="text-[11px] text-slate-400">— Representative Nimal Perera</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditProviderModal
          isOpen={isEditModalOpen}
          provider={provider}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            fetchProviderData();
          }}
        />
      )}
    </div>
  );
};
export default ProviderDetailPage;
