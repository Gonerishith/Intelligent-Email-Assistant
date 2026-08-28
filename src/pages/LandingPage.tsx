import React from 'react';
import { 
  Sparkles, 
  Mail, 
  Bot, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  Code2, 
  Cpu, 
  Inbox,
  PenSquare
} from 'lucide-react';
import { useRouter } from '../router/RouterContext';
import { Link } from '../router/Link';

export const LandingPage: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div id="landing-page" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">
              Intelligent Email Assistant
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/activity"
              className="hidden sm:inline-block text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Activity Logs
            </Link>
            <Link
              to="/settings"
              className="hidden sm:inline-block text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Settings
            </Link>
            <button
              onClick={() => navigate('/login')}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/inbox')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Launch Inbox
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center flex-1 flex flex-col items-center justify-center">
        {/* Foundation Mode Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/70 border border-blue-800/60 text-blue-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Stage 1: Production Application Foundation & UI Architecture</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight max-w-4xl leading-tight">
          Next-Generation Email Client with{' '}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">
            AI-First Architecture
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Experience a lightning-fast, distraction-free inbox built for high-throughput professionals. Designed with modular service abstractions ready for seamless Gmail OAuth and Gemini AI integration.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => navigate('/inbox')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all"
          >
            <Inbox className="w-4 h-4" />
            <span>Open Email Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/compose')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl transition-all"
          >
            <PenSquare className="w-4 h-4" />
            <span>Test Compose Editor</span>
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              Context-Aware Summarization
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Synthesize lengthy email threads into structured executive briefs and action items in milliseconds with purpose-built UI components.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              Smart Draft Generation
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Compose responses in customizable tones (Professional, Concise, Casual, Persuasive) with integrated prompt starters and editing tools.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">
              OAuth & API Ready Architecture
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strictly decoupled service layers separating UI logic from data sources. Easily plug in Google Cloud OAuth 2.0 and Gemini endpoints.
            </p>
          </div>
        </div>

        {/* Technical Architecture Overview */}
        <div className="mt-16 w-full p-6 sm:p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-left">
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">
              Foundation Architecture & Decoupled Layers
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-blue-400 font-semibold block mb-1">1. Frontend UI Tier</span>
              <p className="text-slate-400">React 19 + Tailwind CSS + Lucide Icons with responsive master-detail layout.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-indigo-400 font-semibold block mb-1">2. Service Abstraction</span>
              <p className="text-slate-400">Clean interfaces in <code>/src/services/</code> ready to swap mock data for live Gmail API calls.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-emerald-400 font-semibold block mb-1">3. AI Intelligence Bridge</span>
              <p className="text-slate-400">Standardized summary & prompt contracts in <code>aiService.ts</code> ready for Gemini Flash SDK.</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-amber-400 font-semibold block mb-1">4. Secure Secrets Schema</span>
              <p className="text-slate-400">Environment variables declared in <code>.env.example</code> for secure OAuth & database keys.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 px-4 text-center text-xs text-slate-500">
        Intelligent Email Assistant — Production-Ready Client Foundation
      </footer>
    </div>
  );
};
