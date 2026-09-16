import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  AlertTriangle,
  Users,
  Wrench,
  GitBranch,
  CalendarCheck,
  FileSpreadsheet,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Overview & Hub',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Property Assets',
    path: '/assets',
    icon: Building2,
    roles: ['Owner', 'Manager', 'Admin'],
  },
  {
    label: 'Incident Reports',
    path: '/incidents',
    icon: AlertTriangle,
    roles: ['Owner', 'Representative', 'Manager', 'Admin'],
  },
  {
    label: 'Provider Network',
    path: '/providers',
    icon: Users,
    roles: ['Manager', 'Admin', 'Representative'],
  },
  {
    label: 'Maintenance & Jobs',
    path: '/maintenance',
    icon: Wrench,
    roles: ['ServiceProvider', 'Manager', 'Admin'],
  },
  {
    label: 'Quotations & Bids',
    path: '/quotations',
    icon: FileSpreadsheet,
    roles: ['ServiceProvider', 'Manager', 'Admin', 'Owner'],
  },
  {
    label: 'Workflow Engine',
    path: '/workflows',
    icon: GitBranch,
    roles: ['Manager', 'Admin', 'Owner'],
  },
  {
    label: 'Continuity & Tasks',
    path: '/continuity',
    icon: CalendarCheck,
    roles: ['Manager', 'Admin', 'Representative'],
  },
  {
    label: 'Audit & Governance',
    path: '/audit',
    icon: ShieldAlert,
    roles: ['Manager', 'Admin'],
  },
];

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <aside className="w-64 border-r border-border/50 bg-card/40 flex flex-col justify-between py-6 px-4 shrink-0">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30 font-extrabold shadow-sm">
            AB
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-foreground">AssetBridge AI</div>
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Governance Hub
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="space-y-1.5">
          <div className="px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Navigation
          </div>
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30 shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / System Info */}
      <div className="rounded-lg border border-border/40 bg-secondary/30 p-3 text-xs text-muted-foreground space-y-1">
        <div className="font-medium text-foreground flex items-center justify-between">
          <span>Clean Architecture</span>
          <span className="text-[10px] text-brand-400">v1.0.0</span>
        </div>
        <div className="text-[11px]">ASP.NET Core 8 &bull; React Vite</div>
      </div>
    </aside>
  );
};
