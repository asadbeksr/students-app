import { NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const ai = getGeminiClient();
    const { messages } = await req.json();

    const systemPrompt = `You are an AI assistant for the Polito Community student portal — an unofficial community tool for PoliTO students.
Help students with academic questions, exam strategies, study tips, and how to use university services.
Note: Polito Community is NOT affiliated with Politecnico di Torino. Always be helpful and accurate.
If you don't know something specific about PoliTO, say so honestly.`;

    // Build contents from messages
    const contents = (messages || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 2048,
      },
    });

    const content = response.text ?? '';
    return NextResponse.json({ content });
  } catch (error) {
    const message = (error as Error).message || 'Unknown error';

    if (message.includes('GEMINI_API_KEY')) {
      return NextResponse.json({
        content: 'AI features require a Gemini API key. Add GEMINI_API_KEY to .env.local to enable this feature.',
      });
    }

    return NextResponse.json(
      { error: `AI request failed: ${message}` },
      { status: 500 }
    );
  }
}
