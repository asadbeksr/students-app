async function getPdfjs() {
  const reactPdf = await import('react-pdf');
  const pdfjs = reactPdf.pdfjs;

  // Use local worker from /public to avoid CDN/protocol-relative URL issues
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  return pdfjs;
}

export interface PdfTextExtractionResult {
  text: string;
  pageCount: number;
  isLikelyScanned: boolean;
  averageCharsPerPage: number;
}

const MAX_PAGES_TO_EXTRACT = 50;
const MAX_CHARS_TO_EXTRACT = 100000;
const BATCH_SIZE = 5;

/**
 * Extracts text from a single page using geometric sorting (top-to-bottom, left-to-right)
 * to preserve natural reading order and paragraphs.
 */
async function extractPageTextGeometrically(pdf: any, pageNum: number): Promise<string> {
  try {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    if (!content.items || content.items.length === 0) return '';

    // Filter valid text items and attach their Y/X coordinates from the transform matrix
    // transform matrix: [scaleX, skewY, skewX, scaleY, translateX (X), translateY (Y)]
    const textItems = content.items
      .filter((item: any) => 'str' in item && item.str.trim() !== '')
      .map((item: any) => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        height: item.height || Math.abs(item.transform[3]) || 10,
        hasEOL: item.hasEOL || false
      }));

    // Sort top-to-bottom (highest Y to lowest Y in PDF coordinate system)
    // If Y is roughly the same (within half a line height), sort left-to-right
    textItems.sort((a: any, b: any) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > a.height * 0.5) {
        return yDiff; // Sort by Y
      }
      return a.x - b.x; // Sort by X on same line
    });

    let pageText = '';
    let lastY = null;

    for (let i = 0; i < textItems.length; i++) {
      const item = textItems[i];

      // If Y jumped significantly, treat it as a new paragraph/line
      if (lastY !== null && Math.abs(lastY - item.y) > item.height * 0.8) {
        pageText += '\n';
      } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
        // Add space between items on the same line if missing
        pageText += ' ';
      }

      pageText += item.str;
      if (item.hasEOL) pageText += '\n';

      lastY = item.y;
    }

    return pageText.trim();
  } catch (error) {
    console.error(`Failed to extract page ${pageNum}:`, error);
    return '';
  }
}

/**
 * Extract text from PDF using pdf.js with spatial awareness and parallel batching.
 */
export async function extractPdfText(
  pdfData: ArrayBuffer
): Promise<PdfTextExtractionResult> {
  try {
    const pdfjs = await getPdfjs();
    const pdf = await pdfjs.getDocument({ data: pdfData }).promise;

    const pageCountToExtract = Math.min(pdf.numPages, MAX_PAGES_TO_EXTRACT);
    let fullText = '';
    let totalChars = 0;

    // Process pages in parallel batches
    for (let batchStart = 1; batchStart <= pageCountToExtract; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, pageCountToExtract);
      const batchPromises = [];

      for (let i = batchStart; i <= batchEnd; i++) {
        batchPromises.push(extractPageTextGeometrically(pdf, i));
      }

      const batchResults = await Promise.all(batchPromises);

      for (let i = 0; i < batchResults.length; i++) {
        const pageNum = batchStart + i;
        const pageText = batchResults[i];

        if (pageText) {
          totalChars += pageText.length;
          fullText += `\n\n--- Page ${pageNum} ---\n${pageText}`;
        }
      }

      // Early exit if we hit memory limits
      if (totalChars > MAX_CHARS_TO_EXTRACT) {
        fullText += `\n\n[... Extraction stopped at ${MAX_CHARS_TO_EXTRACT} characters to preserve memory ...]`;
        break;
      }
    }

    const averageCharsPerPage = pageCountToExtract > 0 ? totalChars / pageCountToExtract : 0;
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
 * Extract text from specific pages of a PDF safely and structurally.
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

    const validPages = pageNumbers
      .filter(p => p >= 1 && p <= pdf.numPages)
      .sort((a, b) => a - b)
      .slice(0, MAX_PAGES_TO_EXTRACT); // Guard against massive arrays

    if (validPages.length === 0) {
      throw new Error('No valid page numbers provided');
    }

    // Process in batches
    for (let i = 0; i < validPages.length; i += BATCH_SIZE) {
      const batch = validPages.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(pageNum => extractPageTextGeometrically(pdf, pageNum));
      const batchResults = await Promise.all(batchPromises);

      for (let j = 0; j < batchResults.length; j++) {
        const pageText = batchResults[j];
        if (pageText) {
          totalChars += pageText.length;
          fullText += `\n\n--- Page ${batch[j]} ---\n${pageText}`;
        }
      }

      if (totalChars > MAX_CHARS_TO_EXTRACT) break;
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
