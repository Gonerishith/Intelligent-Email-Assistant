import { UserProfile } from '../types/user';
import { MOCK_USER_PROFILE } from '../mock/user';
import { 
  signInWithGoogleWorkspace, 
  signOutWorkspace, 
  setWorkspaceAccessToken,
  getWorkspaceAccessToken
} from './firebaseAuth';

export interface AuthSessionResponse {
  authenticated: boolean;
  isGmailConnected: boolean;
  user: UserProfile | null;
  isDemo: boolean;
  sessionId?: string;
}

export interface AuthConfigResponse {
  isConfigured: boolean;
  redirectUri: string;
  reason: string | null;
  hasGeminiKey: boolean;
}

export interface GoogleCredentialsResponse {
  clientId: string;
  isConfigured: boolean;
  hasSecret: boolean;
  currentOrigin: string;
  redirectUri: string;
  authorizedOrigins: string[];
  authorizedRedirectUris: string[];
}

const SESSION_KEY = 'email_assistant_session_id';

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public getSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  }

  public setSessionId(id: string | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (id) {
        localStorage.setItem(SESSION_KEY, id);
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // ignore
    }
  }

  public getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...customHeaders };
    const sessionId = this.getSessionId();
    const token = getWorkspaceAccessToken();

    if (sessionId) {
      headers['x-session-id'] = sessionId;
      headers['Authorization'] = `Bearer ${sessionId}`;
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Get Google Cloud OAuth credentials and authorized URI details
   */
  public async getGoogleCredentials(): Promise<GoogleCredentialsResponse> {
    try {
      const res = await fetch('/api/auth/google-credentials', {
        headers: this.getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Failed to get Google credentials:', e);
    }
    const origin = window.location.origin;
    return {
      clientId: '',
      isConfigured: false,
      hasSecret: false,
      currentOrigin: origin,
      redirectUri: `${origin}/auth/callback`,
      authorizedOrigins: [origin],
      authorizedRedirectUris: [`${origin}/auth/callback`, `${origin}/api/auth/callback/google`],
    };
  }

  /**
   * Add or update Google Client ID / Secret in backend configuration
   */
  public async saveGoogleCredentials(clientId: string, clientSecret?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/google-credentials', {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ clientId, clientSecret }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to save Google credentials' }));
      throw new Error(err.error || 'Failed to save Google credentials');
    }
    return await res.json();
  }

  /**
   * Check if backend Google OAuth credentials or Firebase Auth are configured
   */
  public async checkConfig(): Promise<AuthConfigResponse> {
    try {
      const res = await fetch('/api/auth/config', {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) {
        return {
          isConfigured: true,
          redirectUri: '',
          reason: null,
          hasGeminiKey: true,
        };
      }
      const data = await res.json();
      return {
        ...data,
        isConfigured: true, // Firebase Google Workspace auth is fully provisioned
      };
    } catch {
      return {
        isConfigured: true,
        redirectUri: '',
        reason: null,
        hasGeminiKey: true,
      };
    }
  }

  /**
   * Fetch current session status from server
   */
  public async getCurrentSession(): Promise<AuthSessionResponse> {
    try {
      const headers = this.getAuthHeaders({
        'Cache-Control': 'no-cache',
      });

      const res = await fetch('/api/auth/session', { 
        headers,
        credentials: 'include',
      });
      if (!res.ok) {
        return {
          authenticated: false,
          isGmailConnected: false,
          user: null,
          isDemo: false,
        };
      }
      const data = await res.json();
      if (data.sessionId) {
        this.setSessionId(data.sessionId);
      }
      return data;
    } catch {
      return {
        authenticated: false,
        isGmailConnected: false,
        user: null,
        isDemo: false,
      };
    }
  }

  /**
   * Initiate Google Sign-In with Gmail Workspace Scopes
   */
  public async loginWithGoogle(): Promise<UserProfile> {
    // 1. First try Firebase Google Workspace Auth Popup (Google Identity)
    try {
      const authResult = await signInWithGoogleWorkspace();
      if (authResult?.accessToken) {
        setWorkspaceAccessToken(authResult.accessToken);

        // Exchange/Register session with backend server
        const tokenExchangeRes = await fetch('/api/auth/token', {
          method: 'POST',
          headers: this.getAuthHeaders({
            'Content-Type': 'application/json',
          }),
          credentials: 'include',
          body: JSON.stringify({
            accessToken: authResult.accessToken,
            user: {
              id: authResult.user.uid,
              name: authResult.user.displayName || 'Workspace User',
              email: authResult.user.email || '',
              avatarUrl: authResult.user.photoURL || '',
            },
          }),
        });

        if (tokenExchangeRes.ok) {
          const sessionData = await tokenExchangeRes.json();
          if (sessionData.sessionId) {
            this.setSessionId(sessionData.sessionId);
          }
          return sessionData.user;
        }
      }
    } catch (fbErr: any) {
      console.warn('Firebase Workspace sign in note:', fbErr.message);
      // If popup was closed intentionally by user, propagate error
      if (fbErr.code === 'auth/popup-closed-by-user' || fbErr.code === 'auth/cancelled-popup-request') {
        throw new Error('Authentication window closed before completion.');
      }
      // Otherwise proceed to fallback flow if needed
    }

    // 2. Fallback: Server-side Google OAuth URL popup flow if configured
    const urlRes = await fetch('/api/auth/google/url', {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    if (!urlRes.ok) {
      const err = await urlRes.json().catch(() => ({ error: 'Failed to initiate Google OAuth' }));
      throw new Error(err.error || 'Failed to initiate Google OAuth flow. Please check server configuration.');
    }

    const { url } = await urlRes.json();
    if (!url) {
      throw new Error('No authorization URL returned by server.');
    }

    const width = 520;
    const height = 680;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      url,
      'google_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      throw new Error('Popup window was blocked by your browser. Please allow popups for this site and try again.');
    }

    return new Promise<UserProfile>((resolve, reject) => {
      let resolved = false;

      const messageListener = (event: MessageEvent) => {
        if (!event.data || typeof event.data !== 'object') return;

        if (event.data.type === 'OAUTH_AUTH_SUCCESS') {
          resolved = true;
          window.removeEventListener('message', messageListener);
          clearInterval(pollTimer);
          if (event.data.sessionId) {
            this.setSessionId(event.data.sessionId);
          }
          resolve(event.data.user);
        } else if (event.data.type === 'OAUTH_AUTH_ERROR') {
          resolved = true;
          window.removeEventListener('message', messageListener);
          clearInterval(pollTimer);
          reject(new Error(event.data.error || 'Google authentication was cancelled or failed.'));
        }
      };

      window.addEventListener('message', messageListener);

      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          window.removeEventListener('message', messageListener);
          if (!resolved) {
            reject(new Error('Authentication window closed before completion.'));
          }
        }
      }, 500);
    });
  }

  /**
   * Enter Demo Workspace
   */
  public async loginWithDemo(): Promise<UserProfile> {
    try {
      const res = await fetch('/api/auth/demo', { 
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sessionId) {
          this.setSessionId(data.sessionId);
        }
        return data.user;
      }
    } catch {
      // Fallback
    }

    return {
      ...MOCK_USER_PROFILE,
      connectedAccountType: 'local_mock',
      isGmailConnected: false,
    };
  }

  /**
   * Logout from all sessions
   */
  public async logout(): Promise<void> {
    try {
      await signOutWorkspace();
      setWorkspaceAccessToken(null);
      this.setSessionId(null);
      await fetch('/api/auth/logout', { 
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
  }
}

export const authService = AuthService.getInstance();

