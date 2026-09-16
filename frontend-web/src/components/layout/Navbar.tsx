import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ShieldCheck, LogOut, Activity, User as UserIcon } from 'lucide-react';
import apiClient from '../../lib/api';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    // Health check ping to backend
    apiClient
      .get('/health')
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'Admin':
        return 'destructive';
      case 'Manager':
        return 'brand';
      case 'Owner':
        return 'default';
      case 'Representative':
        return 'success';
      case 'ServiceProvider':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold tracking-tight text-foreground md:text-base">
          AssetBridge <span className="text-brand-400 font-bold">AI</span>
        </h1>
        <span className="hidden text-xs text-muted-foreground md:inline">| Remote Property Continuity</span>
      </div>

      <div className="flex items-center gap-4">
        {/* API Health Pill */}
        <div className="flex items-center gap-1.5 rounded-full bg-secondary/50 px-2.5 py-1 text-xs text-muted-foreground border border-border/40">
          <Activity className={`h-3 w-3 ${apiOnline === true ? 'text-emerald-400 animate-pulse' : apiOnline === false ? 'text-rose-400' : 'text-amber-400'}`} />
          <span>API: {apiOnline === true ? 'Connected (5206)' : apiOnline === false ? 'Offline' : 'Checking...'}</span>
        </div>

        {/* User Role Badge */}
        {user && (
          <Badge variant={getRoleBadgeVariant(user.role)} className="font-medium">
            <ShieldCheck className="mr-1 h-3 w-3" />
            {user.role}
          </Badge>
        )}

        {/* User info */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-semibold text-foreground text-xs">{user.fullName}</span>
              <span className="text-[10px] text-muted-foreground">{user.email}</span>
            </div>
          </div>
        )}

        {/* Logout button */}
        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive">
          <LogOut className="h-4 w-4 mr-1.5" />
          <span className="hidden md:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
};
