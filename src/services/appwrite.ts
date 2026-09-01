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

// The session SECRET, which is what actually authenticates a request. Distinct
// from SESSION_KEY above, which holds only the session's id and cannot
// authenticate anything.
const SESSION_SECRET_KEY = 'appwrite_session_secret';

export const saveSession = async (session: string): Promise<void> => {
  await SecureStore.setItemAsync(SESSION_KEY, session);
};

/**
 * Attach a freshly created session to the client and remember it.
 *
 * The React Native SDK persists NOTHING by itself. Its only session storage is
 * the browser one, guarded by a check that is never true here:
 *
 *   if (typeof window !== 'undefined' && window.localStorage && cookieFallback)
 *
 * With no localStorage in React Native, an authenticated request depends on
 * either the platform's cookie jar or an explicit X-Appwrite-Session header,
 * which is what client.setSession() sets:
 *
 *   setSession(value) { this.headers['X-Appwrite-Session'] = value; }
 *
 * iOS shares its cookie store between the app and the system auth browser, so
 * the session cookie set during OAuth is already present on the app's own
 * requests and everything works without any of this. Android's Custom Tab does
 * not share cookies with the app, so nothing carries the session forward -- the
 * login succeeds and the very next account.get() is an anonymous request. The
 * app reads that as "not signed in" and returns to onboarding, which is exactly
 * what happens after the Google account picker.
 *
 * Appwrite only fills in `secret` on session responses in some flows; when it
 * is empty this does nothing at all and behaviour is unchanged, so this is
 * additive and cannot regress the platform that already works.
 */
export const adoptSession = async (session: Models.Session): Promise<void> => {
  await saveSession(session.$id);

  // Appwrite returns an EMPTY secret on session responses to client requests --
  // measured against the live server, not assumed:
  //
  //   POST /v1/account/sessions/anonymous -> 201, "secret" field length 0
  //
  // so this branch does nothing on its own. The real credential arrives in the
  // response HEADERS, and captureSessionFromHeaders() below is what collects it.
  const secret = (session as unknown as { secret?: string }).secret;
  if (!secret) return;

  client.setSession(secret);
  await SecureStore.setItemAsync(SESSION_SECRET_KEY, secret);
};

/**
 * Take the session out of the response headers, which is where Appwrite
 * actually puts it for clients that have no cookie jar.
 *
 * A session response carries both:
 *
 *   set-cookie:          the session cookie
 *   x-fallback-cookies:  the same value as JSON, for exactly this case
 *
 * The SDK reads that second header and stores it in window.localStorage:
 *
 *   const cookieFallback = response.headers.get('X-Fallback-Cookies');
 *   if (typeof window !== 'undefined' && window.localStorage && cookieFallback) { ... }
 *
 * React Native has no window.localStorage, so the SDK drops it and the session
 * survives only if the platform's cookie jar happens to keep it. iOS shares its
 * cookie store with the system auth browser and does; Android's Custom Tab does
 * not share cookies with the app, so the session is simply lost and the next
 * request is anonymous -- the app then shows onboarding, which is the reported
 * behaviour after the Google account picker.
 *
 * Storing it ourselves and replaying it as X-Appwrite-Session removes the
 * dependency on cookie behaviour entirely, on both platforms.
 */
