import { test, expect, describe } from 'bun:test';
import {
  assertToolSuccess,
  splitOutputs,
  extractToolOutputs,
  extractChatReply,
  parseFunctionJson,
  isNetworkError,
  withTimeout,
  TimeoutError,
  buildConversationHistory,
  removeFailedTurn,
  type ChatMessageLike,
} from './aiResponse';

const LONG = 'A real generated answer that is long enough to count.';

describe('assertToolSuccess', () => {
  test('accepts a success body with a result string', () => {
    expect(assertToolSuccess({ success: true, result: LONG })).toEqual({ text: LONG, tokensUsed: undefined });
  });

  test('accepts an outputs array and keeps token usage', () => {
    expect(assertToolSuccess({ outputs: ['one', 'two'], tokens_used: 42 })).toEqual({
      outputs: ['one', 'two'],
      tokensUsed: 42,
    });
  });

  test('throws on success:false and uses the server message', () => {
    expect(() => assertToolSuccess({ success: false, error: 'Monthly limit reached' })).toThrow('Monthly limit reached');
  });

  test('throws on success:false even when a result is present', () => {
    expect(() => assertToolSuccess({ success: false, result: LONG })).toThrow();
  });

  test('throws on an error field without success flag', () => {
    expect(() => assertToolSuccess({ error: 'Quota exceeded', result: LONG })).toThrow('Quota exceeded');
  });

  test('throws on an error object', () => {
    expect(() => assertToolSuccess({ error: { message: 'Upstream failed' } })).toThrow('Upstream failed');
  });

  test('throws when the result is missing', () => {
    expect(() => assertToolSuccess({ success: true })).toThrow('empty result');
  });

  test('throws when the result is empty or whitespace', () => {
    expect(() => assertToolSuccess({ success: true, result: '   ' })).toThrow('empty result');
    expect(() => assertToolSuccess({ outputs: [] })).toThrow('empty result');
    expect(() => assertToolSuccess({ outputs: ['', '  '] })).toThrow('empty result');
  });

  test('throws on non-object bodies', () => {
    expect(() => assertToolSuccess(null)).toThrow();
    expect(() => assertToolSuccess('text')).toThrow();
    expect(() => assertToolSuccess([LONG])).toThrow();
  });
});

describe('splitOutputs', () => {
  test('splits on the explicit ---VARIATION--- marker and caps to count', () => {
    const text = ['First variation, long enough.', 'Second variation, long enough.', 'Third variation, long enough.']
      .join('\n---VARIATION---\n');
    expect(splitOutputs(text, 2)).toEqual(['First variation, long enough.', 'Second variation, long enough.']);
  });

  test('keeps markdown with --- and ### as ONE output', () => {
    const md = '### Headline\nSome intro text here.\n\n---\n\n### Body\nMore content goes here.\n\n***\n\nEnd.';
    expect(splitOutputs(md, 3)).toEqual([md]);
  });

  test('keeps a numbered list as ONE output', () => {
    const list = '1. First idea with detail\n2. Second idea with detail\n3. Third idea with detail';
    expect(splitOutputs(list, 3)).toEqual([list]);
  });

  test('returns the whole text when marker parts are too short', () => {
    expect(splitOutputs('a ---VARIATION--- b', 3)).toEqual(['a \n b']);
  });
});

describe('extractToolOutputs', () => {
  test('parses a JSON string body and splits on the marker', () => {
    const body = JSON.stringify({ result: `${LONG}\n---VARIATION---\n${LONG} again` });
    expect(extractToolOutputs(body, 3).outputs).toEqual([LONG, `${LONG} again`]);
  });

  test('a quota JSON body is an error, not output', () => {
    expect(() => extractToolOutputs('{"success":false,"error":"Generation limit reached"}', 3)).toThrow(
      'Generation limit reached',
    );
  });

  test('a non-JSON body (HTML error page) is an error, not output', () => {
    expect(() => extractToolOutputs('<html><body>502 Bad Gateway</body></html>', 3)).toThrow('unexpected response');
  });

  test('an empty body is an error', () => {
    expect(() => extractToolOutputs('', 3)).toThrow('empty response');
  });
});

describe('extractChatReply', () => {
  test('reads the reply', () => {
    expect(extractChatReply('{"response":"Hello there"}')).toBe('Hello there');
  });

  test('non-JSON body throws instead of becoming the reply', () => {
    expect(() => extractChatReply('<html>502</html>')).toThrow();
  });

  test('empty body throws', () => {
    expect(() => extractChatReply('')).toThrow();
  });

  test('error body throws', () => {
    expect(() => extractChatReply({ success: false, message: 'down' })).toThrow('down');
  });

  test('missing reply throws instead of returning canned text', () => {
    expect(() => extractChatReply({ success: true })).toThrow('empty reply');
  });
});

describe('parseFunctionJson', () => {
  test('passes objects through', () => {
    const o = { a: 1 };
    expect(parseFunctionJson(o)).toBe(o);
  });
});

describe('isNetworkError', () => {
  test('true for a fetch failure wrapped with code 0', () => {
    expect(isNetworkError({ code: 0, message: 'Network request failed' })).toBe(true);
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
  });

  test('false for HTTP errors, timeouts and other errors', () => {
    expect(isNetworkError({ code: 500, message: 'Network request failed' })).toBe(false);
    expect(isNetworkError({ code: 401, message: 'Unauthorized' })).toBe(false);
    expect(isNetworkError(new TimeoutError())).toBe(false);
    expect(isNetworkError(new Error('The server returned an unexpected response.'))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});

describe('withTimeout', () => {
  test('resolves when the promise wins', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 50)).resolves.toBe('ok');
  });

  test('rejects with TimeoutError when too slow', async () => {
    const slow = new Promise((r) => setTimeout(() => r('late'), 200));
    await expect(withTimeout(slow, 10)).rejects.toBeInstanceOf(TimeoutError);
  });
});

describe('chat history', () => {
  const msgs: ChatMessageLike[] = [
    { id: '1', role: 'user', content: 'hi' },
    { id: '2', role: 'assistant', content: 'hello' },
    { id: '3', role: 'user', content: 'write an ad' },
    { id: '4', role: 'assistant', content: "Sorry, I couldn't get a reply.", isError: true },
  ];

  test('error notices are excluded from history', () => {
    expect(buildConversationHistory(msgs)).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'write an ad' },
    ]);
  });

  test('history is limited to the last N messages', () => {
    expect(buildConversationHistory(msgs, 2)).toEqual([
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'write an ad' },
    ]);
  });

  test('removeFailedTurn drops the error and its user message', () => {
    expect(removeFailedTurn(msgs, '4').map((m) => m.id)).toEqual(['1', '2']);
  });

  test('removeFailedTurn with an unknown id changes nothing', () => {
    expect(removeFailedTurn(msgs, 'x').map((m) => m.id)).toEqual(['1', '2', '3', '4']);
  });
});
