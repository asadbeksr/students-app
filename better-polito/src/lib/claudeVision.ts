import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import type { ChatAttachment } from '@/types';
import { arrayBufferToBase64, readFileAsText } from './fileProcessing';

// Lazy-load pdfjs to prevent webpack from statically bundling pdf.mjs (ESM-only)
// which causes "Object.defineProperty called on non-object" at runtime.
async function getPdfjs() {
  const { pdfjs } = await import('react-pdf');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  return pdfjs;
}
export async function formatAttachmentsForClaude(
  text: string,
  attachments: ChatAttachment[]
): Promise<MessageParam['content']> {
  const contentBlocks: any[] = [];

  // Add attachments first (so AI sees them before the question)
  for (const attachment of attachments) {
    if (attachment.fileType.startsWith('image/')) {
      // Images: Use Vision API
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: attachment.fileType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: arrayBufferToBase64(attachment.fileData),
        },
      });
    } else if (attachment.fileType === 'application/pdf') {
      // PDFs: Use extracted text (free) or Vision API (paid)
      if (attachment.extractedText) {
        // Use pre-extracted text from pdf.js (FREE)
        contentBlocks.push({
          type: 'text',
          text: `PDF Document: ${attachment.fileName}\n\n${attachment.extractedText}`,
        });
      } else if (attachment.useVisionApi) {
        // Use Claude Vision API to extract from rendered pages (PAID)
        const pdfImages = await convertPdfPagesToImages(attachment.fileData);
        for (const { pageNumber, base64Image } of pdfImages) {
          contentBlocks.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: base64Image,
            },
          });
          contentBlocks.push({
            type: 'text',
            text: `[PDF: ${attachment.fileName}, Page ${pageNumber}]`,
          });
        }
      } else {
        // Fallback: Just mention the PDF
        contentBlocks.push({
          type: 'text',
          text: `[Attached PDF: ${attachment.fileName} - Content not extracted]`,
        });
      }
    } else {
      // Text-based files: Include content directly
      try {
        const textContent = await readFileAsText(attachment.fileData);
        contentBlocks.push({
          type: 'text',
          text: `File: ${attachment.fileName}\n\`\`\`\n${textContent}\n\`\`\``,
        });
      } catch (error) {
        contentBlocks.push({
          type: 'text',
          text: `[Attached file: ${attachment.fileName} - Unable to read content]`,
        });
      }
    }
  }

  // Add user's message text last
  contentBlocks.push({
    type: 'text',
    text: text,
  });

  return contentBlocks;
}

/**
 * Convert PDF pages to base64 images for Claude Vision API.
 * This is used when useVisionApi is true for a PDF attachment.
 */
async function convertPdfPagesToImages(
  pdfData: ArrayBuffer,
  maxPages: number = 10
): Promise<Array<{ pageNumber: number; base64Image: string }>> {
  const pdfjs = await getPdfjs();
  const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
  const numPages = Math.min(pdf.numPages, maxPages);
  const results: Array<{ pageNumber: number; base64Image: string }> = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    
    // Render at 2x scale for better quality
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

    // Convert to base64 (remove the data:image/png;base64, prefix)
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    
    results.push({
      pageNumber: i,
      base64Image: base64,
    });
  }

  return results;
}
