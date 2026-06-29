import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { callGeminiStream, resolveModel } from '@/lib/gemini';
import { formatAttachmentsForGeminiFromSerialized, type SerializedAttachment } from '@/lib/geminiVision';
import { Type } from '@google/genai';
import type { FunctionCall, Part, Tool } from '@google/genai';

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

/** Structured open-document metadata sent by the client (see lib/openDocument.ts). */
interface OpenDocument {
  name: string;
  url: string;
  pageCount: number;
  currentPage: number | null;
  isScanned: boolean;
  status: 'ready' | 'extracting' | 'failed';
  fullText?: string;
}

/** Extract a window of pages around `centerPage` from extracted PDF text. */
function extractPageWindow(fullText: string, centerPage: number, radius: number): string {
  const startPage = Math.max(1, centerPage - radius);
  const endPage = centerPage + radius;
  const pageRegex = /--- Page (\d+) ---/g;

  const sections: { page: number; start: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = pageRegex.exec(fullText)) !== null) {
    sections.push({ page: parseInt(match[1], 10), start: match.index });
  }

  const inWindow = sections.filter(s => s.page >= startPage && s.page <= endPage);
  if (!inWindow.length) return fullText;

  const first = inWindow[0].start;
  const lastSection = inWindow[inWindow.length - 1];
  const nextIdx = sections.findIndex(s => s.page > lastSection.page);
  const end = nextIdx >= 0 ? sections[nextIdx].start : fullText.length;

  return `[Showing pages ${startPage}–${Math.min(endPage, lastSection.page)} of the document]\n\n` + fullText.slice(first, end).trim();
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
      type: Type.OBJECT,
      properties: {
        pages: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER },
          description: 'Page numbers to read (1-indexed)',
        },
      },
      required: ['pages'],
    },
  }],
};

export async function POST(req: Request) {
  try {
    const {
      messages, systemPrompt, model, attachments,
      openDocument,
    } = await req.json() as {
      messages?: Array<{ role: string; content: string }>;
      systemPrompt?: string;
      model?: string;
      attachments?: SerializedAttachment[];
      openDocument?: OpenDocument;
    };

    const selectedModel = resolveModel(model);
    let enrichedSystemPrompt = systemPrompt || '';

    // The full extracted text (with page markers) is only present when the
    // document finished extracting successfully.
    const docFullText = openDocument?.status === 'ready' ? (openDocument.fullText ?? '') : '';

    // Build page map from the full extracted text (for the read_pdf_pages tool)
    const pageMap = docFullText ? buildPageMap(docFullText) : {};
    const hasTool = docFullText.length > 0 && Object.keys(pageMap).length > 0;

    // Build conversation contents
    const contents: Array<{ role: string; parts: Part[] }> = [];
    if (messages && messages.length > 1) {
      for (const msg of messages.slice(0, -1)) {
        contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] });
      }
    }

    const lastUserMessage = messages?.[messages.length - 1];
    const userText = lastUserMessage?.content || '';
    const userParts: Part[] = attachments?.length
      ? formatAttachmentsForGeminiFromSerialized(userText, attachments)
      : [{ text: userText }];

    // Build the "Currently Open Document Content" section from structured
    // fields and explicit status — no prose string-matching.
    let successfullyUsedNativePdf = false;
    if (openDocument) {
      const pageCountLine = openDocument.pageCount > 0
        ? `\nThis document has EXACTLY ${openDocument.pageCount} pages.`
        : '';

      // Scanned/image-based PDFs: attach the raw file for native vision/OCR.
      if (openDocument.status === 'ready' && openDocument.isScanned && openDocument.url) {
        const reqHeaders = await headers();
        const nativePdfPart = await fetchDocumentNative(openDocument.url, reqHeaders);
        if (nativePdfPart) {
          userParts.push(nativePdfPart);
          successfullyUsedNativePdf = true;
          enrichedSystemPrompt += `\n\n## Currently Open Document Content\nThe student has a scanned document open.${pageCountLine} The RAW native PDF file has been attached directly to this context for you to read via your native vision/OCR capabilities! NEVER guess or hallucinate.`;
        }
      }

      if (!successfullyUsedNativePdf) {
        if (openDocument.status === 'ready' && docFullText) {
          const partial = openDocument.currentPage
            ? extractPageWindow(docFullText, openDocument.currentPage, 2)
            : (docFullText.length > 12000
                ? docFullText.slice(0, 12000) + '\n\n[... more pages available — use read_pdf_pages tool to read specific pages ...]'
                : docFullText);
          enrichedSystemPrompt += `\n\n## Currently Open Document Content\nThe student has this document open.${pageCountLine}
${hasTool ? 'You have access to a `read_pdf_pages` tool — use it to read any page not already shown below.' : ''}
CRITICAL RULES:
1. Text is divided by "--- Page N ---" markers. Only summarize the exact text under the requested marker.
2. DO NOT hallucinate content. If a page is not shown, use the tool to read it.
3. NEVER guess page content based on filename or topic.

DOCUMENT TEXT (partial):
${partial}`;
        } else if (openDocument.status === 'extracting') {
          enrichedSystemPrompt += `\n\n## Currently Open Document Content\nThe student has a document open, but it is still being processed and its text is not available yet. Tell the student the document is still loading and ask them to send their question again in a moment. Do NOT claim you are unable to read the document.`;
        } else {
          enrichedSystemPrompt += `\n\n## Currently Open Document Content\nThe student has a document open, but its text could not be extracted (it may be an unsupported or corrupted file). Honestly tell the student you cannot read this document, and offer to help if they paste the relevant text or ask a general question.`;
        }
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

          // If tool is available, do a streaming pass to check for tool calls
          if (hasTool) {
            const toolStream = await callGeminiStream({
              model: selectedModel,
              contents,
              config: { ...genConfig, tools: [READ_PDF_PAGES_TOOL] },
            });

            let hasFunctionCall = false;
            const fcs: FunctionCall[] = [];
            const modelParts: Part[] = [];

            for await (const chunk of toolStream) {
               if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                  hasFunctionCall = true;
                  fcs.push(...chunk.functionCalls);
               }
               if (!hasFunctionCall && chunk.text) {
                  // We didn't call a function, stream text immediately!
                  controller.enqueue(encoder.encode(chunk.text));
               }

               const chunkParts = chunk.candidates?.[0]?.content?.parts;
               if (chunkParts) {
                   modelParts.push(...chunkParts);
               }
            }

            if (hasFunctionCall) {
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
              // No tool call needed — stream was already handled!
              controller.close();
              return;
            }
          }

          // Stream the final response (after tool resolution, or when no tool needed)
          const finalStream = await callGeminiStream({
            model: selectedModel,
            contents: finalContents,
            config: genConfig,
          });

          for await (const chunk of finalStream) {
            const text = chunk.text;
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
