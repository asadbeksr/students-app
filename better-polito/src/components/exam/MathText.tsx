'use client';
import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Props {
  text: string;
  className?: string;
}

export function MathText({ text, className }: Props) {
  const html = useMemo(() => renderMath(text), [text]);
  return (
    <span
      className={className}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMath(input: string): string {
  // Handle $$...$$ (display) first, then $...$ (inline).
  const parts: string[] = [];
  let i = 0;
  while (i < input.length) {
    if (input[i] === '$' && input[i + 1] === '$') {
      const end = input.indexOf('$$', i + 2);
      if (end === -1) {
        parts.push(escapeHtml(input.slice(i)));
        break;
      }
      const tex = input.slice(i + 2, end);
      parts.push(tryKatex(tex, true));
      i = end + 2;
    } else if (input[i] === '$') {
      const end = input.indexOf('$', i + 1);
      if (end === -1) {
        parts.push(escapeHtml(input.slice(i)));
        break;
      }
      const tex = input.slice(i + 1, end);
      parts.push(tryKatex(tex, false));
      i = end + 1;
    } else {
      const next = input.indexOf('$', i);
      const chunk = next === -1 ? input.slice(i) : input.slice(i, next);
      parts.push(escapeHtml(chunk));
      i = next === -1 ? input.length : next;
    }
  }
  return parts.join('').replace(/\n/g, '<br/>');
}

function tryKatex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
    });
  } catch {
    return `$${escapeHtml(tex)}$`;
  }
}
