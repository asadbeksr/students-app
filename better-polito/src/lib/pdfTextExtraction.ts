// Lazy-load pdfjs to prevent webpack from statically bundling pdf.mjs (ESM-only)
async function getPdfjs() {
  const { pdfjs } = await import('react-pdf');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }
  return pdfjs;
}
export interface PdfTextExtractionResult {
  text: string;
  pageCount: number;
  isLikelyScanned: boolean;
  averageCharsPerPage: number;
}

/**
 * Extract text from PDF using pdf.js (FREE - no API calls).
 * This works for text-based PDFs but not scanned/image PDFs.
 */
export async function extractPdfText(
  pdfData: ArrayBuffer
): Promise<PdfTextExtractionResult> {
  try {
    const pdfjs = await getPdfjs();
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
    let fullText = '';
    let totalChars = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      
      // Extract text items and join them with proper spacing
      const pageText = content.items
        .map((item: any) => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .filter(str => str.trim().length > 0)
        .join(' ');
      
      totalChars += pageText.length;
      fullText += `\n\n--- Page ${i} ---\n${pageText}`;
    }

    const averageCharsPerPage = pdf.numPages > 0 ? totalChars / pdf.numPages : 0;
    
    // Heuristic: If average page has less than 100 chars, it's likely scanned
    // or the PDF doesn't contain selectable text
    const isLikelyScanned = averageCharsPerPage < 100;

    return {
      text: fullText.trim(),
      pageCount: pdf.numPages,
      isLikelyScanned,
      averageCharsPerPage: Math.round(averageCharsPerPage),
    };
  } catch (error) {
    throw new Error(`Failed to extract PDF text: ${(error as Error).message}`);
  }
}

/**
 * Extract text from specific pages of a PDF.
 * Useful for large PDFs where you only want certain pages.
 */
export async function extractPdfTextFromPages(
  pdfData: ArrayBuffer,
  pageNumbers: number[]
): Promise<PdfTextExtractionResult> {
  try {
    const pdfjs = await getPdfjs();
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
    let fullText = '';
    let totalChars = 0;
    
    // Validate page numbers
    const validPages = pageNumbers.filter(p => p >= 1 && p <= pdf.numPages);
    
    if (validPages.length === 0) {
      throw new Error('No valid page numbers provided');
    }

    for (const pageNum of validPages.sort((a, b) => a - b)) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      
      const pageText = content.items
        .map((item: any) => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .filter(str => str.trim().length > 0)
        .join(' ');
      
      totalChars += pageText.length;
      fullText += `\n\n--- Page ${pageNum} ---\n${pageText}`;
    }

    const averageCharsPerPage = validPages.length > 0 ? totalChars / validPages.length : 0;
    const isLikelyScanned = averageCharsPerPage < 100;

    return {
      text: fullText.trim(),
      pageCount: pdf.numPages,
      isLikelyScanned,
      averageCharsPerPage: Math.round(averageCharsPerPage),
    };
  } catch (error) {
    throw new Error(`Failed to extract PDF text from pages: ${(error as Error).message}`);
  }
}

/**
 * Get basic PDF info without extracting all text.
 * Useful for showing page count and file info before extraction.
 */
export async function getPdfInfo(pdfData: ArrayBuffer): Promise<{
  pageCount: number;
  title?: string;
  author?: string;
}> {
  try {
    const pdfjs = await getPdfjs();
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
    const metadata = await pdf.getMetadata();
    
    return {
      pageCount: pdf.numPages,
      title: (metadata.info as any)?.Title,
      author: (metadata.info as any)?.Author,
    };
  } catch (error) {
    throw new Error(`Failed to get PDF info: ${(error as Error).message}`);
  }
}
