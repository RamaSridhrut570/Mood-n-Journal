import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateContentWithFallback(contents: any, config: any) {
  const models = [
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-1.5-flash'
  ];

  let lastError: any = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      return response;
    } catch (error: any) {
      console.warn(`Model ${model} failed:`, error.message);
      lastError = error;
      const status = error.status || error?.response?.status;
      const errorMsg = typeof error.message === 'string' ? error.message : JSON.stringify(error);
      
      if (
        [503, 429, 404, 500].includes(status) || 
        errorMsg.includes('503') || errorMsg.includes('UNAVAILABLE') ||
        errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('404') || errorMsg.includes('NOT_FOUND') || errorMsg.includes('not found') ||
        errorMsg.includes('500') || errorMsg.includes('INTERNAL')
      ) {
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('All models in fallback ladder failed.');
}

export async function POST(req: NextRequest) {
  try {
    const { journalText, messages } = await req.json();

    const systemInstruction = "You are a helpful assistant that extracts actionable tasks from a user's journal or chat history. Respond ONLY with a valid JSON object in the following format: {\"tasks\": [\"Task 1\", \"Task 2\"]}. Do not include markdown formatting or any other text.";

    let promptText = "Extract actionable tasks from the following:\n\n";
    if (journalText) {
      promptText += `Journal Summary:\n${journalText}\n\n`;
    }
    if (messages && messages.length > 0) {
      promptText += `Recent Chat:\n${messages.map((m: any) => `${m.role}: ${m.text}`).join('\n')}\n`;
    }

    const response = await generateContentWithFallback(promptText, {
      systemInstruction,
      responseMimeType: 'application/json'
    });

    const text = response.text || "{}";
    let data = { tasks: [] };
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse Gemini response as JSON', text);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error extracting tasks:', error);
    return NextResponse.json({ error: error.message || 'Failed to extract tasks' }, { status: 500 });
  }
}
