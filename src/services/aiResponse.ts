// Pure helpers for reading AI function responses on the phone.
//
// No React Native imports on purpose: these run under `bun test`.
//
// Why this exists: error and quota-block bodies such as
// `{ success: false, error: "Monthly limit reached" }` used to be shown to the
// user as AI output AND counted as a used generation. A 502 HTML page from the
// gateway was shown as a chat reply. Every response is now checked here before
// the app treats it as a result.

const VARIATION_MARKER = '---VARIATION---';
const MIN_VARIATION_PART_LENGTH = 20;

export class TimeoutError extends Error {
  constructor(message = 'The request took too long. Please try again.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class AIResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIResponseError';
  }
}

type JsonObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function errorText(body: JsonObject, fallback: string): string {
  if (nonEmptyString(body.error)) return body.error;
  if (isPlainObject(body.error) && nonEmptyString(body.error.message)) return body.error.message;
  if (nonEmptyString(body.message)) return body.message;
  return fallback;
}

/**
 * Parse an Appwrite function `responseBody` strictly.
 * Empty and non-JSON bodies (for example an HTML 502 page) are errors, never content.
 */
export function parseFunctionJson(responseBody: unknown): unknown {
  if (isPlainObject(responseBody)) return responseBody;
  if (typeof responseBody !== 'string' || responseBody.trim().length === 0) {
    throw new AIResponseError('The server returned an empty response.');
  }
  try {
    return JSON.parse(responseBody);
  } catch {
    throw new AIResponseError('The server returned an unexpected response.');
  }
}

export interface ToolSuccessBody {
  /** Either a list of outputs or one text that may hold ---VARIATION--- markers. */
  outputs?: string[];
  text?: string;
  tokensUsed?: number;
}

/**
 * Throw unless `body` is a real, successful tool result.
 *
 * Rejects: non-objects, `success === false`, any `error` field, and a missing or
 * empty result. Returns the result content so callers never re-read the raw body.
 */
export function assertToolSuccess(body: unknown): ToolSuccessBody {
  if (!isPlainObject(body)) {
    throw new AIResponseError('The server returned an unexpected response.');
  }
  if (body.success === false) {
    throw new AIResponseError(errorText(body, 'The tool could not finish. Please try again.'));
  }
  if (body.error !== undefined && body.error !== null && body.error !== '' && body.error !== false) {
    throw new AIResponseError(errorText(body, 'The tool could not finish. Please try again.'));
  }

  const tokens = body.tokensUsed ?? body.tokens_used;
  const tokensUsed = typeof tokens === 'number' ? tokens : undefined;

  if (Array.isArray(body.outputs)) {
    const outputs = body.outputs.filter(nonEmptyString).map((o) => o.trim());
    if (outputs.length > 0) return { outputs, tokensUsed };
  } else if (nonEmptyString(body.outputs)) {
    return { text: body.outputs, tokensUsed };
  }

  for (const key of ['result', 'output', 'content', 'text'] as const) {
    if (nonEmptyString(body[key])) return { text: body[key] as string, tokensUsed };
  }

  throw new AIResponseError('The tool returned an empty result. Please try again.');
}

/**
 * Split a result into variations ONLY on the explicit ---VARIATION--- marker.
 *
 * Markdown separators (`---`, `***`, `###`) and numbered lists are content, not
 * variation markers. Splitting on them cut one answer into fake "Option 1/2/3" tabs.
 */
export function splitOutputs(content: string, count: number): string[] {
  const trimmed = content.trim();
  if (!trimmed.includes(VARIATION_MARKER)) return [trimmed];
  const parts = trimmed
    .split(VARIATION_MARKER)
    .map((p) => p.trim())
    .filter((p) => p.length >= MIN_VARIATION_PART_LENGTH);
  if (parts.length === 0) return [trimmed.split(VARIATION_MARKER).join('\n').trim()];
  return parts.slice(0, Math.max(1, count));
}

/** Parse, validate and split a tool-executor response body into outputs. */
export function extractToolOutputs(
  responseBody: unknown,
  count: number,
): { outputs: string[]; tokensUsed?: number } {
  const ok = assertToolSuccess(parseFunctionJson(responseBody));
  if (ok.outputs && ok.outputs.length > 1) {
    return { outputs: ok.outputs.slice(0, Math.max(1, count)), tokensUsed: ok.tokensUsed };
  }
  const single = ok.outputs?.[0] ?? ok.text ?? '';
  return { outputs: splitOutputs(single, count), tokensUsed: ok.tokensUsed };
}

/** Read the assistant reply from a chat-ai response body, or throw. Never returns canned text. */
export function extractChatReply(responseBody: unknown): string {
  const body = parseFunctionJson(responseBody);
  if (!isPlainObject(body)) throw new AIResponseError('The assistant returned an unexpected response.');
  if (body.success === false || (body.error !== undefined && body.error !== null && body.error !== '' && body.error !== false)) {
    throw new AIResponseError(errorText(body, 'The assistant could not reply.'));
  }
  for (const key of ['response', 'content', 'message', 'result', 'text'] as const) {
    if (nonEmptyString(body[key])) return body[key] as string;
  }
  throw new AIResponseError('The assistant returned an empty reply.');
}

/**
 * True only when the request never got a response (offline, DNS, connection reset).
 * The Appwrite SDK wraps fetch failures as AppwriteException with code 0.
 * HTTP errors carry a real status code, and timeouts are TimeoutError: neither is
 * retried, because the server may already have done the work.
 */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if (error instanceof TimeoutError) return false;
  const e = error as { code?: unknown; message?: unknown };
  if (typeof e.code === 'number' && e.code !== 0) return false;
  const message = typeof e.message === 'string' ? e.message : '';
  return /network request failed|failed to fetch|network ?error|load failed|internet connection appears to be offline/i.test(message);
}

/** Reject with TimeoutError after `ms`. The underlying request is not cancelled. */
export function withTimeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export interface ChatMessageLike {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

/** History sent to the server: error notices are never part of the conversation. */
export function buildConversationHistory(
  messages: readonly ChatMessageLike[],
  limit = 10,
): { role: 'user' | 'assistant'; content: string }[] {
  return messages
    .filter((m) => !m.isError)
    .slice(-limit)
    .map((m) => ({ role: m.role, content: m.content }));
}

/**
 * Remove a failed turn before a retry: the error notice and the user message right
 * before it, so the retried message is not duplicated in the history.
 */
export function removeFailedTurn<T extends ChatMessageLike>(messages: readonly T[], errorId: string): T[] {
  const index = messages.findIndex((m) => m.id === errorId);
  if (index === -1) return [...messages];
  const start = index > 0 && messages[index - 1].role === 'user' ? index - 1 : index;
  return [...messages.slice(0, start), ...messages.slice(index + 1)];
}
