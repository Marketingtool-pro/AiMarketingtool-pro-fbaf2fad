// Pure helpers for the tool-output components. No React Native imports, so they
// run under `bun test`.

export type ActionStatus = 'idle' | 'loading' | 'success' | 'error';
export interface ActionState {
  status: ActionStatus;
  message?: string;
}
export type ActionStates = Record<string, ActionState>;

export type ActionEvent =
  | { type: 'start'; key: string }
  | { type: 'success'; key: string }
  | { type: 'error'; key: string; message?: string }
  | { type: 'reset'; key: string };

/** idle → loading → success | error; reset returns to idle. */
export function actionReducer(states: ActionStates, event: ActionEvent): ActionStates {
  switch (event.type) {
    case 'start':
      return { ...states, [event.key]: { status: 'loading' } };
    case 'success':
      return { ...states, [event.key]: { status: 'success' } };
    case 'error':
      return { ...states, [event.key]: { status: 'error', message: event.message || 'Something went wrong' } };
    case 'reset':
      return { ...states, [event.key]: { status: 'idle' } };
    default:
      return states;
  }
}

export function statusOf(states: ActionStates, key: string): ActionStatus {
  return states[key]?.status ?? 'idle';
}

/** True when the toolbar has something to act on. */
export function hasOutput(output: unknown): output is string {
  return typeof output === 'string' && output.trim().length > 0;
}

/** A filesystem-safe base name, e.g. "Ad Copy Generator!" -> "ad-copy-generator". */
export function safeFileName(name: string | undefined | null, fallback = 'result'): string {
  const base = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || fallback;
}
