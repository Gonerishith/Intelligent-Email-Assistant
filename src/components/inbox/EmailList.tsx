import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  RotateCw, 
  CheckCheck, 
  Archive, 
  Trash2, 
  Sparkles,
  Inbox,
  LayoutGrid,
  AlertCircle,
  XCircle,
  ChevronDown
} from 'lucide-react';
import { useEmails } from '../../context/EmailContext';
import { EmailListItem } from './EmailListItem';
import { EmptyState } from './EmptyState';
import { EmailCategory } from '../../types/email';
import { useRouter } from '../../router/RouterContext';
import { cn } from '../../utils/cn';

interface EmailListProps {
  onSelectEmailMobile?: () => void;
}

export const EmailList: React.FC<EmailListProps> = ({ onSelectEmailMobile }) => {
  const {
    emails,
    currentFolder,
    selectedEmailId,
    selectEmail,
    searchQuery,
    setSearch,
    activeCategory,
    setActiveCategory,
    isLoading,
    isLoadingMore,
    isBatchCategorizing,
    nextPageToken,
    loadMoreEmails,
    toggleStar,
    toggleRead,
    selectedEmailIds,
    toggleSelectId,
    selectAll,
    clearSelection,
    markAllAsRead,
    refreshEmails,
    archiveEmail,
    trashEmail,
    batchCategorizeAll,
    apiError,
    clearApiError,
  } = useEmails();

  const { navigate } = useRouter();
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Filter by category if in inbox
  const displayedEmails = emails.filter((email) => {
    if (currentFolder !== 'inbox') return true;
    if (!activeCategory || activeCategory === 'all') return true;
    const cat = (email.category || '').toLowerCase();
    const target = activeCategory.toLowerCase();
    return cat === target;
  });

  const allSelected = displayedEmails.length > 0 && selectedEmailIds.size === displayedEmails.length;
  const someSelected = selectedEmailIds.size > 0 && !allSelected;

  const handleBulkArchive = async () => {
    for (const id of Array.from(selectedEmailIds)) {
      await archiveEmail(id);
    }
    clearSelection();
  };

  const handleBulkTrash = async () => {
    for (const id of Array.from(selectedEmailIds)) {
      await trashEmail(id);
    }
    setShowBulkDeleteConfirm(false);
    clearSelection();
  };

  const handleSelectEmail = (id: string) => {
    selectEmail(id);
    if (onSelectEmailMobile) {
      onSelectEmailMobile();
    }
  };

  const getFolderTitle = () => {
    switch (currentFolder) {
      case 'inbox': return 'Inbox';
      case 'starred': return 'Starred Messages';
      case 'sent': return 'Sent Mail';
      case 'archived': return 'Archived Messages';
      case 'trash': return 'Trash';
      default: return 'Emails';
    }
  };

  const categoryTabs = [
    { id: 'all', label: 'All' },
    { id: 'primary', label: 'Primary' },
    { id: 'work', label: 'Work' },
    { id: 'financial', label: 'Financial' },
    { id: 'updates', label: 'Updates' },
    { id: 'promotions', label: 'Promotions' },
    { id: 'personal', label: 'Personal' },
  ];

  return (
    <div id="email-list-container" className="h-full flex flex-col bg-white border-r border-slate-200 overflow-hidden">
      {/* List Header & Category Tabs */}
      <div className="border-b border-slate-100 bg-white shrink-0">
        <div className="px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 capitalize tracking-tight">
              {getFolderTitle()}
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">
              {displayedEmails.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {currentFolder === 'inbox' && (
              <button
                onClick={() => batchCategorizeAll()}
                disabled={isBatchCategorizing || emails.length === 0}
                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium disabled:opacity-50"
                title="Use Gemini AI to categorize all inbox emails"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isBatchCategorizing ? 'animate-spin text-indigo-500' : 'text-indigo-600'}`} />
                <span className="hidden md:inline">{isBatchCategorizing ? 'Categorizing...' : 'AI Categorize'}</span>
              </button>
            )}
            <button
              onClick={() => markAllAsRead()}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors text-xs flex items-center gap-1"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline font-medium">Mark Read</span>
            </button>
            <button
              onClick={() => refreshEmails()}
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh list"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Category Tabs (All, Primary, Work, Financial, Updates, Promotions, Personal) */}
        {currentFolder === 'inbox' && (
          <div className="flex border-t border-slate-100 px-3 overflow-x-auto text-xs font-medium scrollbar-none gap-1 py-1">
            {categoryTabs.map((tab) => {
              const count = emails.filter((e) => tab.id === 'all' || (e.category || '').toLowerCase() === tab.id).length;
              const isActive = (activeCategory || 'all') === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 text-xs',
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  )}
                >
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px]',
                        isActive ? 'bg-blue-200/70 text-blue-800' : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* API Error Notice */}
        {apiError && (
          <div className="bg-rose-50 border-b border-rose-100 px-4 py-2 flex items-center justify-between gap-2 text-xs text-rose-800">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="truncate">{apiError}</span>
            </div>
            <button
              onClick={clearApiError}
              className="p-0.5 hover:bg-rose-100 rounded text-rose-500"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Bulk Selection Toolbar */}
        {selectedEmailIds.size > 0 && (
          <div className="bg-blue-50/80 px-4 py-2 flex items-center justify-between border-t border-blue-100 animate-in fade-in duration-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
              <button
                onClick={selectAll}
                className="flex items-center gap-1.5 hover:underline focus:outline-none"
              >
                {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-blue-600" />}
                <span>{selectedEmailIds.size} Selected</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleBulkArchive}
                className="px-2.5 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-1"
                title="Archive selected"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive</span>
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 rounded-md transition-colors flex items-center gap-1"
                title="Delete selected"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
              <button
                onClick={clearSelection}
                className="px-2 py-1 text-xs text-blue-700 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirmation Modal */}
        {showBulkDeleteConfirm && (
          <div className="bg-amber-50 border-t border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 animate-in fade-in">
            <span>Move {selectedEmailIds.size} message(s) to Trash?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkTrash}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded shadow-xs"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-2 py-1 text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main List Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {isLoading ? (
          <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RotateCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Loading messages...</span>
          </div>
        ) : displayedEmails.length === 0 ? (
          <EmptyState
            folder={currentFolder}
            isSearch={!!searchQuery}
            searchQuery={searchQuery}
            onClearSearch={() => setSearch('')}
            onComposeClick={() => navigate('/compose')}
          />
        ) : (
          <>
            {displayedEmails.map((email) => (
              <EmailListItem
                key={email.id}
                email={email}
                isSelected={email.id === selectedEmailId}
                isChecked={selectedEmailIds.has(email.id)}
                onSelect={handleSelectEmail}
                onToggleCheck={toggleSelectId}
                onToggleStar={toggleStar}
                onToggleRead={toggleRead}
              />
            ))}

            {/* Pagination / Load More Button */}
            {nextPageToken && (
              <div className="p-4 flex justify-center bg-slate-50/50">
                <button
                  onClick={loadMoreEmails}
                  disabled={isLoadingMore}
                  className="px-4 py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading more...</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Load older messages</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
