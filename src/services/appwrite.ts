import { Client, Account, Databases, Storage, Functions, ID, Query, Models, OAuthProvider, AuthenticatorType } from 'react-native-appwrite';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
// Ensure web browser closes properly after OAuth
WebBrowser.maybeCompleteAuthSession();

// Appwrite Configuration
const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://api.marketingtool.pro/v1';
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '6952c8a0002d3365625d';
const APPWRITE_PLATFORM = process.env.EXPO_PUBLIC_APPWRITE_PLATFORM || 'pro.marketingtool.app';

// Database IDs
// The Appwrite database ID on the server is 'main' (was wrongly 'marketingtool_db',
// which caused every profile read/write to fail with "Database not found" — the
// real reason credits never showed and plans never unlocked after purchase).
export const DATABASE_ID = 'main';
export const COLLECTIONS = {
  USERS: 'users',
  TOOLS: 'tools',
  GENERATIONS: 'generations',
  SUBSCRIPTIONS: 'subscriptions',
  CREDIT_USAGE: 'credit_usage',
  CHAT_SESSIONS: 'chat_sessions',
  CHAT_MESSAGES: 'chat_messages',
  FAVORITES: 'favorites',
  USAGE: 'credit_usage',
};

// Storage Bucket IDs
export const BUCKETS = {
  AVATARS: 'avatars',
  MEDIA: 'media',
  EXPORTS: 'exports',
};

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setPlatform(APPWRITE_PLATFORM);

// Set global timeout to 30s to prevent iOS 408 errors.
// Cast needed because the config type is a fixed interface in older SDK versions.
(client.config as Record<string, string>).timeout = '30000';

