import { useEffect, useRef, useState, useCallback } from 'react';

import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bot, ChevronDown, Brain, Copy, Download, RotateCcw, Check, ArrowDown } from 'lucide-react';
import ExplanationTabs from './ExplanationTabs';
import ChatInput from './ChatInput';
import MessageAttachments from './MessageAttachments';
import { GifDisplay } from './GifDisplay';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { messageToMarkdown, copyToClipboard, downloadMarkdown, generateFilename, addExportFooter } from '@/lib/exportUtils';
import type { ChatMessage } from '@/types';

interface ChatWindowProps {
  courseId: string;
}

export default function ChatWindow({ courseId }: ChatWindowProps) {

  const { messages, loading, error, streamingState, fetchMessages, sendMessage, retryMessage } = useChatStore();
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
        behavior: smooth ? 'smooth' : 'instant',
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
    fetchMessages(courseId);
    fetchSettings();
  }, [courseId, fetchMessages, fetchSettings]);

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
    await sendMessage(courseId, message, files);
  };



  const handleCopyMessage = async (message: ChatMessage) => {
    const markdown = addExportFooter(messageToMarkdown(message, settings?.explanationMode));
    const success = await copyToClipboard(markdown);
    if (success) {
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }
  };

  const handleExportMessage = (message: ChatMessage) => {
    const markdown = addExportFooter(messageToMarkdown(message, settings?.explanationMode));
    const filename = generateFilename(message);
    downloadMarkdown(markdown, filename);
  };

  const handleRetryMessage = async (messageId: string) => {
    await retryMessage(courseId, messageId);
  };



  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      {/* Header */}
      {/* <div className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-card gap-2">
        <h2 className="text-base md:text-lg font-semibold text-foreground truncate">{getChatHeader()}</h2>
        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          <div className="flex items-center bg-muted rounded-lg p-0.5 md:p-1">
            <Button
              variant={settings?.explanationMode === 'quick' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setExplanationMode('quick')}
              className="gap-1 md:gap-2 h-7 md:h-8 text-xs md:text-sm px-2 md:px-3"
            >
              <Zap className="h-3 w-3 md:h-3.5 md:w-3.5" />
              <span className="hidden sm:inline">Quick</span>
            </Button>
            <Button
              variant={settings?.explanationMode === 'deep' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setExplanationMode('deep')}
              className="gap-1 md:gap-2 h-7 md:h-8 text-xs md:text-sm px-2 md:px-3"
            >
              <Microscope className="h-3 w-3 md:h-3.5 md:w-3.5" />
              <span className="hidden sm:inline">Deep</span>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={messages.length === 0}
            className="gap-1 md:gap-2 h-7 md:h-8 px-2 md:px-3"
          >
            <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">{t('chat.clear')}</span>
          </Button>
        </div>
      </div> */}

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
                <button
                  onClick={() => setInput('Explain derivatives')}
                  className="p-3 bg-card border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                >
                  <p className="text-sm font-medium">📊 Explain derivatives</p>
                  <p className="text-xs text-muted-foreground">Get a complete breakdown with examples</p>
                </button>
                <button
                  onClick={() => setInput('What are limits?')}
                  className="p-3 bg-card border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                >
                  <p className="text-sm font-medium">🎯 What are limits?</p>
                  <p className="text-xs text-muted-foreground">Learn the fundamentals</p>
                </button>
                <button
                  onClick={() => setInput('How do I integrate by parts?')}
                  className="p-3 bg-card border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                >
                  <p className="text-sm font-medium">🔧 How do I integrate by parts?</p>
                  <p className="text-xs text-muted-foreground">Step-by-step guidance</p>
                </button>
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

                  {/* Message text bubble */}
                  <div className="bg-slate-100 dark:bg-slate-700/60 text-foreground px-3 py-2 md:px-4 md:py-3 rounded-2xl rounded-bl-sm shadow-sm">
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
                  <div className="bg-slate-100 dark:bg-slate-700/60 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm relative overflow-hidden">
                    {/* Subtle shimmer effect */}
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

                    <div className="text-foreground prose prose-sm max-w-none relative inline-block">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: ({ children }) => <span>{children}</span>,
                        }}
                      >
                        {streamingState.streamingContent}
                      </ReactMarkdown>
                      {/* Blinking green cursor inline with text */}
                      <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-[blink_1s_ease-in-out_infinite] align-middle" />
                    </div>
                  </div>
                )}

                {/* Loading without content yet */}
                {!streamingState.isStreaming && !streamingState.thinkingContent && loading && (
                  <div className="bg-slate-100 dark:bg-slate-700/60 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm animate-in fade-in duration-200">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
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
        disabled={loading}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
      />
    </div>
  );
}
