import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { providerApi } from '../../lib/api/providerApi';
import { CreateServiceProviderRequestDto, ServiceProviderResponseDto } from '../../types/provider';
import { X, Briefcase, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { IncidentCategory } from '../../types/incident';
import { SRI_LANKA_DISTRICTS, getCitiesForDistrict } from '../../constants/sriLankaLocations';
import { isValidEmail } from '../../utils/validationUtils';

interface CreateProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SKILL_OPTIONS: { category: IncidentCategory; name: string }[] = [
  { category: 'Plumbing', name: 'Plumbing' },
  { category: 'Plumbing', name: 'Pipe Repair' },
  { category: 'Plumbing', name: 'Leak Detection' },
  { category: 'Electrical', name: 'Electrical' },
  { category: 'Electrical', name: 'Wiring' },
  { category: 'Structural', name: 'Masonry' },
  { category: 'HVAC', name: 'AC Service' },
  { category: 'General', name: 'Cleaning' },
  { category: 'Roofing', name: 'Roofing' },
  { category: 'Carpentry', name: 'Carpentry' },
  { category: 'Painting', name: 'Painting' },
  { category: 'PestControl', name: 'Pest Control' },
];

export const CreateProviderModal: React.FC<CreateProviderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateServiceProviderRequestDto>({
    businessName: '',
    contactPerson: '',
    phoneNumber: '',
    email: '',
    primaryDistrict: 'Kandy',
    city: 'Kandy',
    address: '',
    serviceRadiusKm: 30,
    baseLatitude: 7.2906,
    baseLongitude: 80.6337,
  });

  const [selectedSkill, setSelectedSkill] = useState<{ category: IncidentCategory; name: string }>(
    SKILL_OPTIONS[0]
  );
  const [experienceYears, setExperienceYears] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [existingProfile, setExistingProfile] = useState<ServiceProviderResponseDto | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkExistingProfile();
    }
  }, [isOpen]);

  const checkExistingProfile = async () => {
    try {
      const res = await providerApi.getCurrentProfile();
      if (res.data?.id) {
        setExistingProfile(res.data);
      }
    } catch {
      setExistingProfile(null);
    }
  };

  if (!isOpen) return null;

  const handleDistrictChange = (newDistrict: string) => {
    const availableCities = getCitiesForDistrict(newDistrict);
    setFormData((prev) => ({
      ...prev,
      primaryDistrict: newDistrict,
      city: availableCities.length > 0 ? availableCities[0] : newDistrict,
    }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.businessName.trim()) errs.businessName = 'Business or trade name is required.';
    if (!formData.contactPerson.trim()) errs.contactPerson = 'Contact person name is required.';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!isValidEmail(formData.email)) {
      errs.email = 'Please provide a valid email address.';
    }
    if (!formData.phoneNumber.trim()) {
      errs.phoneNumber = 'Phone number is required.';
    } else if (formData.phoneNumber.replace(/[\s\-\+]/g, '').length < 9) {
      errs.phoneNumber = 'Please provide a valid phone number with country code.';
    }
    if (Number(experienceYears) < 0 || Number(experienceYears) > 50) {
      errs.experienceYears = 'Experience must be between 0 and 50 years.';
    }
    if (Number(formData.serviceRadiusKm) < 1 || Number(formData.serviceRadiusKm) > 200) {
      errs.serviceRadiusKm = 'Service radius must be between 1 and 200 km.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await providerApi.createProvider(formData);
      if (res.data?.id) {
        try {
          await providerApi.addSkill(res.data.id, {
            category: selectedSkill.category,
            skillName: selectedSkill.name,
            yearsOfExperience: Number(experienceYears),
            isPrimary: true,
          });
        } catch (skillErr) {
          console.warn('Initial skill attachment note:', skillErr);
        }
      }
      onSuccess();
    } catch (err: any) {
      console.error('Failed to create provider:', err);
      const serverMsg = err?.response?.data?.message || err?.response?.data?.title || 'Failed to register service provider profile.';
      const errorsObj = err?.response?.data?.errors;

      const isDuplicate =
        (errorsObj && (errorsObj.UserId || errorsObj.userId)) ||
        serverMsg.toLowerCase().includes('already exists');

      if (isDuplicate) {
        await checkExistingProfile();
        setError('A service provider profile already exists for this user account. You cannot create duplicate profiles.');
        return;
      }

      if (errorsObj && typeof errorsObj === 'object') {
        const mappedErrors: Record<string, string> = {};
        for (const [key, val] of Object.entries(errorsObj)) {
          const lower = key.charAt(0).toLowerCase() + key.slice(1);
          mappedErrors[lower] = Array.isArray(val) ? val.join(', ') : String(val);
        }
        setFieldErrors(mappedErrors);
        const details = Object.entries(errorsObj)
          .map(([key, msgs]: any) => `${key}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ');
        setError(`${serverMsg} (${details})`);
      } else {
        setError(serverMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Service Provider</h2>
              <p className="text-xs text-slate-500">Register a contractor or technician for maintenance matching</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {existingProfile && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900">Provider Profile Already Registered</h4>
                  <p className="text-amber-800 mt-1">
                    Your account is already linked to provider profile{' '}
                    <strong>{existingProfile.businessName}</strong> ({existingProfile.city}, {existingProfile.primaryDistrict}).
                    To avoid orphaned records, a user account can only be associated with one service provider identity.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/providers/${existingProfile.id}`);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs"
                >
                  View / Edit Existing Profile <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {error && !existingProfile && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!existingProfile && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Business / Trade Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Electrical & Plumbing"
                    value={formData.businessName}
                    onChange={(e) => {
                      setFormData({ ...formData, businessName: e.target.value });
                      setFieldErrors((prev) => ({ ...prev, businessName: '' }));
                    }}
                    className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none transition ${
                      fieldErrors.businessName ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  {fieldErrors.businessName && <p className="text-[11px] text-red-600 font-semibold">{fieldErrors.businessName}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ruwan Silva"
                    value={formData.contactPerson}
                    onChange={(e) => {
                      setFormData({ ...formData, contactPerson: e.target.value });
                      setFieldErrors((prev) => ({ ...prev, contactPerson: '' }));
                    }}
                    className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none transition ${
                      fieldErrors.contactPerson ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  {fieldErrors.contactPerson && <p className="text-[11px] text-red-600 font-semibold">{fieldErrors.contactPerson}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. contact@apexengineering.lk"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none transition ${
                      fieldErrors.email ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  {fieldErrors.email && <p className="text-[11px] text-red-600 font-semibold">{fieldErrors.email}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 071 999 2222"
                    value={formData.phoneNumber}
                    onChange={(e) => {
                      setFormData({ ...formData, phoneNumber: e.target.value });
                      setFieldErrors((prev) => ({ ...prev, phoneNumber: '' }));
                    }}
                    className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none transition ${
                      fieldErrors.phoneNumber ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  {fieldErrors.phoneNumber && <p className="text-[11px] text-red-600 font-semibold">{fieldErrors.phoneNumber}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Primary Trade Skill *</label>
                  <select
                    value={selectedSkill.name}
                    onChange={(e) => {
                      const skill = SKILL_OPTIONS.find((s) => s.name === e.target.value) || SKILL_OPTIONS[0];
                      setSelectedSkill(skill);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
                  >
                    {SKILL_OPTIONS.map((opt) => (
                      <option key={opt.name} value={opt.name}>
                        {opt.name} ({opt.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Experience (Years) *</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={experienceYears}
                    onChange={(e) => {
                      setExperienceYears(Number(e.target.value));
                      setFieldErrors((prev) => ({ ...prev, experienceYears: '' }));
                    }}
                    className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none transition ${
                      fieldErrors.experienceYears ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  {fieldErrors.experienceYears && <p className="text-[11px] text-red-600 font-semibold">{fieldErrors.experienceYears}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">District *</label>
                  <select
                    value={formData.primaryDistrict}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
                  >
                    {SRI_LANKA_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">City / Town *</label>
                  {getCitiesForDistrict(formData.primaryDistrict).length > 0 ? (
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 transition"
                    >
                      {getCitiesForDistrict(formData.primaryDistrict).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kandy"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Service Radius (Km) *</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={formData.serviceRadiusKm}
                    onChange={(e) => {
                      setFormData({ ...formData, serviceRadiusKm: Number(e.target.value) });
                      setFieldErrors((prev) => ({ ...prev, serviceRadiusKm: '' }));
                    }}
                    className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none transition ${
                      fieldErrors.serviceRadiusKm ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  {fieldErrors.serviceRadiusKm && <p className="text-[11px] text-red-600 font-semibold">{fieldErrors.serviceRadiusKm}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Office / Workshop Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 45/2 Peradeniya Road, Kandy"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Register Provider
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default CreateProviderModal;
