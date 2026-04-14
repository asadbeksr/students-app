import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 503 });
  }

  const { text, courseId, fileName } = await req.json();

  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an academic assistant. Summarize the provided course material into key concepts, definitions, and likely exam questions. Use markdown formatting.',
      },
      {
        role: 'user',
        content: `Course ID: ${courseId ?? 'unknown'}\nFile: ${fileName ?? 'unknown'}\n\nContent:\n${text}`,
      },
    ],
  });

  const summary = response.choices[0].message.content ?? '';
  return NextResponse.json({ summary });
}
