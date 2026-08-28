import React from 'react';
import { ActivityTimeline } from '../components/activity/ActivityTimeline';
import { 
  Sparkles, 
  Mail, 
  Bot, 
  Zap, 
  ShieldCheck, 
  Layers 
} from 'lucide-react';
import { INITIAL_MOCK_EMAILS } from '../mock/emails';
import { INITIAL_MOCK_ACTIVITIES } from '../mock/activity';

export const ActivityPage: React.FC = () => {
  const totalSummaries = INITIAL_MOCK_ACTIVITIES.filter(
    (a) => a.action === 'summarized' || a.action === 'draft_generated'
  ).length;

  return (
    <div id="activity-page" className="h-full overflow-y-auto bg-zinc-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
              Email & AI Activity Log
            </h1>
            <p className="text-xs text-zinc-500">
              Audit trail of background email ingestion, AI summarization, and draft assistance
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Operations Audit Live</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Emails Ingested</span>
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-zinc-900">
              {INITIAL_MOCK_EMAILS.length}
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">
              Demo sample threads
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">AI Insights Created</span>
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-zinc-900">
              {totalSummaries}
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">
              Summaries & Smart drafts
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Avg. AI Latency</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-zinc-900">
              ~85ms
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">
              Token pipeline benchmark
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Security Validation</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">
              100%
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">
              Zero-leakage isolated tier
            </span>
          </div>
        </div>

        {/* Activity Timeline List Component */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-xs">
          <ActivityTimeline />
        </div>
      </div>
    </div>
  );
};
