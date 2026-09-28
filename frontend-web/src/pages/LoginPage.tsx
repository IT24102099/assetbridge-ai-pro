import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api/authApi';
import { Logo } from '../components/common/Logo';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  Home,
  Users,
  Wrench,
  BarChart3,
  FileText,
  Brain,
  CheckCircle2,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';

/* ==========================================================================
   FLAT ASSET VECTOR ILLUSTRATIONS
   ========================================================================== */

const ResidentialIllustration: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-14 object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="65" rx="50" ry="4" fill="#E2E8F0" />
    {/* Background trees */}
    <circle cx="24" cy="46" r="10" fill="#86EFAC" />
    <circle cx="28" cy="42" r="8" fill="#4ADE80" />
    <rect x="25" y="48" width="3" height="16" rx="1.5" fill="#15803D" />
    <circle cx="96" cy="46" r="11" fill="#86EFAC" />
    <circle cx="92" cy="42" r="9" fill="#4ADE80" />
    <rect x="92" y="48" width="3" height="16" rx="1.5" fill="#15803D" />
    {/* Main House Body */}
    <rect x="36" y="32" width="48" height="32" rx="2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
    {/* Pitched Roof */}
    <path d="M30 34L60 12L90 34H30Z" fill="#2563EB" />
    <path d="M34 32L60 14L86 32" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
    {/* Chimney */}
    <rect x="72" y="16" width="6" height="12" rx="1" fill="#1D4ED8" />
    {/* Upper Attic Window */}
    <circle cx="60" cy="25" r="4.5" fill="#DBEAFE" stroke="#2563EB" strokeWidth="1" />
    <line x1="60" y1="20.5" x2="60" y2="29.5" stroke="#2563EB" strokeWidth="1" />
    <line x1="55.5" y1="25" x2="64.5" y2="25" stroke="#2563EB" strokeWidth="1" />
    {/* Windows */}
    <rect x="42" y="38" width="10" height="10" rx="1.5" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1" />
    <line x1="47" y1="38" x2="47" y2="48" stroke="#38BDF8" strokeWidth="0.75" />
    <line x1="42" y1="43" x2="52" y2="43" stroke="#38BDF8" strokeWidth="0.75" />
    <rect x="68" y="38" width="10" height="10" rx="1.5" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1" />
    <line x1="73" y1="38" x2="73" y2="48" stroke="#38BDF8" strokeWidth="0.75" />
    <line x1="68" y1="43" x2="78" y2="43" stroke="#38BDF8" strokeWidth="0.75" />
    {/* Entrance Door */}
    <rect x="55" y="46" width="10" height="18" rx="1.5" fill="#1E40AF" />
    <circle cx="62.5" cy="55" r="1" fill="#FEF08A" />
  </svg>
);

const CommercialIllustration: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-14 object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="65" rx="50" ry="4" fill="#E2E8F0" />
    {/* Side Trees */}
    <circle cx="20" cy="50" r="8" fill="#86EFAC" />
    <rect x="19" y="52" width="2.5" height="12" rx="1" fill="#15803D" />
    <circle cx="100" cy="50" r="8" fill="#86EFAC" />
    <rect x="99" y="52" width="2.5" height="12" rx="1" fill="#15803D" />
    {/* Main Building Structure */}
    <rect x="34" y="14" width="52" height="50" rx="3" fill="#0284C7" />
    <rect x="38" y="18" width="44" height="44" rx="2" fill="#38BDF8" />
    {/* Windows Grid */}
    <line x1="38" y1="27" x2="82" y2="27" stroke="#E0F2FE" strokeWidth="1.5" strokeOpacity="0.8" />
    <line x1="38" y1="36" x2="82" y2="36" stroke="#E0F2FE" strokeWidth="1.5" strokeOpacity="0.8" />
    <line x1="38" y1="45" x2="82" y2="45" stroke="#E0F2FE" strokeWidth="1.5" strokeOpacity="0.8" />
    <line x1="38" y1="54" x2="82" y2="54" stroke="#E0F2FE" strokeWidth="1.5" strokeOpacity="0.8" />
    <line x1="49" y1="18" x2="49" y2="62" stroke="#E0F2FE" strokeWidth="1.5" strokeOpacity="0.8" />
    <line x1="60" y1="18" x2="60" y2="62" stroke="#E0F2FE" strokeWidth="1.5" strokeOpacity="0.8" />
    <line x1="71" y1="18" x2="71" y2="62" stroke="#E0F2FE" strokeWidth="1.5" strokeOpacity="0.8" />
    {/* Entrance Door */}
    <rect x="54" y="52" width="12" height="12" rx="1" fill="#0369A1" stroke="#E0F2FE" strokeWidth="1" />
  </svg>
);

