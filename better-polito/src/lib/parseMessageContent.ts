export type Segment =
  | { type: 'text'; content: string }
  | { type: 'visualization'; html: string; title: string }
  | { type: 'visualization_loading'; title: string }
  | { type: 'manim'; script: string; title: string }
  | { type: 'manim_loading'; title: string };

const VIZ_REGEX = /<visualization title="([^"]*)">([\s\S]*?)<\/visualization>/g;
const VIZ_OPEN_REGEX = /<visualization title="([^"]*)">/;
const MANIM_REGEX = /<manim title="([^"]*)">([\s\S]*?)<\/manim>/g;
const MANIM_OPEN_REGEX = /<manim title="([^"]*)">/;

/**
 * Parse a raw message string into text and visualization segments.
 * Visualization segments contain self-contained HTML that should be
 * rendered in a sandboxed iframe.
 */
function combineAndSortMatches(raw: string) {
  const matches = [];
  for (const match of raw.matchAll(VIZ_REGEX)) {
    matches.push({ type: 'visualization', title: match[1], content: match[2], index: match.index!, length: match[0].length });
  }
  for (const match of raw.matchAll(MANIM_REGEX)) {
    matches.push({ type: 'manim', title: match[1], content: match[2], index: match.index!, length: match[0].length });
  }
  return matches.sort((a, b) => a.index - b.index);
}

export function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  const matches = combineAndSortMatches(raw);

  for (const match of matches) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: raw.slice(lastIndex, match.index) });
    }
    if (match.type === 'visualization') {
      segments.push({ type: 'visualization', html: match.content.trim(), title: match.title });
    } else {
      segments.push({ type: 'manim', script: match.content.trim(), title: match.title });
    }
    lastIndex = match.index + match.length;
  }

  if (lastIndex < raw.length) {
    segments.push({ type: 'text', content: raw.slice(lastIndex) });
  }

  return segments;
}

export function parseStreamingSegments(raw: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  const matches = combineAndSortMatches(raw);

  for (const match of matches) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: raw.slice(lastIndex, match.index) });
    }
    if (match.type === 'visualization') {
      segments.push({ type: 'visualization', html: match.content.trim(), title: match.title });
    } else {
      segments.push({ type: 'manim', script: match.content.trim(), title: match.title });
    }
    lastIndex = match.index + match.length;
  }

  const remaining = raw.slice(lastIndex);
  const vizOpenMatch = remaining.match(VIZ_OPEN_REGEX);
  const manimOpenMatch = remaining.match(MANIM_OPEN_REGEX);

  if (vizOpenMatch && (!manimOpenMatch || vizOpenMatch.index! < manimOpenMatch.index!)) {
    const textBefore = remaining.slice(0, vizOpenMatch.index!);
    if (textBefore) segments.push({ type: 'text', content: textBefore });
    segments.push({ type: 'visualization_loading', title: vizOpenMatch[1] });
  } else if (manimOpenMatch) {
    const textBefore = remaining.slice(0, manimOpenMatch.index!);
    if (textBefore) segments.push({ type: 'text', content: textBefore });
    segments.push({ type: 'manim_loading', title: manimOpenMatch[1] });
  } else if (remaining) {
    segments.push({ type: 'text', content: remaining });
  }

  return segments;
}

export function hasVisualizations(raw: string): boolean {
  return VIZ_OPEN_REGEX.test(raw) || MANIM_OPEN_REGEX.test(raw);
}
