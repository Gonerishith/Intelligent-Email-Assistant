import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserProfile } from '../types/user';
import { authService, AuthConfigResponse } from '../services/authService';

export type AuthStatus = 'checking' | 'unauthenticated' | 'authenticating' | 'authenticated' | 'auth_failed';

interface AuthContextType {
  user: UserProfile | null;
  status: AuthStatus;
  isGmailConnected: boolean;
  isDemo: boolean;
  config: AuthConfigResponse | null;
  error: string | null;
  loginWithGoogle: () => Promise<void>;
  loginWithDemo: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [isGmailConnected, setIsGmailConnected] = useState<boolean>(false);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [config, setConfig] = useState<AuthConfigResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const [session, cfg] = await Promise.all([
        authService.getCurrentSession(),
        authService.checkConfig(),
      ]);

      setConfig(cfg);

      if (session.authenticated && session.user) {
        setUser(session.user);
        setIsGmailConnected(session.isGmailConnected);
        setIsDemo(session.isDemo);
        setStatus('authenticated');
      } else {
        setUser(null);
        setIsGmailConnected(false);
        setIsDemo(false);
        setStatus('unauthenticated');
      }
    } catch (err: any) {
      console.error('Failed to load auth session:', err);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const loginWithGoogle = async () => {
    setStatus('authenticating');
    setError(null);

    try {
      const loggedInUser = await authService.loginWithGoogle();
      setUser(loggedInUser);
      setIsGmailConnected(true);
      setIsDemo(false);
      setStatus('authenticated');
      await refreshSession();
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      setError(err.message || 'Google authentication was cancelled or failed.');
      setStatus('auth_failed');
      throw err;
    }
  };

  const loginWithDemo = async () => {
    setStatus('authenticating');
    setError(null);

    try {
      const demoUser = await authService.loginWithDemo();
      setUser(demoUser);
      setIsGmailConnected(false);
      setIsDemo(true);
      setStatus('authenticated');
    } catch (err: any) {
      setError('Failed to start demo session');
      setStatus('auth_failed');
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsGmailConnected(false);
      setIsDemo(false);
      setStatus('unauthenticated');
      setError(null);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        isGmailConnected,
        isDemo,
        config,
        error,
        loginWithGoogle,
        loginWithDemo,
        logout,
        clearError,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
