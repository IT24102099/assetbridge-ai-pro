import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api/authApi';
import { Logo } from '../components/common/Logo';
import { PropertyIllustration } from '../components/common/PropertyIllustration';
import { Mail, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';

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

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('SecurePassword123!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* 2-Column Container matching Screen 1 wireframe */}
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Left Column: Sign In Form matching Screen 1 wireframe */}
        <div className="p-8 sm:p-12 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Unified Logo */}
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
              <Logo size="lg" />
            </div>

            <div className="space-y-1 text-center sm:text-left">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h2>
              <p className="text-xs text-slate-500">Sign in to your account</p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-start gap-2.5 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium">
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
                  className="font-bold text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </a>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-blue-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span>Sign In</span>
                )}
              </button>

              {/* Or divider */}
              <div className="relative py-2 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase">
                  or
                </span>
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                onClick={() => handleQuickFill('owner@assetbridge.lk')}
                className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
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

          {/* Quick-Fill & Link to Sign Up */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickFill('owner@assetbridge.lk')}
                className="px-2 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 font-bold transition text-center truncate"
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('rep@assetbridge.lk')}
                className="px-2 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 font-bold transition text-center truncate"
              >
                Rep
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('provider@assetbridge.lk')}
                className="px-2 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 font-bold transition text-center truncate"
              >
                Provider
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('manager@assetbridge.lk')}
                className="px-2 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 font-bold transition text-center truncate"
              >
                Manager
              </button>
            </div>

            <p className="text-xs text-center text-slate-600 pt-1">
              Don't have an account?{' '}
              <Link to="/signup" className="font-bold text-blue-600 hover:text-blue-700">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Right Column: Clean Artwork & Wireframe Composition */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-100/60 border-l border-slate-200 text-center">
          <div className="space-y-4 pt-4">
            <h3 className="text-2xl font-bold text-slate-900 leading-tight max-w-xs mx-auto">
              Manage your assets from anywhere in the world.
            </h3>
          </div>

          {/* Large Property Illustration */}
          <div className="py-4">
            <PropertyIllustration className="max-w-xs mx-auto" />
          </div>

          {/* Bottom Trust Line */}
          <div className="text-xs font-semibold text-slate-500 pt-4">
            Secure • Reliable • AI-Powered
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
