import {
  EmailSummary,
  ReplyTone,
  PriorityDetectionResult,
  ActionItemsResult,
  ImportantDatesResult,
  EmailCategorizationResult,
} from '../types/email';
import { authService } from './authService';

export interface SummarizeEmailParams {
  emailId?: string;
  subject: string;
  sender?: { name?: string; email?: string };
  date?: string;
  body: string;
}

export interface GenerateReplyParams {
  emailId?: string;
  subject: string;
  sender?: { name?: string; email?: string };
  date?: string;
  body: string;
  threadMessages?: Array<{
    sender: { name?: string; email?: string };
    date?: string;
    body: string;
  }>;
  tone?: ReplyTone;
  userInstructions?: string;
}

export interface GenerateDraftParams {
  userPrompt: string;
  tone?: 'professional' | 'casual' | 'concise' | 'persuasive';
  context?: string;
}

export const aiService = {
  /**
   * Request an AI-powered summary from the backend Gemini 3.7 Flash service
   */
  async summarizeEmail(params: SummarizeEmailParams): Promise<EmailSummary> {
    const res = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: authService.getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate summary with Gemini AI.');
    }

    return data.data as EmailSummary;
  },

  /**
   * ⚡ Detect Email Priority (High, Medium, Low + Reason)
   */
  async detectPriority(params: SummarizeEmailParams): Promise<PriorityDetectionResult> {
    const res = await fetch('/api/ai/priority', {
      method: 'POST',
      headers: authService.getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to detect email priority.');
    }

    return data.data as PriorityDetectionResult;
  },

  /**
   * ✓ Extract Action Items (Tasks + Deadlines)
   */
  async extractActionItems(params: SummarizeEmailParams): Promise<ActionItemsResult> {
    const res = await fetch('/api/ai/action-items', {
      method: 'POST',
      headers: authService.getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to extract action items.');
    }

    return data.data as ActionItemsResult;
  },

  /**
   * 📅 Extract Important Dates & Deadlines
   */
  async extractImportantDates(params: SummarizeEmailParams): Promise<ImportantDatesResult> {
    const res = await fetch('/api/ai/important-dates', {
      method: 'POST',
      headers: authService.getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to extract important dates.');
    }

    return data.data as ImportantDatesResult;
  },

  /**
   * 🏷️ Categorize Single Email & Persist to Supabase
   */
  async categorizeEmail(params: SummarizeEmailParams): Promise<EmailCategorizationResult> {
    const res = await fetch('/api/ai/categorize', {
      method: 'POST',
      headers: authService.getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to categorize email.');
    }

    return data.data as EmailCategorizationResult;
  },

  /**
   * 🏷️ Batch Categorize Multiple Emails
   */
  async batchCategorize(emails: Array<{ id: string; subject: string; body?: string; snippet?: string; sender?: any; date?: string }>): Promise<any> {
    const res = await fetch('/api/ai/batch-categorize', {
      method: 'POST',
      headers: authService.getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify({ emails }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to batch categorize emails.');
    }

    return data;
  },

  /**
   * Get all stored email categories from Supabase
   */
  async getCategories(): Promise<any[]> {
    const res = await fetch('/api/ai/categories', {
      method: 'GET',
      headers: authService.getAuthHeaders({}),
      credentials: 'include',
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return [];
    }

    return data.categories || [];
  },

  /**
   * Generate an intelligent email reply using Gemini 3.7 Flash
   */
  async generateReply(params: GenerateReplyParams): Promise<{ reply: string; tone: ReplyTone }> {
    const res = await fetch('/api/ai/generate-reply', {
      method: 'POST',
      headers: authService.getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      credentials: 'include',
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate reply with Gemini AI.');
    }

    return {
      reply: data.reply as string,
      tone: (data.tone as ReplyTone) || 'professional',
    };
  },

  /**
   * Helper for draft generation
   */
  async generateDraft(params: GenerateDraftParams): Promise<string> {
    const greeting = params.tone === 'casual' ? 'Hi,' : 'Dear Team,';
    const signoff = params.tone === 'casual' ? 'Best,\nAlex' : 'Kind regards,\nAlex Rivera';
    return `${greeting}\n\nThank you for reaching out. ${params.userPrompt}\n\nPlease let me know if you need any additional details.\n\n${signoff}`;
  },
};
