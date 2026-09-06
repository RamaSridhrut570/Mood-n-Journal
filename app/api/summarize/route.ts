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
    const { existingJournal = '', newMessages = [] } = data;

    if (!newMessages || newMessages.length === 0) {
      return NextResponse.json({ text: existingJournal });
    }

    const systemInstruction = "You are a journal assistant. Your task is to update or create a journal entry based on the user's chat. Use simple language and only include exactly what was discussed in the chat. Do not add extra fluff, opinions, or complex language. Write it in the first person (e.g., 'I did...', 'I felt...'). Focus only on the user's inputs. If an existing journal is provided, seamlessly add the new information into it. Keep it simple and direct.";

    const promptText = `
${existingJournal ? `### EXISTING JOURNAL:\n${existingJournal}\n\n` : ''}
### NEW MESSAGES TO INCORPORATE:
${newMessages.map((msg: any) => `${msg.role === 'user' ? 'Me' : 'AI Assistant'}: ${msg.text}`).join('\n')}

Please output ONLY the updated comprehensive journal entry text. No markdown backticks or pleasantries.
`;

    const contents = [
      {
        role: 'user',
        parts: [{ text: promptText }]
      }
    ];

    const config = {
      systemInstruction,
    };

    const response = await generateContentWithFallback(contents, config);

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error('Error generating summary:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate summary' }, { status: 500 });
  }
}
