/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RouterProvider, useRouter } from './router/RouterContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EmailProvider } from './context/EmailContext';
import { AppLayout } from './components/layout/AppLayout';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { InboxPage } from './pages/InboxPage';
import { ComposePage } from './pages/ComposePage';
import { SettingsPage } from './pages/SettingsPage';
import { ActivityPage } from './pages/ActivityPage';
import { Sparkles, Loader2 } from 'lucide-react';

function AppContent() {
  const { currentPath, navigate } = useRouter();
  const { status, user } = useAuth();

  // Public pages
  if (currentPath === '/') {
    return <LandingPage />;
  }

  if (currentPath === '/login') {
    return <LoginPage />;
  }

  // Loading state during auth check
  if (status === 'checking') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">Intelligent Email Assistant</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span>Verifying session and OAuth security...</span>
        </div>
      </div>
    );
  }

  // Protected Routes Check
  if (status === 'unauthenticated' || (!user && status !== 'authenticating')) {
    return <LoginPage redirectNotice="Please sign in with Google or enter demo mode to access your workspace." />;
  }

  // Protected workspace routes
  switch (currentPath) {
    case '/compose':
      return (
        <AppLayout>
          <ComposePage />
        </AppLayout>
      );

    case '/settings':
      return (
        <AppLayout>
          <SettingsPage />
        </AppLayout>
      );

    case '/activity':
      return (
        <AppLayout>
          <ActivityPage />
        </AppLayout>
      );

    case '/inbox':
    default:
      return (
        <AppLayout>
          <InboxPage />
        </AppLayout>
      );
  }
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <EmailProvider>
          <AppContent />
        </EmailProvider>
      </RouterProvider>
    </AuthProvider>
  );
}
