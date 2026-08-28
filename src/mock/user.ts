import { UserProfile, UserSettings } from '../types/user';

export const MOCK_USER_PROFILE: UserProfile = {
  id: 'usr-9042',
  name: 'Alex Rivera',
  email: 'alex.rivera@workspace.internal',
  role: 'Engineering Lead & Architect',
  connectedAccountType: 'local_mock',
  isGmailConnected: false, // Explicitly set to false with ready setup guide
  quotaUsagePercent: 24,
};

export const MOCK_USER_SETTINGS: UserSettings = {
  aiSummaryStyle: 'bullet_points',
  aiDraftTone: 'professional',
  aiAutoDetectActionItems: true,
  emailSyncIntervalMinutes: 5,
  theme: 'light',
  compactView: false,
  notificationsEnabled: true,
};
