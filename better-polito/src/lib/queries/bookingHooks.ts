// Modified from polito/students-app — 2026-04-13
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const BOOKINGS_QUERY_KEY = ['bookings'];
export const BOOKINGS_TOPICS_QUERY_KEY = ['booking', 'topics'];

export const useGetBookings = () => useQuery({
  queryKey: BOOKINGS_QUERY_KEY,
  queryFn: () => ((getApiClient() as any) as any).getBookings().then((r: any) => r.data ?? []),
});

export const useGetBookingTopics = () => useQuery({
  queryKey: BOOKINGS_TOPICS_QUERY_KEY,
  queryFn: () => ((getApiClient() as any) as any).getBookingTopics().then((r: any) => r.data ?? []),
});

export const useGetBookingSlots = (topicId: string, from: string, to: string) => useQuery({
  queryKey: ['booking', 'slots', topicId, from, to],
  queryFn: () => ((getApiClient() as any) as any).getBookingSlots(topicId, from, to).then((r: any) => r.data ?? []),
  enabled: !!topicId && !!from && !!to,
});

export const useGetBookingSeats = (topicId: string, slotId: string) => useQuery({
  queryKey: ['booking', 'seats', topicId, slotId],
  queryFn: () => ((getApiClient() as any) as any).getBookingSeats(topicId, slotId).then((r: any) => r.data ?? []),
  enabled: !!topicId && !!slotId,
});

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: unknown) => ((getApiClient() as any) as any).createBooking(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY }),
  });
};

export const useDeleteBooking = (bookingId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ((getApiClient() as any) as any).deleteBooking(bookingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY }),
  });
};
