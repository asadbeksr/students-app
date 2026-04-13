'use client';
import { useGetMessages } from '@/lib/queries/studentHooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  const { data: messages = [], isLoading } = useGetMessages();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-light text-black">Messages</h1>
        <p className="text-sm text-[#777169] mt-1">System messages and notifications.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : (messages as any[]).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageSquare className="w-10 h-10 text-[#e5e5e5] mx-auto mb-3" />
            <p className="text-[#777169]">No messages.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(messages as any[]).map((m: any, i: number) => (
            <Card key={i} className={!m.isRead ? 'border-l-4 border-l-black' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-black truncate">{m.subject || m.title}</p>
                      {!m.isRead && <Badge variant="default" className="text-[10px] px-1.5">New</Badge>}
                    </div>
                    <p className="text-sm text-[#4e4e4e] mt-1 line-clamp-2">{m.content || m.body}</p>
                    {m.sentAt && <p className="text-xs text-[#777169] mt-1">{new Date(m.sentAt).toLocaleDateString()}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
