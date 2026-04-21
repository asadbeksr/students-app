import { NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const ai = getGeminiClient();
    const { text, courseId, fileName } = await req.json();

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [{ text: `Course ID: ${courseId ?? 'unknown'}\nFile: ${fileName ?? 'unknown'}\n\nContent:\n${text}` }],
        },
      ],
      config: {
        systemInstruction: 'You are an academic assistant. Summarize the provided course material into key concepts, definitions, and likely exam questions. Use markdown formatting.',
        maxOutputTokens: 2048,
      },
    });

    const summary = response.text ?? '';
    return NextResponse.json({ summary });
  } catch (error) {
    const message = (error as Error).message || 'Unknown error';

    if (message.includes('GEMINI_API_KEY')) {
      return NextResponse.json({ error: 'Gemini API key not configured.' }, { status: 503 });
    }

    return NextResponse.json(
      { error: `AI request failed: ${message}` },
      { status: 500 }
    );
  }
}
