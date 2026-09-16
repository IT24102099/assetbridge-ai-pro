import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Shield, Sparkles, Building, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import apiClient from '../lib/api';
import { ApiResponse, LoginResponseDto, UserRole } from '../types/auth';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.post<ApiResponse<LoginResponseDto>>('/auth/login', {
        email,
        password,
      });

      if (response.data.success && response.data.data) {
        login(response.data.data.token, response.data.data.user);
        navigate('/dashboard');
      } else {
        setErrorMessage(response.data.message || 'Login failed. Please verify credentials.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const apiMessage = err.response?.data?.message || err.message || 'Unable to connect to backend service.';
      setErrorMessage(apiMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string, _role: UserRole) => {
    setEmail(demoEmail);
    setPassword('SecurePassword123!');
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-4 bg-background overflow-hidden selection:bg-brand-500 selection:text-white">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 shadow-lg shadow-brand-500/10 mb-2">
            <Building className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            AssetBridge <span className="text-brand-400">AI</span>
          </h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
            Your Assets. Always Closer.
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription className="text-xs">
              Enter your credentials to access your remote asset governance portal
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/15 p-3 text-xs text-destructive border border-destructive/30">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" variant="brand" className="w-full font-semibold" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2 border-t border-border/40">
            <div className="w-full flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Quick-Fill Demo Credentials:
              </span>
              <Sparkles className="h-3 w-3 text-brand-400" />
            </div>
            <div className="grid grid-cols-2 gap-1.5 w-full">
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-7 justify-start"
                onClick={() => handleDemoFill('manager@assetbridge.lk', 'Manager')}
              >
                <Badge variant="brand" className="mr-1 py-0 px-1 text-[9px]">M</Badge> Manager
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-7 justify-start"
                onClick={() => handleDemoFill('owner@assetbridge.lk', 'Owner')}
              >
                <Badge variant="default" className="mr-1 py-0 px-1 text-[9px]">O</Badge> Owner
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-7 justify-start"
                onClick={() => handleDemoFill('provider@assetbridge.lk', 'ServiceProvider')}
              >
                <Badge variant="warning" className="mr-1 py-0 px-1 text-[9px]">P</Badge> Provider
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] h-7 justify-start"
                onClick={() => handleDemoFill('rep@assetbridge.lk', 'Representative')}
              >
                <Badge variant="success" className="mr-1 py-0 px-1 text-[9px]">R</Badge> Rep
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Security Assurance Tag */}
        <div className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-brand-400" />
          <span>Stateless HMAC-SHA256 JWT Authentication &bull; RBAC Protected</span>
        </div>
      </div>
    </div>
  );
};
