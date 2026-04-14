'use client';
import { useState, useRef, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages.map(m => ({ role: m.role, content: m.content })) }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantContent = data.content || data.text || data.message || 'I received your message.';
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: assistantContent }]);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center mx-auto mb-4">
                <Bot className="w-6 h-6 text-surface" />
              </div>
              <h3 className="text-lg font-light text-foreground mb-2">AI Study Assistant</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Ask about exam tips, university services, study strategies, or your academic questions.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={cn('flex gap-3', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarFallback className={cn('text-xs', m.role === 'user' ? 'bg-foreground text-surface' : 'bg-surface-warm text-text-muted')}>
                  {m.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                </AvatarFallback>
              </Avatar>
              <div className={cn('max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                m.role === 'user' ? 'bg-foreground text-surface rounded-tr-sm' : 'bg-background text-text-muted rounded-tl-sm'
              )}>
                {m.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs bg-surface-warm text-text-muted"><Bot className="w-3 h-3" /></AvatarFallback>
              </Avatar>
              <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-background flex items-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-[#777169] rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}

          {error && <div className="text-center text-xs text-red-500 py-2">{error}</div>}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