async function captureSessionFromHeaders(headers: Headers): Promise<boolean> {
  const fallback = headers.get('x-fallback-cookies') || headers.get('X-Fallback-Cookies');
  if (!fallback) return false;

  try {
    const parsed = JSON.parse(fallback);
    const secret = parsed?.[`a_session_${APPWRITE_PROJECT_ID}`];
    if (!secret) return false;

    client.setSession(secret);
    await SecureStore.setItemAsync(SESSION_SECRET_KEY, secret);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a session with a plain request so the response headers stay reachable.
 *
 * The SDK returns only the parsed body, so the header carrying the session is
 * unreachable through it. These are the only two calls that need it: everything
 * afterwards goes through the SDK as usual, authenticated by the header that
 * client.setSession() adds.
 */
async function postSession(path: string, body: Record<string, string>): Promise<Models.Session> {
  const response = await fetch(`${APPWRITE_ENDPOINT}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-appwrite-project': APPWRITE_PROJECT_ID,
      'x-appwrite-response-format': '1.8.0',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error: any = new Error(data?.message || `Session request failed (${response.status})`);
    error.code = data?.code ?? response.status;
    error.type = data?.type;
    throw error;
  }

  await captureSessionFromHeaders(response.headers);
  return data as Models.Session;
}

/**
 * Re-attach a stored session secret on app start.
 *
 * Without this the header is lost on every cold start, which on Android is
 * every time the OAuth callback relaunches the app.
 */
export const restoreSession = async (): Promise<boolean> => {
  try {
    const secret = await SecureStore.getItemAsync(SESSION_SECRET_KEY);
    if (!secret) return false;
    client.setSession(secret);
    return true;
  } catch {
    return false;
  }
};

export const deleteSession = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await SecureStore.deleteItemAsync(SESSION_SECRET_KEY);
  client.setSession('');
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

  // Record that a callback arrived and whether it carried usable credentials.
  //
  // Without this the failure is silent: on Android the app returns to its
  // onboarding screen after the Google account picker, with no error anywhere,
  // because a callback missing userId/secret simply returns false. Server-side
  // the endpoint is fine -- POST /v1/account/sessions/token answers
  // 401 user_invalid_token identically for an Android origin and a web origin --
  // so the open question is whether the app receives those values at all.
  //
  // Only presence is recorded, never the secret itself.
  reportAuthFailure('oauthCallbackReceived', {
    type: 'diagnostic',
    code: url.split('?')[0],
    message: `hasUserId=${!!params.userId} hasSecret=${!!params.secret} keys=${Object.keys(params).join(',')}`,
  });

  if (!params.userId || !params.secret) return false;

  try {
    const session = await postSession('/account/sessions/token', {
      userId: params.userId,
      secret: params.secret,
    });
    await adoptSession(session);
    if (__DEV__) console.log('[OAuth] Session created from deep link');
    return true;
  } catch (error: any) {
    // An already-consumed secret lands here when the in-process handler won the
    // race and completed the login first. That is a success, not a failure, so
    // it must not surface as an error to the user.
    if (__DEV__) console.log('[OAuth] Deep link session failed:', error?.message || error);
    reportAuthFailure('oauthDeepLinkSession', error);
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
      const session = await postSession('/account/sessions/email', { email, password });
      await adoptSession(session);
      return session;
    } catch (error) {
      reportAuthFailure('emailLogin', error);
      throw error;
    }
  },

  // ---------------------------------------------------------------------------
  // OAuth
  //
  // Google, Apple and Facebook were three ~60-line copies differing only by the
  // provider constant. They had already drifted -- only Google logged the
  // signed-in address -- so any fix had to be written three times or silently
  // applied to one provider. One implementation, three thin wrappers.
  // ---------------------------------------------------------------------------

  /**
   * Run the Appwrite OAuth2 token flow for one provider.
   *
   * The token flow returns userId+secret on the callback URL, and postSession()
   * exchanges those for a real session. postSession is the ONLY path that reads
   * the session out of the response headers, so it is the only one that works
   * on Android -- see captureSessionFromHeaders above.
   */
  async loginWithOAuthProvider(
    provider: OAuthProvider,
    label: string,
  ): Promise<Models.Session | null> {
    try {
      if (__DEV__) console.log(`[OAuth] Starting ${label} OAuth via Appwrite SDK...`);

      // auth.marketingtool.pro is the phone app's OAuth host, separate from the
      // web app. Nginx there redirects /oauth/success -> marketingtool://oauth/success.
      const successUrl = 'https://auth.marketingtool.pro/oauth/success';
      const failureUrl = 'https://auth.marketingtool.pro/oauth/failure';

      const oauthUrl = account.createOAuth2Token(provider, successUrl, failureUrl);
      if (!oauthUrl) throw new Error('Failed to generate OAuth URL');

      const result = await WebBrowser.openAuthSessionAsync(
        oauthUrl.toString(),
        'marketingtool://'
      );

      if (__DEV__) console.log(`[OAuth] ${label} browser result:`, result.type);

      if (result.type === 'cancel') {
        if (__DEV__) console.log(`[OAuth] ${label} cancelled by user`);
        return null;
      }

      if (result.type === 'success' && result.url) {
        if (result.url.includes('oauth/success') || result.url.includes('secret=')) {
          const { userId, secret } = parseCallbackParams(result.url);

          if (userId && secret) {
            const session = await postSession('/account/sessions/token', { userId, secret });
            await adoptSession(session);
            if (__DEV__) console.log(`[OAuth] ${label} session created from token`);
            return session;
          }

          // Callback carried no credentials. On Android this is terminal, and it
          // used to fail silently -- the user just landed back on onboarding.
          // Record presence only, never the secret, so the next occurrence is
          // diagnosable instead of guessed at.
          reportAuthFailure(`oauth${label}MissingParams`, {
            type: 'diagnostic',
            code: result.url.split('?')[0],
            message: `hasUserId=${!!userId} hasSecret=${!!secret}`,
          });
        }

        // Last resort: a session the browser established via cookies.
        //
        // This can only ever succeed on iOS. ASWebAuthenticationSession shares
        // the app's cookie store, so account.get() finds the session; Android's
        // Chrome Custom Tab shares nothing with the app, so account.get() goes
        // out anonymous and this branch cannot help. Kept because it costs one
        // request and does rescue the iOS flow when the callback had no params.
        try {
          const user = await account.get();
          if (user) {
            const { sessions } = await account.listSessions();
            // Prefer the CURRENT session. Taking sessions[0] adopted whichever
            // session happened to sort first, which is not necessarily the one
            // this login just created.
            const session = sessions.find((s) => s.current) ?? sessions[0];
            if (session) {
              await adoptSession(session);
              if (__DEV__) console.log(`[OAuth] ${label} session found for:`, user.email);
              return session;
            }
          }
        } catch {
          if (__DEV__) console.log(`[OAuth] No existing ${label} session`);
        }
      }

      return null;
    } catch (error: any) {
      if (__DEV__) console.error(`[OAuth] ${label} error:`, error?.message || error);
      reportAuthFailure(`oauth${label}`, error);
      throw error;
    }
  },

  loginWithGoogle(): Promise<Models.Session | null> {
    return this.loginWithOAuthProvider(OAuthProvider.Google, 'Google');
  },

  loginWithApple(): Promise<Models.Session | null> {
    return this.loginWithOAuthProvider(OAuthProvider.Apple, 'Apple');
  },

  loginWithFacebook(): Promise<Models.Session | null> {
    return this.loginWithOAuthProvider(OAuthProvider.Facebook, 'Facebook');
  },

  // Phone OTP is handled directly by Firebase Phone Auth. See src/store/authStore.ts.

  // Get Current User
  //
  // Only an auth rejection means "not signed in". This used to swallow EVERY
  // error and return null, so a dropped connection, DNS failure, TLS error or
  // 5xx was indistinguishable from a guest -- and checkAuth turned that into
  // isAuthenticated:false, i.e. a signed-in user thrown back to onboarding by
  // a bad network. That is the market this app's own comments call out (low-end
  // devices, poor connectivity), so it is not a rare path.
  //
  // 401/403 -> genuinely no session, return null.
  // Anything else -> transport-level, says nothing about the session, rethrow
  //                  and let the caller decide (checkAuth keeps prior state).
  async getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
    try {
      return await account.get();
    } catch (error: any) {
      const code = error?.code;
      if (code === 401 || code === 403) return null;
      throw error;
    }
  },

  // Logout
  //
  // The local teardown runs in `finally`. Previously it sat after the server
  // call, so a throw there -- an already-dead session, or no network -- skipped
  // it entirely and rethrew, leaving the session secret in SecureStore and the
  // X-Appwrite-Session header still attached to the client. The user believed
  // they had signed out while the device kept usable credentials.
  //
  // Clearing locally is always correct: the intent is to end the session on
  // THIS device, and a server session that outlives it expires on its own.
  async logout(): Promise<void> {
    try {
      await account.deleteSession('current');
    } finally {
      await deleteSession();
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
