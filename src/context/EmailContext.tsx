import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Email, FolderId, ComposeDraft, EmailCategorizationResult, EmailAiInsightsState } from '../types/email';
import { emailService } from '../services/emailService';
import { aiService } from '../services/aiService';

interface EmailContextType {
  emails: Email[];
  currentFolder: FolderId;
  selectedEmailId: string | null;
  selectedEmail: Email | null;
  searchQuery: string;
  activeCategory: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  isDetailLoading: boolean;
  isBatchCategorizing: boolean;
  nextPageToken: string | null;
  emailSource: 'gmail_api' | 'local_demo';
  unreadCounts: Record<FolderId, number>;
  selectedEmailIds: Set<string>;
  apiError: string | null;
  
  // Actions
  setFolder: (folder: FolderId) => void;
  setActiveCategory: (category: string) => void;
  selectEmail: (id: string | null) => Promise<void>;
  setSearch: (query: string) => void;
  toggleStar: (id: string, e?: React.MouseEvent) => Promise<void>;
  toggleRead: (id: string, forceState?: boolean, e?: React.MouseEvent) => Promise<void>;
  archiveEmail: (id: string) => Promise<void>;
  trashEmail: (id: string) => Promise<void>;
  sendEmail: (draft: ComposeDraft) => Promise<Email>;
  sendReply: (emailId: string, replyText: string, customSubject?: string) => Promise<Email>;
  markAllAsRead: () => Promise<void>;
  toggleSelectId: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  refreshEmails: () => Promise<void>;
  loadMoreEmails: () => Promise<void>;
  clearApiError: () => void;
  categorizeEmail: (emailId: string) => Promise<EmailCategorizationResult>;
  batchCategorizeAll: () => Promise<void>;
  updateEmailAiInsights: (emailId: string, partial: Partial<EmailAiInsightsState>) => void;
  updateEmailCategory: (emailId: string, category: string, labels?: string[]) => void;
}

const EmailContext = createContext<EmailContextType | null>(null);

