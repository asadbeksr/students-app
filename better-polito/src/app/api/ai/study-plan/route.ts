import { NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const ai = getGeminiClient();
    const { exams, grades } = await req.json();

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

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 2048,
      },
    });

    const content = response.text ?? '{}';
    return NextResponse.json(JSON.parse(content));
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
