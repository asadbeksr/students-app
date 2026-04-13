'use client';
import { useState, use } from 'react';
import { useGetTicket, useReplyToTicket } from '@/lib/queries/ticketHooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Props { params: Promise<{ ticketId: string }> }

export default function TicketDetailPage({ params }: Props) {
  const { ticketId } = use(params);
  const id = parseInt(ticketId);
  const { data: ticket, isLoading } = useGetTicket(id);
  const reply = useReplyToTicket(id);
  const [message, setMessage] = useState('');

  const ticketData = ticket as any;

  const handleReply = async () => {
    if (!message.trim()) return;
    try {
      await reply.mutateAsync({ message });
      setMessage('');
      toast.success('Reply sent');
    } catch {
      toast.error('Failed to send reply');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/tickets"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        {isLoading ? <Skeleton className="h-9 w-64" /> : (
          <div>
            <h1 className="text-xl font-light text-black">{ticketData?.subject || `Ticket #${id}`}</h1>
            <Badge variant={ticketData?.status === 'open' ? 'success' : 'secondary'} className="mt-1">
              {ticketData?.status ?? 'open'}
            </Badge>
          </div>
        )}
      </div>

      {/* Messages */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Conversation</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20" />)}</div>
          ) : (
            <>
              {ticketData?.description && (
                <div className="p-4 rounded-xl bg-[#f5f5f5]">
                  <p className="text-xs font-semibold text-[#777169] mb-1">You</p>
                  <p className="text-sm text-[#4e4e4e]">{ticketData.description}</p>
                </div>
              )}
              {(ticketData?.replies ?? []).map((r: any, i: number) => (
                <div key={i} className={`p-4 rounded-xl ${r.isStaff ? 'bg-black text-white' : 'bg-[#f5f5f5]'}`}>
                  <p className={`text-xs font-semibold mb-1 ${r.isStaff ? 'text-white/60' : 'text-[#777169]'}`}>
                    {r.isStaff ? 'Support' : 'You'}
                  </p>
                  <p className={`text-sm ${r.isStaff ? 'text-white' : 'text-[#4e4e4e]'}`}>{r.message}</p>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Reply form */}
      {ticketData?.status !== 'closed' && (
        <div className="flex gap-3">
          <Input
            placeholder="Type your reply…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply()}
            className="flex-1"
          />
          <Button onClick={handleReply} disabled={reply.isPending || !message.trim()}>
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      )}
    </div>
  );
}
