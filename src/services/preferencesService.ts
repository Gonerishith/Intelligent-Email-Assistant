import { UserSettings } from '../types/user';
import { MOCK_USER_SETTINGS } from '../mock/user';
import { authService } from './authService';

export const PreferencesService = {
  async getPreferences(): Promise<UserSettings> {
    try {
      const res = await fetch('/api/user/preferences', {
        headers: authService.getAuthHeaders({
          'Accept': 'application/json',
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        return MOCK_USER_SETTINGS;
      }

      const data = await res.json();
      if (data) {
        return {
          aiSummaryStyle: data.summary_format || MOCK_USER_SETTINGS.aiSummaryStyle,
          aiDraftTone: data.preferred_reply_tone || MOCK_USER_SETTINGS.aiDraftTone,
          aiAutoDetectActionItems: data.auto_detect_action_items ?? MOCK_USER_SETTINGS.aiAutoDetectActionItems,
          notificationsEnabled: data.notifications_enabled ?? MOCK_USER_SETTINGS.notificationsEnabled,
          emailSyncIntervalMinutes: MOCK_USER_SETTINGS.emailSyncIntervalMinutes,
          theme: MOCK_USER_SETTINGS.theme,
          compactView: MOCK_USER_SETTINGS.compactView,
        };
      }

      return MOCK_USER_SETTINGS;
    } catch (err) {
      console.warn('Failed to fetch user preferences from Supabase, using defaults:', err);
      return MOCK_USER_SETTINGS;
    }
  },

  async savePreferences(settings: UserSettings): Promise<boolean> {
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: authService.getAuthHeaders({
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }),
        credentials: 'include',
        body: JSON.stringify({
          preferred_reply_tone: settings.aiDraftTone,
          summary_format: settings.aiSummaryStyle,
          auto_detect_action_items: settings.aiAutoDetectActionItems,
          notifications_enabled: settings.notificationsEnabled,
        }),
      });

      return res.ok;
    } catch (err) {
      console.error('Failed to save user preferences to database:', err);
      return false;
    }
  }
};
