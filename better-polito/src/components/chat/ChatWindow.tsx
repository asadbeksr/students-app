import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useCoursePortalStore, useDocumentContentStore } from '@/lib/stores/coursePortalStore';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bot, ChevronDown, Brain, Copy, Download, RotateCcw, Check, ArrowDown, Plus, Settings, MessageSquare, Trash2 } from 'lucide-react';
import ExplanationTabs from './ExplanationTabs';
import ChatInput from './ChatInput';
import MessageAttachments from './MessageAttachments';
import { GifDisplay } from './GifDisplay';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { parseStreamingSegments, hasVisualizations } from '@/lib/parseMessageContent';
import { VisualizationFrame, VisualizationSkeleton } from '@/components/chat/VisualizationFrame';
import { ManimFrame, ManimSkeleton } from '@/components/chat/ManimFrame';
import { messageToMarkdown, copyToClipboard, downloadMarkdown, generateFilename, addExportFooter } from '@/lib/exportUtils';
import type { ChatMessage, Conversation } from '@/types';
import ChatSettingsPanel from './ChatSettingsPanel';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ChatWindowProps {
  courseId: string;
}

export default function ChatWindow({ courseId }: ChatWindowProps) {

  const {
    messages, conversations, activeConversationId, loading, error, streamingState,
    fetchMessages, fetchConversations, sendMessage, retryMessage,
    createConversation, switchConversation, deleteConversation,
  } = useChatStore();
  const { settings, fetchSettings } = useSettingsStore();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [thinkingOpen, setThinkingOpen] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isAutoScrollingRef = useRef(false);
  const [courseName, setCourseName] = useState<string>('');
  const [openDocName, setOpenDocName] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const studentContext = ''; // Removed dynamic fetching to prevent AI hallucination

  // Fetch course name from PoliTO API (not local DB which only has stubs)
  useEffect(() => {
    fetch(`/api/polito/courses/${courseId}`)
      .then(r => r.json())
      .then(data => {
        const c = data?.data || data;
        const name = c?.name || c?.shortName || c?.courseName || '';
        if (name) setCourseName(name);
      })
      .catch(() => {});
  }, [courseId]);

    // Track the open document and extract its text content
  const [docExtracting, setDocExtracting] = useState(false);
  const docContentStore = useDocumentContentStore();

  useEffect(() => {
    const extractDocText = async (preview: { id: string; name: string; url: string } | null) => {
      if (!preview) {
        setOpenDocName('');
        setDocExtracting(false);
        return;
      }

      setOpenDocName(preview.name);

      // Check cache first
      const cached = docContentStore.getContent(preview.id);
      if (cached) {
        setDocExtracting(cached.extracting);
        return;
      }

      // Start extraction
      setDocExtracting(true);
      docContentStore.setExtracting(preview.id);

      try {
        if (!preview.url) {
          docContentStore.setContent(preview.id, '');
          setDocExtracting(false);
          return;
        }

        const name = preview.name.toLowerCase();
        const isPdf = name.endsWith('.pdf');

        let text = '';
        if (isPdf) {
          const res = await fetch('/api/ai/extract-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: preview.url }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Extraction API error: ${res.status}`);
          }
          const data = await res.json();
          if (data.error) throw new Error(data.error);

          text = data.text || '';
          if (data.isLikelyScanned) {
            text = `[This PDF appears to be scanned/image-based. ${data.pageCount} pages. Text extraction may be incomplete.]\n\n${text}`;
          } else {
            text = `[This PDF has exactly ${data.pageCount} pages.]\n\n${text}`;
          }
        } else {
          const response = await fetch(preview.url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          text = await response.text();
        }

        docContentStore.setContent(preview.id, text);
        setDocExtracting(false);
      } catch (error) {
        console.error('Failed to extract document text:', error);
        docContentStore.setContent(preview.id, '');
        setDocExtracting(false);
      }
    };

    // Subscribe to preview changes
    const unsubscribe = useCoursePortalStore.subscribe((state) => {
      const preview = state.states[courseId]?.preview;
      extractDocText(preview || null);
    });

    // Initial extraction
    const preview = useCoursePortalStore.getState().getCourseState(courseId).preview;
    extractDocText(preview || null);

    return unsubscribe;
  }, [courseId, docContentStore]);

  // Generate dynamic suggestion chips based on course name and open document
  const suggestions = useMemo(() => {
    const name = courseName.toLowerCase();
    const doc = openDocName;

    // If a document is open, make suggestions about it
    if (doc) {
      const shortDoc = doc.replace(/\.(pdf|pptx?|docx?|txt)$/i, '').replace(/[_-]/g, ' ');
      return [
        { emoji: '\u{1f4c4}', title: `Summarize "${shortDoc}"`, desc: 'Get key points from this document' },
        { emoji: '\u2753', title: `What are the main concepts in "${shortDoc}"?`, desc: 'Understand the key ideas' },
        { emoji: '\u{1f4dd}', title: `Create practice questions from "${shortDoc}"`, desc: 'Test your understanding' },
      ];
    }

    if (name.includes('math') || name.includes('calculus') || name.includes('analisi') || name.includes('matematica')) {
      return [
        { emoji: '\u{1f4ca}', title: 'Explain derivatives step by step', desc: 'With visual examples' },
        { emoji: '\u{1f3af}', title: 'What are limits and how do they work?', desc: 'Build intuition from scratch' },
        { emoji: '\u{1f527}', title: 'Show me integration techniques', desc: 'By parts, substitution, and more' },
      ];
    } else if (name.includes('physic') || name.includes('fisica')) {
      return [
        { emoji: '\u26a1', title: "Break down Newton's laws with examples", desc: 'Real-world applications' },
        { emoji: '\u{1f30a}', title: 'Explain electromagnetic waves', desc: 'From Maxwell to light' },
        { emoji: '\u{1f527}', title: 'How to approach kinematics problems?', desc: 'Problem-solving strategies' },
      ];
    } else if (name.includes('chem') || name.includes('chim')) {
      return [
        { emoji: '\u2697\ufe0f', title: 'Explain chemical bonding types', desc: 'Ionic, covalent, metallic' },
        { emoji: '\u{1f9ea}', title: 'Walk me through balancing redox reactions', desc: 'Step-by-step method' },
        { emoji: '\u{1f4ca}', title: 'How does thermodynamics work in chemistry?', desc: 'Energy and equilibrium' },
      ];
    } else if (name.includes('program') || name.includes('comput') || name.includes('inform') || name.includes('software') || name.includes('algorithm')) {
      return [
        { emoji: '\u{1f4bb}', title: 'Explain OOP with code examples', desc: 'Classes, inheritance, polymorphism' },
        { emoji: '\u{1f504}', title: 'Compare sorting algorithms visually', desc: 'Time complexity and trade-offs' },
        { emoji: '\u{1f3d7}\ufe0f', title: 'What design patterns should I know?', desc: 'Common patterns for exams' },
      ];
    } else if (name.includes('electr') || name.includes('circuit') || name.includes('elettr')) {
      return [
        { emoji: '\u26a1', title: "Explain Kirchhoff's laws", desc: 'Circuit analysis fundamentals' },
        { emoji: '\u{1f4ca}', title: 'How do I analyze RC/RL circuits?', desc: 'Transient and steady-state' },
        { emoji: '\u{1f527}', title: 'What is impedance in AC circuits?', desc: 'Phasors and complex numbers' },
      ];
    } else if (name) {
      return [
        { emoji: '\u{1f4da}', title: `What are the key topics in ${courseName}?`, desc: 'Course overview and structure' },
        { emoji: '\u{1f3af}', title: `Explain the most important concept in ${courseName}`, desc: 'Start with the fundamentals' },
        { emoji: '\u{1f4dd}', title: `Help me prepare for the ${courseName} exam`, desc: 'Study strategies and practice' },
      ];
    } else {
      return [
        { emoji: '\u{1f4da}', title: 'What should I focus on in this course?', desc: 'Get a study roadmap' },
        { emoji: '\u{1f3af}', title: 'Explain the most important concept', desc: 'Start with the fundamentals' },
        { emoji: '\u{1f4dd}', title: 'Help me prepare for the exam', desc: 'Study strategies and key points' },
      ];
    }
  }, [courseName, openDocName]);

  // Check if user is near bottom of scroll container
  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const threshold = 100; // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  // Scroll to bottom smoothly
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      isAutoScrollingRef.current = true;
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
      // Reset the flag after animation completes
      setTimeout(() => {
        isAutoScrollingRef.current = false;
        setIsUserScrolledUp(false);
        setShowScrollButton(false);
      }, smooth ? 300 : 0);
    }
  }, []);

  // Handle scroll events to detect user scrolling up
  const handleScroll = useCallback(() => {
    // Ignore scroll events triggered by auto-scrolling
    if (isAutoScrollingRef.current) return;

    const nearBottom = isNearBottom();
    setIsUserScrolledUp(!nearBottom);
    setShowScrollButton(!nearBottom);
  }, [isNearBottom]);

  useEffect(() => {
    fetchConversations(courseId);
    fetchSettings();
  }, [courseId, fetchConversations, fetchSettings]);

  // Load active conversation messages or create one if none exist
  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId) {
      switchConversation(conversations[0].id);
    }
  }, [conversations, activeConversationId, switchConversation]);

  // Listen for "Ask AI" text selection events from the course page
  useEffect(() => {
    const handleAskAIQuote = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.text) {
        const quoted = `> ${detail.text.split('\n').join('\n> ')}\n\nExplain this:`;
        setInput(quoted);
      }
    };
    window.addEventListener('ask-ai-quote', handleAskAIQuote);
    return () => window.removeEventListener('ask-ai-quote', handleAskAIQuote);
  }, []);

  // Auto-scroll when new messages arrive or content streams (only if user hasn't scrolled up)
  useEffect(() => {
    if (!isUserScrolledUp) {
      scrollToBottom(true);
    }
  }, [messages, isUserScrolledUp, scrollToBottom]);

  // Auto-scroll during streaming (only if user hasn't scrolled up)
  useEffect(() => {
    if ((streamingState.isStreaming || streamingState.isThinking) && !isUserScrolledUp) {
      scrollToBottom(false); // Use instant scroll during streaming for smoother experience
    }
  }, [streamingState.streamingContent, streamingState.thinkingContent, streamingState.isStreaming, streamingState.isThinking, isUserScrolledUp, scrollToBottom]);

  // Reset scroll state when user sends a new message
  useEffect(() => {
    if (loading && !streamingState.isStreaming) {
      setIsUserScrolledUp(false);
      setShowScrollButton(false);
      scrollToBottom(true);
    }
  }, [loading, streamingState.isStreaming, scrollToBottom]);

  const handleSubmit = async () => {
    if ((!input.trim() && attachments.length === 0) || loading) return;

    const message = input.trim();
    const files = attachments;
    setInput('');
    setAttachments([]);
    await sendMessage(courseId, message, files, studentContext, courseName);
  };



  const handleCopyMessage = async (message: ChatMessage) => {
    const markdown = addExportFooter(messageToMarkdown(message, undefined));
    const success = await copyToClipboard(markdown);
    if (success) {
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }
  };

  const handleExportMessage = (message: ChatMessage) => {
    const markdown = addExportFooter(messageToMarkdown(message, undefined));
    const filename = generateFilename(message);
    downloadMarkdown(markdown, filename);
  };

  const handleRetryMessage = async (messageId: string) => {
    await retryMessage(courseId, messageId, courseName);
  };



  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 min-w-0 px-2 py-1 rounded-md hover:bg-muted transition-colors">
                <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">
                  {conversations.find(c => c.id === activeConversationId)?.title || 'New Chat'}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
              {conversations.map(conv => (
                <DropdownMenuItem
                  key={conv.id}
                  className={`flex items-center justify-between gap-2 cursor-pointer ${
                    conv.id === activeConversationId ? 'bg-muted' : ''
                  }`}
                  onSelect={() => switchConversation(conv.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{conv.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(conv.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id, courseId); }}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </DropdownMenuItem>
              ))}
              {conversations.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => createConversation(courseId)}
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>New Chat</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => createConversation(courseId)}
            className="h-7 w-7 p-0"
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="h-7 w-7 p-0"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2 md:p-4 scroll-smooth bg-background dark:bg-background"
      >
        <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">AI Tutor Ready!</h3>
              <p className="text-muted-foreground mb-6">
                Ask me to explain concepts, solve problems, or clarify doubts
              </p>

              <div className="grid gap-2 max-w-md mx-auto text-left">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(s.title)}
                    className="p-3 bg-card border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                  >
                    <p className="text-sm font-medium">{s.emoji} {s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`group relative flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              {message.role === 'user' ? (
                <div className="max-w-[90%] sm:max-w-[85%] md:max-w-[80%]">
                  <div className="bg-primary/15 dark:bg-emerald-900/40 text-foreground px-3 py-2 md:px-4 md:py-3 rounded-2xl rounded-br-sm shadow-sm">
                    {message.attachments && message.attachments.length > 0 && (
                      <MessageAttachments attachments={message.attachments} />
                    )}
                    {message.content && (
                      <div className="leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                        {message.content}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-[95%] sm:max-w-[90%] md:max-w-[85%] space-y-2">
                  {/* GIF Display - shown above message content as separate element */}
                  {message.gifUrl && message.gifPreviewUrl && message.gifMood && (
                    <div className="max-w-full">
                      <GifDisplay
                        gifUrl={message.gifUrl}
                        previewUrl={message.gifPreviewUrl}
                        mood={message.gifMood}
                      />
                    </div>
                  )}

                  {/* Message text */}
                  <div className="text-foreground px-1 py-1 md:px-2 md:py-1">
                    <ExplanationTabs 
                      message={message} 
                      isStreaming={streamingState.isStreaming && streamingState.streamingMessageId === message.id}
                    />
                  </div>

                  {/* Hover Action Buttons */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyMessage(message)}
                      className="h-7 w-7 p-0 hover:bg-muted"
                      title="Copy"
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExportMessage(message)}
                      className="h-7 w-7 p-0 hover:bg-muted"
                      title="Export .md"
                    >
                      <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRetryMessage(message.id)}
                      className="h-7 w-7 p-0 hover:bg-muted"
                      title="Retry"
                      disabled={loading}
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {(streamingState.isThinking || streamingState.isStreaming) && (
            <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="max-w-[95%] sm:max-w-[90%] md:max-w-[85%] space-y-3">
                {/* Thinking State */}
                {streamingState.isThinking && streamingState.thinkingContent && (
                  <Collapsible open={thinkingOpen} onOpenChange={setThinkingOpen}>
                    <CollapsibleTrigger className="w-full bg-amber-50 dark:bg-amber-900/40 rounded-2xl rounded-bl-sm p-3 hover:bg-amber-100 dark:hover:bg-amber-800/50 transition-all shadow-sm animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                          <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Thinking...</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-amber-600 dark:text-amber-400 transition-transform ${thinkingOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="bg-amber-50/70 dark:bg-amber-900/30 rounded-2xl rounded-bl-sm p-4 shadow-sm animate-in fade-in duration-300">
                        <div className="text-sm text-amber-900 dark:text-amber-100 prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {streamingState.thinkingContent}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Streaming State */}
                {streamingState.isStreaming && streamingState.streamingContent && (
                  <div className="text-foreground px-1 py-1 md:px-2 md:py-1 relative overflow-hidden">
                    {hasVisualizations(streamingState.streamingContent) ? (
                      <div className="text-foreground prose prose-sm max-w-none relative">
                        {parseStreamingSegments(streamingState.streamingContent).map((seg, i) => {
                          if (seg.type === 'text') {
                            return (
                              <div key={i}>
                                <ReactMarkdown
                                  remarkPlugins={[remarkMath, remarkGfm]}
                                  rehypePlugins={[rehypeKatex]}
                                  components={{
                                    p: ({ children }) => <span className="block mb-2">{children}</span>,
                                    a: ({ node, href, children, ...props }) => {
                                      if (href?.startsWith('#pdf-')) {
                                        return (
                                          <button 
                                            onClick={(e) => {
                                              e.preventDefault();
                                              window.dispatchEvent(new CustomEvent('pdf-navigate', { detail: href.replace('#pdf-', '') }));
                                            }}
                                            className="inline-flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 px-2 py-0.5 rounded text-sm font-medium transition-colors"
                                          >
                                            {children}
                                          </button>
                                        );
                                      }
                                      return <a href={href} {...props} className="text-primary hover:underline" target={href?.startsWith('http') ? '_blank' : undefined}>{children}</a>
                                    }
                                  }}
                                >
                                  {seg.content}
                                </ReactMarkdown>
                              </div>
                            );
                          } else if (seg.type === 'visualization') {
                            return <VisualizationFrame key={i} html={seg.html} title={seg.title} />;
                          } else if (seg.type === 'visualization_loading') {
                            return <VisualizationSkeleton key={i} title={seg.title} />;
                          } else if (seg.type === 'manim') {
                            return <ManimFrame key={i} script={seg.script} title={seg.title} />;
                          } else if (seg.type === 'manim_loading') {
                            return <ManimSkeleton key={i} title={seg.title} />;
                          }
                          return null;
                        })}
                        <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-[blink_1s_ease-in-out_infinite] align-middle" />
                      </div>
                    ) : (
                      <>
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                        <div className="text-foreground prose prose-sm max-w-none relative inline-block">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              p: ({ children }) => <span>{children}</span>,
                              a: ({ node, href, children, ...props }) => {
                                if (href?.startsWith('#pdf-')) {
                                  return (
                                    <button 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        window.dispatchEvent(new CustomEvent('pdf-navigate', { detail: href.replace('#pdf-', '') }));
                                      }}
                                      className="inline-flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 px-2 py-0.5 rounded text-sm font-medium transition-colors"
                                    >
                                      {children}
                                    </button>
                                  );
                                }
                                return <a href={href} {...props} className="text-primary hover:underline" target={href?.startsWith('http') ? '_blank' : undefined}>{children}</a>
                              }
                            }}
                          >
                            {streamingState.streamingContent}
                          </ReactMarkdown>
                          <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-[blink_1s_ease-in-out_infinite] align-middle" />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Loading indicator — claude.ai inspired sparkle */}
                {((!streamingState.isStreaming && !streamingState.thinkingContent && loading) || 
                  (streamingState.isThinking && !streamingState.thinkingContent && !streamingState.isStreaming)) && (
                  <div className="flex items-start gap-3 animate-in fade-in duration-200">
                    <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                      <svg
                        className="w-7 h-7 animate-spin"
                        style={{ animationDuration: '3s' }}
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                          <line
                            key={angle}
                            x1="12"
                            y1="12"
                            x2={12 + 8 * Math.cos((angle * Math.PI) / 180)}
                            y2={12 + 8 * Math.sin((angle * Math.PI) / 180)}
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            className="text-primary"
                            style={{
                              opacity: 0.3 + (i % 4) * 0.2,
                            }}
                          />
                        ))}
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-28 md:bottom-32 left-1/2 -translate-x-1/2 z-10">
          <Button
            onClick={() => scrollToBottom(true)}
            size="sm"
            className="rounded-full shadow-lg gap-1 md:gap-1.5 bg-background hover:bg-muted text-foreground border border-border text-xs md:text-sm px-3 md:px-4 h-8 md:h-9"
          >
            <ArrowDown className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Scroll to bottom</span>
            <span className="sm:hidden">Bottom</span>
          </Button>
        </div>
      )}

      {/* Reading Document Indicator */}
      {docExtracting && openDocName && (
        <div className="absolute bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-full text-xs font-medium shadow-sm backdrop-blur-sm">
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="truncate max-w-[200px]">Reading {openDocName}...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 pb-2">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Floating Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={loading || docExtracting}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
      />
      <ChatSettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
