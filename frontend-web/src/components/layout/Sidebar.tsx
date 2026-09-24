import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';
import {
  LayoutDashboard,
  Building2,
  AlertTriangle,
  Bot,
  FileBarChart,
  Settings,
  Users,
  Briefcase,
  Search,
  ClipboardCheck,
  Wrench,
  FileText,
  ShieldAlert,
  Clock,
  GitMerge,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { UserRole } from '../../types/auth';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const role: UserRole = user?.role || 'Owner';

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case 'Owner':
        return [
          { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { label: 'My Assets', path: '/assets', icon: Building2 },
          { label: 'Incidents', path: '/incidents', icon: AlertTriangle },
          { label: 'Maintenance & Jobs', path: '/maintenance', icon: Wrench },
          { label: 'Quotations', path: '/quotations', icon: FileText },
          { label: 'Compare Quotes', path: '/quotations/compare', icon: Search },
          { label: 'AI Assistant', path: '/ai-assistant', icon: Bot },
          { label: 'Property Continuity', path: '/follow-up', icon: RotateCcw },
          { label: 'Reports', path: '/reports', icon: FileBarChart },
          { label: 'Settings', path: '/settings', icon: Settings },
        ];

      case 'Representative':
        return [
          { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { label: 'Assigned Assets', path: '/assets', icon: Building2 },
          { label: 'Service Providers', path: '/providers', icon: Briefcase },
          { label: 'Provider Search', path: '/providers/search', icon: Search },
          { label: 'Visits & Inspections', path: '/inspections', icon: ClipboardCheck },
          { label: 'Maintenance Jobs', path: '/maintenance/jobs', icon: Wrench },
          { label: 'Material Catalog', path: '/maintenance/catalog', icon: FileText },
          { label: 'Continuity Tasks', path: '/follow-up', icon: RotateCcw },
          { label: 'Reports', path: '/reports', icon: FileBarChart },
          { label: 'Settings', path: '/settings', icon: Settings },
        ];

      case 'ServiceProvider':
        return [
          { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { label: 'Assigned Jobs', path: '/maintenance/jobs', icon: Wrench },
          { label: 'Site Inspections', path: '/inspections', icon: ClipboardCheck },
          { label: 'Quotations & Bids', path: '/quotations', icon: FileText },
          { label: 'Material Catalog', path: '/maintenance/catalog', icon: FileText },
          { label: 'Availability', path: '/provider-availability', icon: Clock },
          { label: 'Reports', path: '/reports', icon: FileBarChart },
          { label: 'Settings', path: '/settings', icon: Settings },
        ];

      case 'Manager':
      case 'Admin':
      default:
        return [
          { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { label: 'Workflows & Approvals', path: '/workflows', icon: GitMerge },
          { label: 'Agent Activity', path: '/workflows/agents', icon: Bot },
          { label: 'Maintenance', path: '/maintenance', icon: Wrench },
          { label: 'Inspections', path: '/inspections', icon: ClipboardCheck },
          { label: 'Quotations', path: '/quotations', icon: FileText },
          { label: 'Compare Quotes', path: '/quotations/compare', icon: Search },
          { label: 'Maintenance Jobs', path: '/maintenance/jobs', icon: Wrench },
          { label: 'Material Catalog', path: '/maintenance/catalog', icon: FileText },
          { label: 'Cost Analytics', path: '/maintenance/reports', icon: FileBarChart },
          { label: 'Representatives', path: '/representatives', icon: Users },
          { label: 'Service Providers', path: '/providers', icon: Briefcase },
          { label: 'Provider Search', path: '/providers/search', icon: Search },
          { label: 'Availability', path: '/provider-availability', icon: Clock },
          { label: 'Assignments', path: '/assignments', icon: ClipboardCheck },
          { label: 'Verifications', path: '/verifications', icon: ShieldAlert },
          { label: 'Audit Logs', path: '/audit-logs', icon: ShieldCheck },
          { label: 'Follow-up & Continuity', path: '/follow-up', icon: RotateCcw },
          { label: 'Reports', path: '/reports', icon: FileBarChart },
          { label: 'Settings', path: '/settings', icon: Settings },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0 selection:bg-blue-600 selection:text-white">
      {/* Brand Header with Unified Logo */}
      <div className="p-5 border-b border-slate-100 flex items-center">
        <Logo size="sm" showTagline={false} />
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Footer Role / API Heartbeat Status */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-slate-600">Core API Online</span>
          </div>
          <span className="text-[10px] font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded">
            5206
          </span>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
