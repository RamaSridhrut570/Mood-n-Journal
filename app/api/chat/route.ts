import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateContentWithFallback(contents: any[], config: any) {
  const models = [
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash'
  ];

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
      const status = error.status || error?.response?.status;
      const errorMsg = typeof error.message === 'string' ? error.message : JSON.stringify(error);
      
      // Recoverable errors
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
  throw new Error('All models in fallback ladder failed.');
}

export async function POST(req: NextRequest) {
  try {
    let rawBody;
    try {
      rawBody = await req.json();
    } catch (err) {
      rawBody = {};
    }
    const data = (rawBody && typeof rawBody === 'object') ? rawBody : {};
    const { history = [], message = '' } = data;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const contents = [];
    if (Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: [{ text: msg.text || '' }]
        });
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const config = {
      systemInstruction: "You are a thoughtful, empathetic journaling assistant. You help the user reflect on their entries, brainstorm ideas, and summarize their thoughts when helpful. Keep your responses concise, insightful, and supportive.",
    };

    const response = await generateContentWithFallback(contents, config);

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error('Error generating AI response:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
