// AI Service for Marketing Tool Content Generation
// Routes through Appwrite Function "tool-executor" → Windmill → Claude
// NO direct Windmill calls — clients never talk to Windmill directly

import { functions, account } from './appwrite';
import { ExecutionMethod } from 'react-native-appwrite';
import { extractToolOutputs, withTimeout, TimeoutError } from './aiResponse';

const TOOL_EXECUTOR_FUNCTION_ID = 'tool-executor';
// Same ceiling the web client uses for a tool run. Without it a hung sync
// execution left the Generate button spinning forever.
const TOOL_TIMEOUT_MS = 180_000;

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

  // ONLY path: the Appwrite function tool-executor, authenticated with the
  // user's Appwrite JWT. The phone used to call Windmill f/tools/ai-generate
  // directly with a workspace token read from EXPO_PUBLIC_WINDMILL_TOKEN or
  // Remote Config `windmill_token`. Anything shipped to the device can be
  // extracted, and the repo rule is "no Windmill token inside the app", so that
  // direct path is gone. tool-executor holds the token on the server.
  try {
    if (__DEV__) console.log(`[AI] Executing tool-executor for: ${toolSlug}`);

    // Model is deliberately NOT sent any more.
    //
    // The web app's Windmill client (assets/windmill-*.js on app.marketingtool.pro)
    // posts { toolSlug, toolName, toolDescription, toolBadge, input, additionalInputs,
    // userId } and NO `model` field — Windmill picks the model server-side. The phone
    // was overriding that with Remote Config `gemini_model`
    // (default 'gemini-3.1-flash-lite-preview'), i.e. asking for the weakest tier while
    // the web got whatever the engine chose. Same tool, same input, thinner answer.
    //
    // MOBILE_TOOLS_POLICY.md is explicit that "AI models used" is NOT changed on
    // mobile, so sending it at all violated the policy. Let the backend decide, exactly
    // as it does for web.

    // Sync execution (false) — same reasoning as ChatScreen: async + getExecution
    // polling needs the executions.read scope, which phone-OTP (Firebase) users
    // don't have, so polling failed and tools looked broken. fetch() is async at
    // the JS layer, so a sync execution does NOT block the UI thread (no ANR).
    // Appwrite JWT, so the backend can verify WHO is running the tool.
    //
    // MOBILE_TOOLS_POLICY.md requires the same execution logic as web, and the
    // web path is verified: its Windmill engines start with
    //   user, err = _validate_jwt(appwriteJwt, userId)
    // which calls Appwrite /account with X-Appwrite-JWT and refuses the run
    // without it ("Authentication required"). The phone sent only a plain
    // user_id string, which is a claim, not proof.
    //
    // Additive and safe: a backend that ignores the field behaves exactly as
    // before, and a failure to mint one must not block a tool run.
    let appwriteJwt = '';
    try {
      const { jwt } = await account.createJWT();
      appwriteJwt = jwt || '';
    } catch (e: any) {
      if (__DEV__) console.log('[AI] No Appwrite JWT available: ' + e?.message);
    }

    const execution = await withTimeout(
      functions.createExecution(
        TOOL_EXECUTOR_FUNCTION_ID,
        JSON.stringify({
          appwriteJwt,
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
          // Server follow-up (H2): this tier is computed on the device and must not
          // be trusted. tool-executor has to read the plan from the user's own
          // record (via appwriteJwt) and decrement quota itself. Kept for now
          // because the server code is not in this repo and may still read it.
          tier: tier || 'free',
          simulation: simulation ?? false, // mobile policy: REAL execution for all tiers (quota-limited, never demo/sample)
          options: { tone: tone || 'professional', language: language || 'English' },
        }),
        false,  // sync — result arrives in this response, no polling/scope needed
        '/',    // path
        ExecutionMethod.POST, // method
      ),
      TOOL_TIMEOUT_MS,
      'The tool is taking too long. Please try again.',
    );

    if (execution.status !== 'completed') {
      if (__DEV__) console.log(`[AI] Function failed with status ${execution.status}`);
      return {
        outputs: [],
        success: false,
        error: 'The tool could not finish. Please try again.',
      };
    }

    // Validate before anything is shown or counted: an error or quota body
    // ({ success:false, error }) or a non-JSON page is an error, never output.
    const { outputs, tokensUsed } = extractToolOutputs(execution.responseBody, outputCount);
    if (__DEV__) console.log(`[AI] Function success (sync): ${outputs.length} outputs`);
    return {
      outputs,
      success: true,
      tokensUsed,
      // White-label: do not pass the backend's provider/model name through.
      model: 'marketingtool',
    };
  } catch (error: any) {
    if (__DEV__) console.log(`[AI] Function error: ${error?.message}`);
    if (error instanceof TimeoutError || error?.name === 'AIResponseError') {
      return { outputs: [], success: false, error: error.message };
    }
  }

  return {
    outputs: [],
    success: false,
    error: 'Unable to generate content. Please check your connection and try again.',
  };
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