const VehiclesIllustration: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-14 object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="62" rx="46" ry="4" fill="#CBD5E1" />
    {/* Car Body */}
    <path
      d="M18 46L28 35C33 30 40 28 50 28H76C84 28 92 31 96 36L104 44C108 45 110 48 110 52V54H12V50C12 48 14 46 18 46Z"
      fill="#F8FAFC"
      stroke="#94A3B8"
      strokeWidth="1.5"
    />
    {/* Car Cabin / Glass */}
    <path
      d="M32 36L40 31H74C80 31 86 33 89 37L94 43H30L32 36Z"
      fill="#BAE6FD"
      stroke="#0284C7"
      strokeWidth="1"
    />
    <line x1="62" y1="31" x2="62" y2="43" stroke="#0284C7" strokeWidth="1.5" />
    {/* Headlight & Taillight */}
    <path d="M106 47L109 48V51L106 50Z" fill="#FACC15" />
    <path d="M13 47L15 47V50L13 49Z" fill="#EF4444" />
    {/* Front Wheel */}
    <circle cx="86" cy="54" r="9" fill="#1E293B" />
    <circle cx="86" cy="54" r="5" fill="#94A3B8" />
    <circle cx="86" cy="54" r="2" fill="#F8FAFC" />
    {/* Rear Wheel */}
    <circle cx="34" cy="54" r="9" fill="#1E293B" />
    <circle cx="34" cy="54" r="5" fill="#94A3B8" />
    <circle cx="34" cy="54" r="2" fill="#F8FAFC" />
  </svg>
);

const LandIllustration: React.FC = () => (
  <svg viewBox="0 0 120 70" className="w-full h-14 object-contain" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="65" rx="50" ry="4" fill="#E2E8F0" />
    {/* Distant Mountains */}
    <path d="M15 48L40 28L62 48" fill="#A7F3D0" fillOpacity="0.5" />
    <path d="M48 48L72 24L98 48" fill="#6EE7B7" fillOpacity="0.6" />
    {/* Rolling Hills Foreground */}
    <path d="M10 56C25 44 48 44 70 52C88 58 102 54 110 52V62H10V56Z" fill="#34D399" />
    <path d="M10 60C30 50 65 52 85 58C98 62 108 58 110 58V64H10V60Z" fill="#10B981" />
    {/* Parcel Lines / Path */}
    <path d="M48 64C52 56 60 52 68 48" stroke="#FDE68A" strokeWidth="1.5" strokeDasharray="2 2" />
    {/* Trees on landscape */}
    <circle cx="30" cy="48" r="6" fill="#059669" />
    <circle cx="88" cy="44" r="7" fill="#047857" />
    <circle cx="94" cy="42" r="5" fill="#059669" />
  </svg>
);

