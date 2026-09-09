// Windmill client for the phone app.
//
// This is a deliberate, faithful port of the web app's own Windmill client
// (assets/windmill-*.js on app.marketingtool.pro). One product, one backend:
// the phone must reach the same scripts, with the same payload, as the web app.
//
// What the web client does, and therefore what this does:
//
//   POST https://wm.marketingtool.pro/api/w/marketingtool-pro
//        /jobs/run_wait_result/p/f/tools/ai-generate
//   headers: Content-Type: application/json, Authorization: Bearer <workspace token>
//   body:    { toolSlug, toolName, toolDescription, toolBadge,
//              input: mainInput.slice(0, 5000), additionalInputs, userId,
//              appwriteJwt }
//
// Two things about that payload matter, because the phone used to get both wrong:
//
//   1. There is NO `model` field. Windmill picks the model server-side. The phone
//      was pinning Remote Config `gemini_model` and so asked for a weaker model
//      than the web app got for the same tool.
//
//   2. `input` is the RAW user text, not a composed prompt. The per-tool
//      instructions live in the `f/tools/ai-generate` script on Windmill, keyed by
//      toolSlug. The phone used to build its own instruction on-device and send
//      that instead, which OVERRODE the real server template — the reason mobile
//      answers read as generic marketing copy while web answers are on-task.
//
// Auth is Appwrite on both platforms; Windmill identifies the caller from the
// Appwrite JWT carried in the body, exactly as the web client does.

import { account } from './appwrite';
import { getString } from './firebaseRemoteConfig';

const WINDMILL_BASE = 'https://wm.marketingtool.pro/api/w/marketingtool-pro';

// Generic tool execution. The web app's tool-detail page passes no engineType, so
// it falls through to this script; the specialised engine-* routes belong to the
// Campaigns / Automate / Intelligence pages, not to a plain tool run.
const AI_GENERATE_PATH = '/jobs/run_wait_result/p/f/tools/ai-generate';

// Matches the web client's tool timeout (180s). Tool runs are genuinely slow.
const TOOL_TIMEOUT_MS = 180_000;

// The workspace token is NOT committed. It is read from the build-time env var
// first, then Firebase Remote Config so it can be rotated without a rebuild.
// When neither is set, callers fall back to the Appwrite tool-executor path.
function getWorkspaceToken(): string {
  const fromEnv = process.env.EXPO_PUBLIC_WINDMILL_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  try {
    return getString('windmill_token')?.trim() || '';
  } catch {
    return '';
  }
}

export function isWindmillConfigured(): boolean {
  return getWorkspaceToken().length > 0;
}

// Appwrite JWTs are short-lived, so mint one per call rather than caching it.
// A guest (or a failure) yields '', which is what the web client also sends when
// localStorage has no session.
async function getAppwriteJwt(): Promise<string> {
  try {
    const { jwt } = await account.createJWT();
    return jwt || '';
  } catch {
    return '';
  }
}

async function windmillPost<T = any>(path: string, body: Record<string, any>): Promise<T> {
  const token = getWorkspaceToken();
  if (!token) throw new Error('Windmill is not configured');

  const payload = { ...body, appwriteJwt: await getAppwriteJwt() };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TOOL_TIMEOUT_MS);

  try {
    const response = await fetch(`${WINDMILL_BASE}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => 'Unknown error');
      throw new Error(`Request failed (${response.status}): ${detail}`);
    }

    return (await response.json()) as T;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export interface RunToolArgs {
  toolSlug: string;
  toolName: string;
  toolDescription?: string;
  toolBadge?: string;
  mainInput: string;
  additionalInputs?: Record<string, any>;
  userId: string;
}

/**
 * Run a tool through Windmill with the web app's exact payload.
 *
 * Returns the raw response. The web app reads it as
 * `typeof r === 'string' ? r : r?.result`, so callers should do the same.
 */
export async function runTool({
  toolSlug,
  toolName,
  toolDescription,
  toolBadge,
  mainInput,
  additionalInputs = {},
  userId,
}: RunToolArgs): Promise<any> {
  return windmillPost(AI_GENERATE_PATH, {
    toolSlug,
    toolName,
    toolDescription: toolDescription || '',
    toolBadge: toolBadge || '',
    // The 5000-char cap is the web client's, kept so both platforms truncate
    // identically rather than one silently sending more than the other.
    input: mainInput.slice(0, 5000),
    additionalInputs,
    userId,
  });
}

/** Normalise a Windmill tool response the way the web app's tool-detail page does. */
export function readToolResult(response: any): string {
  if (typeof response === 'string') return response;
  if (response?.result != null) {
    return typeof response.result === 'string'
      ? response.result
      : JSON.stringify(response.result, null, 2);
  }
  return JSON.stringify(response, null, 2);
}
