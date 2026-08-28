import crypto from 'crypto';

export interface UserSession {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: string;
    connectedAccountType: 'local_mock' | 'google_workspace' | 'none';
    isGmailConnected: boolean;
    quotaUsagePercent: number;
  };
  tokens?: {
    access_token: string;
    refresh_token?: string;
    expires_at: number; // Unix timestamp in ms
    token_type: string;
    scope: string;
  };
  isDemo: boolean;
  createdAt: number;
  lastActiveAt: number;
}

// In-memory session store (server-side only, sensitive tokens never exposed to client)
const sessions = new Map<string, UserSession>();

export class SessionStore {
  public static createSession(
    user: UserSession['user'],
    tokens?: UserSession['tokens'],
    isDemo = false,
    customSessionId?: string
  ): UserSession {
    const sessionId = customSessionId || crypto.randomBytes(32).toString('hex');
    const session: UserSession = {
      id: sessionId,
      user,
      tokens,
      isDemo,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    sessions.set(sessionId, session);
    return session;
  }

  public static getSession(sessionId: string | undefined): UserSession | null {
    if (!sessionId) return null;
    const session = sessions.get(sessionId);
    if (!session) return null;

    // Update last active timestamp
    session.lastActiveAt = Date.now();
    return session;
  }

  public static getOrCreateGuestSession(existingSessionId?: string): UserSession {
    if (existingSessionId) {
      const existing = sessions.get(existingSessionId);
      if (existing) {
        existing.lastActiveAt = Date.now();
        return existing;
      }
    }

    const guestUser = {
      id: 'demo-user-001',
      name: 'Alex Rivera',
      email: 'alex.rivera@enterprise-demo.io',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'Product Lead',
      connectedAccountType: 'local_mock' as const,
      isGmailConnected: false,
      quotaUsagePercent: 32,
    };

    const newSession = this.createSession(guestUser, undefined, true, existingSessionId);
    return newSession;
  }

  public static updateTokens(sessionId: string, tokens: NonNullable<UserSession['tokens']>): void {
    const session = sessions.get(sessionId);
    if (session) {
      session.tokens = { ...session.tokens, ...tokens };
      session.lastActiveAt = Date.now();
    }
  }

  public static deleteSession(sessionId: string | undefined): void {
    if (sessionId) {
      sessions.delete(sessionId);
    }
  }
}
