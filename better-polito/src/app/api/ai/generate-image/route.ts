import { NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const ai = getGeminiClient();
    const { prompt, conversationHistory } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Build contents from conversation history + current prompt
    const contents: Array<{ role: string; parts: any[] }> = [];

    if (conversationHistory && conversationHistory.length > 0) {
      // Only include the last few exchanges for context
      const recentHistory = conversationHistory.slice(-6);
      for (const msg of recentHistory) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    } as any);

    // Extract text and images from the response
    const result: { text: string; images: Array<{ data: string; mimeType: string }> } = {
      text: '',
      images: [],
    };

    const candidates = (response as any).candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.text) {
          result.text += part.text;
        } else if (part.inlineData) {
          result.images.push({
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
          });
        }
      }
    }

    if (result.images.length === 0 && !result.text) {
      return NextResponse.json(
        { error: 'No image was generated. Try a different prompt.' },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = (error as Error).message || 'Unknown error';
    console.error('Image generation error:', message);

    if (message.includes('GEMINI_API_KEY')) {
      return NextResponse.json(
        { error: 'AI features require a Gemini API key.' },
        { status: 503 }
      );
    }
    if (message.includes('SAFETY') || message.includes('safety')) {
      return NextResponse.json(
        { error: 'Image generation was blocked by safety filters. Try a different prompt.' },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: `Image generation failed: ${message}` },
      { status: 500 }
    );
  }
}
