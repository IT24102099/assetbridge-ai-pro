import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell, LogOut } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';

interface TopbarProps {
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  searchPlaceholder = 'Search anything...',
  onSearch,
}) => {
  const { user, logout } = useAuth();

  // Get user initial for avatar circle
  const initial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Search Input matching wireframes */}
      <div className="flex-1 max-w-md relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          onChange={(e) => onSearch && onSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
        />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">

        {/* User Role Badge */}
        {user?.role && (
          <div className="flex items-center gap-1">
            <StatusBadge status={user.role} size="md" />
          </div>
        )}

        {/* Notifications Icon */}
        <button
          title="Notifications"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition relative"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        {/* User profile capsule with initial matching wireframe */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shadow-xs">
            {initial}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-none">{user?.fullName || 'Authenticated User'}</p>
            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition ml-1"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
export default Topbar;
