'use client';
import { useGetMessages } from '@/lib/queries/studentHooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MessageSquare, Info, AlertTriangle, Shield, Mail } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';
import { MESSAGES_QUERY_KEY } from '@/lib/queries/studentHooks';
import { toast } from 'sonner';
import { useState } from 'react';

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  info: { icon: Info, color: 'text-blue-500', label: 'Info' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', label: 'Warning' },
  mfa: { icon: Shield, color: 'text-purple-500', label: 'Security' },
  default: { icon: Mail, color: 'text-muted-foreground', label: '' },
};

export default function MessagesPage() {
  const { data: messages = [], isLoading } = useGetMessages();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);

  const markRead = useMutation({
    mutationFn: (id: number) => getApiClient().markMessageAsRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY }),
  });

  const deleteMsg = useMutation({
    mutationFn: (id: number) => getApiClient().deleteMessage(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY }); toast.success('Message deleted'); },
  });

  const unread = (messages as any[]).filter((m: any) => !m.isRead).length;

  return (
    <div className="space-y-6 w-full">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-light text-foreground">Messages</h1>
          {unread > 0 && <Badge className="bg-black text-white">{unread} unread</Badge>}
        </div>
        <p className="text-sm text-muted-foreground mt-1">Official student communications.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : (messages as any[]).length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <MessageSquare className="w-10 h-10 text-border mb-3" />
            <p className="text-muted-foreground">No messages.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(messages as any[]).map((m: any, i: number) => {
            const typeKey = m.type?.toLowerCase() ?? 'default';
            const cfg = TYPE_CONFIG[typeKey] ?? TYPE_CONFIG.default;
            const Icon = cfg.icon;
            const isExpanded = expanded === i;

            return (
              <Card
                key={m.id ?? i}
                className={`transition-all cursor-pointer ${!m.isRead ? 'border-l-4 border-l-black' : ''}`}
                onClick={() => {
                  setExpanded(isExpanded ? null : i);
                  if (!m.isRead && m.id) markRead.mutate(m.id);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate">{m.subject ?? m.title}</p>
                        {!m.isRead && <Badge variant="default" className="text-[10px] px-1.5 shrink-0">New</Badge>}
                        {cfg.label && <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">{cfg.label}</Badge>}
                      </div>
                      {m.sender && (
                        <p className="text-xs text-muted-foreground mt-0.5">From: {m.sender}</p>
                      )}
                      <p className={`text-sm text-muted-foreground mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {m.content ?? m.body}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        {m.sentAt && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(m.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                        {m.id && (
                          <Button
                            size="sm" variant="ghost"
                            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 h-6 px-2 ml-auto"
                            onClick={(e) => { e.stopPropagation(); deleteMsg.mutate(m.id); }}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
