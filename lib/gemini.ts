import { GoogleGenAI } from '@google/genai';

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export const VALID_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

export async function generateContentWithFallback(contents: any, config: any = {}) {
  let lastError: any = null;

  for (const model of VALID_GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      if (response && (response.text !== undefined || (response.candidates && response.candidates.length > 0))) {
        return response;
      }
    } catch (error: any) {
      console.warn(`Model ${model} failed:`, error?.message || error);
      lastError = error;
      const status = error?.status || error?.response?.status;
      const errorMsg = typeof error?.message === 'string' ? error.message : JSON.stringify(error || '');

      // Retry next model for transient / unavailable / deprecated model errors
      if (
        [503, 429, 404, 500, 502, 504].includes(status) ||
        errorMsg.includes('503') ||
        errorMsg.includes('UNAVAILABLE') ||
        errorMsg.includes('high demand') ||
        errorMsg.includes('429') ||
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('404') ||
        errorMsg.includes('NOT_FOUND') ||
        errorMsg.includes('not found') ||
        errorMsg.includes('no longer available') ||
        errorMsg.includes('500') ||
        errorMsg.includes('INTERNAL')
      ) {
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('All models in fallback ladder failed.');
}
