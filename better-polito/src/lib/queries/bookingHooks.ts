// Modified from polito/students-app — 2026-04-13
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const BOOKINGS_QUERY_KEY = ['bookings'];

export const useGetBookings = () => useQuery({
  queryKey: BOOKINGS_QUERY_KEY,
  queryFn: () => getApiClient().getBookings().then((r) => r.data ?? []),
});

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: unknown) => getApiClient().createBooking(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY }),
  });
};

export const useDeleteBooking = (bookingId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => getApiClient().deleteBooking(bookingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY }),
  });
};
