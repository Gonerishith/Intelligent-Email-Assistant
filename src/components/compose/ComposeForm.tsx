import React, { useState } from 'react';
import { 
  Send, 
  Trash2, 
  Sparkles, 
  Paperclip, 
  Bold, 
  Italic, 
  List, 
  Link2, 
  Check, 
  Wand2, 
  ArrowLeft,
  FileText
} from 'lucide-react';
import { useEmails } from '../../context/EmailContext';
import { useRouter } from '../../router/RouterContext';
import { aiService } from '../../services/aiService';

interface ComposeFormProps {
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
}

export const ComposeForm: React.FC<ComposeFormProps> = ({
  initialTo = '',
  initialSubject = '',
  initialBody = '',
}) => {
  const { sendEmail } = useEmails();
  const { navigate } = useRouter();

  const [to, setTo] = useState(initialTo);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);

  const [isSending, setIsSending] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedTone, setSelectedTone] = useState<'professional' | 'casual' | 'concise' | 'persuasive'>('professional');
  const [showAiAssist, setShowAiAssist] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim()) {
      setValidationError('Please specify at least one recipient in the "To" field.');
      return;
    }

    setValidationError('');
    setIsSending(true);

    try {
      await sendEmail({
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        subject: subject || '(No Subject)',
        body: body || '',
      });
      navigate('/inbox');
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateAiDraft = async () => {
    if (!aiPrompt.trim()) return;

    setIsAiGenerating(true);
    try {
      const generated = await aiService.generateDraft({
        userPrompt: aiPrompt,
        tone: selectedTone,
      });

      setBody((prev) => (prev ? `${prev}\n\n${generated}` : generated));
      setShowAiAssist(false);
      setAiPrompt('');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const applyTemplate = (templatePrompt: string, tone: 'professional' | 'casual' | 'concise' | 'persuasive') => {
    setAiPrompt(templatePrompt);
    setSelectedTone(tone);
  };

  return (
    <div id="compose-container" className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inbox')}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
            title="Back to inbox"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Compose Email
            </h1>
            <p className="text-xs text-slate-500">
              Draft messages with assistive AI prompt generation
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAiAssist((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-200 transition-all focus:outline-none"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{showAiAssist ? 'Hide AI Assistant' : 'AI Draft Assistant'}</span>
        </button>
      </div>

      {/* AI Assistant Drawer / Helper Card */}
      {showAiAssist && (
        <div
          id="compose-ai-assistant-card"
          className="mb-6 p-5 rounded-xl border border-slate-200 bg-white space-y-4 shadow-sm animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold uppercase tracking-wider">
                <Wand2 className="w-3.5 h-3.5 text-violet-600" />
                AI Draft Co-Pilot
              </span>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              Gemini Prompt Interface
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              What would you like this email to say?
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g., Ask Elena if we can reschedule our systems architecture review to Thursday morning..."
              rows={2}
              className="w-full p-3 bg-slate-50 text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-600">Tone:</span>
              {(['professional', 'concise', 'casual', 'persuasive'] as const).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setSelectedTone(tone)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-colors ${
                    selectedTone === tone
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleGenerateAiDraft}
              disabled={!aiPrompt.trim() || isAiGenerating}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-200 transition-all focus:outline-none"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAiGenerating ? 'Synthesizing...' : 'Generate & Insert'}</span>
            </button>
          </div>

          {/* Quick Starter Templates */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] text-slate-500 font-medium">Quick Starters:</span>
            <button
              type="button"
              onClick={() => applyTemplate('Schedule a 30-minute review for the upcoming sprint release.', 'professional')}
              className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-medium"
            >
              Sprint Review
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('Request status update on the security compliance audit checklist.', 'concise')}
              className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-medium"
            >
              Security Check
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('Thank the partner for their presentation and propose next steps.', 'persuasive')}
              className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-medium"
            >
              Partner Follow-up
            </button>
          </div>
        </div>
      )}

      {/* Main Email Form */}
      <form onSubmit={handleSend} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {validationError && (
          <div className="p-3 bg-rose-50 border-b border-rose-100 text-rose-700 text-xs font-medium">
            {validationError}
          </div>
        )}

        {/* Recipients (To) */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <label htmlFor="compose-to" className="w-16 text-xs font-semibold text-slate-500 shrink-0">
            To:
          </label>
          <input
            id="compose-to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@company.com"
            className="flex-1 text-sm text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
          />
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            {!showCc && (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                className="hover:text-slate-700 px-1.5 py-0.5"
              >
                Cc
              </button>
            )}
            {!showBcc && (
              <button
                type="button"
                onClick={() => setShowBcc(true)}
                className="hover:text-slate-700 px-1.5 py-0.5"
              >
                Bcc
              </button>
            )}
          </div>
        </div>

        {/* Optional CC */}
        {showCc && (
          <div className="flex items-center px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 animate-in fade-in">
            <label htmlFor="compose-cc" className="w-16 text-xs font-semibold text-slate-500 shrink-0">
              Cc:
            </label>
            <input
              id="compose-cc"
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="teammates@company.com"
              className="flex-1 text-sm text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
            />
          </div>
        )}

        {/* Optional BCC */}
        {showBcc && (
          <div className="flex items-center px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 animate-in fade-in">
            <label htmlFor="compose-bcc" className="w-16 text-xs font-semibold text-slate-500 shrink-0">
              Bcc:
            </label>
            <input
              id="compose-bcc"
              type="text"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="archive@internal.com"
              className="flex-1 text-sm text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
            />
          </div>
        )}

        {/* Subject */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <label htmlFor="compose-subject" className="w-16 text-xs font-semibold text-slate-500 shrink-0">
            Subject:
          </label>
          <input
            id="compose-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line..."
            className="flex-1 text-sm font-semibold text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
          />
        </div>

        {/* Rich Formatting Toolbar */}
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/60 flex items-center gap-1 text-slate-500 text-xs">
          <button type="button" className="p-1.5 hover:bg-slate-200 rounded" title="Bold">
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button type="button" className="p-1.5 hover:bg-slate-200 rounded" title="Italic">
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button type="button" className="p-1.5 hover:bg-slate-200 rounded" title="Bulleted List">
            <List className="w-3.5 h-3.5" />
          </button>
          <button type="button" className="p-1.5 hover:bg-slate-200 rounded" title="Insert Link">
            <Link2 className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-4 bg-slate-300 mx-1"></span>
          <button type="button" className="p-1.5 hover:bg-slate-200 rounded flex items-center gap-1 text-xs" title="Attach file">
            <Paperclip className="w-3.5 h-3.5" />
            <span className="text-[11px]">Attach File</span>
          </button>
        </div>

        {/* Message Body */}
        <div className="p-4">
          <textarea
            id="compose-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email here, or use the AI Draft Assistant above..."
            rows={12}
            className="w-full text-sm text-slate-900 leading-relaxed outline-none resize-y min-h-[220px] placeholder:text-slate-400"
          />
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              id="compose-send-button"
              type="submit"
              disabled={isSending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-200 transition-all focus:outline-none"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Sending Message...' : 'Send Email'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/inbox')}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Save as Draft
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/inbox')}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus:outline-none"
            title="Discard draft"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
