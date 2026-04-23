import { NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const ai = getGeminiClient();
    const { exams, grades, courses, student } = await req.json();

    const prompt = `You are an expert AI Study Planner acting as an academic advisor for a university student. Given their data, create a detailed, highly personalized 4-week study plan.
    
Student Profile:
- Degree: ${student?.degreeName || 'Not specified'}
- Average Grade: ${student?.weightedAverage || student?.mean || 'Not specified'}
- Acquired Credits: ${student?.acquiredCredits || 'Not specified'}

Upcoming Exams/Deadlines: 
${JSON.stringify((exams ?? []).slice(0, 10))}

Current Enrolled Courses:
${JSON.stringify((courses ?? []).map((c: any) => ({ name: c.name || c.description, code: c.code })).slice(0, 10))}

Recent Grades:
${JSON.stringify((grades ?? []).slice(0, 10))}

Return valid JSON in this exact structure:
{
  "weeks": [
    {
      "label": "Week 1 — Focus",
      "tasks": [
        { "subject": "Mathematics", "description": "Review chapters 1-3, practice problems" }
      ]
    }
  ],
  "summary": "A short, highly personalized, and encouraging recommendation paragraph tailored specifically to their major, grades, and upcoming workload."
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
