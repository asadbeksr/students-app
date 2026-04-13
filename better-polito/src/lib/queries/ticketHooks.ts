// Modified from polito/students-app — 2026-04-13
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const TICKETS_QUERY_KEY = ['tickets'];
export const TICKET_QUERY_PREFIX = 'ticket';
export const TOPICS_QUERY_KEY = ['ticket-topics'];
export const FAQS_QUERY_KEY = ['ticket-faqs'];

export const useGetTickets = () => useQuery({
  queryKey: TICKETS_QUERY_KEY,
  queryFn: () => (getApiClient() as any).getTickets().then((r: any) => r.data ?? []),
});

export const useGetTicket = (ticketId: number) => useQuery({
  queryKey: [TICKET_QUERY_PREFIX, ticketId],
  queryFn: () => (getApiClient() as any).getTicket(ticketId).then((r: any) => r.data),
  enabled: !!ticketId,
});

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: unknown) => (getApiClient() as any).createTicket(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY }),
  });
};

export const useReplyToTicket = (ticketId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: unknown) => (getApiClient() as any).replyToTicket(ticketId, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [TICKET_QUERY_PREFIX, ticketId] }),
  });
};

export const useGetTicketTopics = () => useQuery({
  queryKey: TOPICS_QUERY_KEY,
  queryFn: () => (getApiClient() as any).getTicketTopics().then((r: any) => r.data ?? []),
  staleTime: Infinity,
});

export const useMarkTicketAsClosed = (ticketId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => (getApiClient() as any).markTicketAsClosed(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [TICKET_QUERY_PREFIX, ticketId] });
    },
  });
};

export const useSearchTicketFaqs = (search: string) => useQuery({
  queryKey: [...FAQS_QUERY_KEY, search],
  queryFn: () => (getApiClient() as any).searchTicketFaqs(search).then((r: any) => r.data ?? []),
  enabled: search.length >= 2,
});