/* ==========================================================================
   LOGIN PAGE COMPONENT
   ========================================================================== */

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter your registered email address and password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await authApi.login(email.trim(), password);

      if (res.data) {
        login(res.data.token, res.data.user);
        navigate('/dashboard');
      } else {
        setErrorMessage(res.message || 'Authentication failed. Please check credentials.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to reach authentication server. Please ensure backend is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setErrorMessage('Google sign-in is not configured for this deployment yet.');
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('SecurePassword123!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex items-center justify-center p-3 sm:p-5 lg:p-6 font-sans">
      {/* 2-Column Main Container */}
      <div className="w-full max-w-5xl xl:max-w-6xl bg-white rounded-2xl sm:rounded-[2rem] border border-slate-200/80 shadow-2xl shadow-slate-200/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-all">
        
        {/* ==================================================================
            LEFT COLUMN — LOGIN FORM
            ================================================================== */}
        <div className="lg:col-span-5 p-6 sm:p-8 lg:p-8 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Logo */}
            <div>
              <Logo size="md" />
            </div>

            {/* Heading & Subtitle */}
            <div className="space-y-0.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Welcome Back
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Sign in to manage your assets remotely
              </p>
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-start gap-2.5 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Email Address */}
              <div className="space-y-1">
                <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-600 font-medium text-[11px]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Password reset service is currently in maintenance. Please contact your system administrator.');
                  }}
                  className="font-bold text-blue-600 hover:text-blue-700 text-[11px] transition"
                >
                  Forgot password?
                </a>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    Sign In <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </button>

              {/* OR Divider */}
              <div className="relative py-1 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  or
                </span>
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-2 shadow-2xs"
              >
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continue with Google
              </button>
            </form>
          </div>

          {/* Role Shortcuts & Sign Up Footer */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('owner@assetbridge.lk')}
                className="flex flex-col items-center justify-center p-1.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/60 text-slate-700 hover:text-blue-600 transition shadow-2xs group"
                title="Quick fill as Owner"
              >
                <div className="h-5 w-5 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-600 mb-0.5">
                  <Home className="h-3 w-3" />
                </div>
                <span className="text-[10px] font-bold">Owner</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('rep@assetbridge.lk')}
                className="flex flex-col items-center justify-center p-1.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/60 text-slate-700 hover:text-blue-600 transition shadow-2xs group"
                title="Quick fill as Representative"
              >
                <div className="h-5 w-5 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-600 mb-0.5">
                  <Users className="h-3 w-3" />
                </div>
                <span className="text-[10px] font-bold">Rep</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('provider@assetbridge.lk')}
                className="flex flex-col items-center justify-center p-1.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/60 text-slate-700 hover:text-blue-600 transition shadow-2xs group"
                title="Quick fill as Service Provider"
              >
                <div className="h-5 w-5 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-600 mb-0.5">
                  <Wrench className="h-3 w-3" />
                </div>
                <span className="text-[10px] font-bold">Provider</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('manager@assetbridge.lk')}
                className="flex flex-col items-center justify-center p-1.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/60 text-slate-700 hover:text-blue-600 transition shadow-2xs group"
                title="Quick fill as Asset Manager"
              >
                <div className="h-5 w-5 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center text-blue-600 mb-0.5">
                  <BarChart3 className="h-3 w-3" />
                </div>
                <span className="text-[10px] font-bold">Manager</span>
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-600 pt-0.5">
              Don't have an account?{' '}
              <Link to="/signup" className="font-bold text-blue-600 hover:text-blue-700">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* ==================================================================
            RIGHT COLUMN — PROJECT INTRODUCTION & ASSET OVERVIEW
            ================================================================== */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-8 bg-slate-50/70 border-t lg:border-t-0 lg:border-l border-slate-200/80 flex flex-col justify-between space-y-4">
          
          {/* Top: Header Section */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 uppercase tracking-widest">
                ASSET CONTINUITY PLATFORM
              </span>
              <div className="h-px bg-blue-200 flex-1 max-w-[60px]" />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Remote Asset Management <br />
              <span className="text-blue-600">& Continuity</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 font-normal leading-normal max-w-lg">
              Manage your properties and assets remotely through one connected platform.
            </p>
          </div>

          {/* Middle 1: Four Asset Categories in ONE ROW on Desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. Residential */}
            <div className="bg-blue-50/80 border border-blue-100 rounded-xl sm:rounded-2xl p-2.5 flex flex-col items-center text-center shadow-2xs hover:shadow-md transition group">
              <div className="w-full flex items-center justify-center h-14">
                <ResidentialIllustration />
              </div>
              <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 mt-1.5">Residential</span>
              <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 mt-0.5">Homes & Properties</span>
            </div>

            {/* 2. Commercial */}
            <div className="bg-sky-50/70 border border-sky-100 rounded-xl sm:rounded-2xl p-2.5 flex flex-col items-center text-center shadow-2xs hover:shadow-md transition group">
              <div className="w-full flex items-center justify-center h-14">
                <CommercialIllustration />
              </div>
              <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 mt-1.5">Commercial</span>
              <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 mt-0.5">Business Properties</span>
            </div>

            {/* 3. Vehicles */}
            <div className="bg-amber-50/60 border border-amber-100 rounded-xl sm:rounded-2xl p-2.5 flex flex-col items-center text-center shadow-2xs hover:shadow-md transition group">
              <div className="w-full flex items-center justify-center h-14">
                <VehiclesIllustration />
              </div>
              <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 mt-1.5">Vehicles</span>
              <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 mt-0.5">Maintenance & Service</span>
            </div>

            {/* 4. Land */}
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl sm:rounded-2xl p-2.5 flex flex-col items-center text-center shadow-2xs hover:shadow-md transition group">
              <div className="w-full flex items-center justify-center h-14">
                <LandIllustration />
              </div>
              <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 mt-1.5">Land</span>
              <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 mt-0.5">Land & Estates</span>
            </div>
          </div>

          {/* Middle 2: How It Works Workflow */}
          <div className="space-y-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
              How It Works
            </h3>

            <div className="flex items-center justify-between gap-1 sm:gap-2">
              {/* Step 1: Report */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center shadow-2xs">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 mt-1">Report</span>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-3.5 w-3.5 text-blue-400 shrink-0 mb-3" />

              {/* Step 2: AI Analysis */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center shadow-2xs">
                  <Brain className="h-4 w-4" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 mt-1">AI Analysis</span>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-3.5 w-3.5 text-blue-400 shrink-0 mb-3" />

              {/* Step 3: Approval */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center shadow-2xs">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 mt-1">Approval</span>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-3.5 w-3.5 text-blue-400 shrink-0 mb-3" />

              {/* Step 4: Service */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center shadow-2xs">
                  <Wrench className="h-4 w-4" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 mt-1">Service</span>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-3.5 w-3.5 text-blue-400 shrink-0 mb-3" />

              {/* Step 5: Evidence */}
              <div className="flex flex-col items-center text-center flex-1">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center shadow-2xs">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 mt-1">Evidence</span>
              </div>
            </div>
          </div>

          {/* Bottom: AI Governance Notice Bar */}
          <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-blue-50/90 border border-blue-100 text-blue-800 text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs">
            <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="text-center">
              AI recommends. You approve. The platform tracks everything.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;

