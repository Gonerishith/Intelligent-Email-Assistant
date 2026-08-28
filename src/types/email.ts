export type FolderId = 'inbox' | 'starred' | 'sent' | 'archived' | 'trash';

export type PriorityLevel = 'high' | 'normal' | 'low';

export type EmailCategory = 'primary' | 'updates' | 'promotions' | 'financial' | 'personal' | 'social' | 'work' | 'general';

export type ReplyTone = 'professional' | 'friendly' | 'formal' | 'concise';

export interface EmailSender {
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface EmailRecipient {
  name: string;
  email: string;
}

export interface EmailAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
}

export interface PriorityDetectionResult {
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface ActionItem {
  task: string;
  deadline: string | null;
}

export interface ActionItemsResult {
  actionItems: ActionItem[];
}

export interface ImportantDate {
  date: string;
  description: string;
}

export interface ImportantDatesResult {
  importantDates: ImportantDate[];
}

export interface EmailCategorizationResult {
  category: 'Promotions' | 'Updates' | 'Financial' | 'Personal' | 'Work' | 'Primary' | string;
  confidence: number;
  reason: string;
  labels: string[];
}

export interface EmailSummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  importantDates: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface EmailAiInsightsState {
  priorityResult?: PriorityDetectionResult;
  actionItemsResult?: ActionItemsResult;
  datesResult?: ImportantDatesResult;
  categoryResult?: EmailCategorizationResult;
  summaryResult?: EmailSummary;
}

export interface Email {
  id: string;
  threadId: string;
  sender: EmailSender;
  recipients: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject: string;
  snippet: string;
  body: string;
  htmlBody?: string;
  date: string; // ISO string or parsable date
  folder: FolderId;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isTrash: boolean;
  labels: string[];
  category: EmailCategory;
  priority?: PriorityLevel;
  attachments?: EmailAttachment[];
  threadMessages?: Email[];
  
  // AI-enrichment data (Gemini)
  aiSummary?: string;
  aiSummaryData?: EmailSummary;
  aiSuggestedReply?: string;
  aiActionItems?: string[];
  aiSentiment?: 'positive' | 'neutral' | 'urgent' | 'action_required';
  aiCategory?: string;
  aiInsights?: EmailAiInsightsState;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  action: 'received' | 'sent' | 'summarized' | 'draft_generated' | 'categorized' | 'archived' | 'deleted';
  title: string;
  description: string;
  emailId?: string;
  senderOrRecipient?: string;
  status: 'completed' | 'pending' | 'simulated';
}

export interface EmailFilterOptions {
  searchQuery: string;
  folder: FolderId;
  label?: string;
  category?: EmailCategory;
  unreadOnly?: boolean;
  hasAttachments?: boolean;
}

export interface ComposeDraft {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: File[];
}

export type SendEmailParams = ComposeDraft;
