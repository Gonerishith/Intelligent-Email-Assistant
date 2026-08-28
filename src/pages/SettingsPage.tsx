import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Key, 
  ShieldCheck, 
  Bell, 
  Check, 
  Database, 
  Save, 
  LogOut, 
  Lock, 
  Globe, 
  AlertCircle, 
  Server,
  Copy,
  ExternalLink,
  PlusCircle,
  RefreshCw,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { MOCK_USER_SETTINGS } from '../mock/user';
import { UserSettings } from '../types/user';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../router/RouterContext';
import { PreferencesService } from '../services/preferencesService';
import { authService, GoogleCredentialsResponse } from '../services/authService';

export const SettingsPage: React.FC = () => {
  const { user, isGmailConnected, isDemo, config, logout, loginWithGoogle } = useAuth();
  const { navigate } = useRouter();

  const [settings, setSettings] = useState<UserSettings>(MOCK_USER_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Google Client ID configuration state
  const [googleCreds, setGoogleCreds] = useState<GoogleCredentialsResponse | null>(null);
  const [customClientId, setCustomClientId] = useState('');
  const [customClientSecret, setCustomClientSecret] = useState('');
  const [isSavingCreds, setIsSavingCreds] = useState(false);
  const [credsSuccessMsg, setCredsSuccessMsg] = useState<string | null>(null);
  const [credsErrorMsg, setCredsErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserPrefs() {
      try {
        const loaded = await PreferencesService.getPreferences();
        setSettings(loaded);
      } catch (err) {
        console.warn('Using default settings fallback:', err);
      }
    }

    async function loadGoogleCredentials() {
      try {
        const creds = await authService.getGoogleCredentials();
        setGoogleCreds(creds);
        if (creds.clientId) {
          setCustomClientId(creds.clientId);
        }
      } catch (err) {
        console.warn('Could not load Google credentials:', err);
      }
    }

    loadUserPrefs();
    loadGoogleCredentials();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveGoogleCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customClientId.trim()) {
      setCredsErrorMsg('Please enter a valid Google Client ID.');
      return;
    }

    setIsSavingCreds(true);
    setCredsErrorMsg(null);
    setCredsSuccessMsg(null);

    try {
      const res = await authService.saveGoogleCredentials(customClientId, customClientSecret || undefined);
      setCredsSuccessMsg(res.message || 'Google Client ID saved successfully!');
      const updated = await authService.getGoogleCredentials();
      setGoogleCreds(updated);
      setTimeout(() => setCredsSuccessMsg(null), 3500);
    } catch (err: any) {
      setCredsErrorMsg(err.message || 'Failed to save Google Client ID.');
    } finally {
      setIsSavingCreds(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await PreferencesService.savePreferences(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectGoogle = async () => {
    setConnectError(null);
    setIsConnectingGoogle(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setConnectError(err.message || 'Failed to connect Google Workspace.');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnect = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const defaultRedirectUri = `${currentOrigin}/auth/callback`;

  return (
    <div id="settings-page" className="h-full overflow-y-auto bg-[#F8FAFC] p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Title */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Settings & Account Configuration
            </h1>
            <p className="text-xs text-slate-500">
              Manage Google ID & OAuth 2.0 connection, Google Cloud Client ID, Supabase database synchronization, and AI preferences
            </p>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Saved to Supabase database!</span>
            </div>
          )}
        </div>

        {/* Section 1: Google Account ID & Workspace Integration */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Google Account & Active Google ID
              </h2>
            </div>
            {isGmailConnected ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected to Gmail API
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                Demo Workspace Mode
              </span>
            )}
          </div>

          {connectError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{connectError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-4">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-xs"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
                  {initials}
                </div>
              )}
              <div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>{user?.name || 'Workspace User'}</span>
                  {user?.id && (
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                      ID: {user.id.slice(0, 12)}...
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {user?.email || 'user@workspace.internal'}
                </div>
                <div className="text-xs text-blue-600 font-medium mt-0.5">
                  {isGmailConnected ? 'Google Workspace Authenticated' : 'Local Workspace Simulation'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="add-google-id-button"
                onClick={handleConnectGoogle}
                disabled={isConnectingGoogle}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all focus:outline-none flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isConnectingGoogle ? 'Connecting...' : isGmailConnected ? 'Add / Switch Google ID' : 'Connect Google ID'}</span>
              </button>

              {isGmailConnected && (
                <button
                  onClick={handleDisconnect}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-semibold rounded-xl transition-all focus:outline-none flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>

          {/* OAuth Authorized Scopes */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Requested Google OAuth Scopes</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold block text-slate-800 font-mono">https://www.googleapis.com/auth/gmail.readonly</span>
                Read incoming emails and threads
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold block text-slate-800 font-mono">https://www.googleapis.com/auth/gmail.modify</span>
                Star, archive, and mark emails as read/unread
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold block text-slate-800 font-mono">https://www.googleapis.com/auth/gmail.send</span>
                Send composed and reply messages
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-semibold block text-slate-800 font-mono">https://www.googleapis.com/auth/userinfo.profile</span>
                Display user name and profile avatar
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Option to Add / Configure Google Client ID */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Google Cloud OAuth 2.0 Client ID Configuration
              </h2>
            </div>
            {googleCreds?.isConfigured ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Client ID Active
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                Setup Optional
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            You can enter your custom <strong>Google Cloud Client ID</strong> below if you have created OAuth credentials in your Google Cloud Console project.
          </p>

          {credsSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{credsSuccessMsg}</span>
            </div>
          )}

          {credsErrorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{credsErrorMsg}</span>
            </div>
          )}

          {/* Form to Add / Update Google Client ID */}
          <form onSubmit={handleSaveGoogleCreds} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Client ID (<span className="font-mono text-slate-500">GOOGLE_CLIENT_ID</span>)
                </label>
                <div className="relative">
                  <input
                    id="input-google-client-id"
                    type="text"
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value)}
                    placeholder="e.g. 284777312727-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Client Secret (<span className="font-mono text-slate-500">GOOGLE_CLIENT_SECRET</span>)
                </label>
                <input
                  id="input-google-client-secret"
                  type="password"
                  value={customClientSecret}
                  onChange={(e) => setCustomClientSecret(e.target.value)}
                  placeholder={googleCreds?.hasSecret ? "•••••••••••••••••••• (Configured)" : "Enter client secret if required"}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Changes take effect immediately for new sign-in attempts.
              </span>
              <button
                id="save-google-id-credentials-button"
                type="submit"
                disabled={isSavingCreds}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all focus:outline-none flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingCreds ? 'Saving...' : 'Save Google Client ID'}</span>
              </button>
            </div>
          </form>

          {/* Quick Copy URIs for Google Cloud Console */}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="text-xs font-bold text-slate-800">
              Required Values for Google Cloud Console OAuth Client:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Authorized Origins */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">1. Authorized JavaScript Origins</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(currentOrigin, 'origin')}
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                  >
                    {copiedKey === 'origin' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'origin' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200 text-[11px] font-mono text-slate-700 break-all select-all">
                  {currentOrigin}
                </div>
              </div>

              {/* Authorized Redirect URI */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">2. Authorized Redirect URI</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(defaultRedirectUri, 'redirect')}
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                  >
                    {copiedKey === 'redirect' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'redirect' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200 text-[11px] font-mono text-slate-700 break-all select-all">
                  {defaultRedirectUri}
                </div>
              </div>
            </div>
          </div>

          {/* Supabase Database Persistent Storage Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Supabase Database Persistent Storage</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Tables: users, connected_accounts, ai_activity, user_preferences
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tokens and user credentials are encrypted on the backend and mapped to Supabase. Database security policies (RLS) isolate each user's records.
            </p>
          </div>
        </div>

        {/* Section 3: AI Preferences Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                AI Assistant Engine Preferences (Gemini)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Summary Format */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Default Summary Format
                </label>
                <select
                  value={settings.aiSummaryStyle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      aiSummaryStyle: e.target.value as any,
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="bullet_points">Structured Bullet Points</option>
                  <option value="executive_summary">Executive Brief Paragraph</option>
                  <option value="one_liner">High-Impact One-Liner</option>
                </select>
              </div>

              {/* Default Response Tone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Default Draft Response Tone
                </label>
                <select
                  value={settings.defaultTone}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultTone: e.target.value as any,
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="professional">Professional & Crisp</option>
                  <option value="casual">Casual & Friendly</option>
                  <option value="urgent">Urgent & Direct</option>
                  <option value="empathetic">Empathetic & Warm</option>
                </select>
              </div>
            </div>

            {/* Toggle Features */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Auto-Generate Action Items
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Automatically extract deadlines, tasks, and questions from email content.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoGenerateActionItems}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      autoGenerateActionItems: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Smart Priority Triage
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Categorize incoming messages by High, Medium, and Low urgency using Gemini.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.smartTriageEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      smartTriageEnabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Bell className="w-3.5 h-3.5 text-slate-500" />
                <span>Notification Settings</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-700">
                    Email Digest Alerts
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Receive recurring updates for high priority threads.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.emailDigests}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        emailDigests: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-700">
                    High Priority Instant Alerts
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Show desktop notification toast for VIP and urgent emails.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.highPriorityAlerts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        highPriorityAlerts: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 flex justify-end">
              <button
                id="save-preferences-button"
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all focus:outline-none flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save AI Preferences'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
