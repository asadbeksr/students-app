'use client';
import { useGetBookings, useGetBookingTopics } from '@/lib/queries/bookingHooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function BookingsPage() {
  const { data: bookings = [], isLoading } = useGetBookings();
  const { data: topics = [] } = useGetBookingTopics();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-black">Bookings</h1>
          <p className="text-sm text-[#777169] mt-1">Room and service reservations.</p>
        </div>
        <Button onClick={() => toast.info('New booking wizard coming soon')}>
          <Plus className="w-4 h-4 mr-2" /> New Booking
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : (bookings as any[]).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarCheck className="w-10 h-10 text-[#e5e5e5] mx-auto mb-3" />
            <p className="text-[#777169]">No bookings found.</p>
            <p className="text-sm text-[#777169] mt-1">Book rooms, labs, or services below.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(bookings as any[]).map((b: any, i: number) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-black">{b.topicName || b.name}</p>
                  <p className="text-xs text-[#777169] mt-1">{b.date ? new Date(b.date).toLocaleDateString() : ''}</p>
                </div>
                <Badge variant={b.status === 'confirmed' ? 'success' : 'secondary'}>{b.status ?? 'pending'}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(topics as any[]).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Available Services</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(topics as any[]).map((t: any, i: number) => (
                <Button key={i} variant="stone" size="sm" onClick={() => toast.info(`Booking ${t.name} — coming soon`)}>
                  {t.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
