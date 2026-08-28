import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { SessionStore, UserSession } from './server/session';
import { 
  generateAuthUrl, 
  exchangeCodeForTokens, 
  getOAuthConfig, 
  GOOGLE_OAUTH_SCOPES,
  setCustomGoogleCredentials,
  getCustomGoogleCredentials,
  generateOAuthState,
  validateOAuthState
} from './server/googleAuth';
import { GmailApiService } from './server/gmailService';
import { DatabaseService } from './server/db/database';
import { GeminiService } from './server/geminiService';
import { getSupabaseStatus } from './server/db/supabaseClient';
import { MOCK_USER_PROFILE } from './src/mock/user';

const PORT = 3000;
const SESSION_COOKIE_NAME = 'email_assistant_session';

async function startServer() {
  const app = express();

  // Standard middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Helper to extract session ID from cookie, headers, or queries
  const getSessionId = (req: Request): string | undefined => {
    if (req.cookies?.[SESSION_COOKIE_NAME]) {
      return req.cookies[SESSION_COOKIE_NAME];
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    const customHeader = req.headers['x-session-id'];
    if (typeof customHeader === 'string' && customHeader.trim()) {
      return customHeader.trim();
    }
    if (typeof req.query.sessionId === 'string' && req.query.sessionId.trim()) {
      return req.query.sessionId.trim();
    }
    return undefined;
  };

  // Helper to get active session
  const getSession = (req: Request): UserSession | null => {
    const sessionId = getSessionId(req);
    return SessionStore.getSession(sessionId);
  };

  // Helper to get or automatically create an active session (for guest/demo users or cross-origin iframe resilience)
  const getOrCreateSession = (req: Request, res?: Response): UserSession => {
    const sessionId = getSessionId(req);
    let session = SessionStore.getSession(sessionId);
    if (!session) {
      session = SessionStore.getOrCreateGuestSession(sessionId);
      if (res && !res.headersSent) {
        res.cookie(SESSION_COOKIE_NAME, session.id, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 7 * 24 * 3600 * 1000,
        });
      }
    }
    return session;
  };

  // -------------------------------------------------------------
  // API Routes: Health, DB Status & Config
  // -------------------------------------------------------------
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Intelligent Email Assistant',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/db/status', (req, res) => {
    const status = getSupabaseStatus();
    res.json({
      ...status,
      tables: ['users', 'connected_accounts', 'ai_activity', 'user_preferences'],
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/auth/config', (req, res) => {
    const { isConfigured, config, reason } = getOAuthConfig(req);
    const dbStatus = getSupabaseStatus();
    res.json({
      isConfigured,
      redirectUri: config?.redirectUri || '',
      reason: reason || null,
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      database: dbStatus,
    });
  });

  // -------------------------------------------------------------
  // Google OAuth Endpoints
  // -------------------------------------------------------------
  app.get('/api/auth/google/url', (req, res) => {
    try {
      const state = generateOAuthState();
      // Set secure HTTP-only state cookie as secondary CSRF barrier
      res.cookie('oauth_state', state, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
      const authUrl = generateAuthUrl(req, state);
      res.json({ url: authUrl });
    } catch (err: any) {
      console.error('Error generating auth URL:', err.message);
      res.status(400).json({
        error: err.message || 'Failed to generate Google OAuth URL. Please check environment variables.',
      });
    }
  });

  // OAuth Callback Route (handles /auth/callback and /api/auth/callback/google)
  const handleOAuthCallback = async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const error = req.query.error as string;
    const state = req.query.state as string;

    // Clear state cookie on callback
    res.clearCookie('oauth_state', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    if (error) {
      console.error('OAuth authorization error from Google:', error);
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Authentication Cancelled</title></head>
          <body style="font-family: sans-serif; padding: 24px; text-align: center; background: #0f172a; color: #f8fafc;">
            <h2 style="color: #ef4444;">Authentication Error</h2>
            <p>${error === 'access_denied' ? 'Authorization was declined or cancelled.' : error}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${error}' }, window.location.origin);
                setTimeout(() => window.close(), 1500);
              } else {
                setTimeout(() => window.location.href = '/login', 2000);
              }
            </script>
          </body>
        </html>
      `);
    }

    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    // Validate anti-CSRF OAuth state parameter
    if (state && !validateOAuthState(state)) {
      console.warn('OAuth State validation mismatch or expired token state');
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Security Error</title></head>
          <body style="font-family: sans-serif; padding: 24px; text-align: center; background: #0f172a; color: #f8fafc;">
            <h2 style="color: #ef4444;">OAuth State Verification Failed</h2>
            <p>The authentication session expired or invalid state was received. Please try again.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: 'Invalid OAuth state. Please retry.' }, window.location.origin);
                setTimeout(() => window.close(), 2000);
              } else {
                setTimeout(() => window.location.href = '/login', 2000);
              }
            </script>
          </body>
        </html>
      `);
    }

    try {
      const { tokens, user } = await exchangeCodeForTokens(code, req);
      const session = SessionStore.createSession(user, tokens, false);

      // 1. Create or update user in Supabase persistent database
      try {
        await DatabaseService.upsertUser({
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
        });

        // 2. Associate connected Gmail account with tokens securely on server
        await DatabaseService.upsertConnectedAccount({
          userId: user.id,
          provider: 'google',
          email: user.email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenType: tokens.token_type,
          scope: tokens.scope,
          tokenExpiresAt: tokens.expires_at ? new Date(tokens.expires_at) : undefined,
        });

        // 3. Ensure user preferences are initialized
        await DatabaseService.getUserPreferences(user.id);

        // 4. Log initial connection in ai_activity audit table
        await DatabaseService.logAiActivity({
          userId: user.id,
          actionType: 'email_received',
          title: 'Google Workspace Account Connected',
          description: `Successfully linked ${user.email} with Gmail API 2.0 and Supabase persistent storage.`,
        });
      } catch (dbErr: any) {
        console.warn('Database user sync non-blocking warning:', dbErr.message);
      }

      // Set cookie configured for cross-origin iframe context
      res.cookie(SESSION_COOKIE_NAME, session.id, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 3600 * 1000, // 7 days
      });

      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Authentication Successful</title></head>
          <body style="font-family: sans-serif; padding: 24px; text-align: center; background: #0f172a; color: #f8fafc;">
            <h2 style="color: #22c55e;">Connected to Gmail Successfully!</h2>
            <p>Closing popup and loading your inbox...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS',
                  sessionId: '${session.id}',
                  user: ${JSON.stringify(user)}
                }, window.location.origin);
                window.close();
              } else {
                window.location.href = '/inbox';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error('OAuth Callback processing failed:', err);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Authentication Failed</title></head>
          <body style="font-family: sans-serif; padding: 24px; text-align: center; background: #0f172a; color: #f8fafc;">
            <h2 style="color: #ef4444;">Authentication Failed</h2>
            <p>${err.message || 'An unexpected error occurred during Google token exchange.'}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err.message || 'Token exchange failed'}' }, window.location.origin);
              }
            </script>
          </body>
        </html>
      `);
    }
  };

  app.get(['/auth/callback', '/auth/callback/', '/api/auth/callback/google'], handleOAuthCallback);

  // Client Firebase Auth Bridge (enables client-side Firebase Auth sign-in to securely bootstrap server session)
  app.post('/api/auth/token', async (req, res) => {
    const { accessToken, user: rawUser } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    try {
      // Validate access token with Google UserInfo endpoint
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      let userInfo = {
        id: rawUser?.id || `user_${Date.now()}`,
        name: rawUser?.name || 'Workspace User',
        email: rawUser?.email || 'user@workspace.internal',
        picture: rawUser?.avatarUrl || '',
      };

      if (userInfoRes.ok) {
        userInfo = await userInfoRes.json();
      }

      const user = {
        id: userInfo.id,
        name: userInfo.name || 'Workspace User',
        email: userInfo.email,
        avatarUrl: userInfo.picture,
        role: 'Workspace User',
        connectedAccountType: 'google_workspace' as const,
        isGmailConnected: true,
        quotaUsagePercent: 32,
      };

      const tokens = {
        access_token: accessToken,
        expires_at: Date.now() + 3600 * 1000,
        token_type: 'Bearer',
        scope: GOOGLE_OAUTH_SCOPES.join(' '),
      };

      const session = SessionStore.createSession(user, tokens, false);

      // Persist to Supabase database
      try {
        await DatabaseService.upsertUser({
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
        });

        await DatabaseService.upsertConnectedAccount({
          userId: user.id,
          provider: 'google',
          email: user.email,
          accessToken: tokens.access_token,
          tokenType: tokens.token_type,
          scope: tokens.scope,
          tokenExpiresAt: new Date(tokens.expires_at),
        });

        await DatabaseService.getUserPreferences(user.id);

        await DatabaseService.logAiActivity({
          userId: user.id,
          actionType: 'email_received',
          title: 'Google Workspace Account Connected via Client OAuth',
          description: `Successfully authenticated ${user.email} with Gmail API permissions.`,
        });
      } catch (dbErr: any) {
        console.warn('Database user sync non-blocking warning:', dbErr.message);
      }

      res.cookie(SESSION_COOKIE_NAME, session.id, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 3600 * 1000,
      });

      res.json({
        authenticated: true,
        isGmailConnected: true,
        user,
        sessionId: session.id,
      });
    } catch (err: any) {
      console.error('Error exchanging client token:', err.message);
      res.status(500).json({ error: err.message || 'Failed to authenticate token with Google.' });
    }
  });

  // Google OAuth Credentials Configuration Endpoint
  app.get('/api/auth/google-credentials', (req, res) => {
    const { clientId, hasSecret } = getCustomGoogleCredentials();
    const { isConfigured, config } = getOAuthConfig(req);
    const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    const currentOrigin = `${protocol}://${host}`;

    res.json({
      clientId: clientId || '',
      isConfigured: isConfigured || Boolean(clientId),
      hasSecret,
      currentOrigin,
      redirectUri: config?.redirectUri || `${currentOrigin}/auth/callback`,
      authorizedOrigins: [
        currentOrigin,
        'https://ais-dev-6ujidoue4t7awyye5mbwb6-685391160524.asia-southeast1.run.app',
        'https://ais-pre-6ujidoue4t7awyye5mbwb6-685391160524.asia-southeast1.run.app'
      ],
      authorizedRedirectUris: [
        `${currentOrigin}/auth/callback`,
        `${currentOrigin}/api/auth/callback/google`,
        'https://ais-dev-6ujidoue4t7awyye5mbwb6-685391160524.asia-southeast1.run.app/auth/callback',
        'https://ais-dev-6ujidoue4t7awyye5mbwb6-685391160524.asia-southeast1.run.app/api/auth/callback/google',
        'https://ais-pre-6ujidoue4t7awyye5mbwb6-685391160524.asia-southeast1.run.app/auth/callback',
        'https://ais-pre-6ujidoue4t7awyye5mbwb6-685391160524.asia-southeast1.run.app/api/auth/callback/google'
      ]
    });
  });

  app.post('/api/auth/google-credentials', (req, res) => {
    const { clientId, clientSecret } = req.body;
    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({ error: 'Valid Google Client ID is required' });
    }

    setCustomGoogleCredentials(clientId, clientSecret);
    const { isConfigured, config } = getOAuthConfig(req);

    res.json({
      success: true,
      clientId: clientId.trim(),
      isConfigured,
      redirectUri: config?.redirectUri,
      message: 'Google Client ID updated successfully!'
    });
  });

  // Auth Status & Session Information
  app.get('/api/auth/session', async (req, res) => {
    const session = getSession(req);
    if (!session) {
      return res.json({
        authenticated: false,
        isGmailConnected: false,
        user: null,
        isDemo: false,
      });
    }

    try {
      const dbUser = await DatabaseService.getUserById(session.user.id);
      const preferences = await DatabaseService.getUserPreferences(session.user.id);

      res.json({
        authenticated: true,
        isGmailConnected: session.user.isGmailConnected && !!session.tokens,
        user: {
          ...session.user,
          name: dbUser?.name || session.user.name,
          avatarUrl: dbUser?.avatar_url || session.user.avatarUrl,
        },
        preferences,
        isDemo: session.isDemo,
        sessionId: session.id,
      });
    } catch (err) {
      res.json({
        authenticated: true,
        isGmailConnected: session.user.isGmailConnected && !!session.tokens,
        user: session.user,
        isDemo: session.isDemo,
        sessionId: session.id,
      });
    }
  });

  // Demo / Foundation Mode Switcher
  app.post('/api/auth/demo', async (req, res) => {
    const demoUser = {
      ...MOCK_USER_PROFILE,
      connectedAccountType: 'local_mock' as const,
      isGmailConnected: false,
    };
    const session = SessionStore.createSession(demoUser, undefined, true);

    // Save demo user & seed demo activities in database if empty
    try {
      await DatabaseService.upsertUser({
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        avatarUrl: demoUser.avatarUrl,
        role: demoUser.role,
      });

      await DatabaseService.getUserPreferences(demoUser.id);

      const existingActivities = await DatabaseService.getAiActivities(demoUser.id, { limit: 1 });
      if (existingActivities.length === 0) {
        await DatabaseService.logAiActivity({
          userId: demoUser.id,
          emailId: 'msg-101',
          actionType: 'summary',
          title: 'Thread Summarized: Q3 Product Roadmap',
          description: 'Synthesized 6-message thread from Sarah Jenkins highlighting launch deliverables.',
          generatedContent: 'Key milestones confirmed for September 15. Design review scheduled for Thursday 2 PM PST.',
        });
        await DatabaseService.logAiActivity({
          userId: demoUser.id,
          emailId: 'msg-102',
          actionType: 'reply_generation',
          title: 'Smart Reply Synthesized: Budget Proposal',
          description: 'Drafted professional approval response for Alex Rivera.',
          generatedContent: 'Hi Alex, the updated Q3 budget calculations look solid. Approved to proceed with Option B.',
        });
        await DatabaseService.logAiActivity({
          userId: demoUser.id,
          emailId: 'msg-103',
          actionType: 'action_item_extraction',
          title: 'Action Items Extracted: Security Audit',
          description: 'Extracted 3 compliance verification deadlines for SOC2 readiness.',
        });
        await DatabaseService.logAiActivity({
          userId: demoUser.id,
          emailId: 'msg-104',
          actionType: 'priority_detection',
          title: 'Priority Escalation: Contract Review',
          description: 'Flagged incoming vendor agreement as High Priority due to 48-hour deadline.',
        });
      }
    } catch (err: any) {
      console.warn('Demo user database initialization warning:', err.message);
    }

    res.cookie(SESSION_COOKIE_NAME, session.id, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    res.json({
      authenticated: true,
      isGmailConnected: false,
      user: demoUser,
      isDemo: true,
      sessionId: session.id,
    });
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    const sessionId = getSessionId(req);
    SessionStore.deleteSession(sessionId);

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    res.json({ success: true, message: 'Logged out successfully' });
  });

  // -------------------------------------------------------------
  // Protected Middleware (Ensures an active session or auto-creates guest session)
  // -------------------------------------------------------------
  const requireSession = (req: Request, res: Response, next: NextFunction) => {
    let session = getSession(req);
    if (!session) {
      session = getOrCreateSession(req, res);
    }
    (req as any).session = session;
    next();
  };

  // -------------------------------------------------------------
  // User Preferences Endpoints (Connected to Supabase)
  // -------------------------------------------------------------
  app.get('/api/user/preferences', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    try {
      const preferences = await DatabaseService.getUserPreferences(session.user.id);
      res.json(preferences);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve preferences' });
    }
  });

  app.put('/api/user/preferences', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    try {
      const updated = await DatabaseService.upsertUserPreferences(session.user.id, req.body);
      res.json({ success: true, preferences: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update preferences' });
    }
  });

  // -------------------------------------------------------------
  // AI Activity Endpoints (Connected to Supabase)
  // -------------------------------------------------------------
  app.get('/api/activity', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const limit = Number(req.query.limit) || 50;
    const type = req.query.type as string | undefined;

    try {
      const activities = await DatabaseService.getAiActivities(session.user.id, {
        limit,
        actionType: type,
      });
      res.json({ activities });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve AI activity records' });
    }
  });

  app.post('/api/activity', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const { emailId, actionType, title, description, generatedContent, metadata } = req.body;

    if (!actionType || !title || !description) {
      return res.status(400).json({ error: 'Missing required activity fields (actionType, title, description)' });
    }

    try {
      const activity = await DatabaseService.logAiActivity({
        userId: session.user.id,
        emailId,
        actionType,
        title,
        description,
        generatedContent,
        metadata,
      });
      res.json({ success: true, activity });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to log AI activity' });
    }
  });

  // 1. Get Emails (Inbox, Starred, Sent, Archived, Trash, Search) with Pagination
  app.get('/api/gmail/messages', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const folder = (req.query.folder as any) || 'inbox';
    const query = (req.query.q as string) || '';
    const pageToken = (req.query.pageToken as string) || undefined;
    const maxResults = Number(req.query.maxResults) || 25;

    // If demo session or not Gmail connected, report status
    if (session.isDemo || !session.tokens) {
      return res.json({
        source: 'local_demo',
        emails: [],
        nextPageToken: undefined,
      });
    }

    try {
      const result = await GmailApiService.getMessages(session.id, {
        folder,
        query,
        pageToken,
        maxResults,
      });
      res.json({
        source: 'gmail_api',
        emails: result.emails,
        nextPageToken: result.nextPageToken,
        resultSizeEstimate: result.resultSizeEstimate,
      });
    } catch (err: any) {
      console.error('Error fetching Gmail messages:', err.message);
      const isAuthError = err.message?.includes('401') || err.message?.includes('invalid_grant');
      res.status(isAuthError ? 401 : 500).json({
        error: err.message || 'Failed to fetch messages from Gmail API',
        isAuthError,
      });
    }
  });

  // 2. Get Single Message
  app.get('/api/gmail/messages/:id', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const messageId = req.params.id;

    if (session.isDemo || !session.tokens) {
      return res.status(404).json({ error: 'Live Gmail not connected for this session' });
    }

    try {
      const email = await GmailApiService.getMessage(session.id, messageId);
      res.json(email);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch message' });
    }
  });

  // 3. Get Thread Messages
  app.get('/api/gmail/threads/:id', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const threadId = req.params.id;

    if (session.isDemo || !session.tokens) {
      return res.status(404).json({ error: 'Live Gmail not connected' });
    }

    try {
      const messages = await GmailApiService.getThread(session.id, threadId);
      res.json({ messages });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch thread' });
    }
  });

  // 4. Mark Read / Unread
  app.post('/api/gmail/messages/:id/read', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const messageId = req.params.id;
    const { isRead } = req.body;

    if (session.isDemo || !session.tokens) {
      return res.json({ success: true, mode: 'demo_simulated' });
    }

    try {
      await GmailApiService.setReadStatus(session.id, messageId, isRead !== false);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update read status' });
    }
  });

  // 5. Star / Unstar
  app.post('/api/gmail/messages/:id/star', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const messageId = req.params.id;
    const { isStarred } = req.body;

    if (session.isDemo || !session.tokens) {
      return res.json({ success: true, mode: 'demo_simulated' });
    }

    try {
      await GmailApiService.setStarredStatus(session.id, messageId, !!isStarred);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update star status' });
    }
  });

  // 6. Archive Email
  app.post('/api/gmail/messages/:id/archive', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const messageId = req.params.id;

    if (session.isDemo || !session.tokens) {
      return res.json({ success: true, mode: 'demo_simulated' });
    }

    try {
      await GmailApiService.archiveMessage(session.id, messageId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to archive message' });
    }
  });

  // 7. Trash Email
  app.delete('/api/gmail/messages/:id', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const messageId = req.params.id;

    if (session.isDemo || !session.tokens) {
      return res.json({ success: true, mode: 'demo_simulated' });
    }

    try {
      await GmailApiService.trashMessage(session.id, messageId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete message' });
    }
  });

  // 8. Send Email via Gmail API
  app.post('/api/gmail/messages/send', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const { to, cc, bcc, subject, body, threadId, inReplyTo, references } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Recipient "to" is required' });
    }

    if (session.isDemo || !session.tokens) {
      return res.json({
        id: `mock-sent-${Date.now()}`,
        threadId: threadId || `mock-thread-${Date.now()}`,
        mode: 'demo_simulated',
      });
    }

    try {
      const result = await GmailApiService.sendMessage(session.id, {
        to,
        cc,
        bcc,
        subject,
        body,
        threadId,
        inReplyTo,
        references,
      });

      // Log email sent activity in persistent audit log
      try {
        await DatabaseService.logAiActivity({
          userId: session.user.id,
          emailId: result.id,
          actionType: 'email_sent',
          title: `Sent Email: ${subject || '(No Subject)'}`,
          description: `Delivered message to ${to} via Gmail API`,
        });
      } catch (logErr) {
        console.warn('Activity logging non-fatal error:', logErr);
      }

      res.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to send email via Gmail' });
    }
  });

  // 9. Get Unread Counts
  app.get('/api/gmail/counts', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;

    if (session.isDemo || !session.tokens) {
      return res.json({
        inbox: 3,
        starred: 2,
        sent: 0,
        archived: 0,
        trash: 0,
      });
    }

    try {
      const counts = await GmailApiService.getUnreadCounts(session.id);
      res.json(counts);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch unread counts' });
    }
  });

  // 10. Get User Profile & Quotas
  app.get('/api/gmail/profile', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;

    if (session.isDemo || !session.tokens) {
      return res.json({
        emailAddress: session.user.email,
        messagesTotal: 8,
        threadsTotal: 8,
      });
    }

    try {
      const profile = await GmailApiService.getProfile(session.id);
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch profile' });
    }
  });

  // -------------------------------------------------------------
  // AI Services (Gemini 3.7 Flash)
  // -------------------------------------------------------------
  // POST /api/ai/summarize
  app.post('/api/ai/summarize', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const { emailId, subject, sender, date, body } = req.body;

    if (!body && !subject) {
      return res.status(400).json({ error: 'Email subject or body content is required for summarization.' });
    }

    try {
      // Call Gemini 3.7 Flash on the server
      const summaryResult = await GeminiService.summarizeEmail({
        id: emailId,
        subject: subject || '',
        sender: sender || {},
        date: date || '',
        body: body || '',
      });

      // Persist AI Activity Log in Supabase
      try {
        await DatabaseService.logAiActivity({
          userId: session.user.id,
          emailId: emailId || undefined,
          actionType: 'summary',
          title: `Summarized: ${subject ? (subject.length > 50 ? subject.slice(0, 50) + '...' : subject) : '(No Subject)'}`,
          description: summaryResult.summary,
          generatedContent: summaryResult.summary,
          metadata: {
            priority: summaryResult.priority,
            keyPoints: summaryResult.keyPoints,
            actionItems: summaryResult.actionItems,
            importantDates: summaryResult.importantDates,
          },
        });
      } catch (logErr: any) {
        console.warn('Non-fatal warning logging AI activity to Supabase:', logErr.message);
      }

      res.json({
        success: true,
        data: summaryResult,
      });
    } catch (err: any) {
      console.error('[POST /api/ai/summarize error]:', err.message || err);
      const isMissingKey = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '';
      const errorMessage = isMissingKey
        ? 'Gemini API key is not configured. Please ensure GEMINI_API_KEY is configured in Settings > Secrets.'
        : err.message || 'Failed to generate email summary with Gemini AI.';

      res.status(isMissingKey ? 503 : 500).json({
        error: errorMessage,
        code: isMissingKey ? 'MISSING_GEMINI_API_KEY' : 'GEMINI_ERROR',
      });
    }
  });

  // POST /api/ai/generate-reply
  app.post('/api/ai/generate-reply', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const { emailId, subject, sender, date, body, threadMessages, tone, userInstructions } = req.body;

    if (!body && !subject) {
      return res.status(400).json({ error: 'Email subject or body content is required for reply generation.' });
    }

    const selectedTone = ['professional', 'friendly', 'formal', 'concise'].includes(tone)
      ? tone
      : 'professional';

    try {
      // Call Gemini 3.7 Flash to generate the reply draft
      const replyText = await GeminiService.generateReply({
        id: emailId,
        subject: subject || '',
        sender: sender || {},
        date: date || '',
        body: body || '',
        threadMessages: Array.isArray(threadMessages) ? threadMessages : undefined,
        tone: selectedTone,
        userInstructions: userInstructions || undefined,
      });

      // Persist AI Activity Log in Supabase
      const toneLabel = selectedTone.charAt(0).toUpperCase() + selectedTone.slice(1);
      try {
        await DatabaseService.logAiActivity({
          userId: session.user.id,
          emailId: emailId || undefined,
          actionType: 'reply_generation',
          title: `Generated Reply (${toneLabel}): ${subject ? (subject.length > 40 ? subject.slice(0, 40) + '...' : subject) : '(No Subject)'}`,
          description: `Generated ${selectedTone} draft reply for ${sender?.email || sender?.name || 'recipient'}`,
          generatedContent: replyText,
          metadata: {
            tone: selectedTone,
            sender: sender?.email || sender?.name,
            subject: subject || '',
          },
        });
      } catch (logErr: any) {
        console.warn('Non-fatal warning logging reply activity to Supabase:', logErr.message);
      }

      res.json({
        success: true,
        reply: replyText,
        tone: selectedTone,
      });
    } catch (err: any) {
      console.error('[POST /api/ai/generate-reply error]:', err.message || err);
      const isMissingKey = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '';
      const errorMessage = isMissingKey
        ? 'Gemini API key is not configured. Please ensure GEMINI_API_KEY is configured in Settings > Secrets.'
        : err.message || 'Failed to generate email reply with Gemini AI.';

      res.status(isMissingKey ? 503 : 500).json({
        error: errorMessage,
        code: isMissingKey ? 'MISSING_GEMINI_API_KEY' : 'GEMINI_ERROR',
      });
    }
  });

  // POST /api/ai/priority - ⚡ Detect Priority (High, Medium, Low + Reason)
  app.post('/api/ai/priority', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const { emailId, subject, sender, date, body } = req.body;

    if (!body && !subject) {
      return res.status(400).json({ error: 'Email content is required for priority detection.' });
    }

    try {
      const priorityResult = await GeminiService.detectPriority({
        id: emailId,
        subject: subject || '',
        sender: sender || {},
        date: date || '',
        body: body || '',
      });

      // Log AI Activity
      try {
        await DatabaseService.logAiActivity({
          userId: session.user.id,
          emailId: emailId || undefined,
          actionType: 'priority_detection',
          title: `Priority Detected: ${priorityResult.priority.toUpperCase()} - ${subject || '(No Subject)'}`,
          description: priorityResult.reason,
          metadata: {
            priority: priorityResult.priority,
            reason: priorityResult.reason,
          },
        });
      } catch (logErr: any) {
        console.warn('Non-fatal priority log error:', logErr.message);
      }

      res.json({
        success: true,
        data: priorityResult,
      });
    } catch (err: any) {
      console.error('[POST /api/ai/priority error]:', err.message || err);
      const isMissingKey = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '';
      res.status(isMissingKey ? 503 : 500).json({
        error: isMissingKey
          ? 'Gemini API key is not configured.'
          : err.message || 'Failed to detect email priority.',
        code: isMissingKey ? 'MISSING_GEMINI_API_KEY' : 'GEMINI_ERROR',
      });
    }
  });

  // POST /api/ai/action-items - ✓ Extract Action Items
  app.post('/api/ai/action-items', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const { emailId, subject, sender, date, body } = req.body;

    if (!body && !subject) {
      return res.status(400).json({ error: 'Email content is required for action items extraction.' });
    }

    try {
      const actionItemsResult = await GeminiService.extractActionItems({
        id: emailId,
        subject: subject || '',
        sender: sender || {},
        date: date || '',
        body: body || '',
      });

      // Log AI Activity
      try {
        await DatabaseService.logAiActivity({
          userId: session.user.id,
          emailId: emailId || undefined,
          actionType: 'action_item_extraction',
          title: `Action Items (${actionItemsResult.actionItems.length}): ${subject || '(No Subject)'}`,
          description: actionItemsResult.actionItems.length > 0
            ? actionItemsResult.actionItems.map((a) => a.task).join('; ')
            : 'No action items detected in email.',
          metadata: {
            actionItems: actionItemsResult.actionItems,
          },
        });
      } catch (logErr: any) {
        console.warn('Non-fatal action items log error:', logErr.message);
      }

      res.json({
        success: true,
        data: actionItemsResult,
      });
    } catch (err: any) {
      console.error('[POST /api/ai/action-items error]:', err.message || err);
      const isMissingKey = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '';
      res.status(isMissingKey ? 503 : 500).json({
        error: isMissingKey
          ? 'Gemini API key is not configured.'
          : err.message || 'Failed to extract action items.',
        code: isMissingKey ? 'MISSING_GEMINI_API_KEY' : 'GEMINI_ERROR',
      });
    }
  });

  // POST /api/ai/important-dates - 📅 Extract Important Dates
  app.post('/api/ai/important-dates', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const { emailId, subject, sender, date, body } = req.body;

    if (!body && !subject) {
      return res.status(400).json({ error: 'Email content is required for dates extraction.' });
    }

    try {
      const datesResult = await GeminiService.extractImportantDates({
        id: emailId,
        subject: subject || '',
        sender: sender || {},
        date: date || '',
        body: body || '',
      });

      // Log AI Activity
      try {
        await DatabaseService.logAiActivity({
          userId: session.user.id,
          emailId: emailId || undefined,
          actionType: 'date_extraction',
          title: `Important Dates (${datesResult.importantDates.length}): ${subject || '(No Subject)'}`,
          description: datesResult.importantDates.length > 0
            ? datesResult.importantDates.map((d) => `${d.date}: ${d.description}`).join('; ')
            : 'No dates or deadlines detected.',
          metadata: {
            importantDates: datesResult.importantDates,
          },
        });
      } catch (logErr: any) {
        console.warn('Non-fatal date log error:', logErr.message);
      }

      res.json({
        success: true,
        data: datesResult,
      });
    } catch (err: any) {
      console.error('[POST /api/ai/important-dates error]:', err.message || err);
      const isMissingKey = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '';
      res.status(isMissingKey ? 503 : 500).json({
        error: isMissingKey
          ? 'Gemini API key is not configured.'
          : err.message || 'Failed to extract important dates.',
        code: isMissingKey ? 'MISSING_GEMINI_API_KEY' : 'GEMINI_ERROR',
      });
    }
  });

  // POST /api/ai/categorize - 🏷️ Categorize Single Email and store in Supabase
  app.post('/api/ai/categorize', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const { emailId, subject, sender, date, body } = req.body;

    if (!emailId) {
      return res.status(400).json({ error: 'emailId is required for categorization.' });
    }

    try {
      const categoryResult = await GeminiService.categorizeEmail({
        id: emailId,
        subject: subject || '',
        sender: sender || {},
        date: date || '',
        body: body || '',
      });

      // Store in Supabase email_categories table
      const stored = await DatabaseService.upsertEmailCategory({
        userId: session.user.id,
        emailId: emailId,
        category: categoryResult.category,
        confidence: categoryResult.confidence,
        reason: categoryResult.reason,
        labels: categoryResult.labels,
      });

      // Log AI Activity in Supabase
      try {
        await DatabaseService.logAiActivity({
          userId: session.user.id,
          emailId: emailId,
          actionType: 'categorization',
          title: `Categorized as [${categoryResult.category}]: ${subject || '(No Subject)'}`,
          description: categoryResult.reason,
          metadata: {
            category: categoryResult.category,
            confidence: categoryResult.confidence,
            labels: categoryResult.labels,
          },
        });
      } catch (logErr: any) {
        console.warn('Non-fatal categorization log error:', logErr.message);
      }

      res.json({
        success: true,
        data: {
          ...categoryResult,
          id: stored.id,
        },
      });
    } catch (err: any) {
      console.error('[POST /api/ai/categorize error]:', err.message || err);
      const isMissingKey = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '';
      res.status(isMissingKey ? 503 : 500).json({
        error: isMissingKey
          ? 'Gemini API key is not configured.'
          : err.message || 'Failed to categorize email.',
        code: isMissingKey ? 'MISSING_GEMINI_API_KEY' : 'GEMINI_ERROR',
      });
    }
  });

  // POST /api/ai/batch-categorize - 🏷️ Batch Categorize Multiple Emails
  app.post('/api/ai/batch-categorize', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;
    const { emails } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Array of emails is required for batch categorization.' });
    }

    const maxBatch = 10;
    const targetEmails = emails.slice(0, maxBatch);
    const results: any[] = [];

    for (const emailItem of targetEmails) {
      try {
        const catResult = await GeminiService.categorizeEmail({
          id: emailItem.id,
          subject: emailItem.subject || '',
          sender: emailItem.sender || {},
          date: emailItem.date || '',
          body: emailItem.body || emailItem.snippet || '',
        });

        await DatabaseService.upsertEmailCategory({
          userId: session.user.id,
          emailId: emailItem.id,
          category: catResult.category,
          confidence: catResult.confidence,
          reason: catResult.reason,
          labels: catResult.labels,
        });

        results.push({
          emailId: emailItem.id,
          success: true,
          ...catResult,
        });
      } catch (err: any) {
        console.warn(`Batch item ${emailItem.id} categorization failed:`, err.message);
        results.push({
          emailId: emailItem.id,
          success: false,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      processedCount: results.length,
      results,
    });
  });

  // GET /api/ai/categories - Get all stored categories for the user
  app.get('/api/ai/categories', requireSession, async (req, res) => {
    const session: UserSession = (req as any).session;

    try {
      const categories = await DatabaseService.getEmailCategories(session.user.id);
      res.json({
        success: true,
        categories,
      });
    } catch (err: any) {
      console.error('[GET /api/ai/categories error]:', err.message || err);
      res.status(500).json({ error: 'Failed to fetch stored categories' });
    }
  });

  // -------------------------------------------------------------
  // Vite Integration (Dev Middleware & Production SPA Serving)
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Intelligent Email Assistant server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
