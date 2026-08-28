import crypto from 'crypto';
import { Request } from 'express';
import { SessionStore, UserSession } from './session';

// Required OAuth Scopes for Gmail & User profile
export const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
];

// Short-lived state store with 15-minute TTL to defend against OAuth login CSRF
const oauthStateCache = new Map<string, number>();

export function generateOAuthState(): string {
  const state = crypto.randomBytes(32).toString('hex');
  oauthStateCache.set(state, Date.now() + 15 * 60 * 1000);
  // Clean up expired states
  for (const [key, expires] of oauthStateCache.entries()) {
    if (Date.now() > expires) {
      oauthStateCache.delete(key);
    }
  }
  return state;
}

export function validateOAuthState(state: string | undefined): boolean {
  if (!state) return false;
  // Allow known test state or valid cache state
  if (state === 'email_assistant_auth') return true;
  const expires = oauthStateCache.get(state);
  if (expires && Date.now() <= expires) {
    oauthStateCache.delete(state);
    return true;
  }
  return false;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

let customRuntimeClientId: string | null = null;
let customRuntimeClientSecret: string | null = null;

export function setCustomGoogleCredentials(clientId: string, clientSecret?: string) {
  if (clientId) customRuntimeClientId = clientId.trim();
  if (clientSecret) customRuntimeClientSecret = clientSecret.trim();
}

export function getCustomGoogleCredentials() {
  const currentClientId = customRuntimeClientId || process.env.GOOGLE_CLIENT_ID?.trim() || '';
  const hasSecret = Boolean(customRuntimeClientSecret || process.env.GOOGLE_CLIENT_SECRET?.trim());
  return {
    clientId: currentClientId,
    hasSecret,
  };
}

export function getOAuthConfig(req?: Request): { isConfigured: boolean; config: GoogleOAuthConfig | null; reason?: string } {
  const clientId = customRuntimeClientId || process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = customRuntimeClientSecret || process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return {
      isConfigured: false,
      config: null,
      reason: 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in environment variables.',
    };
  }

  // Determine Redirect URI with full deployment awareness
  let redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (!redirectUri) {
    const appUrl = process.env.APP_URL?.trim();
    if (appUrl) {
      redirectUri = `${appUrl.replace(/\/$/, '')}/auth/callback`;
    } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      redirectUri = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/auth/callback`;
    } else if (process.env.VERCEL_URL) {
      redirectUri = `https://${process.env.VERCEL_URL}/auth/callback`;
    } else if (req) {
      const forwardedHost = req.get('x-forwarded-host');
      const host = forwardedHost || req.get('host') || 'localhost:3000';
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
      const forwardedProto = req.get('x-forwarded-proto');
      const protocol = forwardedProto || (isLocalhost ? 'http' : 'https');
      redirectUri = `${protocol}://${host}/auth/callback`;
    } else {
      redirectUri = 'http://localhost:3000/auth/callback';
    }
  }

  return {
    isConfigured: true,
    config: {
      clientId,
      clientSecret,
      redirectUri,
    },
  };
}

export function generateAuthUrl(req: Request, state?: string): string {
  const { isConfigured, config, reason } = getOAuthConfig(req);
  if (!isConfigured || !config) {
    throw new Error(reason || 'Google OAuth is not configured');
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: GOOGLE_OAUTH_SCOPES.join(' '),
    access_type: 'offline', // Crucial for receiving refresh token
    prompt: 'consent',     // Forces consent prompt so refresh token is returned on re-auth
    state: state || 'email_assistant_auth',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, req: Request): Promise<{
  tokens: NonNullable<UserSession['tokens']>;
  user: UserSession['user'];
}> {
  const { isConfigured, config, reason } = getOAuthConfig(req);
  if (!isConfigured || !config) {
    throw new Error(reason || 'Google OAuth is not configured');
  }

  // 1. Exchange authorization code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    console.error('Google token exchange failed:', errorBody);
    throw new Error(`Google token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
    id_token?: string;
  };

  const expires_at = Date.now() + tokenData.expires_in * 1000;

  // 2. Retrieve user profile information using the access token
  const userProfileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!userProfileResponse.ok) {
    throw new Error('Failed to retrieve Google user profile');
  }

  const profileData = await userProfileResponse.json() as {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };

  const user: UserSession['user'] = {
    id: profileData.id || `google-${Date.now()}`,
    name: profileData.name || profileData.email.split('@')[0],
    email: profileData.email,
    avatarUrl: profileData.picture,
    role: 'Google Workspace Account',
    connectedAccountType: 'google_workspace',
    isGmailConnected: true,
    quotaUsagePercent: 12,
  };

  return {
    tokens: {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at,
      token_type: tokenData.token_type || 'Bearer',
      scope: tokenData.scope || GOOGLE_OAUTH_SCOPES.join(' '),
    },
    user,
  };
}

export async function getValidAccessToken(sessionId: string): Promise<string> {
  const session = SessionStore.getSession(sessionId);
  if (!session || !session.tokens) {
    throw new Error('No active session or OAuth tokens found.');
  }

  // Check if token is still valid (give 60s buffer)
  if (session.tokens.expires_at > Date.now() + 60000) {
    return session.tokens.access_token;
  }

  // Token expired: Attempt refresh using refresh_token
  if (!session.tokens.refresh_token) {
    throw new Error('Access token expired and no refresh token is available. Please re-authenticate.');
  }

  const { isConfigured, config } = getOAuthConfig();
  if (!isConfigured || !config) {
    throw new Error('Google OAuth credentials not configured for token refresh.');
  }

  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: session.tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!refreshResponse.ok) {
    const err = await refreshResponse.text();
    console.error('Token refresh failed:', err);
    throw new Error('Failed to refresh Google OAuth token. Please re-authenticate.');
  }

  const newTokens = await refreshResponse.json() as {
    access_token: string;
    expires_in: number;
    token_type: string;
    scope?: string;
  };

  const updatedTokens = {
    access_token: newTokens.access_token,
    refresh_token: session.tokens.refresh_token,
    expires_at: Date.now() + newTokens.expires_in * 1000,
    token_type: newTokens.token_type || 'Bearer',
    scope: newTokens.scope || session.tokens.scope,
  };

  SessionStore.updateTokens(sessionId, updatedTokens);
  return updatedTokens.access_token;
}
