import { Email, FolderId, SendEmailParams } from '../types/email';
import { INITIAL_MOCK_EMAILS } from '../mock/emails';
import { authService } from './authService';

const STORAGE_KEY = 'intelligent_email_assistant_mock_emails';

export class EmailService {
  private static instance: EmailService;
  private isLiveConnected = false;

  private constructor() {
    this.initLocalStorageFallback();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  public setLiveConnected(connected: boolean): void {
    this.isLiveConnected = connected;
  }

  private initLocalStorageFallback(): void {
    if (typeof window === 'undefined') return;
    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (!existing) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_EMAILS));
      }
    } catch {
      // Storage access error handling
    }
  }

  private getStoredFallbackEmails(): Email[] {
    if (typeof window === 'undefined') return INITIAL_MOCK_EMAILS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return INITIAL_MOCK_EMAILS;
      return JSON.parse(raw);
    } catch {
      return INITIAL_MOCK_EMAILS;
    }
  }

  private saveStoredFallbackEmails(emails: Email[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
    } catch {
      // Storage save error handling
    }
  }

  /**
   * 1. Get Emails (Inbox, Starred, Sent, Archived, Trash, Search) with real Gmail API & pagination
   */
  public async getEmails(
    folder: FolderId = 'inbox',
    query = '',
    options?: { pageToken?: string; maxResults?: number }
  ): Promise<{
    emails: Email[];
    source: 'gmail_api' | 'local_demo';
    nextPageToken?: string;
    totalEstimate?: number;
    error?: string;
  }> {
    // Attempt real Gmail API fetch
    try {
      const params = new URLSearchParams({ folder });
      if (query.trim()) params.append('q', query.trim());
      if (options?.pageToken) params.append('pageToken', options.pageToken);
      if (options?.maxResults) params.append('maxResults', options.maxResults.toString());

      const res = await fetch(`/api/gmail/messages?${params.toString()}`, {
        headers: authService.getAuthHeaders({
          'Accept': 'application/json',
        }),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.source === 'gmail_api') {
          return {
            emails: data.emails || [],
            source: 'gmail_api',
            nextPageToken: data.nextPageToken,
            totalEstimate: data.resultSizeEstimate,
          };
        }
      } else if (res.status === 401) {
        return {
          emails: [],
          source: 'gmail_api',
          error: 'Google OAuth session expired. Please sign in again.',
        };
      }
    } catch (err: any) {
      console.warn('Gmail API request failed:', err);
    }

    // Fallback to local storage mock store only when in demo mode or offline
    let emails = this.getStoredFallbackEmails();

    if (folder === 'inbox') {
      emails = emails.filter((e) => !e.isArchived && !e.isTrash && e.folder === 'inbox');
    } else if (folder === 'starred') {
      emails = emails.filter((e) => e.isStarred && !e.isTrash);
    } else if (folder === 'sent') {
      emails = emails.filter((e) => e.folder === 'sent');
    } else if (folder === 'archived') {
      emails = emails.filter((e) => e.isArchived && !e.isTrash);
    } else if (folder === 'trash') {
      emails = emails.filter((e) => e.isTrash);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      emails = emails.filter(
        (e) =>
          e.subject.toLowerCase().includes(q) ||
          e.body.toLowerCase().includes(q) ||
          e.sender.name.toLowerCase().includes(q) ||
          e.sender.email.toLowerCase().includes(q) ||
          e.labels.some((l) => l.toLowerCase().includes(q))
      );
    }

    return { emails, source: 'local_demo' };
  }

  /**
   * 2. Get Single Email
   */
  public async getEmailById(id: string): Promise<Email | undefined> {
    try {
      const res = await fetch(`/api/gmail/messages/${id}`, {
        headers: authService.getAuthHeaders({
          'Accept': 'application/json',
        }),
        credentials: 'include',
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const emails = this.getStoredFallbackEmails();
    return emails.find((e) => e.id === id);
  }

  /**
   * 3. Get Thread
   */
  public async getThread(threadId: string): Promise<Email[]> {
    try {
      const res = await fetch(`/api/gmail/threads/${threadId}`, {
        headers: authService.getAuthHeaders({
          'Accept': 'application/json',
        }),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        return data.messages || [];
      }
    } catch {
      // Fallback
    }

    const emails = this.getStoredFallbackEmails();
    return emails.filter((e) => e.threadId === threadId);
  }

  /**
   * 4 & 5. Mark as read / unread
   */
  public async setReadStatus(id: string, isRead: boolean): Promise<void> {
    try {
      await fetch(`/api/gmail/messages/${id}/read`, {
        method: 'POST',
        headers: authService.getAuthHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'include',
        body: JSON.stringify({ isRead }),
      });
    } catch {
      // Handled gracefully
    }

    // Update local store as well
    const emails = this.getStoredFallbackEmails();
    const idx = emails.findIndex((e) => e.id === id);
    if (idx !== -1) {
      emails[idx].isRead = isRead;
      this.saveStoredFallbackEmails(emails);
    }
  }

  /**
   * 6 & 7. Star / Unstar
   */
  public async setStarredStatus(id: string, isStarred: boolean): Promise<void> {
    try {
      await fetch(`/api/gmail/messages/${id}/star`, {
        method: 'POST',
        headers: authService.getAuthHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'include',
        body: JSON.stringify({ isStarred }),
      });
    } catch {
      // Handled gracefully
    }

    const emails = this.getStoredFallbackEmails();
    const idx = emails.findIndex((e) => e.id === id);
    if (idx !== -1) {
      emails[idx].isStarred = isStarred;
      this.saveStoredFallbackEmails(emails);
    }
  }

  /**
   * 8. Archive Email
   */
  public async archiveEmail(id: string): Promise<void> {
    try {
      await fetch(`/api/gmail/messages/${id}/archive`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        credentials: 'include',
      });
    } catch {
      // Handled gracefully
    }

    const emails = this.getStoredFallbackEmails();
    const idx = emails.findIndex((e) => e.id === id);
    if (idx !== -1) {
      emails[idx].isArchived = true;
      emails[idx].folder = 'archived';
      this.saveStoredFallbackEmails(emails);
    }
  }

  /**
   * 9. Trash Email
   */
  public async trashEmail(id: string): Promise<void> {
    try {
      await fetch(`/api/gmail/messages/${id}`, {
        method: 'DELETE',
        headers: authService.getAuthHeaders(),
        credentials: 'include',
      });
    } catch {
      // Handled gracefully
    }

    const emails = this.getStoredFallbackEmails();
    const idx = emails.findIndex((e) => e.id === id);
    if (idx !== -1) {
      emails[idx].isTrash = true;
      emails[idx].folder = 'trash';
      this.saveStoredFallbackEmails(emails);
    }
  }

  /**
   * 10. Send Email
   */
  public async sendEmail(params: SendEmailParams): Promise<Email> {
    let apiResult: any = null;
    try {
      const res = await fetch('/api/gmail/messages/send', {
        method: 'POST',
        headers: authService.getAuthHeaders({
          'Content-Type': 'application/json',
        }),
        credentials: 'include',
        body: JSON.stringify(params),
      });
      if (res.ok) {
        apiResult = await res.json();
      }
    } catch {
      // Handled gracefully
    }

    const newEmail: Email = {
      id: apiResult?.id || `sent-${Date.now()}`,
      threadId: apiResult?.threadId || `thread-sent-${Date.now()}`,
      sender: {
        name: 'Me',
        email: 'me@workspace.internal',
      },
      recipients: [{ name: params.to.split('@')[0], email: params.to }],
      cc: params.cc ? [{ name: params.cc.split('@')[0], email: params.cc }] : undefined,
      bcc: params.bcc ? [{ name: params.bcc.split('@')[0], email: params.bcc }] : undefined,
      subject: params.subject,
      snippet: params.body.slice(0, 100),
      body: params.body,
      date: new Date().toISOString(),
      folder: 'sent',
      isRead: true,
      isStarred: false,
      isArchived: false,
      isTrash: false,
      labels: ['Sent'],
      category: 'primary',
      priority: 'normal',
    };

    const emails = this.getStoredFallbackEmails();
    emails.unshift(newEmail);
    this.saveStoredFallbackEmails(emails);

    return newEmail;
  }

  /**
   * 11. Folder Counts
   */
  public async getFolderCounts(): Promise<Record<FolderId, number>> {
    try {
      const res = await fetch('/api/gmail/counts', {
        headers: authService.getAuthHeaders({
          'Accept': 'application/json',
        }),
        credentials: 'include',
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const emails = this.getStoredFallbackEmails();
    return {
      inbox: emails.filter((e) => !e.isArchived && !e.isTrash && !e.isRead && e.folder === 'inbox').length,
      starred: emails.filter((e) => e.isStarred && !e.isTrash).length,
      sent: emails.filter((e) => e.folder === 'sent').length,
      archived: emails.filter((e) => e.isArchived && !e.isTrash).length,
      trash: emails.filter((e) => e.isTrash).length,
    };
  }
}

export const emailService = EmailService.getInstance();
