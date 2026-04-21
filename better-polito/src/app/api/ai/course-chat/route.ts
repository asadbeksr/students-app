import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getGeminiClient } from '@/lib/gemini';
import { formatAttachmentsForGeminiFromSerialized } from '@/lib/geminiVision';
import type { Part } from '@google/genai';

/**
 * Fetch the exact PDF bytes for native Gemini processing (skips manual text extraction).
 * Used when a PDF is scanned or image-based so Gemini can use its built-in OCR.
 */
async function fetchDocumentNative(
  documentUrl: string,
  requestHeaders: Headers
): Promise<Part | null> {
  try {
    let absoluteUrl = documentUrl;

    // If it's a relative URL, prepend the host and protocol
    if (!documentUrl.startsWith('http')) {
      const host = requestHeaders.get('host') || 'localhost:3000';
      const protocol = requestHeaders.get('x-forwarded-proto') || 'http';
      absoluteUrl = `${protocol}://${host}${documentUrl.startsWith('/') ? '' : '/'}${documentUrl}`;
    }

    const cookie = requestHeaders.get('cookie') || '';

    const response = await fetch(absoluteUrl, {
      headers: { cookie },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;
    
    const buffer = await response.arrayBuffer();
    
    // Gemini inlineData limit is roughly 20MB. Guard against massive files.
    if (buffer.byteLength > 15 * 1024 * 1024) {
      console.warn('PDF too large for native inlineData processing');
      return null;
    }

    return {
      inlineData: {
        data: Buffer.from(buffer).toString('base64'),
        mimeType: 'application/pdf',
      },
    };
  } catch (error) {
    console.error('Failed to fetch native document:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const ai = getGeminiClient();
    const { messages, systemPrompt, model, attachments, openDocumentUrl, openDocumentText } = await req.json();

    const selectedModel = model || 'gemini-flash-latest';

    // If there's an open document, use the extracted text from the client, or fallback to fetching
    let enrichedSystemPrompt = systemPrompt || '';

    // Build conversation contents for Gemini
    const contents: Array<{ role: string; parts: Part[] }> = [];

    // Add conversation history (skip the last user message — we'll add it with attachments)
    if (messages && messages.length > 1) {
      for (const msg of messages.slice(0, -1)) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Build the final user message with attachments
    const lastUserMessage = messages?.[messages.length - 1];
    const userText = lastUserMessage?.content || '';

    let userParts: Part[];
    if (attachments && attachments.length > 0) {
      userParts = formatAttachmentsForGeminiFromSerialized(userText, attachments);
    } else {
      userParts = [{ text: userText }];
    }

    // NATIVE PDF INTERCEPTION: Only use heavy native PDF vision for scanned/unparsable documents
    let successfullyUsedNativePdf = false;
    
    if (openDocumentText && openDocumentText.includes('scanned/image-based') && openDocumentUrl) {
      const reqHeaders = await headers();
      const nativePdfPart = await fetchDocumentNative(openDocumentUrl, reqHeaders);
      
      if (nativePdfPart) {
        userParts.push(nativePdfPart);
        successfullyUsedNativePdf = true;

        const pageMatch = openDocumentText.match(/has exactly (\d+)\s+page|(\d+)\s+page/i);
        const countStr = pageMatch ? (pageMatch[1] || pageMatch[2]) : null;
        const pageCountInfo = countStr ? `\nThis document has EXACTLY ${countStr} pages.` : '';

        enrichedSystemPrompt += `\n\n## Currently Open Document Content\nThe student has a scanned document open.${pageCountInfo} The RAW native PDF file has been attached directly to this context for you to read via your native vision/OCR capabilities! Read the attached PDF to answer the user's questions. NEVER guess or hallucinate.`;
      }
    }

    // For normal PDFs, fall back to fast, lightweight text extraction with ULTRA-STRICT page enforcement
    if (!successfullyUsedNativePdf) {
      let docTextToUse = openDocumentText || '';

      if (docTextToUse) {
        // Parse out the page count if the frontend included it (e.g. "[This PDF has exactly 31 pages.]")
        const pageMatch = docTextToUse.match(/has exactly (\d+)\s+page|(\d+)\s+page/i);
        const countStr = pageMatch ? (pageMatch[1] || pageMatch[2]) : null;
        const pageCountInfo = countStr ? `\nThis document has EXACTLY ${countStr} pages.` : '';

        enrichedSystemPrompt += `\n\n## Currently Open Document Content\nThe student has this document open.${pageCountInfo}
CRITICAL RULES FOR READING THIS TEXT:
1. The text is divided by markers like "--- Page 1 ---", "--- Page 2 ---", etc.
2. If the user asks what is on a specific page (e.g. "Page 1"), YOU MUST ONLY SUMMARIZE THE EXACT TEXT DIRECTLY BENEATH THAT SPECIFIC MARKER.
3. DO NOT skip title pages. Do not assume the user means "the first content page". If Page 1 is just a professor's name and email, that is what you answer.
4. DO NOT hallucinate. Do not pull content from Page 2 and claim it is on Page 1.
5. NEVER hallucinate content based on the filename. If the text says nothing about a topic, say you don't see it.

DOCUMENT TEXT:
${docTextToUse}`;
      } else if (openDocumentUrl) {
        // We know they have a document open, but we completely failed to read it.
        enrichedSystemPrompt += `\n\n## Currently Open Document Content\n[SYSTEM ERROR: Failed to extract text from the document the student is viewing. Inform the student you cannot read the document.]`;
      }
    }

    contents.push({ role: 'user', parts: userParts });

    // Create streaming response
    const response = await ai.models.generateContentStream({
      model: selectedModel,
      contents,
      config: {
        systemInstruction: enrichedSystemPrompt || undefined,
        maxOutputTokens: 8192,
      },
    });

    // Stream the response using a ReadableStream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          const errorMessage = (error as Error).message || 'Stream error';
          controller.enqueue(encoder.encode(`\n\n[Error: ${errorMessage}]`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    const message = (error as Error).message || 'Unknown error';

    if (message.includes('GEMINI_API_KEY')) {
      return NextResponse.json(
        { error: 'AI features require a Gemini API key. Add GEMINI_API_KEY to .env.local.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `AI request failed: ${message}` },
      { status: 500 }
    );
  }
}
