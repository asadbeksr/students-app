export const runtime = 'nodejs';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';
import type { Part } from '@google/genai';

const SYSTEM_PROMPT = `You are an expert document transcription assistant. Convert this document into clean, well-structured Markdown.

RULES:
- Preserve ALL content exactly — do not skip, summarize, or paraphrase anything
- Use ## for main section headings, ### for subsections
- For ALL mathematical expressions use LaTeX notation:
  - Inline math: $expression$
  - Display/block equations: $$expression$$
- For tables: use Markdown table format
- For diagrams and figures:
  - If it is a SIMPLE mathematical graph or geometric diagram (coordinate axes with curves/lines, geometric shapes, basic function plots): reproduce it accurately as a compact inline SVG. Place the SVG directly in the Markdown, e.g. <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150">...</svg>
  - If it is a complex figure, photograph, dense diagram, or anything you cannot accurately reproduce as SVG: output exactly [FIGURE_PAGE:N] where N is the 1-based page number containing the figure — nothing else on that line
- Separate pages with a horizontal rule: ---
- Output ONLY the Markdown content — no preamble, no commentary`;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pdfBase64 } = await req.json();
    if (!pdfBase64) {
      return NextResponse.json({ error: 'pdfBase64 is required' }, { status: 400 });
    }

    const ai = getGeminiClient();

    const parts: Part[] = [
      { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } },
      { text: SYSTEM_PROMPT },
    ];

    const result = await (ai.models as any).generateContent({
      model: 'gemini-flash-latest',
      contents: [{ role: 'user', parts }],
      config: { maxOutputTokens: 65536 },
    });

    const markdown: string = result.text ?? result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    return new Response(markdown, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('[convert-pdf]', error);
    const message = (error as Error).message || 'Unknown error';
    return NextResponse.json({ error: `Conversion failed: ${message}` }, { status: 500 });
  }
}
