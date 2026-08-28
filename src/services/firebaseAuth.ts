import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut as firebaseSignOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize or reuse Firebase App instance
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);

// Configure Google Auth Provider with full Gmail Workspace scopes
export const googleWorkspaceProvider = new GoogleAuthProvider();
googleWorkspaceProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleWorkspaceProvider.addScope('https://www.googleapis.com/auth/gmail.send');
googleWorkspaceProvider.addScope('https://www.googleapis.com/auth/gmail.modify');
googleWorkspaceProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleWorkspaceProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleWorkspaceProvider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'offline',
});

// Flag to track ongoing sign in flow
let isSigningIn = false;
// Cached access token in memory (never stored in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

/**
 * Initializes Firebase Auth state listener and sets up in-memory access token cache.
 */
export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(firebaseAuth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in using Firebase Auth popup with Google Workspace scopes.
 * Returns the authenticated user profile and in-memory access token.
 */
export const signInWithGoogleWorkspace = async (): Promise<{
  user: User;
  accessToken: string;
  idToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(firebaseAuth, googleWorkspaceProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Google Workspace access token from authentication result.');
    }

    cachedAccessToken = credential.accessToken;
    const idToken = await result.user.getIdToken();

    return {
      user: result.user,
      accessToken: cachedAccessToken,
      idToken,
    };
  } catch (error: any) {
    console.error('[Firebase Auth] Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieves the in-memory access token for Workspace API calls.
 */
export const getWorkspaceAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Sets or updates the in-memory access token cache.
 */
export const setWorkspaceAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

/**
 * Signs out from Firebase Auth and purges the in-memory token.
 */
export const signOutWorkspace = async () => {
  cachedAccessToken = null;
  await firebaseSignOut(firebaseAuth);
};
