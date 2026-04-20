import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      content: 'AI features require an OpenAI API key. Add OPENAI_API_KEY to .env.local to enable this feature.',
    });
  }

  const { messages } = await req.json();

  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an AI assistant for the Polito Community student portal — an unofficial community tool for PoliTO students.
Help students with academic questions, exam strategies, study tips, and how to use university services.
Note: Polito Community is NOT affiliated with Politecnico di Torino. Always be helpful and accurate.
If you don't know something specific about PoliTO, say so honestly.`,
      },
      ...messages,
    ],
  });

  return NextResponse.json({ content: response.choices[0].message.content ?? '' });
}
