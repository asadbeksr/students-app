export type Segment =
  | { type: 'text'; content: string }
  | { type: 'visualization'; html: string; title: string }
  | { type: 'visualization_loading'; title: string };

const VIZ_REGEX = /<visualization title="([^"]*)">([\s\S]*?)<\/visualization>/g;
const VIZ_OPEN_REGEX = /<visualization title="([^"]*)">/;

/**
 * Parse a raw message string into text and visualization segments.
 * Visualization segments contain self-contained HTML that should be
 * rendered in a sandboxed iframe.
 */
export function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of raw.matchAll(VIZ_REGEX)) {
    const [fullMatch, title, html] = match;
    const start = match.index!;
    if (start > lastIndex) {
      segments.push({ type: 'text', content: raw.slice(lastIndex, start) });
    }
    segments.push({ type: 'visualization', html: html.trim(), title });
    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < raw.length) {
    segments.push({ type: 'text', content: raw.slice(lastIndex) });
  }

  return segments;
}

/**
 * Parse streaming content — shows skeleton placeholders for incomplete visualization blocks.
 * An incomplete block is one where we see the opening <visualization> tag but not the closing one.
 */
export function parseStreamingSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  // First, find all complete visualization blocks
  for (const match of raw.matchAll(VIZ_REGEX)) {
    const [fullMatch, title, html] = match;
    const start = match.index!;
    if (start > lastIndex) {
      segments.push({ type: 'text', content: raw.slice(lastIndex, start) });
    }
    segments.push({ type: 'visualization', html: html.trim(), title });
    lastIndex = start + fullMatch.length;
  }

  // Check remaining text for an incomplete opening tag
  const remaining = raw.slice(lastIndex);
  const openMatch = remaining.match(VIZ_OPEN_REGEX);

  if (openMatch) {
    // There's an incomplete visualization block being streamed
    const textBefore = remaining.slice(0, openMatch.index!);
    if (textBefore) {
      segments.push({ type: 'text', content: textBefore });
    }
    segments.push({ type: 'visualization_loading', title: openMatch[1] });
  } else if (remaining) {
    segments.push({ type: 'text', content: remaining });
  }

  return segments;
}

/**
 * Check if a raw string contains any visualization tags (complete or opening).
 */
export function hasVisualizations(raw: string): boolean {
  return VIZ_OPEN_REGEX.test(raw);
}
