// AI Service for Marketing Tool Content Generation
// PRIMARY (Mobile Pro): Appwrite Function "tool-executor" → VPS 1 (Windmill) → Claude/Gemini
// FALLBACK: Firebase Functions (Genkit + Gemini + Firestore history)

import { functions, account } from './appwrite';
import { ExecutionMethod } from 'react-native-appwrite';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

const TOOL_EXECUTOR_FUNCTION_ID = 'tool-executor';
const CHAT_AI_FUNCTION_ID = 'chat-ai';
const NEXTJS_API_BASE = 'https://app.marketingtool.pro';

// Firebase Functions instance (Fallback Only)
let _firebaseFunctions: any = null;
function getFirebaseFunctions() {
  if (!_firebaseFunctions) {
    try {
      _firebaseFunctions = getFunctions();
    } catch (e) {
      if (__DEV__) console.log('[AI] Firebase Functions not available');
    }
  }
  return _firebaseFunctions;
}

export interface AIGenerationRequest {
  toolSlug: string;
  toolName: string;
  inputs: Record<string, any>;
  tone?: string;
  language?: string;
  outputCount?: number;
  userId?: string;
}

export interface AIGenerationResponse {
  outputs: string[];
  success: boolean;
  error?: string;
  tokensUsed?: number;
  model?: string;
}

/**
 * Main AI Generation — Optimized for Mobile Pro (VPS 1)
 */
export async function generateAIContent(request: AIGenerationRequest): Promise<AIGenerationResponse> {
  const { toolSlug, toolName, inputs, tone, language, outputCount = 3, userId } = request;

  // Build user prompt from inputs
  const inputsText = Object.entries(inputs)
    .filter(([key]) => !['outputCount', 'tone', 'language'].includes(key))
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  const userPrompt = `${toolName}\n\n${inputsText}\n\nTone: ${tone || 'professional'}\nLanguage: ${language || 'English'}`;

  // 1. PRIMARY: Appwrite Function (Direct connection to VPS 1 / Windmill)
  try {
    if (__DEV__) console.log(`[AI] VPS 1 Tool Executor for: ${toolSlug}`);

    const execution = await functions.createExecution(
      TOOL_EXECUTOR_FUNCTION_ID,
      JSON.stringify({
        tool_slug: toolSlug,
        tool_name: toolName,
        input: userPrompt,
        inputs: { ...inputs, tone: tone || 'professional', language: language || 'English' },
        output_count: outputCount,
        user_id: userId,
        options: { tone: tone || 'professional', language: language || 'English' },
      }),
      false, '/', ExecutionMethod.POST,
    );

    if (execution.responseStatusCode >= 200 && execution.responseStatusCode < 300) {
      const result = parseExecutionResponse(execution.responseBody, outputCount);
      if (result.success && result.outputs.length > 0) {
        if (__DEV__) console.log(`[AI] VPS 1 success: ${result.outputs.length} outputs`);
        return result;
      }
    }
  } catch (error: any) {
    if (__DEV__) console.log(`[AI] VPS 1 error: ${error.message}, trying Firebase fallback`);
  }

  // 2. FALLBACK: Firebase Functions + Genkit
  try {
    const fb = getFirebaseFunctions();
    if (fb) {
      if (__DEV__) console.log(`[AI] Firebase Fallback for: ${toolSlug}`);
      const callable = httpsCallable(fb, 'toolExecutor');
      const result: any = await callable({
        toolSlug,
        toolName,
        inputs: { ...inputs, tone: tone || 'professional', language: language || 'English' },
        input: userPrompt,
        outputCount,
        userId,
      });
      if (result.data?.success && result.data?.outputs?.length > 0) {
        return {
          outputs: result.data.outputs,
          success: true,
          model: result.data.model,
          tokensUsed: result.data.tokensUsed,
        };
      }
    }
  } catch (error: any) {
    if (__DEV__) console.log(`[AI] Firebase error: ${error.message}`);
  }

  // 3. LAST RESORT: Next.js API
  try {
    const jwt = await account.createJWT();
    const response = await fetch(`${NEXTJS_API_BASE}/api/tools/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt.jwt}`,
      },
      body: JSON.stringify({
        tool: toolSlug,
        input: userPrompt,
        options: { tone: tone || 'professional', language: language || 'English' },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.output) {
        return {
          outputs: splitOutputs(data.output, outputCount),
          success: true,
          model: 'claude',
        };
      }
    }
  } catch (fallbackError: any) {
    if (__DEV__) console.error('[AI] All fallbacks failed');
  }

  return {
    outputs: [],
    success: false,
    error: 'Unable to generate content. Please check your connection and try again.',
  };
}

/**
 * Chat AI Generation — Connects directly to Chat AI on VPS 1
 */
export async function generateChatResponse(message: string, history: any[], userId?: string): Promise<string> {
  // 1. PRIMARY: Appwrite VPS 1
  try {
    const execution = await functions.createExecution(
      CHAT_AI_FUNCTION_ID,
      JSON.stringify({
        message,
        history,
        user_id: userId,
      }),
      false, '/', ExecutionMethod.POST,
    );

    const result = JSON.parse(execution.responseBody);
    if (result.response || result.message) {
      return result.response || result.message;
    }
  } catch (error) {
    if (__DEV__) console.log('[AI] Chat VPS error, trying Firebase');
  }

  // 2. FALLBACK: Firebase Chat
  try {
    const fb = getFirebaseFunctions();
    if (fb) {
      const callable = httpsCallable(fb, 'chatAi');
      const result: any = await callable({
        userMessage: message,
        conversationHistory: history,
        userId,
      });
      return result.data?.response || "I'm sorry, I'm having trouble connecting right now.";
    }
  } catch (e) {
    return "I'm sorry, I'm having trouble connecting right now.";
  }

  return "I'm sorry, I'm having trouble connecting right now.";
}

// Parse the Appwrite Function execution response
function parseExecutionResponse(responseBody: string, outputCount: number): AIGenerationResponse {
  try {
    const result = JSON.parse(responseBody);
    if (result.error) return { outputs: [], success: false, error: result.error };

    if (result.outputs) {
      let outputs = result.outputs;
      if (typeof outputs === 'string') outputs = splitOutputs(outputs, outputCount);
      return { outputs, success: true, tokensUsed: result.tokensUsed, model: result.model };
    }

    const content = result.result || result.output || result.content;
    if (content) return { outputs: splitOutputs(String(content), outputCount), success: true, model: result.model };

    return { outputs: [], success: false, error: 'Unexpected format' };
  } catch {
    return { outputs: [], success: false, error: 'Parse error' };
  }
}

// Split AI response into separate outputs
function splitOutputs(content: string, count: number): string[] {
  if (content.includes('---VARIATION---')) {
    return content.split('---VARIATION---').filter(p => p.trim().length > 20).slice(0, count).map(p => p.trim());
  }
  return [content.trim()];
}

export default generateAIContent;
