import React, { useState } from 'react';
import { 
  Search, 
  Menu, 
  X, 
  Sparkles, 
  RotateCw, 
  ChevronDown,
  User,
  LogOut,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useEmails } from '../../context/EmailContext';
import { useRouter } from '../../router/RouterContext';
import { useAuth } from '../../context/AuthContext';

interface TopHeaderProps {
  onToggleMobileSidebar: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onToggleMobileSidebar }) => {
  const { searchQuery, setSearch, refreshEmails, isLoading, emailSource } = useEmails();
  const { currentPath, navigate } = useRouter();
  const { user, isGmailConnected, isDemo, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (currentPath !== '/inbox') {
      navigate('/inbox');
    }
  };

  const handleClearSearch = () => {
    setSearch('');
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="h-16 bg-white border-b border-slate-100 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shrink-0 z-20">
      {/* Left: Mobile Toggle & Context Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-sidebar-toggle"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="text-slate-900 font-semibold capitalize">
            {currentPath === '/'
              ? 'Overview'
              : currentPath.replace('/', '')}
          </span>
          <span>/</span>
          <span>IntelliMail AI</span>
        </div>
      </div>

      {/* Center: Sleek Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="global-email-search"
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search emails, people, or messages..."
            className="w-full bg-slate-50 border-none rounded-full py-2 pl-10 pr-9 text-sm text-slate-900 focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right Actions: Connection Badge, Refresh, Profile Dropdown */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Live OAuth Connection Status Badge */}
        {isGmailConnected || emailSource === 'gmail_api' ? (
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Gmail API</span>
          </div>
        ) : (
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Demo Workspace</span>
          </div>
        )}

        <button
          id="header-refresh-button"
          onClick={() => refreshEmails()}
          disabled={isLoading}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none disabled:opacity-50"
          title="Refresh Inbox"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
        </button>

        {/* User Profile Trigger */}
        <div className="relative">
          <button
            id="user-profile-menu-button"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 pl-2 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none cursor-pointer"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                {initials}
              </div>
            )}
            <span className="hidden sm:inline text-xs font-semibold text-slate-700 max-w-[100px] truncate">
              {user?.name || 'My Account'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div
              id="user-profile-dropdown"
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-4 py-2.5 border-b border-slate-100">
                <div className="text-xs font-semibold text-slate-900">
                  {user?.name || 'Workspace Account'}
                </div>
                <div className="text-[11px] text-slate-500 truncate font-mono">
                  {user?.email || 'user@workspace.internal'}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  {isGmailConnected ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-700 border border-emerald-100">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Connected to Gmail
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700 border border-blue-100">
                      <Zap className="w-3 h-3 text-blue-600" />
                      Demo Mode
                    </span>
                  )}
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Account & OAuth Settings</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
