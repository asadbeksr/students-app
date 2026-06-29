export interface PdfTextItem { str: string; transform: number[] }
export interface PdfPageProxyLike {
  pageNumber: number;
  getTextContent: (options?: unknown) => Promise<{ items: PdfTextItem[] }>;
}
export interface PdfParseOptions {
  max?: number;
  pagerender?: (page: PdfPageProxyLike) => Promise<string> | string;
}

/**
 * Per-page renderer that prefixes each page with a `--- Page N ---` marker, so
 * the open-document extractor produces the SAME format as the client-side
 * attachment extractor (lib/pdfTextExtraction.ts). This keeps the chat route's
 * read_pdf_pages tool + page-window logic working for open documents, not just
 * attachments. Mirrors pdf-parse's default text-extraction loop (group items on
 * the same Y onto one line, break otherwise).
 */
export async function renderPageWithMarker(pageData: PdfPageProxyLike): Promise<string> {
  const textContent = await pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });
  let lastY: number | undefined;
  let text = '';
  for (const item of textContent.items) {
    if (lastY === item.transform[5] || lastY === undefined) text += item.str;
    else text += '\n' + item.str;
    lastY = item.transform[5];
  }
  return `--- Page ${pageData.pageNumber} ---\n${text}`;
}
