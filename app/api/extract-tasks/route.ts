import { Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithFallback } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const { journalText, messages } = body || {};

    const systemInstruction = "You are a helpful assistant that extracts actionable tasks from a user's journal or chat history. Return the tasks list cleanly.";

    let promptText = "Extract actionable tasks from the following:\n\n";
    if (journalText) {
      promptText += `Journal Summary:\n${journalText}\n\n`;
    }
    if (messages && messages.length > 0) {
      promptText += `Recent Chat:\n${messages.map((m: any) => `${m.role}: ${m.text}`).join('\n')}\n`;
    }

    const response = await generateContentWithFallback(promptText, {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
            description: 'List of actionable tasks extracted from the context',
          },
        },
        required: ['tasks'],
      },
    });

    let text = response.text || '{}';
    // Clean up potential markdown wraps
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    let data = { tasks: [] };
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse Gemini response as JSON:', text, e);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error extracting tasks:', error);
    return NextResponse.json({ error: error.message || 'Failed to extract tasks' }, { status: 500 });
  }
}
