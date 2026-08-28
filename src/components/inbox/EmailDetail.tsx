import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Archive, 
  Trash2, 
  Star, 
  Mail, 
  CornerUpLeft, 
  Paperclip, 
  Sparkles, 
  CheckCircle2, 
  Download,
  Send,
  Wand2,
  Copy,
  Check,
  RefreshCw,
  Calendar,
  AlertCircle,
  ListFilter,
  CheckSquare,
  Clock,
  ChevronDown,
  ChevronUp,
  Sliders,
  MessageSquare,
  AlertTriangle,
  X
} from 'lucide-react';
import { Email, EmailSummary, ReplyTone } from '../../types/email';
import { formatFullDateTime } from '../../utils/date';
import { useEmails } from '../../context/EmailContext';
import { useRouter } from '../../router/RouterContext';
import { aiService } from '../../services/aiService';
import { sanitizeEmailHtml } from '../../utils/sanitizeHtml';
import { EmailAiInsightsPanel } from './EmailAiInsightsPanel';
import { cn } from '../../utils/cn';

interface EmailDetailProps {
  email: Email;
  onBackMobile?: () => void;
}

const TONE_OPTIONS: Array<{ id: ReplyTone; label: string; description: string }> = [
  { id: 'professional', label: 'Professional', description: 'Polished, clear, and business-appropriate' },
  { id: 'friendly', label: 'Friendly', description: 'Warm, personable, and approachable' },
  { id: 'formal', label: 'Formal', description: 'Traditional etiquette and structured presentation' },
  { id: 'concise', label: 'Concise', description: 'Direct, brief, and straight to the point' },
];

