import { GoogleGenAI } from '@google/genai';

const GEMINI_TIMEOUT_MS = 15_000;

export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 502 | 503 | 504,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

const providerErrorDetails = (error: unknown) => {
  const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  return {
    name: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
    status: source.status,
    statusText: source.statusText,
    errorDetails: source.errorDetails
  };
};

export const logAIError = (stage: string, error: unknown, context: Record<string, unknown> = {}) => {
  console.error(`[AI:${stage}]`, { ...providerErrorDetails(error), ...context });
};

export const generateGeminiText = async (
  prompt: string,
  config: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseJsonSchema?: unknown;
    thinkingConfig?: { thinkingBudget?: number; includeThoughts?: boolean };
  } = {}
) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AIServiceError('GEMINI_API_KEY is not configured.', 503, 'AI_NOT_CONFIGURED');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash',
      contents: prompt,
      config: { ...config, abortSignal: controller.signal }
    });
    const text = response.text?.trim();
    if (!text) throw new AIServiceError('Gemini returned an empty response.', 502, 'AI_EMPTY_RESPONSE');
    return text;
  } catch (error) {
    if (error instanceof AIServiceError) throw error;
    const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw new AIServiceError('Gemini request timed out.', 504, 'AI_TIMEOUT', error);
    }
    const providerStatus = Number(source.status);
    if (providerStatus === 429) {
      throw new AIServiceError('Gemini rate limit or quota was exceeded.', 503, 'AI_QUOTA_EXCEEDED', error);
    }
    if (providerStatus === 401 || providerStatus === 403) {
      throw new AIServiceError('Gemini rejected the configured API credentials.', 503, 'AI_AUTHENTICATION_FAILED', error);
    }
    throw new AIServiceError('Gemini failed to generate a response.', 502, 'AI_PROVIDER_ERROR', error);
  } finally {
    clearTimeout(timeout);
  }
};
