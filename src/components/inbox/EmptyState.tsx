import React from 'react';
import { Mail, Search, Star, Archive, Trash2, Send, Sparkles } from 'lucide-react';
import { FolderId } from '../../types/email';

interface EmptyStateProps {
  folder: FolderId;
  isSearch: boolean;
  searchQuery?: string;
  onClearSearch?: () => void;
  onComposeClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  folder,
  isSearch,
  searchQuery,
  onClearSearch,
  onComposeClick,
}) => {
  if (isSearch) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-slate-200 m-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <Search className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          No emails found
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mb-4">
          No emails matched your search for &quot;<span className="font-medium text-slate-800">{searchQuery}</span>&quot;.
        </p>
        {onClearSearch && (
          <button
            onClick={onClearSearch}
            className="px-3.5 py-2 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            Clear Search Filter
          </button>
        )}
      </div>
    );
  }

  const folderConfigs = {
    inbox: {
      icon: Mail,
      title: 'Your inbox is clear',
      description: 'You are all caught up! When new emails arrive, they will appear here ready for AI-assisted review.',
    },
    starred: {
      icon: Star,
      title: 'No starred emails',
      description: 'Star important emails to quickly access them in this mailbox.',
    },
    sent: {
      icon: Send,
      title: 'No sent messages',
      description: 'Emails and replies you send will be saved here.',
    },
    archived: {
      icon: Archive,
      title: 'Archive is empty',
      description: 'Archived messages will remain safely stored here without cluttering your main inbox.',
    },
    trash: {
      icon: Trash2,
      title: 'Trash is empty',
      description: 'Deleted messages stay in the trash until emptied.',
    },
  };

  const currentConfig = folderConfigs[folder] || folderConfigs.inbox;
  const Icon = currentConfig.icon;

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-slate-200 m-4">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 shadow-sm shadow-blue-100">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">
        {currentConfig.title}
      </h3>
      <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
        {currentConfig.description}
      </p>
      {folder === 'inbox' && onComposeClick && (
        <button
          onClick={onComposeClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-200 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Compose New Message</span>
        </button>
      )}
    </div>
  );
};
