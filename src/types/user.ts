export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
  connectedAccountType: 'local_mock' | 'google_workspace' | 'none';
  isGmailConnected: boolean;
  quotaUsagePercent: number;
}

export interface UserSettings {
  aiSummaryStyle: 'bullet_points' | 'one_liner' | 'executive_summary';
  aiDraftTone: 'professional' | 'casual' | 'concise' | 'persuasive';
  aiAutoDetectActionItems: boolean;
  emailSyncIntervalMinutes: number;
  theme: 'system' | 'light' | 'dark';
  compactView: boolean;
  notificationsEnabled: boolean;
}
