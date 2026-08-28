import { getValidAccessToken } from './googleAuth';
import { Email, FolderId, EmailCategory, PriorityLevel, EmailRecipient, EmailSender, EmailAttachment } from '../src/types/email';

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface GmailMessagePart {
  partId?: string;
  mimeType: string;
  filename?: string;
  headers?: GmailMessageHeader[];
  body?: {
    attachmentId?: string;
    size: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
}

interface GmailMessagePayload {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    partId?: string;
    mimeType: string;
    filename?: string;
    headers?: GmailMessageHeader[];
    body?: {
      size: number;
      data?: string;
    };
    parts?: GmailMessagePart[];
  };
}

interface GmailThreadPayload {
  id: string;
  historyId?: string;
  messages?: GmailMessagePayload[];
}

// Helper to decode Base64 / Base64URL string
function decodeBase64(data: string | undefined): string {
  if (!data) return '';
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

// Helper to parse Name & Email from header like "Alex Rivera <alex@work.com>" or "alex@work.com"
function parseSenderOrRecipient(raw: string): { name: string; email: string } {
  if (!raw) return { name: 'Unknown', email: '' };

  const match = raw.match(/^(?:"?([^"]*)"?\s)?(?:<?([^>]+)>?)$/);
  if (match) {
    const name = match[1]?.trim() || match[2]?.split('@')[0] || raw;
    const email = match[2]?.trim() || raw;
    return { name, email };
  }

  return { name: raw.split('@')[0] || raw, email: raw };
}

// Helper to parse multiple recipients in "To" or "Cc" headers
function parseRecipientList(raw: string | undefined): EmailRecipient[] {
  if (!raw) return [];
  const parts = raw.split(/,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  return parts.map(parseSenderOrRecipient).filter((r) => r.email);
}

// Safe HTML sanitizer to prevent XSS / malicious scripts in email HTML bodies
function sanitizeHtmlContent(rawHtml: string): string {
  if (!rawHtml) return '';
  return rawHtml
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove frames, objects, embeds, forms
    .replace(/<\/?(iframe|frame|object|embed|applet|form|base|meta|link)\b[^>]*>/gi, '')
    // Remove inline event handlers (e.g. onload=, onerror=, onclick=)
    .replace(/\son[a-zA-Z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    // Neutralize javascript: href links
    .replace(/href\s*=\s*["']?javascript:[^"'>]+/gi, 'href="#"')
    // Open links in safe target
    .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi, '<a href="$1" target="_blank" rel="noopener noreferrer"');
}

// Helper to extract body content from multipart structure
function extractBodyFromPayload(payload: GmailMessagePayload['payload']): { text: string; html: string; attachments: EmailAttachment[] } {
  if (!payload) return { text: '', html: '', attachments: [] };

  let textBody = '';
  let rawHtmlBody = '';
  const attachments: EmailAttachment[] = [];

  function traverseParts(part: GmailMessagePart) {
    if (part.filename && (part.body?.attachmentId || part.body?.size)) {
      attachments.push({
        id: part.body?.attachmentId || part.partId || `att-${Date.now()}`,
        name: part.filename,
        size: `${Math.max(1, Math.round((part.body?.size || 0) / 1024))} KB`,
        type: part.mimeType || 'application/octet-stream',
      });
    }

    if (part.mimeType === 'text/plain' && part.body?.data && !textBody) {
      textBody = decodeBase64(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data && !rawHtmlBody) {
      rawHtmlBody = decodeBase64(part.body.data);
    }

    if (part.parts && part.parts.length > 0) {
      for (const subPart of part.parts) {
        traverseParts(subPart);
      }
    }
  }

  if (payload.body?.data) {
    const decoded = decodeBase64(payload.body.data);
    if (payload.mimeType === 'text/plain') {
      textBody = decoded;
    } else if (payload.mimeType === 'text/html') {
      rawHtmlBody = decoded;
    }
  }

  if (payload.parts) {
    for (const p of payload.parts) {
      traverseParts(p);
    }
  }

  // Convert simple HTML tags to readable text if no plain text
  let finalBody = textBody;
  if (!finalBody && rawHtmlBody) {
    finalBody = rawHtmlBody
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/gi, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  const safeHtml = rawHtmlBody ? sanitizeHtmlContent(rawHtmlBody) : '';

  return { text: finalBody || '', html: safeHtml, attachments };
}

// Convert a Gmail API Message to our unified application Email object
export function transformGmailMessage(msg: GmailMessagePayload): Email {
  const headers = msg.payload?.headers || [];
  const getHeader = (name: string): string => {
    const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return found?.value || '';
  };

  const labelIds = msg.labelIds || [];
  const fromHeader = getHeader('From');
  const toHeader = getHeader('To');
  const ccHeader = getHeader('Cc');
  const bccHeader = getHeader('Bcc');
  const subjectHeader = getHeader('Subject');
  const dateHeader = getHeader('Date');

  const sender: EmailSender = parseSenderOrRecipient(fromHeader);
  const recipients: EmailRecipient[] = parseRecipientList(toHeader);
  const cc: EmailRecipient[] = parseRecipientList(ccHeader);
  const bcc: EmailRecipient[] = parseRecipientList(bccHeader);

  const { text: body, html: htmlBody, attachments } = extractBodyFromPayload(msg.payload);

  const isRead = !labelIds.includes('UNREAD');
  const isStarred = labelIds.includes('STARRED');
  const isTrash = labelIds.includes('TRASH');
  const isSent = labelIds.includes('SENT');
  const isInbox = labelIds.includes('INBOX');

  let folder: FolderId = 'inbox';
  if (isTrash) {
    folder = 'trash';
  } else if (isStarred && !isInbox) {
    folder = 'starred';
  } else if (isSent && !isInbox) {
    folder = 'sent';
  } else if (!isInbox && !isSent) {
    folder = 'archived';
  }

  let category: EmailCategory = 'primary';
  if (labelIds.includes('CATEGORY_PROMOTIONS')) {
    category = 'promotions';
  } else if (labelIds.includes('CATEGORY_UPDATES')) {
    category = 'updates';
  } else if (labelIds.includes('CATEGORY_SOCIAL')) {
    category = 'social';
  }

  let dateIso = new Date().toISOString();
  if (dateHeader) {
    try {
      const parsed = new Date(dateHeader);
      if (!isNaN(parsed.getTime())) {
        dateIso = parsed.toISOString();
      }
    } catch {
      // Fallback to internalDate if available
    }
  } else if (msg.internalDate) {
    dateIso = new Date(parseInt(msg.internalDate, 10)).toISOString();
  }

  // Determine priority
  let priority: PriorityLevel = 'normal';
  if (labelIds.includes('IMPORTANT') || subjectHeader.toLowerCase().includes('urgent')) {
    priority = 'high';
  }

  return {
    id: msg.id,
    threadId: msg.threadId || msg.id,
    sender,
    recipients: recipients.length > 0 ? recipients : [{ name: 'Me', email: 'me@workspace.internal' }],
    cc: cc.length > 0 ? cc : undefined,
    bcc: bcc.length > 0 ? bcc : undefined,
    subject: subjectHeader || '(No Subject)',
    snippet: msg.snippet || body.slice(0, 120),
    body: body || msg.snippet || '',
    htmlBody: htmlBody || undefined,
    date: dateIso,
    folder,
    isRead,
    isStarred,
    isArchived: !isInbox && !isTrash && !isSent,
    isTrash,
    labels: labelIds.filter(
      (l) => !['UNREAD', 'INBOX', 'TRASH', 'STARRED', 'SENT', 'IMPORTANT'].includes(l)
    ),
    category,
    priority,
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}

export interface GmailListResult {
  emails: Email[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export class GmailApiService {
  /**
   * 1. Get Emails list by folder and/or search query with pagination
   */
  public static async getMessages(
    sessionId: string,
    options: { folder?: FolderId; query?: string; maxResults?: number; pageToken?: string } = {}
  ): Promise<GmailListResult> {
    const accessToken = await getValidAccessToken(sessionId);
    const folder = options.folder || 'inbox';
    const userQuery = options.query?.trim() || '';

    // Construct Gmail query string
    const queryParts: string[] = [];
    if (folder === 'inbox') {
      queryParts.push('in:inbox');
    } else if (folder === 'starred') {
      queryParts.push('is:starred');
    } else if (folder === 'sent') {
      queryParts.push('in:sent');
    } else if (folder === 'archived') {
      queryParts.push('-in:inbox -in:trash -in:spam -in:sent');
    } else if (folder === 'trash') {
      queryParts.push('in:trash');
    }

    if (userQuery) {
      queryParts.push(userQuery);
    }

    const q = queryParts.join(' ');
    const maxResults = options.maxResults || 25;

    let listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
      q
    )}&maxResults=${maxResults}`;

    if (options.pageToken) {
      listUrl += `&pageToken=${encodeURIComponent(options.pageToken)}`;
    }

    const listResponse = await fetch(listUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!listResponse.ok) {
      const err = await listResponse.text();
      console.error('Gmail listMessages error:', listResponse.status, err);
      throw new Error(`Gmail API error (${listResponse.status}): ${listResponse.statusText}`);
    }

    const listData = await listResponse.json() as {
      messages?: Array<{ id: string; threadId: string }>;
      nextPageToken?: string;
      resultSizeEstimate?: number;
    };

    if (!listData.messages || listData.messages.length === 0) {
      return { emails: [], nextPageToken: undefined, resultSizeEstimate: 0 };
    }

    // Fetch details for each message in parallel (batch size up to 25 for fast response)
    const detailPromises = listData.messages.slice(0, 25).map(async (msgStub) => {
      try {
        const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgStub.id}?format=full`;
        const res = await fetch(msgUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!res.ok) return null;
        const msgPayload = await res.json() as GmailMessagePayload;
        return transformGmailMessage(msgPayload);
      } catch (err) {
        console.error(`Failed to fetch message details for ${msgStub.id}:`, err);
        return null;
      }
    });

    const emails = await Promise.all(detailPromises);
    const validEmails = emails.filter((e): e is Email => e !== null);

    return {
      emails: validEmails,
      nextPageToken: listData.nextPageToken,
      resultSizeEstimate: listData.resultSizeEstimate,
    };
  }

  /**
   * 2. Get an individual email by ID with full body and thread history
   */
  public static async getMessage(sessionId: string, messageId: string): Promise<Email> {
    const accessToken = await getValidAccessToken(sessionId);
    const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;

    const res = await fetch(msgUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch message ${messageId}: ${res.statusText}`);
    }

    const msgPayload = await res.json() as GmailMessagePayload;
    const email = transformGmailMessage(msgPayload);

    // If message belongs to a thread, fetch thread messages so user can view full thread
    if (email.threadId && email.threadId !== email.id) {
      try {
        const threadMessages = await GmailApiService.getThread(sessionId, email.threadId);
        email.threadMessages = threadMessages;
      } catch (err) {
        console.warn(`Could not load full thread for ${email.threadId}:`, err);
      }
    }

    return email;
  }

  /**
   * 3. Get thread messages by thread ID
   */
  public static async getThread(sessionId: string, threadId: string): Promise<Email[]> {
    const accessToken = await getValidAccessToken(sessionId);
    const threadUrl = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`;

    const res = await fetch(threadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch thread ${threadId}: ${res.statusText}`);
    }

    const threadPayload = await res.json() as GmailThreadPayload;
    if (!threadPayload.messages) return [];

    return threadPayload.messages.map(transformGmailMessage);
  }

  /**
   * Download attachment data
   */
  public static async getAttachment(
    sessionId: string,
    messageId: string,
    attachmentId: string
  ): Promise<{ data: string; size: number }> {
    const accessToken = await getValidAccessToken(sessionId);
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to download attachment ${attachmentId}`);
    }

    return (await res.json()) as { data: string; size: number };
  }

  /**
   * 4 & 5. Mark as read / unread
   */
  public static async setReadStatus(sessionId: string, messageId: string, isRead: boolean): Promise<void> {
    const accessToken = await getValidAccessToken(sessionId);
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;

    const body = isRead
      ? { removeLabelIds: ['UNREAD'] }
      : { addLabelIds: ['UNREAD'] };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Failed to update read status for ${messageId}`);
    }
  }

  /**
   * 6 & 7. Star / Unstar
   */
  public static async setStarredStatus(sessionId: string, messageId: string, isStarred: boolean): Promise<void> {
    const accessToken = await getValidAccessToken(sessionId);
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;

    const body = isStarred
      ? { addLabelIds: ['STARRED'] }
      : { removeLabelIds: ['STARRED'] };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Failed to update star status for ${messageId}`);
    }
  }

  /**
   * 8. Archive email (removes INBOX label)
   */
  public static async archiveMessage(sessionId: string, messageId: string): Promise<void> {
    const accessToken = await getValidAccessToken(sessionId);
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        removeLabelIds: ['INBOX'],
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to archive message ${messageId}`);
    }
  }

  /**
   * 9. Trash / Delete email
   */
  public static async trashMessage(sessionId: string, messageId: string): Promise<void> {
    const accessToken = await getValidAccessToken(sessionId);
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to trash message ${messageId}`);
    }
  }

  /**
   * 10. Send Email
   */
  public static async sendMessage(
    sessionId: string,
    params: {
      to: string;
      cc?: string;
      bcc?: string;
      subject: string;
      body: string;
      threadId?: string;
      inReplyTo?: string;
      references?: string;
    }
  ): Promise<{ id: string; threadId: string }> {
    const accessToken = await getValidAccessToken(sessionId);

    // Build standard RFC 2822 email message
    const utf8Subject = `=?utf-8?B?${Buffer.from(params.subject || '').toString('base64')}?=`;
    const messageParts: string[] = [
      `To: ${params.to}`,
      params.cc ? `Cc: ${params.cc}` : '',
      params.bcc ? `Bcc: ${params.bcc}` : '',
      `Subject: ${utf8Subject}`,
      params.inReplyTo ? `In-Reply-To: ${params.inReplyTo}` : '',
      params.inReplyTo ? `References: ${params.references || params.inReplyTo}` : '',
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      params.body || '',
    ].filter(Boolean);

    const messageString = messageParts.join('\r\n');
    const rawEncoded = Buffer.from(messageString)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const sendPayload: { raw: string; threadId?: string } = { raw: rawEncoded };
    if (params.threadId) {
      sendPayload.threadId = params.threadId;
    }

    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendPayload),
    });

    if (!sendResponse.ok) {
      const err = await sendResponse.text();
      console.error('Gmail send message error:', sendResponse.status, err);
      throw new Error(`Failed to send email via Gmail API: ${sendResponse.statusText}`);
    }

    return (await sendResponse.json()) as { id: string; threadId: string };
  }

  /**
   * 11. Get Unread and Label Counts
   */
  public static async getUnreadCounts(sessionId: string): Promise<Record<FolderId, number>> {
    const accessToken = await getValidAccessToken(sessionId);

    const getLabelCount = async (labelId: string): Promise<number> => {
      try {
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/labels/${labelId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!res.ok) return 0;
        const data = await res.json() as { messagesUnread?: number; threadsUnread?: number };
        return data.threadsUnread || data.messagesUnread || 0;
      } catch {
        return 0;
      }
    };

    const [inboxUnread, starredCount] = await Promise.all([
      getLabelCount('INBOX'),
      getLabelCount('STARRED'),
    ]);

    return {
      inbox: inboxUnread,
      starred: starredCount,
      sent: 0,
      archived: 0,
      trash: 0,
    };
  }

  /**
   * 12. Get User Gmail Profile
   */
  public static async getProfile(sessionId: string): Promise<{ emailAddress: string; messagesTotal: number; threadsTotal: number }> {
    const accessToken = await getValidAccessToken(sessionId);
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch Gmail profile');
    }

    return (await res.json()) as { emailAddress: string; messagesTotal: number; threadsTotal: number };
  }
}
