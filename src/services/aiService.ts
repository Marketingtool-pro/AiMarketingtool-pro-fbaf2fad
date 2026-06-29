// AI Service for Marketing Tool Content Generation
// Routes through Appwrite Function "tool-executor" → Windmill → Claude
// NO direct Windmill calls — clients never talk to Windmill directly

import { functions, account } from './appwrite';
import { ExecutionMethod } from 'react-native-appwrite';
import { getString } from './firebaseRemoteConfig';

const TOOL_EXECUTOR_FUNCTION_ID = 'tool-executor';
const NEXTJS_API_BASE = 'https://app.marketingtool.pro';

export interface AIGenerationRequest {
  toolSlug: string;
  toolName: string;
  inputs: Record<string, any>;
  tone?: string;
  language?: string;
  outputCount?: number;
  userId?: string;
  // Plan enforcement: the server (tool-executor → Windmill) uses these to gate
  // by plan — Free tier runs in simulation mode, paid tiers get real execution
  // (matches marketingtool.pro/pricing: "we limit usage, not access").
  tier?: string;
  simulation?: boolean;
}

export interface AIGenerationResponse {
  outputs: string[];
  success: boolean;
  error?: string;
  tokensUsed?: number;
  model?: string;
}

// Main AI Generation — calls Appwrite Function, falls back to Next.js API
export async function generateAIContent(request: AIGenerationRequest): Promise<AIGenerationResponse> {
  const { toolSlug, toolName, inputs, tone, language, outputCount = 3, userId, tier, simulation } = request;

  // Build user prompt from inputs
  const inputsText = Object.entries(inputs)
    .filter(([key]) => !['outputCount', 'tone', 'language'].includes(key))
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  // Language must be enforced firmly and last (recency): a weak "Language: X" line
  // mid-prompt was being ignored, so tools sometimes answered in French. State it
  // as an imperative at the end so the model writes the whole response in that language.
  const outputLanguage = language || 'English';
  const userPrompt = `${toolName}\n\n${inputsText}\n\nTone: ${tone || 'professional'}\n\nIMPORTANT: Write the ENTIRE response in ${outputLanguage}. Do not use any other language under any circumstances.`;

  // Primary: Appwrite Function (tool-executor → Windmill → Claude)
  try {
    if (__DEV__) console.log(`[AI] Executing tool-executor for: ${toolSlug}`);

    // Read model from Remote Config (falls back to 'gemini-2.5-flash-lite' if not fetched)
    const geminiModel = getString('gemini_model');

    // Sync execution (false) — same reasoning as ChatScreen: async + getExecution
    // polling needs the executions.read scope, which phone-OTP (Firebase) users
    // don't have, so polling failed and tools looked broken. fetch() is async at
    // the JS layer, so a sync execution does NOT block the UI thread (no ANR).
    const execution = await functions.createExecution(
      TOOL_EXECUTOR_FUNCTION_ID,
      JSON.stringify({
        tool_slug: toolSlug,
        tool_name: toolName,
        input: userPrompt,
        inputs: { ...inputs, tone: tone || 'professional', language: language || 'English' },
        output_count: outputCount,
        user_id: userId,
        tier: tier || 'free',
        simulation: simulation ?? false, // mobile policy: REAL execution for all tiers (quota-limited, never demo/sample)
        options: { tone: tone || 'professional', language: language || 'English' },
        model: geminiModel,
      }),
      false,  // sync — result arrives in this response, no polling/scope needed
      '/',    // path
      ExecutionMethod.POST, // method
    );

    // Sync executions return the result directly.
    if (execution.status === 'completed') {
      const result = parseExecutionResponse(execution.responseBody, outputCount);
      if (result.success && result.outputs.length > 0) {
        if (__DEV__) console.log(`[AI] Function success (sync): ${result.outputs.length} outputs`);
        return result;
      }
    }

    // Polling for the result
    let status = execution.status;
    let executionId = execution.$id;
    let attempts = 0;
    const maxAttempts = 45; // Longer timeout for complex tools

    while ((status === 'waiting' || status === 'processing') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const updatedExecution = await functions.getExecution(TOOL_EXECUTOR_FUNCTION_ID, executionId);
      status = updatedExecution.status;
      
      if (status === 'completed') {
        const result = parseExecutionResponse(updatedExecution.responseBody, outputCount);
        if (result.success && result.outputs.length > 0) {
          if (__DEV__) console.log(`[AI] Function success: ${result.outputs.length} outputs`);
          return result;
        }
      }
      attempts++;
    }

    if (__DEV__) console.log(`[AI] Function timed out or failed with status ${status}, trying fallback`);
  } catch (error: any) {
    if (__DEV__) console.log(`[AI] Function error: ${error.message}, trying fallback`);
  }

  // Fallback: Call Next.js API directly (middleware supports Bearer auth)
  try {
    if (__DEV__) console.log(`[AI] Fallback: calling Next.js API for ${toolSlug}`);

    // createJWT requires an Appwrite session — phone-OTP (Firebase) users have
    // none. Send the request without a bearer in that case instead of dying.
    let bearer = '';
    try {
      const jwt = await account.createJWT();
      bearer = `Bearer ${jwt.jwt}`;
    } catch {
      if (__DEV__) console.log('[AI] No Appwrite session for JWT — calling API without bearer');
    }

    const response = await fetch(`${NEXTJS_API_BASE}/api/tools/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: bearer } : {}),
      },
      body: JSON.stringify({
        tool: toolSlug,
        input: userPrompt,
        options: { tone: tone || 'professional', language: language || 'English' },
        model: getString('gemini_model'),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.output) {
        if (__DEV__) console.log(`[AI] API fallback success`);
        return {
          outputs: splitOutputs(data.output, outputCount),
          success: true,
          // White-label: never surface the underlying provider/model name to the
          // client. Tag results with our own brand engine, not "claude".
          model: 'marketingtool',
        };
      }
    }

    // Try the simpler /api/generate endpoint
    const response2 = await fetch(`${NEXTJS_API_BASE}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: bearer } : {}),
      },
      body: JSON.stringify({
        tool: toolSlug,
        input: userPrompt,
        tone: tone || 'Professional',
        language: language || 'English',
      }),
    });

    if (response2.ok) {
      const data2 = await response2.json();
      if (data2.result) {
        return {
          outputs: splitOutputs(data2.result, outputCount),
          success: true,
          // White-label: ignore any provider/model name the backend returns
          // (could be "claude"/"gemini") and report our own brand engine.
          model: 'marketingtool',
        };
      }
    }
  } catch (fallbackError: any) {
    if (__DEV__) console.error('[AI] Fallback also failed:', fallbackError.message);
  }

  return {
    outputs: [],
    success: false,
    error: 'Unable to generate content. Please check your connection and try again.',
  };
}

