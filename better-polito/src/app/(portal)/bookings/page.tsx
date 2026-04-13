'use client';
import { useGetBookings } from '@/lib/queries/bookingHooks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CalendarCheck, Plus, MapPin, Clock, QrCode, Armchair } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

const BOOKINGS_QUERY_KEY = ['bookings'];

function statusVariant(status: string): 'success' | 'secondary' | 'destructive' | 'outline' {
  const s = status?.toLowerCase();
  if (['confirmed', 'active', 'approved'].includes(s)) return 'success';
  if (['cancelled', 'rejected', 'expired'].includes(s)) return 'destructive';
  return 'secondary';
}

export default function BookingsPage() {
  const { data: bookings = [], isLoading } = useGetBookings();
  const qc = useQueryClient();
  const all = bookings as any[];

  const active = all.filter(b => !['cancelled','expired','rejected'].includes(b.status?.toLowerCase()));
  const past = all.filter(b => ['cancelled','expired','rejected'].includes(b.status?.toLowerCase()));

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-foreground">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">Room and service reservations.</p>
        </div>
        <Button onClick={() => toast.info('New booking wizard coming soon')}>
          <Plus className="w-4 h-4 mr-2" /> New Booking
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}</div>
      ) : all.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarCheck className="w-10 h-10 text-border mx-auto mb-3" />
            <p className="text-muted-foreground">No bookings found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-3">
              {active.map((b: any, i: number) => (
                <BookingCard key={b.id ?? i} booking={b} onCancel={() => {
                  getApiClient().deleteBooking(String(b.id))
                    .then(() => { qc.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY }); toast.success('Booking cancelled'); })
                    .catch(() => toast.error('Could not cancel'));
                }} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Past / Cancelled</h2>
              <div className="space-y-2 opacity-60">
                {past.map((b: any, i: number) => <BookingCard key={b.id ?? i} booking={b} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BookingCard({ booking: b, onCancel }: { booking: any; onCancel?: () => void }) {
  const location = [b.room, b.building, b.address].filter(Boolean).join(', ');
  const startsAt = b.startsAt ?? b.startTime ?? b.date;
  const endsAt = b.endsAt ?? b.endTime;
  const seat = b.seat ?? b.seatCode ?? b.seatNumber;
  const canCancel = !['cancelled','expired','rejected'].includes(b.status?.toLowerCase());

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <p className="font-medium text-foreground">{b.topicName ?? b.name ?? b.serviceName}</p>
              <Badge variant={statusVariant(b.status)}>{b.status ?? 'pending'}</Badge>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {startsAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {' '}
                  {new Date(startsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  {endsAt && ` – ${new Date(endsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {location}
                </span>
              )}
              {seat && (
                <span className="flex items-center gap-1">
                  <Armchair className="w-3 h-3" /> Seat {seat}
                </span>
              )}
            </div>

            {b.qrCode && (
              <button
                className="mt-2 text-xs text-blue-600 flex items-center gap-1 hover:underline"
                onClick={() => toast.info('QR code: ' + b.qrCode)}
              >
                <QrCode className="w-3 h-3" /> Show QR code
              </button>
            )}
          </div>

          {canCancel && onCancel && (
            <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 shrink-0"
              onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
