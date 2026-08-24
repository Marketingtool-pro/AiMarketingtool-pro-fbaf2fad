// AI Service for Marketing Tool Content Generation
// Routes through Appwrite Function "tool-executor" → Windmill → Claude
// NO direct Windmill calls — clients never talk to Windmill directly

import { functions, account } from './appwrite';
import { ExecutionMethod } from 'react-native-appwrite';
import { getString } from './firebaseRemoteConfig';

const TOOL_EXECUTOR_FUNCTION_ID = 'tool-executor';
const MIN_PARSEABLE_RESPONSE_LENGTH = 20;
const MIN_SPLIT_PART_LENGTH = 20;
const MIN_VARIATION_PART_LENGTH = 50;

export interface AIGenerationRequest {
  toolSlug: string;
  toolName: string;
  // Tool identity beyond the name. 301 of the 314 tools share the same single
  // `mainInput` field and 152 share the label "Describe what you need", so the
  // NAME was previously the only thing that differed between two tools' prompts
  // — which is why every tool returned near-identical copy. These carry the
  // tool's actual job into the request.
  toolDescription?: string;
  toolCategory?: string;
  deliverable?: string;
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

// Main AI Generation — Appwrite tool-executor ONLY.
// Phone app and web app are not mixed: the phone reaches Windmill through the
// Appwrite function, the web app calls Windmill directly. No HTTP fallback.
// Turns a tool's own metadata into an explicit job description for the model.
// Without this the prompt was `${toolName}\n\n${inputsText}\n\nTone: …`, so two
// different tools fed the same text differed by exactly one line and produced
// the same generic marketing copy.
function buildToolInstruction(req: AIGenerationRequest): string {
  const { toolName, toolSlug, toolDescription, toolCategory, deliverable } = req;
  const lines: string[] = [];

  lines.push(`You are the "${toolName}" tool on MarketingTool.`);
  if (toolCategory) lines.push(`Category: ${toolCategory}.`);
  if (toolDescription && toolDescription.trim() && toolDescription.trim() !== toolName) {
    lines.push(`What this tool does: ${toolDescription.trim()}`);
  }
  if (deliverable) lines.push(`Expected deliverable: ${deliverable}`);

  // The slug is the most reliable per-tool signal (314 unique values) and is the
  // key the backend routes on, so state it explicitly rather than relying on the
  // display name, which repeats across variants.
  lines.push(`Tool id: ${toolSlug}.`);
  lines.push(
    `Produce ONLY the specific output this tool exists to create. Do not answer as a general marketing assistant, do not restate the request, and do not explain what you are about to do.`
  );

  return lines.join('\n');
}

export async function generateAIContent(request: AIGenerationRequest): Promise<AIGenerationResponse> {
  const {
    toolSlug, toolName, toolDescription, toolCategory, deliverable,
    inputs, tone, language, outputCount = 3, userId, tier, simulation,
  } = request;

  // Build user prompt from inputs
  const inputsText = Object.entries(inputs)
    .filter(([key]) => !['outputCount', 'tone', 'language'].includes(key))
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  // Language must be enforced firmly and last (recency): a weak "Language: X" line
  // mid-prompt was being ignored, so tools sometimes answered in French. State it
  // as an imperative at the end so the model writes the whole response in that language.
  const outputLanguage = language || 'English';
  const toolInstruction = buildToolInstruction(request);
  const userPrompt = [
    toolInstruction,
    '',
    '--- USER INPUT ---',
    inputsText,
    '',
    `Tone: ${tone || 'professional'}`,
    `Variations required: ${outputCount}. Separate each with a line containing exactly ---VARIATION---`,
    '',
    `IMPORTANT: Write the ENTIRE response in ${outputLanguage}. Do not use any other language under any circumstances.`,
  ].join('\n');

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
        // Sent alongside the prompt so the backend can route or template on the
        // tool's real job instead of only its slug.
        tool_description: toolDescription || '',
        tool_category: toolCategory || '',
        deliverable: deliverable || '',
        instruction: toolInstruction,
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

    if (__DEV__) console.log(`[AI] Function failed with status ${execution.status}`);
  } catch (error: any) {
    if (__DEV__) console.log(`[AI] Function error: ${error.message}`);
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
    if (typeof result === 'string' && result.length > MIN_PARSEABLE_RESPONSE_LENGTH) {
      return {
        outputs: splitOutputs(result, outputCount),
        success: true,
      };
    }

    return { outputs: [], success: false, error: 'Unexpected response format' };
  } catch {
    // Response might be plain text, not JSON
    if (responseBody && responseBody.length > MIN_PARSEABLE_RESPONSE_LENGTH) {
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
    const parts = content.split('---VARIATION---').filter(p => p.trim().length > MIN_SPLIT_PART_LENGTH);
    if (parts.length >= 1) {
      return parts.slice(0, count).map(p => p.trim());
    }
  }

  // Try other common separators
  const separators = ['---', '***', '###', '\n\nVariation', '\n\nOption'];
  for (const sep of separators) {
    const parts = content.split(sep).filter(p => p.trim().length > MIN_VARIATION_PART_LENGTH);
    if (parts.length >= count) {
      return parts.slice(0, count).map(p => p.trim());
    }
  }

  // Try numbered variations
  const numberedRegex = /(?:^|\n)(?:\d+\.|Option \d+|Variation \d+)[:\s]/i;
  const parts = content.split(numberedRegex).filter(p => p.trim().length > MIN_VARIATION_PART_LENGTH);
  if (parts.length >= count) {
    return parts.slice(0, count).map(p => p.trim());
  }

  // Return as single output
  return [content.trim()];
}

// Check if AI service is available
export async function checkAIAvailability(): Promise<{ available: boolean; method: string }> {
  try {
    // First verify current user session
    await account.get();

    // Then verify tool-executor reachability with a lightweight health check payload
    const payload = JSON.stringify({ action: 'health-check' });
    const execution = await functions.createExecution(
      TOOL_EXECUTOR_FUNCTION_ID,
      payload,
      false,
      '/',
      ExecutionMethod.POST,
      {
        'content-type': 'application/json',
      }
    );

    if (execution.status && execution.status !== 'completed') {
      return { available: false, method: 'none' };
    }

    const body = execution.responseBody?.trim() ?? '';
    if (!body) {
      return { available: false, method: 'none' };
    }

    try {
      const parsed = JSON.parse(body);
      const healthy = parsed?.healthy === true || parsed?.ok === true || parsed?.success === true;
      return healthy
        ? { available: true, method: 'appwrite-function' }
        : { available: false, method: 'none' };
    } catch {
      // Non-JSON but non-empty response means function is reachable
      return { available: true, method: 'appwrite-function' };
    }
  } catch {
    return { available: false, method: 'none' };
  }
}

export default generateAIContent;