// Parse the Appwrite Function execution response
function parseExecutionResponse(responseBody: string, outputCount: number): AIGenerationResponse {
  try {
    const result = JSON.parse(responseBody);

    // Handle various response formats from the function
    if (result.error) {
      return { outputs: [], success: false, error: result.error };
    }

    // Format 1: { outputs: [...] }
    if (result.outputs) {
      let outputs = result.outputs;
      if (typeof outputs === 'string') {
        outputs = splitOutputs(outputs, outputCount);
      } else if (Array.isArray(outputs) && outputs.length === 1 && typeof outputs[0] === 'string') {
        outputs = splitOutputs(outputs[0], outputCount);
      }
      return {
        outputs,
        success: true,
        tokensUsed: result.tokensUsed || result.tokens_used,
        // White-label: do not pass the backend's provider/model name through.
        model: 'marketingtool',
      };
    }

    // Format 2: { result: "..." } or { output: "..." }
    const content = result.result || result.output || result.content || result.text;
    if (content) {
      return {
        outputs: splitOutputs(String(content), outputCount),
        success: true,
        tokensUsed: result.tokensUsed || result.tokens_used,
        // White-label: do not pass the backend's provider/model name through.
        model: 'marketingtool',
      };
    }

    // Format 3: Raw string response
    if (typeof result === 'string' && result.length > 20) {
      return {
        outputs: splitOutputs(result, outputCount),
        success: true,
      };
    }

    return { outputs: [], success: false, error: 'Unexpected response format' };
  } catch {
    // Response might be plain text, not JSON
    if (responseBody && responseBody.length > 20) {
      return {
        outputs: splitOutputs(responseBody, outputCount),
        success: true,
      };
    }
    return { outputs: [], success: false, error: 'Failed to parse response' };
  }
}

// Split AI response into separate outputs
function splitOutputs(content: string, count: number): string[] {
  // Try custom separator first
  if (content.includes('---VARIATION---')) {
    const parts = content.split('---VARIATION---').filter(p => p.trim().length > 20);
    if (parts.length >= 1) {
      return parts.slice(0, count).map(p => p.trim());
    }
  }

  // Try other common separators
  const separators = ['---', '***', '###', '\n\nVariation', '\n\nOption'];
  for (const sep of separators) {
    const parts = content.split(sep).filter(p => p.trim().length > 50);
    if (parts.length >= count) {
      return parts.slice(0, count).map(p => p.trim());
    }
  }

  // Try numbered variations
  const numberedRegex = /(?:^|\n)(?:\d+\.|Option \d+|Variation \d+)[:\s]/i;
  const parts = content.split(numberedRegex).filter(p => p.trim().length > 50);
  if (parts.length >= count) {
    return parts.slice(0, count).map(p => p.trim());
  }

  // Return as single output
  return [content.trim()];
}

// Check if AI service is available
export async function checkAIAvailability(): Promise<{ available: boolean; method: string }> {
  try {
    // Check Appwrite Function health by verifying current user session
    await account.get();
    return { available: true, method: 'appwrite-function' };
  } catch {
    return { available: false, method: 'none' };
  }
}

export default generateAIContent;
