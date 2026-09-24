import React, { useState } from 'react';
import { providerApi } from '../../lib/api/providerApi';
import { CreateServiceProviderRequestDto } from '../../types/provider';
import { X, Briefcase, AlertCircle, Loader2 } from 'lucide-react';
import { IncidentCategory } from '../../types/incident';

interface CreateProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

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
  'Kilinochchi',
  'Mannar',
  'Vavuniya',
  'Mullaitivu',
  'Batticaloa',
  'Ampara',
  'Trincomalee',
  'Kurunegala',
  'Puttalam',
  'Anuradhapura',
  'Polonnaruwa',
  'Badulla',
  'Monaragala',
  'Ratnapura',
  'Kegalle',
];

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName.trim() || !formData.contactPerson.trim() || !formData.email.trim() || !formData.phoneNumber.trim()) {
      setError('Please provide business name, contact person, email, and phone number.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await providerApi.createProvider(formData);
      if (res.data?.id) {
        // Also attach initial skill
        try {
          await providerApi.addSkill(res.data.id, {
            category: selectedSkill.category,
            skillName: selectedSkill.name,
            yearsOfExperience: experienceYears,
            isPrimary: true,
          });
        } catch (skillErr) {
          console.warn('Initial skill attachment note:', skillErr);
        }
      }
      onSuccess();
    } catch (err: any) {
      console.error('Failed to create provider:', err);
      setError(err?.response?.data?.message || 'Failed to register service provider profile.');
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Company / Trade Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. ABC Plumbing"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Contact Person *</label>
              <input
                type="text"
                required
                placeholder="e.g. Lahiru Fernando"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Email Address *</label>
              <input
                type="email"
                required
                placeholder="e.g. info@abcplumbing.lk"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. 077 888 1111"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Primary District *</label>
              <select
                value={formData.primaryDistrict}
                onChange={(e) => setFormData({ ...formData, primaryDistrict: e.target.value })}
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
              <label className="text-xs font-bold text-slate-700">City / Operating Base *</label>
              <input
                type="text"
                required
                placeholder="e.g. Kandy"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700">Primary Trade Skill</label>
              <select
                value={selectedSkill.name}
                onChange={(e) => {
                  const s = SKILL_OPTIONS.find((opt) => opt.name === e.target.value);
                  if (s) setSelectedSkill(s);
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
              <label className="text-xs font-bold text-slate-700">Experience (Yrs)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={experienceYears}
                onChange={(e) => setExperienceYears(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Service Radius (km)</label>
            <input
              type="number"
              min={5}
              max={150}
              value={formData.serviceRadiusKm}
              onChange={(e) => setFormData({ ...formData, serviceRadiusKm: parseFloat(e.target.value) || 30 })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Office / Workshop Address</label>
            <input
              type="text"
              placeholder="e.g. 45, Dalada Veediya, Kandy"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition"
            />
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
      </div>
    </div>
  );
};
export default CreateProviderModal;
