import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 503 });
  }

  const { exams, courses, grades } = await req.json();

  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `You are a study planner AI. Given this student's data, create a 4-week study plan.

Exams: ${JSON.stringify((exams ?? []).slice(0, 5))}
Grades (recent): ${JSON.stringify((grades ?? []).slice(0, 5))}

Return valid JSON in this exact structure:
{
  "weeks": [
    {
      "label": "Week 1 — Focus",
      "tasks": [
        { "subject": "Mathematics", "description": "Review chapters 1-3, practice problems" },
        { "subject": "Physics", "description": "Past exam papers" }
      ]
    }
  ],
  "summary": "A short personalized recommendation paragraph."
}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content ?? '{}';
  return NextResponse.json(JSON.parse(content));
}
