import React from 'react';
import { Star, Paperclip, Sparkles, Mail, MailOpen } from 'lucide-react';
import { Email } from '../../types/email';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { formatEmailDate } from '../../utils/date';
import { cn } from '../../utils/cn';

interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onToggleRead: (id: string, e: React.MouseEvent) => void;
}

export const EmailListItem: React.FC<EmailListItemProps> = ({
  email,
  isSelected,
  isChecked,
  onSelect,
  onToggleCheck,
  onToggleStar,
  onToggleRead,
}) => {
  return (
    <div
      id={`email-row-${email.id}`}
      onClick={() => onSelect(email.id)}
      className={cn(
        'group relative flex items-start sm:items-center gap-3 px-5 py-3 border-b border-slate-50 cursor-pointer transition-colors',
        isSelected
          ? 'bg-blue-50/50 border-l-4 border-l-blue-600'
          : !email.isRead
          ? 'bg-blue-50/30 hover:bg-blue-50/50 font-semibold'
          : 'bg-white hover:bg-slate-50'
      )}
    >
      {/* Selection Checkbox & Star Controls */}
      <div className="flex items-center gap-2.5 pt-0.5 sm:pt-0 shrink-0" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onToggleCheck(email.id)}
          aria-label={`Select email from ${email.sender.name}`}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
        <button
          onClick={(e) => onToggleStar(email.id, e)}
          className={cn(
            'p-0.5 rounded hover:bg-slate-200/60 transition-colors focus:outline-none',
            email.isStarred ? 'text-amber-400' : 'text-slate-300 hover:text-slate-500'
          )}
          title={email.isStarred ? 'Unstar' : 'Star'}
          aria-label={email.isStarred ? 'Unstar email' : 'Star email'}
        >
          <Star className={cn('w-4 h-4', email.isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
        </button>
      </div>

      {/* Main Email Metadata */}
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
        {/* Sender Name & Unread Dot */}
        <div className="flex items-center gap-2 sm:w-44 shrink-0">
          {!email.isRead && (
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Unread" />
          )}
          <span
            className={cn(
              'text-sm truncate block',
              email.isRead ? 'text-slate-700 font-medium' : 'text-slate-900 font-semibold'
            )}
          >
            {email.sender.name}
          </span>
        </div>

        {/* Subject & Preview */}
        <div className="flex-1 min-w-0 flex items-baseline gap-2">
          <span
            className={cn(
              'text-sm truncate shrink-0 max-w-[260px]',
              email.isRead ? 'text-slate-700 font-normal' : 'text-slate-900 font-semibold'
            )}
          >
            {email.subject}
          </span>
          <span className="text-sm text-slate-500 font-normal truncate hidden md:inline">
            — {email.snippet}
          </span>
        </div>

        {/* Labels & Tags (Badges) */}
        <div className="hidden xl:flex items-center gap-1 shrink-0">
          {email.priority === 'high' && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              ⚡ High Priority
            </span>
          )}
          {email.category && email.category !== 'primary' && email.category !== 'all' && (
            <span
              className={cn(
                'px-2 py-0.5 text-[10px] font-semibold rounded-full border capitalize',
                email.category === 'financial' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                email.category === 'promotions' && 'bg-amber-50 text-amber-700 border-amber-200',
                email.category === 'updates' && 'bg-sky-50 text-sky-700 border-sky-200',
                email.category === 'personal' && 'bg-purple-50 text-purple-700 border-purple-200',
                email.category === 'work' && 'bg-indigo-50 text-indigo-700 border-indigo-200'
              )}
            >
              {email.category}
            </span>
          )}
          {email.aiSummary && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-violet-50 text-violet-700 border border-violet-200">
              <Sparkles className="w-2.5 h-2.5" />
              Summary
            </span>
          )}
          {email.labels.slice(0, 1).map((lbl) => (
            <span key={lbl} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {lbl}
            </span>
          ))}
        </div>
      </div>

      {/* Attachments Icon, Date, & Quick Hover Actions */}
      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto pt-0.5 sm:pt-0">
        {email.attachments && email.attachments.length > 0 && (
          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" title={`${email.attachments.length} attachment(s)`} />
        )}

        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
          {formatEmailDate(email.date)}
        </span>

        {/* Quick Read/Unread toggle on hover */}
        <button
          onClick={(e) => onToggleRead(email.id, e)}
          className="hidden sm:inline-flex p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
          title={email.isRead ? 'Mark as unread' : 'Mark as read'}
        >
          {email.isRead ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