// Add simple retry logic for network/timeout errors
const originalCall = client.call.bind(client);
client.call = async function(method, path, headers, params) {
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
        try {
            return await originalCall(method, path, headers, params);
        } catch (error: any) {
            attempts++;
            const isTimeout = error.code === 408 || error.type === 'database_timeout' || error.message?.includes('timeout');
            if (!isTimeout || attempts >= maxAttempts) {
                throw error;
            }
            if (__DEV__) console.log(`[Appwrite] Request timed out, retrying attempt ${attempts}...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
        }
    }
};

/**
 * Pull userId/secret out of the OAuth callback URL without relying on `URL`.
 *
 * The callback arrives as a CUSTOM SCHEME:
 *
 *   marketingtool://oauth/success?userId=...&secret=...
 *
 * React Native has no complete WHATWG `URL`, and this project does not install
 * react-native-url-polyfill, so `new URL(customScheme).searchParams` is not
 * dependable -- it can come back empty or throw for a non-http(s) scheme.
 *
 * That failure is invisible on iOS and fatal on Android. When the parse yields
 * nothing, the OAuth handlers fall through to "look for an existing session":
 * on iOS the system browser shares cookies with the app, so account.get()
 * finds the session and login still works; on Android a Chrome Custom Tab does
 * NOT share cookies with the app's HTTP client, so there is nothing to find and
 * the handler returns null with no error. Same code, works on Apple, silently
 * does nothing on Android -- which is exactly the reported behaviour.
 *
 * Parsing the query string directly removes the dependency entirely.
 */
export function parseCallbackParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const q = url.indexOf('?');
  if (q === -1) return out;
  // Drop any fragment; providers append it on some flows.
  const query = url.slice(q + 1).split('#')[0];
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawVal = eq === -1 ? '' : pair.slice(eq + 1);
    try {
      out[decodeURIComponent(rawKey)] = decodeURIComponent(rawVal.replace(/\+/g, ' '));
    } catch {
      // A malformed escape must not take the whole login down.
      out[rawKey] = rawVal;
    }
  }
  return out;
}

// Initialize Services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

// Session Management
// The Appwrite React Native SDK persists its own session cookie internally.
// saveSession/deleteSession mirror that lifecycle in SecureStore for any future
// cross-SDK needs (e.g. passing session to a web view). getSession is intentionally
// not exposed — use account.get() to check session validity instead.
const SESSION_KEY = 'appwrite_session';

export const saveSession = async (session: string): Promise<void> => {
  await SecureStore.setItemAsync(SESSION_KEY, session);
};

export const deleteSession = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(SESSION_KEY);
};

/**
 * Finish an OAuth login from a deep link, independently of the browser session.
 *
 * Reported on Android: after choosing the Google account the browser redirects
 * and the app shows its SPLASH SCREEN instead of a signed-in session.
 *
 * A splash screen means the app COLD STARTED. The callback
 * marketingtool://oauth/success?userId=...&secret=... arrived as a launch
 * intent rather than as a return into the running process, so the promise from
 * WebBrowser.openAuthSessionAsync() died with the old process and its result --
 * the userId and secret -- was never read by anyone. Nothing in this app looked
 * at incoming links at all: there was no Linking.getInitialURL() and no 'url'
 * listener anywhere, so those credentials were simply dropped on the floor.
 *
 * iOS does not hit this because ASWebAuthenticationSession returns inside the
 * living process and the promise resolves normally.
 *
 * Handling the link directly makes the login independent of whether the process
 * survived the round trip, which is the only version of this flow that can be
 * relied on. Safe to call with any URL: anything that is not an OAuth success
 * callback is ignored.
 */
export async function completeOAuthFromUrl(url: string | null): Promise<boolean> {
  if (!url) return false;
  if (!url.includes('oauth/success') && !url.includes('secret=')) return false;

  const params = parseCallbackParams(url);
  if (!params.userId || !params.secret) return false;

  try {
    const session = await account.createSession(params.userId, params.secret);
    await saveSession(session.$id);
    if (__DEV__) console.log('[OAuth] Session created from deep link');
    return true;
  } catch (error: any) {
    // An already-consumed secret lands here when the in-process handler won the
    // race and completed the login first. That is a success, not a failure, so
    // it must not surface as an error to the user.
    if (__DEV__) console.log('[OAuth] Deep link session failed:', error?.message || error);
    return false;
  }
}

/**
 * Send an Appwrite auth failure to Crashlytics as a non-fatal.
 *
 * Appwrite is the auth for every provider and every platform -- Google,
 * Facebook, Apple, OpenID and email all go through it, on web, iOS and Android
 * alike. Only the phone OTP uses Firebase. Yet sign-in fails on Android only,
 * and every server-side check answers correctly to Android-shaped requests:
 *
 *   POST /v1/account/sessions/email   -> 401 user_invalid_credentials
 *   GET  /v1/account                  -> 401 guest (not "Invalid Origin")
 *   platform origin enforcement       -> not applied (verified with a control:
 *                                        an unregistered package gets the same
 *                                        answer as the real one)
 *   TLS chain                         -> valid to ISRG Root X1
 *   shipped bundle                    -> correct endpoint and project id
 *
 * So the failure happens inside the app, and until now the app reported
 * nothing: only the Firebase OTP paths recorded anything, while the Appwrite
 * paths -- the ones that actually matter -- rethrew bare and left no trace.
 *
 * Codes and messages here come from Appwrite. No password, secret, session id
 * or email is recorded.
 */
function reportAuthFailure(stage: string, error: any) {
  try {
    const crashlytics = require('@react-native-firebase/crashlytics').default;
    const c = crashlytics();
    c.setAttributes({
      auth_stage: stage,
      auth_error_type: String(error?.type || 'none'),
      auth_error_code: String(error?.code ?? 'none'),
    });
    c.recordError(
      new Error(`Auth ${stage} [${error?.type || 'no-type'}/${error?.code ?? '?'}] ${String(error?.message || '')}`)
    );
  } catch {
    // Diagnostics must never break sign-in.
  }
}

// Auth Functions
export const authService = {
  // Create Account
  async createAccount(email: string, password: string, name: string): Promise<Models.User<Models.Preferences>> {
    try {
      const newAccount = await account.create(ID.unique(), email, password, name);
      await this.login(email, password);
      return newAccount;
    } catch (error) {
      reportAuthFailure('createAccount', error);
      throw error;
    }
  },

  // Login with Email
  async login(email: string, password: string): Promise<Models.Session> {
    try {
      const session = await account.createEmailPasswordSession(email, password);
      await saveSession(session.$id);
      return session;
    } catch (error) {
      reportAuthFailure('emailLogin', error);
      throw error;
    }
  },

  // Login with Google using Appwrite SDK OAuth
  async loginWithGoogle(): Promise<Models.Session | null> {
    try {
      if (__DEV__) console.log('[OAuth] Starting Google OAuth via Appwrite SDK...');

      // Use auth.marketingtool.pro for phone app OAuth (separate from web app)
      const successUrl = 'https://auth.marketingtool.pro/oauth/success';
      const failureUrl = 'https://auth.marketingtool.pro/oauth/failure';

      // Use SDK's createOAuth2Token method for mobile - returns userId & secret in URL
      const oauthUrl = account.createOAuth2Token(
        OAuthProvider.Google,
        successUrl,
        failureUrl
      );

      if (!oauthUrl) throw new Error('Failed to generate OAuth URL');
      const oauthUrlString = oauthUrl.toString();

      if (__DEV__) console.log('[OAuth] Opening URL:', oauthUrlString);

      // Nginx redirects auth.marketingtool.pro/oauth/success → marketingtool://oauth/success
      const result = await WebBrowser.openAuthSessionAsync(oauthUrlString, 'marketingtool://');

      if (__DEV__) console.log('[OAuth] Browser result type:', result.type);

      if (result.type === 'success' && result.url) {
        if (__DEV__) console.log('[OAuth] Callback URL:', result.url);

        // Check if it's a success callback
        if (result.url.includes('oauth/success') || result.url.includes('secret=')) {
          // Parse the URL for session tokens
          const urlParams = parseCallbackParams(result.url);
          const secret = urlParams.secret;
          const userId = urlParams.userId;

          if (secret && userId) {
            if (__DEV__) console.log('[OAuth] Creating session with token...');
            const session = await account.createSession(userId, secret);
            await saveSession(session.$id);
            return session;
          }
        }

        // Try to get existing session (OAuth might have set cookies)
        try {
          if (__DEV__) console.log('[OAuth] Checking for session...');
          const user = await account.get();
          if (user) {
            const sessions = await account.listSessions();
            if (sessions.sessions.length > 0) {
              await saveSession(sessions.sessions[0].$id);
              if (__DEV__) console.log('[OAuth] Session found for:', user.email);
              return sessions.sessions[0];
            }
          }
        } catch (e) {
          if (__DEV__) console.log('[OAuth] No existing session');
        }
      }

      if (result.type === 'cancel') {
        if (__DEV__) console.log('[OAuth] Cancelled by user');
      }

      return null;
    } catch (error: any) {
      if (__DEV__) console.error('[OAuth] Google error:', error?.message || error);
      reportAuthFailure('oauthGoogle', error);
      throw error;
    }
  },

  // Login with Apple using Appwrite SDK OAuth
  async loginWithApple(): Promise<Models.Session | null> {
    try {
      if (__DEV__) console.log('[OAuth] Starting Apple OAuth...');

      const successUrl = 'https://auth.marketingtool.pro/oauth/success';
      const failureUrl = 'https://auth.marketingtool.pro/oauth/failure';

      // Use SDK's createOAuth2Token method for mobile - returns userId & secret in URL
      const oauthUrl = account.createOAuth2Token(
        OAuthProvider.Apple,
        successUrl,
        failureUrl
      );

      if (!oauthUrl) throw new Error('Failed to generate OAuth URL');
      const oauthUrlString = oauthUrl.toString();

      // Nginx redirects auth.marketingtool.pro/oauth/success → marketingtool://oauth/success
      const result = await WebBrowser.openAuthSessionAsync(oauthUrlString, 'marketingtool://');

      if (result.type === 'success' && result.url) {
        if (result.url.includes('oauth/success') || result.url.includes('secret=')) {
          const urlParams = parseCallbackParams(result.url);
          const secret = urlParams.secret;
          const userId = urlParams.userId;

          if (secret && userId) {
            const session = await account.createSession(userId, secret);
            await saveSession(session.$id);
            return session;
          }
        }

        try {
          const user = await account.get();
          if (user) {
            const sessions = await account.listSessions();
            if (sessions.sessions.length > 0) {
              await saveSession(sessions.sessions[0].$id);
              return sessions.sessions[0];
            }
          }
        } catch (e) {
          if (__DEV__) console.log('[OAuth] No Apple session');
        }
      }

      return null;
    } catch (error: any) {
      if (__DEV__) console.error('[OAuth] Apple error:', error?.message || error);
      reportAuthFailure('oauthApple', error);
      throw error;
    }
  },

  // Login with Facebook using Appwrite SDK OAuth
  async loginWithFacebook(): Promise<Models.Session | null> {
    try {
      if (__DEV__) console.log('[OAuth] Starting Facebook OAuth...');

      const successUrl = 'https://auth.marketingtool.pro/oauth/success';
      const failureUrl = 'https://auth.marketingtool.pro/oauth/failure';

      // Use SDK's createOAuth2Token method for mobile - returns userId & secret in URL
      const oauthUrl = account.createOAuth2Token(
        OAuthProvider.Facebook,
        successUrl,
        failureUrl
      );

      if (!oauthUrl) throw new Error('Failed to generate OAuth URL');
      const oauthUrlString = oauthUrl.toString();

      // Nginx redirects auth.marketingtool.pro/oauth/success → marketingtool://oauth/success
      const result = await WebBrowser.openAuthSessionAsync(oauthUrlString, 'marketingtool://');

      if (result.type === 'success' && result.url) {
        if (result.url.includes('oauth/success') || result.url.includes('secret=')) {
          const urlParams = parseCallbackParams(result.url);
          const secret = urlParams.secret;
          const userId = urlParams.userId;

          if (secret && userId) {
            const session = await account.createSession(userId, secret);
            await saveSession(session.$id);
            return session;
          }
        }

        try {
          const user = await account.get();
          if (user) {
            const sessions = await account.listSessions();
            if (sessions.sessions.length > 0) {
              await saveSession(sessions.sessions[0].$id);
              return sessions.sessions[0];
            }
          }
        } catch (e) {
          if (__DEV__) console.log('[OAuth] No Facebook session');
        }
      }

      return null;
    } catch (error: any) {
      if (__DEV__) console.error('[OAuth] Facebook error:', error?.message || error);
      reportAuthFailure('oauthFacebook', error);
      throw error;
    }
  },

  // Phone OTP is handled directly by Firebase Phone Auth. See src/store/authStore.ts.

  // Get Current User
  async getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
    try {
      return await account.get();
    } catch (error) {
      return null;
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await account.deleteSession('current');
      await deleteSession();
    } catch (error) {
      throw error;
    }
  },

  // Reset Password
  async resetPassword(email: string): Promise<Models.Token> {
    try {
      return await account.createRecovery(
        email,
        'https://app.marketingtool.pro/reset-password'
      );
    } catch (error) {
      throw error;
    }
  },

  // Update Password
  async updatePassword(oldPassword: string, newPassword: string): Promise<Models.User<Models.Preferences>> {
    try {
      return await account.updatePassword(newPassword, oldPassword);
    } catch (error) {
      throw error;
    }
  },

  // Update Profile
  async updateProfile(name: string): Promise<Models.User<Models.Preferences>> {
    try {
      return await account.updateName(name);
    } catch (error) {
      throw error;
    }
  },

  // Verify Email
  async verifyEmail(): Promise<Models.Token> {
    try {
      return await account.createVerification(
        'https://app.marketingtool.pro/verify-email'
      );
    } catch (error) {
      throw error;
    }
  },

  // 2FA (TOTP) Functions
  async createTOTP(): Promise<any> {
    try {
      return await account.createMfaAuthenticator(AuthenticatorType.Totp);
    } catch (error) {
      throw error;
    }
  },

  async update2FA(enabled: boolean): Promise<any> {
    try {
      return await account.updateMFA(enabled);
    } catch (error) {
      throw error;
    }
  },

  async verify2FA(otp: string): Promise<any> {
    try {
      return await account.updateMfaAuthenticator(AuthenticatorType.Totp, otp);
    } catch (error) {
      throw error;
    }
  },

  async listMfaFactors(): Promise<any> {
    try {
      return await account.listMfaFactors();
    } catch (error) {
      throw error;
    }
  },
};

// Database Functions
export const dbService = {
  // Create Document
  async createDocument<T extends Models.Document>(
    collectionId: string,
    data: Record<string, unknown>,
    documentId: string = ID.unique()
  ): Promise<T> {
    try {
      return await databases.createDocument(
        DATABASE_ID,
        collectionId,
        documentId,
        data as any
      ) as T;
    } catch (error) {
      throw error;
    }
  },

  // Get Document
  async getDocument<T extends Models.Document>(
    collectionId: string,
    documentId: string
  ): Promise<T> {
    try {
      return await databases.getDocument(
        DATABASE_ID,
        collectionId,
        documentId
      ) as T;
    } catch (error) {
      throw error;
    }
  },

  // List Documents
  async listDocuments<T extends Models.Document>(
    collectionId: string,
    queries: string[] = []
  ): Promise<Models.DocumentList<T>> {
    try {
      return await databases.listDocuments(
        DATABASE_ID,
        collectionId,
        queries
      ) as Models.DocumentList<T>;
    } catch (error) {
      throw error;
    }
  },

  // Update Document
  async updateDocument<T extends Models.Document>(
    collectionId: string,
    documentId: string,
    data: Record<string, unknown>
  ): Promise<T> {
    try {
      return await databases.updateDocument(
        DATABASE_ID,
        collectionId,
        documentId,
        data as any
      ) as T;
    } catch (error) {
      throw error;
    }
  },

  // Delete Document
  async deleteDocument(collectionId: string, documentId: string): Promise<void> {
    try {
      await databases.deleteDocument(DATABASE_ID, collectionId, documentId);
    } catch (error) {
      throw error;
    }
  },
};

// Storage Functions
export const storageService = {
  // Upload File
  async uploadFile(
    bucketId: string,
    file: { uri: string; name: string; type: string; size: number }
  ): Promise<Models.File> {
    try {
      return await storage.createFile(
        bucketId,
        ID.unique(),
        file
      );
    } catch (error) {
      throw error;
    }
  },

  // Get File URL
  getFileUrl(bucketId: string, fileId: string): string {
    return `${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`;
  },

  // Get File Preview
  getFilePreview(bucketId: string, fileId: string, width: number = 400, height: number = 400): string {
    return `${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/preview?project=${APPWRITE_PROJECT_ID}&width=${width}&height=${height}`;
  },

  // Delete File
  async deleteFile(bucketId: string, fileId: string): Promise<void> {
    try {
      await storage.deleteFile(bucketId, fileId);
    } catch (error) {
      throw error;
    }
  },
};

// Function Execution
export const functionService = {
  async execute(functionId: string, data?: string): Promise<Models.Execution> {
    try {
      return await functions.createExecution(functionId, data);
    } catch (error) {
      throw error;
    }
  },
};

export { client, ID, Query };
export default { authService, dbService, storageService, functionService };
