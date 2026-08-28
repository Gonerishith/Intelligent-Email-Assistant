import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  CheckSquare,
  Calendar,
  Tag,
  AlertCircle,
  Clock,
  Check,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import {
  Email,
  PriorityDetectionResult,
  ActionItemsResult,
  ImportantDatesResult,
  EmailCategorizationResult
} from '../../types/email';
import { aiService } from '../../services/aiService';
import { useEmails } from '../../context/EmailContext';
import { cn } from '../../utils/cn';

interface EmailAiInsightsPanelProps {
  email: Email;
}

export const EmailAiInsightsPanel: React.FC<EmailAiInsightsPanelProps> = ({ email }) => {
  const { updateEmailAiInsights, updateEmailCategory } = useEmails();

  // State for individual insight operations
  const [priorityResult, setPriorityResult] = useState<PriorityDetectionResult | null>(
    email.aiInsights?.priorityResult || null
  );
  const [actionItemsResult, setActionItemsResult] = useState<ActionItemsResult | null>(
    email.aiInsights?.actionItemsResult || null
  );
  const [datesResult, setDatesResult] = useState<ImportantDatesResult | null>(
    email.aiInsights?.datesResult || null
  );
  const [categoryResult, setCategoryResult] = useState<EmailCategorizationResult | null>(
    email.aiInsights?.categoryResult || null
  );

  // Loading states
  const [loadingPriority, setLoadingPriority] = useState(false);
  const [loadingActions, setLoadingActions] = useState(false);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

  // Errors
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Interactive checked tasks
  const [checkedTasks, setCheckedTasks] = useState<Record<number, boolean>>({});
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Reset when email changes
  React.useEffect(() => {
    setPriorityResult(email.aiInsights?.priorityResult || null);
    setActionItemsResult(email.aiInsights?.actionItemsResult || null);
    setDatesResult(email.aiInsights?.datesResult || null);
    setCategoryResult(email.aiInsights?.categoryResult || null);
    setErrorMsg(null);
    setCheckedTasks({});
  }, [email.id]);

  const handleDetectPriority = async () => {
    if (loadingPriority) return;
    setLoadingPriority(true);
    setErrorMsg(null);
    try {
      const res = await aiService.detectPriority({
        emailId: email.id,
        subject: email.subject,
        sender: email.sender,
        date: email.date,
        body: email.body || email.snippet || '',
      });
      setPriorityResult(res);
      updateEmailAiInsights(email.id, { priorityResult: res });
    } catch (err: any) {
      console.error('Priority detection error:', err);
      setErrorMsg(err.message || 'Failed to detect priority.');
    } finally {
      setLoadingPriority(false);
    }
  };

  const handleExtractActionItems = async () => {
    if (loadingActions) return;
    setLoadingActions(true);
    setErrorMsg(null);
    try {
      const res = await aiService.extractActionItems({
        emailId: email.id,
        subject: email.subject,
        sender: email.sender,
        date: email.date,
        body: email.body || email.snippet || '',
      });
      setActionItemsResult(res);
      updateEmailAiInsights(email.id, { actionItemsResult: res });
    } catch (err: any) {
      console.error('Action items extraction error:', err);
      setErrorMsg(err.message || 'Failed to extract action items.');
    } finally {
      setLoadingActions(false);
    }
  };

  const handleExtractDates = async () => {
    if (loadingDates) return;
    setLoadingDates(true);
    setErrorMsg(null);
    try {
      const res = await aiService.extractImportantDates({
        emailId: email.id,
        subject: email.subject,
        sender: email.sender,
        date: email.date,
        body: email.body || email.snippet || '',
      });
      setDatesResult(res);
      updateEmailAiInsights(email.id, { datesResult: res });
    } catch (err: any) {
      console.error('Dates extraction error:', err);
      setErrorMsg(err.message || 'Failed to extract dates.');
    } finally {
      setLoadingDates(false);
    }
  };

  const handleCategorize = async () => {
    if (loadingCategory) return;
    setLoadingCategory(true);
    setErrorMsg(null);
    try {
      const res = await aiService.categorizeEmail({
        emailId: email.id,
        subject: email.subject,
        sender: email.sender,
        date: email.date,
        body: email.body || email.snippet || '',
      });
      setCategoryResult(res);
      updateEmailAiInsights(email.id, { categoryResult: res });
      updateEmailCategory(email.id, res.category, res.labels);
    } catch (err: any) {
      console.error('Categorization error:', err);
      setErrorMsg(err.message || 'Failed to categorize email.');
    } finally {
      setLoadingCategory(false);
    }
  };

  const handleRunAllInsights = async () => {
    if (loadingAll) return;
    setLoadingAll(true);
    setErrorMsg(null);
    try {
      const [pRes, aRes, dRes, cRes] = await Promise.allSettled([
        aiService.detectPriority({
          emailId: email.id,
          subject: email.subject,
          sender: email.sender,
          date: email.date,
          body: email.body || email.snippet || '',
        }),
        aiService.extractActionItems({
          emailId: email.id,
          subject: email.subject,
          sender: email.sender,
          date: email.date,
          body: email.body || email.snippet || '',
        }),
        aiService.extractImportantDates({
          emailId: email.id,
          subject: email.subject,
          sender: email.sender,
          date: email.date,
          body: email.body || email.snippet || '',
        }),
        aiService.categorizeEmail({
          emailId: email.id,
          subject: email.subject,
          sender: email.sender,
          date: email.date,
          body: email.body || email.snippet || '',
        }),
      ]);

      const updates: any = {};

      if (pRes.status === 'fulfilled') {
        setPriorityResult(pRes.value);
        updates.priorityResult = pRes.value;
      }
      if (aRes.status === 'fulfilled') {
        setActionItemsResult(aRes.value);
        updates.actionItemsResult = aRes.value;
      }
      if (dRes.status === 'fulfilled') {
        setDatesResult(dRes.value);
        updates.datesResult = dRes.value;
      }
      if (cRes.status === 'fulfilled') {
        setCategoryResult(cRes.value);
        updates.categoryResult = cRes.value;
        updateEmailCategory(email.id, cRes.value.category, cRes.value.labels);
      }

      updateEmailAiInsights(email.id, updates);
    } catch (err: any) {
      console.error('Run all insights error:', err);
      setErrorMsg(err.message || 'Failed to complete full AI analysis.');
    } finally {
      setLoadingAll(false);
    }
  };

  const copyToClipboard = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const hasAnyInsight = priorityResult || actionItemsResult || datesResult || categoryResult;

  return (
    <div id="ai-insights-panel" className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 p-4 sm:p-5 space-y-4 shadow-xs">
      {/* Panel Header & Trigger Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">Intelligent AI Insights</h3>
            <p className="text-[11px] text-slate-500">Gemini-powered priority, task extraction, date detection, and custom categorization</p>
          </div>
        </div>

        {/* Master Trigger */}
        <button
          onClick={handleRunAllInsights}
          disabled={loadingAll || loadingPriority || loadingActions || loadingDates || loadingCategory}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all",
            loadingAll
              ? "bg-indigo-100 text-indigo-700 animate-pulse cursor-wait"
              : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white"
          )}
        >
          <Sparkles className={cn("w-3.5 h-3.5", loadingAll && "animate-spin")} />
          <span>{loadingAll ? 'Analyzing Everything...' : '✨ Run All AI Insights'}</span>
        </button>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Detect Priority Button */}
        <button
          id="btn-detect-priority"
          onClick={handleDetectPriority}
          disabled={loadingPriority || loadingAll}
          className={cn(
            "px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors shadow-2xs",
            priorityResult
              ? "bg-rose-50/70 border-rose-200 text-rose-800 hover:bg-rose-100"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          )}
        >
          <Zap className={cn("w-3.5 h-3.5 text-rose-600", loadingPriority && "animate-spin")} />
          <span>{loadingPriority ? 'Detecting Priority...' : '⚡ Detect Priority'}</span>
        </button>

        {/* Extract Action Items Button */}
        <button
          id="btn-extract-action-items"
          onClick={handleExtractActionItems}
          disabled={loadingActions || loadingAll}
          className={cn(
            "px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors shadow-2xs",
            actionItemsResult
              ? "bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          )}
        >
          <CheckSquare className={cn("w-3.5 h-3.5 text-emerald-600", loadingActions && "animate-spin")} />
          <span>{loadingActions ? 'Extracting Tasks...' : '✓ Extract Action Items'}</span>
        </button>

        {/* Extract Important Dates Button */}
        <button
          id="btn-extract-dates"
          onClick={handleExtractDates}
          disabled={loadingDates || loadingAll}
          className={cn(
            "px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors shadow-2xs",
            datesResult
              ? "bg-amber-50/70 border-amber-200 text-amber-800 hover:bg-amber-100"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          )}
        >
          <Calendar className={cn("w-3.5 h-3.5 text-amber-600", loadingDates && "animate-spin")} />
          <span>{loadingDates ? 'Finding Dates...' : '📅 Extract Dates'}</span>
        </button>

        {/* Categorize Button */}
        <button
          id="btn-categorize-email"
          onClick={handleCategorize}
          disabled={loadingCategory || loadingAll}
          className={cn(
            "px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors shadow-2xs",
            categoryResult
              ? "bg-purple-50/70 border-purple-200 text-purple-800 hover:bg-purple-100"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          )}
        >
          <Tag className={cn("w-3.5 h-3.5 text-purple-600", loadingCategory && "animate-spin")} />
          <span>{loadingCategory ? 'Categorizing...' : '🏷️ Categorize'}</span>
        </button>
      </div>

      {/* Error display */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Results Grid / Cards */}
      {hasAnyInsight && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {/* 1. Priority Detection Card */}
          {priorityResult && (
            <div id="ai-priority-card" className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Priority Classification</span>
                </div>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    priorityResult.priority === 'high'
                      ? "bg-rose-100 text-rose-700 border border-rose-200"
                      : priorityResult.priority === 'medium'
                      ? "bg-amber-100 text-amber-700 border border-amber-200"
                      : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  )}
                >
                  {priorityResult.priority} Priority
                </span>
              </div>
              <div className="text-xs text-slate-700 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                <p className="font-medium text-slate-800">
                  <span className="font-semibold text-slate-900">Reason: </span>
                  {priorityResult.reason}
                </p>
              </div>
            </div>
          )}

          {/* 2. Categorization Card (Stored in Supabase) */}
          {categoryResult && (
            <div id="ai-category-card" className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Category &amp; Labels</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                    {categoryResult.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {Math.round(categoryResult.confidence * 100)}% conf
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-700 bg-purple-50/30 p-2 rounded-lg border border-purple-100/50 space-y-1.5">
                <p className="font-medium text-slate-800">{categoryResult.reason}</p>
                {categoryResult.labels && categoryResult.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {categoryResult.labels.map((lbl) => (
                      <span key={lbl} className="px-1.5 py-0.5 rounded bg-white text-purple-700 border border-purple-200 text-[10px] font-medium">
                        #{lbl}
                      </span>
                    ))}
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-medium ml-1">
                      <ShieldCheck className="w-3 h-3" /> Saved to Supabase
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Action Items Extraction Card */}
          {actionItemsResult && (
            <div id="ai-action-items-card" className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-2 shadow-2xs md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Action Items ({actionItemsResult.actionItems.length})
                  </span>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      actionItemsResult.actionItems.map((a) => `- ${a.task}${a.deadline ? ` (Due: ${a.deadline})` : ''}`).join('\n'),
                      'actionItems'
                    )
                  }
                  className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
                  title="Copy action items list"
                >
                  {copiedSection === 'actionItems' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span className="text-[11px]">Copy Tasks</span>
                </button>
              </div>

              {actionItemsResult.actionItems.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg text-center">
                  No direct action items or tasks detected in this email.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {actionItemsResult.actionItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => setCheckedTasks((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                      className={cn(
                        "flex items-start justify-between gap-2.5 p-2 rounded-lg text-xs cursor-pointer transition-all border select-none",
                        checkedTasks[idx]
                          ? "bg-slate-50 border-slate-200 text-slate-400 line-through"
                          : "bg-white border-slate-200 text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/20"
                      )}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={!!checkedTasks[idx]}
                          onChange={() => {}}
                          className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                        />
                        <span className="font-medium break-words">{item.task}</span>
                      </div>
                      {item.deadline && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-semibold shrink-0">
                          Due: {item.deadline}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Important Dates Card */}
          {datesResult && (
            <div id="ai-dates-card" className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-2 shadow-2xs md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Important Dates &amp; Events ({datesResult.importantDates.length})
                  </span>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      datesResult.importantDates.map((d) => `${d.date}: ${d.description}`).join('\n'),
                      'dates'
                    )
                  }
                  className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1"
                  title="Copy dates list"
                >
                  {copiedSection === 'dates' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span className="text-[11px]">Copy Dates</span>
                </button>
              </div>

              {datesResult.importantDates.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg text-center">
                  No upcoming deadlines or dates found in this email.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {datesResult.importantDates.map((d, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-200/80 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs"
                    >
                      <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block">{d.date}</span>
                        <span className="text-slate-600 text-[11px] leading-snug">{d.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