export const EmailDetail: React.FC<EmailDetailProps> = ({ email, onBackMobile }) => {
  const { toggleStar, toggleRead, archiveEmail, trashEmail, sendEmail } = useEmails();
  const { navigate } = useRouter();
  
  // Reply Composer State
  const [replyText, setReplyText] = useState('');
  const [selectedTone, setSelectedTone] = useState<ReplyTone>('professional');
  const [customInstructions, setCustomInstructions] = useState('');
  const [showCustomInstructions, setShowCustomInstructions] = useState(false);
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingToneChange, setPendingToneChange] = useState<ReplyTone | null>(null);
  
  // Sending State
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySentSuccess, setReplySentSuccess] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});

  // AI Summarization State
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryData, setSummaryData] = useState<EmailSummary | null>(() => {
    if (email.aiSummaryData) return email.aiSummaryData;
    if (email.aiSummary) {
      return {
        summary: email.aiSummary,
        keyPoints: [],
        actionItems: email.aiActionItems || [],
        importantDates: [],
        priority: (email.priority as 'high' | 'medium' | 'low') || 'medium',
      };
    }
    return null;
  });
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Sync state when active email changes
  useEffect(() => {
    if (email.aiSummaryData) {
      setSummaryData(email.aiSummaryData);
    } else if (email.aiSummary) {
      setSummaryData({
        summary: email.aiSummary,
        keyPoints: [],
        actionItems: email.aiActionItems || [],
        importantDates: [],
        priority: (email.priority as 'high' | 'medium' | 'low') || 'medium',
      });
    } else {
      setSummaryData(null);
    }
    setSummaryError(null);
    setReplyError(null);
    setReplyText('');
    setIsDraftDirty(false);
    setShowOverwriteConfirm(false);
    setCompletedActions({});
  }, [email.id]);

  const handleGenerateSummary = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    setSummaryError(null);

    try {
      const result = await aiService.summarizeEmail({
        emailId: email.id,
        subject: email.subject,
        sender: email.sender,
        date: email.date,
        body: email.body || email.snippet || '',
      });

      setSummaryData(result);
    } catch (err: any) {
      console.error('Failed to summarize email:', err);
      setSummaryError(err.message || 'Failed to generate AI summary. Please check your Gemini API key configuration.');
    } finally {
      setIsSummarizing(false);
    }
  };

  /**
   * Core AI Reply Generation Logic
   */
  const executeGenerateReply = async (toneToUse = selectedTone) => {
    if (isGeneratingReply) return;
    setIsGeneratingReply(true);
    setReplyError(null);
    setShowOverwriteConfirm(false);
    setPendingToneChange(null);

    try {
      const threadMsgs = email.threadMessages?.map((m) => ({
        sender: m.sender,
        date: m.date,
        body: m.body || m.snippet || '',
      }));

      const res = await aiService.generateReply({
        emailId: email.id,
        subject: email.subject,
        sender: email.sender,
        date: email.date,
        body: email.body || email.snippet || '',
        threadMessages: threadMsgs,
        tone: toneToUse,
        userInstructions: customInstructions.trim() || undefined,
      });

      setReplyText(res.reply);
      setSelectedTone(res.tone || toneToUse);
      setIsDraftDirty(false);
    } catch (err: any) {
      console.error('Failed to generate AI reply:', err);
      setReplyError(err.message || 'Failed to generate AI reply draft. Please check your Gemini API key.');
    } finally {
      setIsGeneratingReply(false);
    }
  };

  /**
   * Handle user clicking Generate AI Reply or changing tone
   */
  const handleGenerateReplyClick = (newTone?: ReplyTone) => {
    const targetTone = newTone || selectedTone;
    if (newTone) {
      setSelectedTone(newTone);
    }

    // If user has customized the draft, prompt for confirmation before overwriting
    if (replyText.trim() && isDraftDirty) {
      setPendingToneChange(targetTone);
      setShowOverwriteConfirm(true);
      return;
    }

    executeGenerateReply(targetTone);
  };

  const handleConfirmOverwrite = () => {
    const toneToUse = pendingToneChange || selectedTone;
    executeGenerateReply(toneToUse);
  };

  const handleCancelOverwrite = () => {
    setShowOverwriteConfirm(false);
    setPendingToneChange(null);
  };

  /**
   * Handle sending the reply via Gmail API
   */
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || isSendingReply) return;

    setIsSendingReply(true);
    setReplyError(null);

    try {
      const replySubject = email.subject.toLowerCase().startsWith('re:')
        ? email.subject
        : `Re: ${email.subject}`;

      await sendEmail({
        to: email.sender.email,
        subject: replySubject,
        body: replyText,
        threadId: email.threadId || email.id,
        inReplyTo: email.id,
        references: email.id,
      });

      setReplyText('');
      setIsDraftDirty(false);
      setReplySentSuccess(true);
      setTimeout(() => setReplySentSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to send reply:', err);
      setReplyError(err.message || 'Failed to send reply via Gmail. Please try again.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleCopyReplyDraft = () => {
    if (!replyText) return;
    navigator.clipboard.writeText(replyText);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const handleCopyAiSummary = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  const toggleActionItem = (index: number) => {
    setCompletedActions((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div id="email-detail-pane" className="h-full flex flex-col bg-white overflow-hidden">
      {/* Top Action Toolbar */}
      <div className="h-14 border-b border-slate-100 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile Back Button */}
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors focus:outline-none"
              title="Back to email list"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => archiveEmail(email.id)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none"
            title="Archive email"
          >
            <Archive className="w-4 h-4" />
          </button>

          <button
            onClick={() => trashEmail(email.id)}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus:outline-none"
            title="Move to trash"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => toggleRead(email.id, false, e)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none"
            title="Mark as unread"
          >
            <Mail className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => toggleStar(email.id, e)}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none"
            title={email.isStarred ? 'Unstar' : 'Star'}
          >
            <Star
              className={cn(
                'w-4 h-4',
                email.isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
              )}
            />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick AI Reply Button in Toolbar */}
          <button
            id="btn-ai-reply-toolbar"
            onClick={() => handleGenerateReplyClick()}
            disabled={isGeneratingReply}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-xs",
              isGeneratingReply
                ? "bg-purple-100 text-purple-700 cursor-wait animate-pulse"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:from-purple-800 active:to-indigo-800 text-white"
            )}
            title="Generate AI Reply with Gemini"
          >
            <Sparkles className={cn("w-3.5 h-3.5", isGeneratingReply && "animate-spin")} />
            <span>{isGeneratingReply ? 'Drafting Reply...' : '✨ AI Reply'}</span>
          </button>

          {/* AI Summary Action Button in Toolbar */}
          <button
            id="btn-ai-summary-toolbar"
            onClick={handleGenerateSummary}
            disabled={isSummarizing}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-xs",
              isSummarizing
                ? "bg-blue-100 text-blue-700 cursor-wait animate-pulse"
                : summaryData
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white"
            )}
            title={summaryData ? "Regenerate AI Summary" : "Generate AI Summary with Gemini"}
          >
            {isSummarizing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Summarizing...</span>
              </>
            ) : summaryData ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Summary</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Summary</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Email Reading Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Email Header */}
        <div className="space-y-3 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight break-words">
              {email.subject || '(No Subject)'}
            </h1>
            <span className="text-xs text-slate-400 shrink-0 font-medium pt-1">
              {formatFullDateTime(email.date)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 uppercase shadow-xs">
                {email.sender.name.charAt(0) || email.sender.email.charAt(0) || '?'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {email.sender.name}
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:inline truncate">
                    &lt;{email.sender.email}&gt;
                  </span>
                </div>
                <div className="text-xs text-slate-500 truncate">
                  To: {email.recipients.map((r) => r.name || r.email).join(', ')}
                </div>
              </div>
            </div>

            {/* Email Labels */}
            {email.labels && email.labels.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5">
                {email.labels.map((label) => (
                  <span
                    key={label}
                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Intelligent AI Insights Panel */}
        <EmailAiInsightsPanel email={email} />

        {/* AI Summary Section */}
        {isSummarizing && (
          <div id="ai-summary-loading-box" className="p-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 space-y-3 animate-pulse">
            <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs tracking-wide uppercase">
              <Sparkles className="w-4 h-4 animate-spin text-blue-600" />
              <span>Analyzing email with Gemini AI...</span>
            </div>
            <div className="space-y-2">
              <div className="h-3.5 bg-blue-200/60 rounded w-full"></div>
              <div className="h-3.5 bg-blue-200/60 rounded w-4/5"></div>
              <div className="h-3.5 bg-blue-200/60 rounded w-3/5"></div>
            </div>
          </div>
        )}

        {summaryError && (
          <div id="ai-summary-error-box" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>AI Summary Failed</span>
              </div>
              <button
                onClick={handleGenerateSummary}
                className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
              >
                Retry
              </button>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">{summaryError}</p>
          </div>
        )}

        {summaryData && !isSummarizing && (
          <div id="ai-summary-card" className="p-4 sm:p-5 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/40 via-indigo-50/20 to-white shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight">Gemini AI Executive Summary</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    summaryData.priority === 'high'
                      ? "bg-rose-100 text-rose-700 border border-rose-200"
                      : summaryData.priority === 'medium'
                      ? "bg-amber-100 text-amber-700 border border-amber-200"
                      : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  )}
                >
                  {summaryData.priority} Priority
                </span>

                <button
                  onClick={() => handleCopyAiSummary(summaryData.summary)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                  title="Copy summary text"
                >
                  {copiedDraft ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans font-medium">
              {summaryData.summary}
            </p>

            {summaryData.keyPoints && summaryData.keyPoints.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ListFilter className="w-3 h-3 text-blue-600" />
                  <span>Key Points</span>
                </div>
                <ul className="space-y-1 pl-1">
                  {summaryData.keyPoints.map((point, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summaryData.actionItems && summaryData.actionItems.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-blue-100/60">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-3 h-3 text-indigo-600" />
                  <span>Action Items ({summaryData.actionItems.length})</span>
                </div>
                <div className="space-y-1.5">
                  {summaryData.actionItems.map((action, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleActionItem(idx)}
                      className={cn(
                        "flex items-start gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-all select-none border",
                        completedActions[idx]
                          ? "bg-slate-50 border-slate-200 text-slate-400 line-through"
                          : "bg-white/80 border-blue-100 text-slate-800 hover:bg-white hover:border-blue-200"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={!!completedActions[idx]}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summaryData.importantDates && summaryData.importantDates.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-blue-100/60">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-amber-600" />
                  <span>Dates &amp; Deadlines</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {summaryData.importantDates.map((date, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-1"
                    >
                      <Clock className="w-3 h-3 text-amber-600" />
                      {date}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Email Message Content Body (Safely Sanitized Against Script Execution) */}
        {email.htmlBody ? (
          <div className="border-b border-slate-100 pb-6 space-y-3">
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 overflow-x-auto text-sm text-slate-800 leading-relaxed font-sans max-h-[600px] overflow-y-auto">
              <div 
                className="email-html-content prose prose-sm max-w-none break-words"
                dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(email.htmlBody) }}
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans border-b border-slate-100 pb-6">
            {email.body}
          </div>
        )}

        {/* Conversation Thread History */}
        {email.threadMessages && email.threadMessages.length > 1 && (
          <div className="space-y-4 pt-2 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <span>Conversation Thread ({email.threadMessages.length} messages)</span>
            </div>
            <div className="space-y-3">
              {email.threadMessages
                .filter((m) => m.id !== email.id)
                .map((msg) => (
                  <div key={msg.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{msg.sender.name} &lt;{msg.sender.email}&gt;</span>
                      <span className="text-slate-400">{formatFullDateTime(msg.date)}</span>
                    </div>
                    {msg.htmlBody ? (
                      <div 
                        className="email-thread-html text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(msg.htmlBody) }}
                      />
                    ) : (
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Email Attachments List */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="space-y-2 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
              <span>Attachments ({email.attachments.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {email.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {att.name.split('.').pop()?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {att.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{att.size}</div>
                    </div>
                  </div>
                  <button
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Download attachment"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ✨ AI-POWERED EMAIL REPLY GENERATION & COMPOSER SECTION */}
        {/* ------------------------------------------------------------- */}
        <div id="ai-reply-section" className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 space-y-4 shadow-xs">
          {/* Header with Title and Tone Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Reply to {email.sender.name || email.sender.email}</h3>
                <span className="text-[11px] text-slate-500">Draft manually or generate instantly with Gemini 3.7 Flash</span>
              </div>
            </div>

            {/* Tone Selector Pills */}
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1 hidden sm:inline">Tone:</span>
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => handleGenerateReplyClick(tone.id)}
                  disabled={isGeneratingReply}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium transition-all select-none border",
                    selectedTone === tone.id
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:border-purple-200 hover:text-purple-700"
                  )}
                  title={tone.description}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>

          {/* Overwrite Confirmation Alert if Draft was edited */}
          {showOverwriteConfirm && (
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>You have modified this draft</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Regenerating with the AI will replace your current edits. Do you want to proceed and generate a new {pendingToneChange || selectedTone} reply?
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleConfirmOverwrite}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Yes, Replace Draft
                </button>
                <button
                  onClick={handleCancelOverwrite}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  Keep My Edits
                </button>
              </div>
            </div>
          )}

          {/* AI Reply Loading State */}
          {isGeneratingReply && (
            <div id="ai-reply-loading" className="p-4 rounded-xl border border-purple-200 bg-purple-50/70 space-y-2.5 animate-pulse">
              <div className="flex items-center gap-2 text-purple-700 font-bold text-xs uppercase tracking-wide">
                <Sparkles className="w-4 h-4 animate-spin text-purple-600" />
                <span>Drafting {selectedTone} reply with Gemini AI...</span>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-purple-200/60 rounded w-full"></div>
                <div className="h-3 bg-purple-200/60 rounded w-5/6"></div>
                <div className="h-3 bg-purple-200/60 rounded w-2/3"></div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {replyError && (
            <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 space-y-1.5">
              <div className="flex items-center justify-between font-bold text-xs">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  AI Generation / Send Error
                </span>
                <button
                  onClick={() => setReplyError(null)}
                  className="text-rose-500 hover:text-rose-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">{replyError}</p>
            </div>
          )}

          {/* Success Banner */}
          {replySentSuccess && (
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Reply sent successfully via Gmail API!</span>
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">Thread updated</span>
            </div>
          )}

          {/* Custom Guidance / Special Instructions Accordion */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setShowCustomInstructions(!showCustomInstructions)}
              className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors select-none"
            >
              <Sliders className="w-3 h-3" />
              <span>{showCustomInstructions ? 'Hide custom guidance' : '+ Add custom instructions for AI reply'}</span>
              {showCustomInstructions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showCustomInstructions && (
              <div className="space-y-1 pt-1 animate-in fade-in">
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g., Mention I am available on Thursday after 2 PM, politely decline the offer..."
                  className="w-full px-3 py-2 bg-white text-slate-800 text-xs rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all placeholder:text-slate-400"
                />
                <span className="text-[10px] text-slate-400">
                  Optional: Provide specific guidance or facts for Gemini to include in the reply.
                </span>
              </div>
            )}
          </div>

          {/* The Editable Reply Form */}
          <form onSubmit={handleSendReply} className="space-y-3">
            <div className="relative">
              <textarea
                id="email-reply-textarea"
                value={replyText}
                onChange={(e) => {
                  setReplyText(e.target.value);
                  setIsDraftDirty(true);
                }}
                placeholder={`Type your reply or click "✨ Generate AI Reply" above to have Gemini draft a response...`}
                rows={5}
                className="w-full p-3.5 bg-white text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-y placeholder:text-slate-400 leading-relaxed font-sans"
              />

              {replyText && (
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopyReplyDraft}
                    className="p-1.5 bg-slate-100/90 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors backdrop-blur-xs flex items-center gap-1 shadow-xs"
                    title="Copy draft to clipboard"
                  >
                    {copiedDraft ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                {/* ✨ Generate AI Reply Button (Primary generator) */}
                <button
                  id="btn-generate-ai-reply"
                  type="button"
                  onClick={() => handleGenerateReplyClick()}
                  disabled={isGeneratingReply}
                  className={cn(
                    "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs",
                    isGeneratingReply
                      ? "bg-purple-100 text-purple-700 cursor-wait animate-pulse"
                      : replyText
                      ? "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 active:bg-purple-200"
                      : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-200"
                  )}
                >
                  <Sparkles className={cn("w-3.5 h-3.5", isGeneratingReply && "animate-spin")} />
                  <span>
                    {isGeneratingReply
                      ? 'Generating...'
                      : replyText
                      ? '✨ Regenerate AI Reply'
                      : '✨ Generate AI Reply'}
                  </span>
                </button>

                {replyText && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyText('');
                      setIsDraftDirty(false);
                    }}
                    className="px-2.5 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl text-xs font-medium transition-colors"
                  >
                    Discard
                  </button>
                )}
              </div>

              {/* Send Button */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  id="btn-send-email-reply"
                  type="submit"
                  disabled={!replyText.trim() || isSendingReply}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-200 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <Send className={cn("w-3.5 h-3.5", isSendingReply && "animate-pulse")} />
                  <span>{isSendingReply ? 'Sending via Gmail...' : 'Send Reply'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailDetail;
