'use client';
import { useGetTickets } from '@/lib/queries/ticketHooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Ticket, Plus, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function TicketsPage() {
  const { data: tickets = [], isLoading } = useGetTickets();

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-foreground">Support Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">Your support requests and inquiries.</p>
        </div>
        <Button onClick={() => toast.info('New ticket form coming soon')}>
          <Plus className="w-4 h-4 mr-2" /> New Ticket
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : (tickets as any[]).length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <Ticket className="w-10 h-10 text-border mb-3" />
            <p className="text-muted-foreground">No open tickets.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(tickets as any[]).map((t: any) => (
            <Link key={t.id} href={`/tickets/${t.id}`}>
              <Card className="hover:shadow-[rgba(0,0,0,0.4)_0px_0px_1px,rgba(78,50,23,0.06)_0px_8px_24px] transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{t.subject || t.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">#{t.id}</span>
                      {t.createdAt && <span className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.status === 'open' ? 'success' : t.status === 'closed' ? 'secondary' : 'warning'}>
                      {t.status ?? 'open'}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
