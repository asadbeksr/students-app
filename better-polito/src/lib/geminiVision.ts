import type { Part } from '@google/genai';
import { arrayBufferToBase64, readFileAsText } from './fileProcessing';

// Lazy-load pdfjs to prevent webpack from statically bundling pdf.mjs (ESM-only)
async function getPdfjs() {
  const { pdfjs } = await import('react-pdf');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  return pdfjs;
}

interface SerializedAttachment {
  fileName: string;
  fileType: string;
  fileSize: number;
  base64Data: string;
  extractedText?: string;
}

/**
 * Format attachments for Gemini's Part[] format.
 * Used server-side in the API route with pre-serialized (base64) attachments.
 */
export function formatAttachmentsForGeminiFromSerialized(
  text: string,
  attachments: SerializedAttachment[]
): Part[] {
  const parts: Part[] = [];

  for (const attachment of attachments) {
    if (attachment.fileType.startsWith('image/')) {
      // Images: send as inline base64 data
      parts.push({
        inlineData: {
          mimeType: attachment.fileType,
          data: attachment.base64Data,
        },
      });
    } else if (attachment.fileType === 'application/pdf') {
      if (attachment.extractedText) {
        // Use pre-extracted text from pdf.js
        parts.push({
          text: `PDF Document: ${attachment.fileName}\n\n${attachment.extractedText}`,
        });
      } else {
        // Fallback: just mention the PDF
        parts.push({
          text: `[Attached PDF: ${attachment.fileName} - Content not extracted]`,
        });
      }
    } else {
      // Text-based files: include content from extracted text or base64 decode
      if (attachment.extractedText) {
        parts.push({
          text: `File: ${attachment.fileName}\n\`\`\`\n${attachment.extractedText}\n\`\`\``,
        });
      } else {
        // Try to decode base64 as text
        try {
          const decoded = Buffer.from(attachment.base64Data, 'base64').toString('utf-8');
          parts.push({
            text: `File: ${attachment.fileName}\n\`\`\`\n${decoded}\n\`\`\``,
          });
        } catch {
          parts.push({
            text: `[Attached file: ${attachment.fileName} - Unable to read content]`,
          });
        }
      }
    }
  }

  // Add user's message text last
  parts.push({ text });

  return parts;
}

/**
 * Convert PDF pages to base64 images for Gemini Vision.
 * Used client-side when useVisionApi is true for a PDF attachment.
 */
export async function convertPdfPagesToBase64(
  pdfData: ArrayBuffer,
  maxPages: number = 10
): Promise<Array<{ pageNumber: number; base64Image: string }>> {
  const pdfjs = await getPdfjs();
  const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
  const numPages = Math.min(pdf.numPages, maxPages);
  const results: Array<{ pageNumber: number; base64Image: string }> = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport,
    } as any).promise;

    const base64 = canvas.toDataURL('image/png').split(',')[1];
    results.push({ pageNumber: i, base64Image: base64 });
  }

  return results;
}
