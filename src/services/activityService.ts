import { ActivityLogItem } from '../types/email';
import { INITIAL_MOCK_ACTIVITIES } from '../mock/activity';
import { authService } from './authService';

export interface DbActivityResponseItem {
  id: string;
  user_id: string;
  email_id?: string;
  action_type: string;
  title: string;
  description: string;
  generated_content?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export const ActivityService = {
  async getActivities(options?: { limit?: number; type?: string }): Promise<ActivityLogItem[]> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', String(options.limit));
      if (options?.type && options.type !== 'all') params.set('type', options.type);

      const res = await fetch(`/api/activity?${params.toString()}`, {
        headers: authService.getAuthHeaders({
          'Accept': 'application/json',
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch activities: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data.activities) && data.activities.length > 0) {
        return data.activities.map((item: DbActivityResponseItem): ActivityLogItem => {
          let mappedAction: ActivityLogItem['action'] = 'summarized';
          if (item.action_type === 'email_sent') mappedAction = 'sent';
          else if (item.action_type === 'email_received') mappedAction = 'received';
          else if (item.action_type === 'reply_generation') mappedAction = 'draft_generated';
          else if (item.action_type === 'priority_detection' || item.action_type === 'action_item_extraction') mappedAction = 'categorized';
          else if (item.action_type === 'summary') mappedAction = 'summarized';

          return {
            id: item.id,
            timestamp: item.created_at,
            action: mappedAction,
            title: item.title,
            description: item.description,
            emailId: item.email_id,
            status: 'completed',
          };
        });
      }

      return INITIAL_MOCK_ACTIVITIES;
    } catch (err) {
      console.warn('Falling back to local activities:', err);
      return INITIAL_MOCK_ACTIVITIES;
    }
  },

  async logActivity(payload: {
    emailId?: string;
    actionType: 'summary' | 'reply_generation' | 'priority_detection' | 'action_item_extraction' | 'email_received' | 'email_sent';
    title: string;
    description: string;
    generatedContent?: string;
  }): Promise<boolean> {
    try {
      const res = await fetch('/api/activity', {
        method: 'POST',
        headers: authService.getAuthHeaders({
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to log activity to Supabase database:', err);
      return false;
    }
  }
};