export function EmailProvider({ children }: { children: ReactNode }) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [currentFolder, setCurrentFolder] = useState<FolderId>('inbox');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [detailedEmailMap, setDetailedEmailMap] = useState<Record<string, Email>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [isBatchCategorizing, setIsBatchCategorizing] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [emailSource, setEmailSource] = useState<'gmail_api' | 'local_demo'>('local_demo');
  const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
  const [apiError, setApiError] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<FolderId, number>>({
    inbox: 0,
    starred: 0,
    sent: 0,
    archived: 0,
    trash: 0,
  });

  const fetchEmails = useCallback(async (isRefresh = false) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [res, counts, storedCategories] = await Promise.all([
        emailService.getEmails(currentFolder, searchQuery, { maxResults: 25 }),
        emailService.getFolderCounts(),
        aiService.getCategories().catch(() => []),
      ]);

      if (res.error) {
        setApiError(res.error);
      }

      // Map stored Supabase categories onto email list
      const categoryMap = new Map<string, any>();
      if (Array.isArray(storedCategories)) {
        for (const cat of storedCategories) {
          if (cat.email_id) {
            categoryMap.set(cat.email_id, cat);
          }
        }
      }

      const mergedEmails = (res.emails || []).map((e) => {
        const stored = categoryMap.get(e.id);
        if (stored) {
          const catLower = String(stored.category || '').toLowerCase();
          const existingLabels = new Set(e.labels || []);
          if (Array.isArray(stored.labels)) {
            stored.labels.forEach((l: string) => existingLabels.add(l));
          }
          return {
            ...e,
            category: catLower as any,
            aiCategory: stored.category,
            labels: Array.from(existingLabels),
          };
        }
        return e;
      });

      setEmails(mergedEmails);
      setEmailSource(res.source);
      setNextPageToken(res.nextPageToken || null);
      setUnreadCounts(counts);

      // Auto-select first email on desktop if none selected or if previous selection not found
      if (mergedEmails.length > 0) {
        setSelectedEmailId((prev) => {
          if (prev && mergedEmails.some((e) => e.id === prev)) return prev;
          return window.innerWidth >= 1024 ? mergedEmails[0].id : null;
        });
      } else {
        setSelectedEmailId(null);
      }
    } catch (err: any) {
      console.error('Error fetching emails in context:', err);
      setApiError(err.message || 'Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  }, [currentFolder, searchQuery]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const loadMoreEmails = async () => {
    if (!nextPageToken || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await emailService.getEmails(currentFolder, searchQuery, {
        pageToken: nextPageToken,
        maxResults: 25,
      });

      setEmails((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const newUnique = res.emails.filter((e) => !existingIds.has(e.id));
        return [...prev, ...newUnique];
      });

      setNextPageToken(res.nextPageToken || null);
    } catch (err: any) {
      console.error('Error loading more emails:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const setFolder = (folder: FolderId) => {
    setCurrentFolder(folder);
    setActiveCategory('all');
    setSelectedEmailIds(new Set());
    setSelectedEmailId(null);
  };

  const selectEmail = async (id: string | null) => {
    setSelectedEmailId(id);
    if (!id) return;

    // If we don't have the full detailed version with htmlBody or threadMessages yet, fetch it
    const existingDetail = detailedEmailMap[id];
    if (!existingDetail || !existingDetail.htmlBody) {
      setIsDetailLoading(true);
      try {
        const full = await emailService.getEmailById(id);
        if (full) {
          setDetailedEmailMap((prev) => ({ ...prev, [id]: full }));
        }
      } catch (err) {
        console.warn('Failed to load email details:', err);
      } finally {
        setIsDetailLoading(false);
      }
    }

    // Mark as read automatically when opened
    const target = emails.find((e) => e.id === id);
    if (target && !target.isRead) {
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, isRead: true } : e))
      );
      await emailService.setReadStatus(id, true);
      const counts = await emailService.getFolderCounts();
      setUnreadCounts(counts);
    }
  };

  const setSearch = (query: string) => {
    setSearchQuery(query);
  };

  const toggleStar = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = emails.find((item) => item.id === id);
    if (!target) return;

    const nextStarred = !target.isStarred;
    setEmails((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isStarred: nextStarred } : item))
    );

    await emailService.setStarredStatus(id, nextStarred);
    const counts = await emailService.getFolderCounts();
    setUnreadCounts(counts);
  };

  const toggleRead = async (id: string, forceState?: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = emails.find((item) => item.id === id);
    if (!target) return;

    const nextRead = forceState !== undefined ? forceState : !target.isRead;
    setEmails((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: nextRead } : item))
    );

    await emailService.setReadStatus(id, nextRead);
    const counts = await emailService.getFolderCounts();
    setUnreadCounts(counts);
  };

  const archiveEmail = async (id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id));
    if (selectedEmailId === id) {
      setSelectedEmailId(null);
    }
    await emailService.archiveEmail(id);
    const counts = await emailService.getFolderCounts();
    setUnreadCounts(counts);
  };

  const trashEmail = async (id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id));
    if (selectedEmailId === id) {
      setSelectedEmailId(null);
    }
    await emailService.trashEmail(id);
    const counts = await emailService.getFolderCounts();
    setUnreadCounts(counts);
  };

  const sendEmail = async (draft: ComposeDraft) => {
    const sent = await emailService.sendEmail({
      to: draft.to,
      cc: draft.cc,
      bcc: draft.bcc,
      subject: draft.subject,
      body: draft.body,
      threadId: draft.threadId,
      inReplyTo: draft.inReplyTo,
      references: draft.references,
    });
    await fetchEmails();
    return sent;
  };

  const sendReply = async (emailId: string, replyText: string, customSubject?: string) => {
    const targetEmail = emails.find((e) => e.id === emailId) || (detailedEmailMap[emailId]);
    const recipientEmail = targetEmail?.sender?.email || '';
    const originalSubject = targetEmail?.subject || '';
    const replySubject = customSubject || (originalSubject.toLowerCase().startsWith('re:') ? originalSubject : `Re: ${originalSubject}`);

    const sent = await emailService.sendEmail({
      to: recipientEmail,
      subject: replySubject,
      body: replyText,
      threadId: targetEmail?.threadId || emailId,
      inReplyTo: emailId,
      references: emailId,
    });
    await fetchEmails();
    return sent;
  };

  const markAllAsRead = async () => {
    setEmails((prev) => prev.map((e) => ({ ...e, isRead: true })));
    for (const email of emails) {
      if (!email.isRead) {
        await emailService.setReadStatus(email.id, true);
      }
    }
    const counts = await emailService.getFolderCounts();
    setUnreadCounts(counts);
  };

  const toggleSelectId = (id: string) => {
    setSelectedEmailIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedEmailIds.size === emails.length) {
      setSelectedEmailIds(new Set());
    } else {
      setSelectedEmailIds(new Set(emails.map((e) => e.id)));
    }
  };

  const clearSelection = () => {
    setSelectedEmailIds(new Set());
  };

  const refreshEmails = async () => {
    await fetchEmails(true);
  };

  const clearApiError = () => {
    setApiError(null);
  };

  // Categorize single email with Gemini & store in Supabase
  const categorizeEmail = async (emailId: string): Promise<EmailCategorizationResult> => {
    const target = emails.find((e) => e.id === emailId) || detailedEmailMap[emailId];
    if (!target) {
      throw new Error('Email not found.');
    }

    const result = await aiService.categorizeEmail({
      emailId: target.id,
      subject: target.subject || '',
      sender: target.sender,
      date: target.date,
      body: target.body || target.snippet || '',
    });

    const catLower = result.category.toLowerCase();
    const updatedLabels = Array.from(new Set([...(target.labels || []), ...result.labels]));

    // Update in state
    setEmails((prev) =>
      prev.map((e) =>
        e.id === emailId
          ? {
              ...e,
              category: catLower as any,
              aiCategory: result.category,
              labels: updatedLabels,
              aiInsights: {
                ...e.aiInsights,
                categoryResult: result,
              },
            }
          : e
      )
    );

    if (detailedEmailMap[emailId]) {
      setDetailedEmailMap((prev) => ({
        ...prev,
        [emailId]: {
          ...prev[emailId],
          category: catLower as any,
          aiCategory: result.category,
          labels: updatedLabels,
          aiInsights: {
            ...prev[emailId]?.aiInsights,
            categoryResult: result,
          },
        },
      }));
    }

    return result;
  };

  // Batch Categorize emails with Gemini
  const batchCategorizeAll = async () => {
    if (emails.length === 0 || isBatchCategorizing) return;
    setIsBatchCategorizing(true);
    try {
      const payload = emails.slice(0, 10).map((e) => ({
        id: e.id,
        subject: e.subject,
        body: e.body || e.snippet,
        sender: e.sender,
        date: e.date,
      }));

      const res = await aiService.batchCategorize(payload);
      if (res && Array.isArray(res.results)) {
        setEmails((prev) =>
          prev.map((e) => {
            const found = res.results.find((r: any) => r.emailId === e.id);
            if (found && found.success) {
              const catLower = String(found.category || '').toLowerCase();
              const mergedLabels = Array.from(new Set([...(e.labels || []), ...(found.labels || [])]));
              return {
                ...e,
                category: catLower as any,
                aiCategory: found.category,
                labels: mergedLabels,
                aiInsights: {
                  ...e.aiInsights,
                  categoryResult: {
                    category: found.category,
                    confidence: found.confidence,
                    reason: found.reason,
                    labels: found.labels,
                  },
                },
              };
            }
            return e;
          })
        );
      }
    } catch (err: any) {
      console.error('Batch categorization failed:', err);
    } finally {
      setIsBatchCategorizing(false);
    }
  };

  const updateEmailAiInsights = (emailId: string, partial: Partial<EmailAiInsightsState>) => {
    setEmails((prev) =>
      prev.map((e) =>
        e.id === emailId
          ? {
              ...e,
              priority: partial.priorityResult ? (partial.priorityResult.priority as any) : e.priority,
              aiInsights: {
                ...e.aiInsights,
                ...partial,
              },
            }
          : e
      )
    );

    if (detailedEmailMap[emailId]) {
      setDetailedEmailMap((prev) => ({
        ...prev,
        [emailId]: {
          ...prev[emailId],
          priority: partial.priorityResult ? (partial.priorityResult.priority as any) : prev[emailId].priority,
          aiInsights: {
            ...prev[emailId]?.aiInsights,
            ...partial,
          },
        },
      }));
    }
  };

  const updateEmailCategory = (emailId: string, category: string, labels?: string[]) => {
    const catLower = category.toLowerCase();
    setEmails((prev) =>
      prev.map((e) =>
        e.id === emailId
          ? {
              ...e,
              category: catLower as any,
              aiCategory: category,
              labels: labels ? Array.from(new Set([...e.labels, ...labels])) : e.labels,
            }
          : e
      )
    );
  };

  // Combine listed email with full details map if available
  const baseSelected = emails.find((e) => e.id === selectedEmailId) || null;
  const selectedEmail = selectedEmailId && detailedEmailMap[selectedEmailId]
    ? { ...baseSelected, ...detailedEmailMap[selectedEmailId] }
    : baseSelected;

  return (
    <EmailContext.Provider
      value={{
        emails,
        currentFolder,
        selectedEmailId,
        selectedEmail,
        searchQuery,
        activeCategory,
        isLoading,
        isLoadingMore,
        isDetailLoading,
        isBatchCategorizing,
        nextPageToken,
        emailSource,
        unreadCounts,
        selectedEmailIds,
        apiError,
        setFolder,
        setActiveCategory,
        selectEmail,
        setSearch,
        toggleStar,
        toggleRead,
        archiveEmail,
        trashEmail,
        sendEmail,
        sendReply,
        markAllAsRead,
        toggleSelectId,
        selectAll,
        clearSelection,
        refreshEmails,
        loadMoreEmails,
        clearApiError,
        categorizeEmail,
        batchCategorizeAll,
        updateEmailAiInsights,
        updateEmailCategory,
      }}
    >
      {children}
    </EmailContext.Provider>
  );
}

export function useEmails() {
  const context = useContext(EmailContext);
  if (!context) {
    throw new Error('useEmails must be used within an EmailProvider');
  }
  return context;
}

