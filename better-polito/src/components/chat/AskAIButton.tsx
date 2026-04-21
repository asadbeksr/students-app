'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bot } from 'lucide-react';

interface AskAIButtonProps {
  onAskAI: (text: string) => void;
}

/**
 * Floating "Ask AI" button that appears when text is selected on the page.
 * On click, sends the selected text to the AI chat as a quoted block.
 */
export default function AskAIButton({ onAskAI }: AskAIButtonProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleSelectionChange = useCallback(() => {
    // Clear any pending hide timeout
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      // Delay hiding to allow clicking the button
      hideTimeout.current = setTimeout(() => {
        setVisible(false);
        setSelectedText('');
      }, 200);
      return;
    }

    const raw = selection.toString().trim();
    if (raw.length < 3) return; // Too short to be useful

    // KaTeX renders each math symbol into its own span, so getSelection().toString()
    // yields one character per line for every math expression, plus a duplicate
    // full-text line from the katex-mathml hidden node. Clean this up by:
    // 1. Removing lines that are 1–3 chars (individual KaTeX symbol spans)
    // 2. Collapsing excessive blank lines
    const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const cleaned = lines
      .filter(l => l.length > 3)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    const text = cleaned || raw.replace(/\s+/g, ' ').trim();

    // Don't show for text selected inside the chat input
    const anchorNode = selection.anchorNode;
    if (anchorNode) {
      const parent = anchorNode.parentElement;
      if (parent?.closest('textarea, input, [contenteditable]')) return;
      // Don't show for text inside the chat window messages (they have their own copy)
      if (parent?.closest('[data-chat-messages]')) return;
    }

    // Position the button near the selection
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectedText(text);
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
    setVisible(true);
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, [handleSelectionChange]);

  const handleClick = useCallback(() => {
    if (selectedText) {
      onAskAI(selectedText);
      setVisible(false);
      setSelectedText('');
      // Clear the selection
      window.getSelection()?.removeAllRanges();
    }
  }, [selectedText, onAskAI]);

  if (!visible) return null;

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      className="fixed z-[100] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all text-xs font-medium animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <Bot className="w-3.5 h-3.5" />
      Ask AI
    </button>
  );
}
