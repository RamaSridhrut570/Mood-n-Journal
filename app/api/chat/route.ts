import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithFallback } from '@/lib/gemini';

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
    return NextResponse.json({ error: error.message || 'Failed to generate response' }, { status: 500 });
  }
}
