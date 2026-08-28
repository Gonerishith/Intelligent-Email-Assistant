import React from 'react';
import { 
  Inbox, 
  Star, 
  Send, 
  Archive, 
  Trash2, 
  PenSquare, 
  Activity, 
  Settings, 
  Tag, 
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { FolderId } from '../../types/email';
import { useEmails } from '../../context/EmailContext';
import { useRouter } from '../../router/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { currentFolder, setFolder, unreadCounts } = useEmails();
  const { currentPath, navigate } = useRouter();
  const { user, isGmailConnected } = useAuth();

  const folderItems: { id: FolderId; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: unreadCounts.inbox },
    { id: 'starred', label: 'Starred', icon: Star, count: unreadCounts.starred },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'archived', label: 'Archived', icon: Archive },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ];

  const handleFolderClick = (id: FolderId) => {
    setFolder(id);
    if (currentPath !== '/inbox') {
      navigate('/inbox');
    }
    if (onCloseMobile) onCloseMobile();
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <aside
      id="app-sidebar"
      className={cn(
        'w-64 bg-white text-slate-900 flex flex-col shrink-0 border-r border-slate-200 transition-all duration-200 z-30 h-full',
        'fixed inset-y-0 left-0 lg:static lg:translate-x-0',
        isOpenMobile ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
        <button
          onClick={() => handleNavigate('/')}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-200 group-hover:bg-blue-700 transition-colors">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg text-slate-900 tracking-tight block leading-tight">
              IntelliMail
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded uppercase">
              AI
            </span>
          </div>
        </button>
      </div>

      {/* Primary Action Button: Compose */}
      <div className="p-5 pb-3">
        <button
          id="sidebar-compose-button"
          onClick={() => handleNavigate('/compose')}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-xl shadow-sm shadow-blue-200 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 cursor-pointer"
        >
          <PenSquare className="w-4 h-4" />
          <span>Compose Email</span>
        </button>
      </div>

      {/* Main Mail Folders & Navigation */}
      <div className="px-4 flex-1 overflow-y-auto space-y-6">
        <div>
          <nav className="space-y-1">
            {folderItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === '/inbox' && currentFolder === item.id;
              return (
                <button
                  key={item.id}
                  id={`sidebar-folder-${item.id}`}
                  onClick={() => handleFolderClick(item.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left focus:outline-none cursor-pointer',
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        'w-4 h-4',
                        isActive ? 'text-blue-600' : 'text-slate-400'
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-semibold rounded-full',
                        isActive
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* System & Analytics */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            System & Analytics
          </div>
          <nav className="space-y-1">
            <button
              id="sidebar-link-activity"
              onClick={() => handleNavigate('/activity')}
              className={cn(
                'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left focus:outline-none cursor-pointer',
                currentPath === '/activity'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Activity className={cn('w-4 h-4', currentPath === '/activity' ? 'text-blue-600' : 'text-slate-400')} />
              <span>Activity & Logs</span>
            </button>
            <button
              id="sidebar-link-settings"
              onClick={() => handleNavigate('/settings')}
              className={cn(
                'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left focus:outline-none cursor-pointer',
                currentPath === '/settings'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Settings className={cn('w-4 h-4', currentPath === '/settings' ? 'text-blue-600' : 'text-slate-400')} />
              <span>Settings & OAuth</span>
            </button>
          </nav>
        </div>

        {/* Intelligent Labels */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
            <span>Intelligent Labels</span>
            <Tag className="w-3 h-3 text-slate-400" />
          </div>
          <div className="space-y-1">
            <div 
              onClick={() => handleFolderClick('inbox')}
              className="flex items-center gap-3 px-3.5 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-violet-500"></span>
              <span>Action Required</span>
            </div>
            <div 
              onClick={() => handleFolderClick('inbox')}
              className="flex items-center gap-3 px-3.5 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Finance</span>
            </div>
            <div 
              onClick={() => handleFolderClick('inbox')}
              className="flex items-center gap-3 px-3.5 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Social & Updates</span>
            </div>
            <div 
              onClick={() => handleFolderClick('inbox')}
              className="flex items-center gap-3 px-3.5 py-2 text-slate-600 hover:bg-slate-50 rounded-lg text-sm transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Urgent Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile & Status Footer */}
      <div className="p-4 border-t border-slate-100 mt-auto bg-slate-50/50">
        <div
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-all cursor-pointer border border-transparent hover:border-slate-200"
          onClick={() => handleNavigate('/settings')}
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {initials}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-slate-900 truncate">
              {user?.name || 'Account'}
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              {isGmailConnected ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700 font-medium">Gmail Connected</span>
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 text-blue-500" />
                  <span className="text-slate-500">Demo Mode</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
