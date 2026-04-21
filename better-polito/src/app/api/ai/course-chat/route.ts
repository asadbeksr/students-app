import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getGeminiClient } from '@/lib/gemini';
import { formatAttachmentsForGeminiFromSerialized } from '@/lib/geminiVision';
import type { Part, Tool } from '@google/genai';

async function fetchDocumentNative(
  documentUrl: string,
  requestHeaders: Headers
): Promise<Part | null> {
  try {
    let absoluteUrl = documentUrl;
    if (!documentUrl.startsWith('http')) {
      const host = requestHeaders.get('host') || 'localhost:3000';
      const protocol = requestHeaders.get('x-forwarded-proto') || 'http';
      absoluteUrl = `${protocol}://${host}${documentUrl.startsWith('/') ? '' : '/'}${documentUrl}`;
    }
    const cookie = requestHeaders.get('cookie') || '';
    const response = await fetch(absoluteUrl, { headers: { cookie }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 15 * 1024 * 1024) return null;
    return { inlineData: { data: Buffer.from(buffer).toString('base64'), mimeType: 'application/pdf' } };
  } catch {
    return null;
  }
}

/** Parse "--- Page N ---\ntext" format into a page map */
function buildPageMap(fullText: string): Record<number, string> {
  const map: Record<number, string> = {};
  const parts = fullText.split(/\n\n--- Page (\d+) ---\n/);
  // parts[0] is any text before first marker (usually the prefix line), then alternating: pageNum, text
  for (let i = 1; i < parts.length - 1; i += 2) {
    const pageNum = parseInt(parts[i], 10);
    if (!isNaN(pageNum)) map[pageNum] = parts[i + 1]?.trim() ?? '';
  }
  return map;
}

const READ_PDF_PAGES_TOOL: Tool = {
  functionDeclarations: [{
    name: 'read_pdf_pages',
    description: 'Read the exact text content of specific pages from the currently open PDF document. Use this whenever you need to see a page that is not already in context.',
    parameters: {
      type: 'OBJECT' as any,
      properties: {
        pages: {
          type: 'ARRAY' as any,
          items: { type: 'INTEGER' as any },
          description: 'Page numbers to read (1-indexed)',
        },
      },
      required: ['pages'],
    },
  }],
};

export async function POST(req: Request) {
  try {
    const ai = getGeminiClient();
    const {
      messages, systemPrompt, model, attachments,
      openDocumentUrl, openDocumentText, openDocumentFullText,
    } = await req.json();

    const selectedModel = model || 'gemini-flash-latest';
    let enrichedSystemPrompt = systemPrompt || '';

    // Build page map from the full extracted text (for the tool)
    const pageMap = openDocumentFullText ? buildPageMap(openDocumentFullText) : {};
    const hasTool = openDocumentFullText && Object.keys(pageMap).length > 0;

    // Build conversation contents
    const contents: Array<{ role: string; parts: Part[] }> = [];
    if (messages && messages.length > 1) {
      for (const msg of messages.slice(0, -1)) {
        contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] });
      }
    }

    const lastUserMessage = messages?.[messages.length - 1];
    const userText = lastUserMessage?.content || '';
    let userParts: Part[] = attachments?.length
      ? formatAttachmentsForGeminiFromSerialized(userText, attachments)
      : [{ text: userText }];

    // Native PDF for scanned docs
    let successfullyUsedNativePdf = false;
    if (openDocumentText?.includes('scanned/image-based') && openDocumentUrl) {
      const reqHeaders = await headers();
      const nativePdfPart = await fetchDocumentNative(openDocumentUrl, reqHeaders);
      if (nativePdfPart) {
        userParts.push(nativePdfPart);
        successfullyUsedNativePdf = true;
        const pageMatch = openDocumentText.match(/has exactly (\d+)\s+page|(\d+)\s+page/i);
        const countStr = pageMatch ? (pageMatch[1] || pageMatch[2]) : null;
        enrichedSystemPrompt += `\n\n## Currently Open Document Content\nThe student has a scanned document open.${countStr ? `\nThis document has EXACTLY ${countStr} pages.` : ''} The RAW native PDF file has been attached directly to this context for you to read via your native vision/OCR capabilities! NEVER guess or hallucinate.`;
      }
    }

    if (!successfullyUsedNativePdf) {
      let docTextToUse = openDocumentText || '';
      if (docTextToUse) {
        const pageMatch = docTextToUse.match(/has exactly (\d+)\s+page|(\d+)\s+page/i);
        const countStr = pageMatch ? (pageMatch[1] || pageMatch[2]) : null;
        enrichedSystemPrompt += `\n\n## Currently Open Document Content\nThe student has this document open.${countStr ? `\nThis document has EXACTLY ${countStr} pages.` : ''}
${hasTool ? 'You have access to a `read_pdf_pages` tool — use it to read any page not already shown below.' : ''}
CRITICAL RULES:
1. Text is divided by "--- Page N ---" markers. Only summarize the exact text under the requested marker.
2. DO NOT hallucinate content. If a page is not shown, use the tool to read it.
3. NEVER guess page content based on filename or topic.

DOCUMENT TEXT (partial):
${docTextToUse}`;
      } else if (openDocumentUrl) {
        enrichedSystemPrompt += `\n\n## Currently Open Document Content\n[SYSTEM ERROR: Failed to extract text. Inform the student you cannot read the document.]`;
      }
    }

    contents.push({ role: 'user', parts: userParts });

    const encoder = new TextEncoder();

    const genConfig = {
      systemInstruction: enrichedSystemPrompt || undefined,
      maxOutputTokens: 8192,
    };

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let finalContents = contents;

          // If tool is available, do a non-streaming pass first to resolve any tool calls
          if (hasTool) {
            const toolResponse = await ai.models.generateContent({
              model: selectedModel,
              contents,
              config: { ...genConfig, tools: [READ_PDF_PAGES_TOOL] },
            } as any);

            const fcs = (toolResponse as any).functionCalls as Array<{ name: string; args: any }> | undefined;

            if (fcs && fcs.length > 0) {
              const modelParts = toolResponse.candidates?.[0]?.content?.parts ?? [];
              const toolResultParts: Part[] = fcs.map(fc => {
                if (fc.name === 'read_pdf_pages') {
                  const pages = (fc.args?.pages ?? []) as number[];
                  const content = pages.map(p => {
                    const text = pageMap[p];
                    return text ? `--- Page ${p} ---\n${text}` : `Page ${p} not found.`;
                  }).join('\n\n');
                  return { functionResponse: { name: fc.name, response: { content } } } as Part;
                }
                return { functionResponse: { name: fc.name, response: { content: 'Unknown tool.' } } } as Part;
              });

              finalContents = [
                ...contents,
                { role: 'model', parts: modelParts },
                { role: 'user', parts: toolResultParts },
              ];
            } else {
              // No tool call needed — stream directly from this response text
              const text = (toolResponse as any).text as string | undefined;
              if (text) controller.enqueue(encoder.encode(text));
              controller.close();
              return;
            }
          }

          // Stream the final response (after tool resolution, or when no tool needed)
          const finalStream = await ai.models.generateContentStream({
            model: selectedModel,
            contents: finalContents,
            config: genConfig,
          } as any);

          for await (const chunk of finalStream) {
            const text = (chunk as any).text;
            if (text) controller.enqueue(encoder.encode(text));
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
      return NextResponse.json({ error: 'AI features require a Gemini API key. Add GEMINI_API_KEY to .env.local.' }, { status: 503 });
    }
    return NextResponse.json({ error: `AI request failed: ${message}` }, { status: 500 });
  }
}
