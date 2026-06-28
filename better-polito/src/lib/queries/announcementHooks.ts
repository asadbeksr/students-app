// Modified from polito/students-app — 2026-04-13
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const ANNOUNCEMENTS_QUERY_KEY = ['announcements'];

export const useMarkAnnouncementAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetch(`/api/announcements/${id}/read`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY }),
  });
};
