import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Mail, 
  Send, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Bot, 
  ShieldAlert,
  ArrowRight,
  RotateCw,
  Database
} from 'lucide-react';
import { ActivityLogItem } from '../../types/email';
import { formatFullDateTime } from '../../utils/date';
import { useRouter } from '../../router/RouterContext';
import { useEmails } from '../../context/EmailContext';
import { ActivityService } from '../../services/activityService';

export const ActivityTimeline: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'ai' | 'sync'>('all');
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { navigate } = useRouter();
  const { selectEmail } = useEmails();

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const data = await ActivityService.getActivities({ limit: 50 });
      setActivities(data);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const filteredActivities = activities.filter((item) => {
    if (filter === 'ai') {
      return item.action === 'summarized' || item.action === 'draft_generated';
    }
    if (filter === 'sync') {
      return item.action === 'received' || item.action === 'sent' || item.action === 'categorized';
    }
    return true;
  });

  const getActionIcon = (action: ActivityLogItem['action']) => {
    switch (action) {
      case 'summarized':
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      case 'draft_generated':
        return <Bot className="w-4 h-4 text-indigo-600" />;
      case 'sent':
        return <Send className="w-4 h-4 text-emerald-600" />;
      case 'categorized':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      default:
        return <Mail className="w-4 h-4 text-slate-600" />;
    }
  };

  const handleOpenEmail = (emailId?: string) => {
    if (emailId) {
      selectEmail(emailId);
      navigate('/inbox');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs & Refresh */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Filter Activity:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Events ({activities.length})
            </button>
            <button
              onClick={() => setFilter('ai')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === 'ai'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AI Operations
            </button>
            <button
              onClick={() => setFilter('sync')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === 'sync'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Email & Sync
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadActivities}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer disabled:opacity-50"
            title="Refresh database records"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>Supabase Audit Log</span>
          </span>
        </div>
      </div>

      {/* Timeline List */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-xs">
          No activity records found matching the current filter.
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-200">
          {filteredActivities.map((item) => (
            <div
              key={item.id}
              id={`activity-item-${item.id}`}
              className="relative flex items-start gap-4 group"
            >
              {/* Timeline Bullet */}
              <div className="relative z-10 w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0 group-hover:border-blue-400 transition-colors">
                {getActionIcon(item.action)}
              </div>

              {/* Event Card */}
              <div className="flex-1 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      {item.title}
                    </h3>
                    {item.senderOrRecipient && (
                      <span className="text-xs text-slate-500 font-medium">
                        Related: {item.senderOrRecipient}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {formatFullDateTime(item.timestamp)}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  {item.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Supabase Stored</span>
                  </div>

                  {item.emailId && (
                    <button
                      onClick={() => handleOpenEmail(item.emailId)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-xs hover:underline cursor-pointer"
                    >
                      <span>View Thread</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
