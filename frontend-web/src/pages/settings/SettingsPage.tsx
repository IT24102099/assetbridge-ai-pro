import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../lib/api/authApi';
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  Bell,
  Calendar,
  Clock,
  LogOut,
  Edit3,
  X,
  ExternalLink,
  Home,
  Wrench,
  Users,
  BarChart3,
  Check,
} from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();

  // Profile View / Edit Mode
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');

  // Field-level Validation Errors
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form State & Visibility
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Notification Preferences State (with localStorage persistence)
  const [emailAlerts, setEmailAlerts] = useState<boolean>(() => {
    const stored = localStorage.getItem('assetbridge_pref_email');
    return stored !== null ? stored === 'true' : true;
  });
  const [inAppAlerts, setInAppAlerts] = useState<boolean>(() => {
    const stored = localStorage.getItem('assetbridge_pref_inapp');
    return stored !== null ? stored === 'true' : true;
  });
  const [prefFeedback, setPrefFeedback] = useState<string | null>(null);

  // Sync state when user object loads/changes
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhoneNumber(user.phoneNumber || '');
    }
  }, [user]);

  const handleStartEditing = () => {
    setFullName(user?.fullName || '');
    setPhoneNumber(user?.phoneNumber || '');
    setFullNameError(null);
    setPhoneError(null);
    setProfileError(null);
    setProfileSuccess(null);
    setIsEditingProfile(true);
  };

  const handleCancelEditing = () => {
    setFullName(user?.fullName || '');
    setPhoneNumber(user?.phoneNumber || '');
    setFullNameError(null);
    setPhoneError(null);
    setProfileError(null);
    setIsEditingProfile(false);
  };

  const validateProfileFields = (): boolean => {
    let isValid = true;
    setFullNameError(null);
    setPhoneError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setFullNameError('Full name is required.');
      isValid = false;
    } else if (trimmedName.length < 2) {
      setFullNameError('Full name must be at least 2 characters.');
      isValid = false;
    } else if (trimmedName.length > 100) {
      setFullNameError('Full name cannot exceed 100 characters.');
      isValid = false;
    }

    const trimmedPhone = phoneNumber.trim();
    if (trimmedPhone) {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,16}$/;
      if (!phoneRegex.test(trimmedPhone)) {
        setPhoneError('Please enter a valid phone number (e.g. +94 77 123 4567).');
        isValid = false;
      } else if (trimmedPhone.length > 20) {
        setPhoneError('Phone number cannot exceed 20 characters.');
        isValid = false;
      }
    }

    return isValid;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileLoading) return;

    if (!validateProfileFields()) {
      return;
    }

    setProfileSuccess(null);
    setProfileError(null);

    try {
      setProfileLoading(true);
      const res = await authApi.updateProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
      });

      if (res.success) {
        setProfileSuccess('Profile updated successfully.');
        setIsEditingProfile(false);
        if (refreshUser) {
          await refreshUser();
        }
      } else {
        setProfileError(res.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      console.error('Profile update failed:', err);
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        'Failed to update profile. Please verify your details.';
      setProfileError(serverMsg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordLoading) return;

    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
      });

      if (res.success) {
        setPasswordSuccess('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(res.message || 'Failed to change password.');
      }
    } catch (err: any) {
      console.error('Password change error:', err);
      setPasswordError(
        err?.response?.data?.message ||
          'Failed to change password. Please verify that your current password is correct.'
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleTogglePref = (type: 'email' | 'inApp') => {
    if (type === 'email') {
      setEmailAlerts((prev) => {
        const next = !prev;
        localStorage.setItem('assetbridge_pref_email', String(next));
        return next;
      });
      setPrefFeedback('Email notification preferences updated.');
    } else {
      setInAppAlerts((prev) => {
        const next = !prev;
        localStorage.setItem('assetbridge_pref_inapp', String(next));
        return next;
      });
      setPrefFeedback('In-app alert preferences updated.');
    }

    setTimeout(() => {
      setPrefFeedback(null);
    }, 2500);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not available';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Current session';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // User initials avatar
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 font-sans">
      {/* Page Title & Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserIcon className="h-6 w-6 text-blue-600" />
            Account & Profile Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your personal profile details, authentication credentials, and notification settings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {user?.isActive !== false ? 'Active Account' : 'Inactive'}
          </span>
          <StatusBadge status={user?.role || 'User'} size="md" />
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ==================================================================
            LEFT COLUMN (lg:col-span-4): PROFILE OVERVIEW & SECURITY SUMMARY
            ================================================================== */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card A: Profile Overview */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs text-center space-y-4">
            {/* Avatar Initials Badge */}
            <div className="relative mx-auto w-20 h-20">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-sky-500 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-blue-500/20 ring-4 ring-blue-50">
                {getInitials(user?.fullName)}
              </div>
              <div
                className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
                title="Account is active and verified"
              />
            </div>

            {/* Name & Email */}
            <div className="space-y-0.5">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {user?.fullName || 'User'}
              </h2>
              <p className="text-xs text-slate-500 flex items-center justify-center gap-1 font-medium">
                <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate max-w-[220px]" title={user?.email}>
                  {user?.email}
                </span>
              </p>
            </div>

            {/* Role & Status Pill */}
            <div className="pt-3 border-t border-slate-100 flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Role:</span>
                <StatusBadge status={user?.role || 'User'} size="sm" />
              </div>
              <p className="text-[11px] text-slate-500 max-w-[240px]">
                System privileges and access rights are assigned based on your verified role.
              </p>
            </div>

            {/* Metadata Timestamps */}
            <div className="pt-3 border-t border-slate-100 text-left space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                  <Calendar className="h-3.5 w-3.5" /> Member Since
                </span>
                <span className="font-semibold text-slate-800 text-[11px]">
                  {formatDate(user?.createdAtUtc)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                  <Clock className="h-3.5 w-3.5" /> Last Active
                </span>
                <span className="font-semibold text-slate-800 text-[11px]">
                  {formatDateTime(user?.lastLoginAtUtc)}
                </span>
              </div>
            </div>
          </div>

          {/* Card C (Sub): Account Security & Session Overview */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>Identity & Session Security</span>
            </div>

            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Cryptographic JWT Bearer Token Session</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Protected Client Routes & Server Endpoints</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Strict Ownership Data Isolation</span>
              </li>
            </ul>

            <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">End active session:</span>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>

        </div>

        {/* ==================================================================
            RIGHT COLUMN (lg:col-span-8): EDITABLE SECTIONS
            ================================================================== */}
        <div className="lg:col-span-8 space-y-6">

          {/* Section B: Personal Information */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
                  <p className="text-[11px] text-slate-500">
                    Your contact and profile identity information
                  </p>
                </div>
              </div>

              {!isEditingProfile ? (
                <button
                  type="button"
                  onClick={handleStartEditing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700 hover:text-blue-600 text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Profile
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  disabled={profileLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              )}
            </div>

            {/* Profile Success Banner */}
            {profileSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {/* Profile Error Banner */}
            {profileError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {/* VIEW MODE: Clean Grid Layout */}
            {!isEditingProfile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Full Name
                  </span>
                  <span className="font-semibold text-slate-900 text-sm block">
                    {user?.fullName || 'Not specified'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Email Address
                  </span>
                  <span className="font-semibold text-slate-900 text-sm block truncate" title={user?.email}>
                    {user?.email}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Contact Phone Number
                  </span>
                  <span className="font-semibold text-slate-900 text-sm block">
                    {user?.phoneNumber || (
                      <span className="text-slate-400 font-normal italic">No contact number provided</span>
                    )}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Role Designation
                  </span>
                  <div className="pt-0.5">
                    <StatusBadge status={user?.role || 'User'} size="sm" />
                  </div>
                </div>
              </div>
            ) : (
              /* EDIT MODE: Interactive Form with Validation */
              <form onSubmit={handleProfileSubmit} noValidate className="space-y-4">
                {/* Full Name Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fullNameError) setFullNameError(null);
                    }}
                    placeholder="Enter your full name"
                    className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none transition ${
                      fullNameError
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                        : 'border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                  />
                  {fullNameError && (
                    <p className="text-[11px] text-red-600 font-semibold">{fullNameError}</p>
                  )}
                </div>

                {/* Email (Read-Only) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Email Address
                    </label>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Primary Identity (Read-Only)
                    </span>
                  </div>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed select-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    Your email address is verified and permanently linked to your system identity.
                  </p>
                </div>

                {/* Phone Number Field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Contact Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        if (phoneError) setPhoneError(null);
                      }}
                      placeholder="e.g. +94 77 123 4567"
                      className={`w-full bg-white border rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none transition ${
                        phoneError
                          ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                          : 'border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  {phoneError ? (
                    <p className="text-[11px] text-red-600 font-semibold">{phoneError}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Used for emergency notifications, maintenance dispatch, and inspection coordination.
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    disabled={profileLoading}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {profileLoading ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Section C: Account & Security (Password Management) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Security & Password</h3>
                <p className="text-[11px] text-slate-500">
                  Update your authentication credentials to keep your account secure
                </p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                    tabIndex={-1}
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                      tabIndex={-1}
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full bg-slate-50/70 border border-slate-300 rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  {passwordLoading ? 'Updating Password...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Section D: Role-Specific Information & Quick Capabilities */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                {user?.role === 'Owner' && <Home className="h-4 w-4" />}
                {user?.role === 'Representative' && <Users className="h-4 w-4" />}
                {user?.role === 'ServiceProvider' && <Wrench className="h-4 w-4" />}
                {(user?.role === 'Manager' || user?.role === 'Admin') && <BarChart3 className="h-4 w-4" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {user?.role === 'Owner' && 'Property Owner Capabilities'}
                  {user?.role === 'Representative' && 'Local Asset Representative Operations'}
                  {user?.role === 'ServiceProvider' && 'Contractor & Service Provider Hub'}
                  {(user?.role === 'Manager' || user?.role === 'Admin') && 'Operations Management & Governance'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Specialized workflows and access rights enabled for your account
                </p>
              </div>
            </div>

            {/* Role Conditional Body */}
            {user?.role === 'Owner' && (
              <div className="space-y-3 text-xs text-slate-600">
                <p className="leading-relaxed">
                  As an <strong>Asset Owner</strong>, you have access to remote asset telemetry, automated AI triage proposals, and direct approval governance for all property expenditures.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <Link
                    to="/assets"
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-200 transition text-center flex flex-col items-center gap-1 group"
                  >
                    <Home className="h-4 w-4 text-blue-600" />
                    <span className="font-bold text-slate-800 group-hover:text-blue-600">My Properties</span>
                  </Link>
                  <Link
                    to="/incidents"
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-200 transition text-center flex flex-col items-center gap-1 group"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="font-bold text-slate-800 group-hover:text-blue-600">Reported Incidents</span>
                  </Link>
                  <Link
                    to="/reports"
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-200 transition text-center flex flex-col items-center gap-1 group"
                  >
                    <BarChart3 className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold text-slate-800 group-hover:text-blue-600">Continuity Reports</span>
                  </Link>
                </div>
              </div>
            )}

            {user?.role === 'Representative' && (
              <div className="space-y-3 text-xs text-slate-600">
                <p className="leading-relaxed">
                  As an authorized <strong>Local Representative</strong>, you perform physical on-site inspections, document proof of damage with geotagged photography, and verify contractor execution.
                </p>
                <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-blue-800 text-[11px] leading-relaxed">
                  <strong>Verification Credentials:</strong> Your identity documents and representative accreditation are securely audited by AssetBridge operations managers.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <Link
                    to="/inspections"
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-200 transition text-center flex flex-col items-center gap-1 group"
                  >
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="font-bold text-slate-800 group-hover:text-blue-600">Assigned Inspections</span>
                  </Link>
                  <Link
                    to="/representatives"
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-200 transition text-center flex flex-col items-center gap-1 group"
                  >
                    <ExternalLink className="h-4 w-4 text-slate-600" />
                    <span className="font-bold text-slate-800 group-hover:text-blue-600">Representative Directory</span>
                  </Link>
                </div>
              </div>
            )}

            {user?.role === 'ServiceProvider' && (
              <div className="space-y-3 text-xs text-slate-600">
                <p className="leading-relaxed">
                  As a registered <strong>Service Provider</strong>, you can review open maintenance tasks, submit itemized quotations with materials and labor costs, and execute approved repair jobs.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <Link
                    to="/maintenance/jobs"
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-200 transition text-center flex flex-col items-center gap-1 group"
                  >
                    <Wrench className="h-4 w-4 text-blue-600" />
                    <span className="font-bold text-slate-800 group-hover:text-blue-600">Open Maintenance Jobs</span>
                  </Link>
                  <Link
                    to="/quotations"
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-200 transition text-center flex flex-col items-center gap-1 group"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold text-slate-800 group-hover:text-blue-600">My Quotations</span>
                  </Link>
                </div>
              </div>
            )}

            {(user?.role === 'Manager' || user?.role === 'Admin') && (
              <div className="space-y-3 text-xs text-slate-600">
                <p className="leading-relaxed">
                  As an <strong>Asset Manager</strong>, you maintain operational oversight, review representative credential verifications, allocate emergency tasks, and monitor system security audit events.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <Link
                    to="/manager"
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-200 transition text-center flex flex-col items-center gap-1 group"
                  >
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <span className="font-bold text-slate-800 text-[11px] group-hover:text-blue-600">Dashboard</span>
                  </Link>
                  <Link
                    to="/verifications"
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-200 transition text-center flex flex-col items-center gap-1 group"
                  >
                    <Shield className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold text-slate-800 text-[11px] group-hover:text-blue-600">Verifications</span>
                  </Link>
                  <Link
                    to="/assignments"
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-200 transition text-center flex flex-col items-center gap-1 group"
                  >
                    <Users className="h-4 w-4 text-amber-600" />
                    <span className="font-bold text-slate-800 text-[11px] group-hover:text-blue-600">Assignments</span>
                  </Link>
                  <Link
                    to="/audit-logs"
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-200 transition text-center flex flex-col items-center gap-1 group"
                  >
                    <Lock className="h-4 w-4 text-purple-600" />
                    <span className="font-bold text-slate-800 text-[11px] group-hover:text-blue-600">Audit Logs</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Section E: Notification Preferences */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Notification Preferences</h3>
                  <p className="text-[11px] text-slate-500">
                    Configure alert channels and event notifications
                  </p>
                </div>
              </div>

              {prefFeedback && (
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                  <Check className="h-3.5 w-3.5" /> {prefFeedback}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {/* In-App Alerts Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900">In-App Notification Alerts</p>
                  <p className="text-[11px] text-slate-500">
                    Receive live real-time notifications for triage proposals, approvals, and job milestones.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inAppAlerts}
                    onChange={() => handleTogglePref('inApp')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Email Digest Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900">Email Digest Notifications</p>
                  <p className="text-[11px] text-slate-500">
                    Receive consolidated summaries and continuity reports directly in your inbox.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={() => handleTogglePref('email')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* System Note */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  Live Notification Engine
                </p>
                <p className="text-slate-500 leading-relaxed">
                  In-app notifications are stored in PostgreSQL and delivered to your notification bell. Outbound email requires valid SMTP mail server configuration in the server environment.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
