import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Info, 
  Lock, 
  Check, 
  Mail, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Key,
  Copy,
  PlusCircle,
  Settings as SettingsIcon,
  CheckCircle2,
  Save
} from 'lucide-react';
import { useRouter } from '../router/RouterContext';
import { useAuth } from '../context/AuthContext';
import { authService, GoogleCredentialsResponse } from '../services/authService';

interface LoginPageProps {
  redirectNotice?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ redirectNotice }) => {
  const { navigate } = useRouter();
  const { loginWithGoogle, loginWithDemo, error, clearError, config } = useAuth();
  
  const [isAuthenticatingGoogle, setIsAuthenticatingGoogle] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  const [showAddClientIdModal, setShowAddClientIdModal] = useState(false);

  // Custom Google Client ID setup state
  const [customClientId, setCustomClientId] = useState('');
  const [customClientSecret, setCustomClientSecret] = useState('');
  const [isSavingCreds, setIsSavingCreds] = useState(false);
  const [credsSuccessMsg, setCredsSuccessMsg] = useState<string | null>(null);
  const [credsErrorMsg, setCredsErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [googleCreds, setGoogleCreds] = useState<GoogleCredentialsResponse | null>(null);

  useEffect(() => {
    async function loadCreds() {
      try {
        const creds = await authService.getGoogleCredentials();
        setGoogleCreds(creds);
        if (creds.clientId) {
          setCustomClientId(creds.clientId);
        }
      } catch (err) {
        // ignore
      }
    }
    loadCreds();
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
      setTimeout(() => {
        setCredsSuccessMsg(null);
        setShowAddClientIdModal(false);
      }, 1800);
    } catch (err: any) {
      setCredsErrorMsg(err.message || 'Failed to save Google Client ID.');
    } finally {
      setIsSavingCreds(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    clearError();
    setIsAuthenticatingGoogle(true);

    try {
      await loginWithGoogle();
      navigate('/inbox');
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      setLocalError(err.message || 'Google sign in was cancelled or failed.');
    } finally {
      setIsAuthenticatingGoogle(false);
    }
  };

  const handleDemoSignIn = async () => {
    setLocalError(null);
    clearError();
    try {
      await loginWithDemo();
      navigate('/inbox');
    } catch (err: any) {
      setLocalError('Failed to initialize demo workspace.');
    }
  };

  const activeError = localError || error;
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const defaultRedirectUri = `${currentOrigin}/auth/callback`;

  return (
    <div id="login-page" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 mb-4">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Intelligent Email Assistant
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-400">
          Connect your Google Workspace or explore in sample mode
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-950 border border-slate-800 py-8 px-6 sm:px-10 shadow-xl rounded-2xl space-y-6">
          {/* Redirect notice if redirected from protected route */}
          {redirectNotice && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{redirectNotice}</span>
            </div>
          )}

          {/* Active Error Alert */}
          {activeError && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block text-rose-200">Authentication Error</span>
                <span className="text-[11px] leading-relaxed">{activeError}</span>
              </div>
            </div>
          )}

          {/* Primary Action: Real Google OAuth 2.0 Sign In */}
          <div className="space-y-3">
            <button
              id="google-oauth-login-button"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isAuthenticatingGoogle}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-100 active:bg-slate-200 disabled:opacity-75 text-slate-900 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md focus:outline-none cursor-pointer"
            >
              {isAuthenticatingGoogle ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Connecting to Google OAuth...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Sign in with Google Workspace</span>
                </>
              )}
            </button>

            {/* Google ID Options Bar */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Gmail API 2.0 Secure
              </span>
              <button
                type="button"
                onClick={() => setShowAddClientIdModal((prev) => !prev)}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium cursor-pointer"
              >
                <Key className="w-3 h-3" />
                <span>{showAddClientIdModal ? 'Close ID setup' : 'Add custom Google ID'}</span>
              </button>
            </div>

            {/* Custom Google Client ID / Google ID Setup Modal / Drawer */}
            {showAddClientIdModal && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-slate-300 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between font-semibold text-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Configure Google Cloud Client ID</span>
                  </div>
                  {googleCreds?.isConfigured && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> ID Set
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Enter your Google OAuth 2.0 Client ID from Google Cloud Console:
                </p>

                {credsSuccessMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[11px] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{credsSuccessMsg}</span>
                  </div>
                )}

                {credsErrorMsg && (
                  <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>{credsErrorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveGoogleCreds} className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Google Client ID
                    </label>
                    <input
                      id="modal-google-client-id"
                      type="text"
                      value={customClientId}
                      onChange={(e) => setCustomClientId(e.target.value)}
                      placeholder="e.g. xxxxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-[11px] font-mono text-slate-200 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Google Client Secret (Optional)
                    </label>
                    <input
                      id="modal-google-client-secret"
                      type="password"
                      value={customClientSecret}
                      onChange={(e) => setCustomClientSecret(e.target.value)}
                      placeholder={googleCreds?.hasSecret ? "•••••••••••••••••••• (Saved)" : "Enter client secret if required"}
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-[11px] font-mono text-slate-200 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleCopy(defaultRedirectUri, 'login_redirect')}
                      className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedKey === 'login_redirect' ? 'URI Copied!' : 'Copy Redirect URI'}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingCreds}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3 h-3" />
                      <span>{isSavingCreds ? 'Saving...' : 'Save ID'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full"></div>
            <span className="bg-slate-950 px-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
              Or Explore Preview
            </span>
          </div>

          {/* Secondary Action: Demo Mode */}
          <div className="space-y-3">
            <button
              id="demo-mode-button"
              type="button"
              onClick={handleDemoSignIn}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm focus:outline-none"
            >
              <span>Enter Workspace with Demo Data</span>
              <ArrowRight className="w-4 h-4 text-blue-400" />
            </button>
            <p className="text-center text-[11px] text-slate-500">
              Explore email triage, AI drafting, and categorization with pre-loaded mock threads.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
