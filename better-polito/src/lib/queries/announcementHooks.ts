// Modified from polito/students-app — 2026-04-13
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const ANNOUNCEMENTS_QUERY_KEY = ['announcements'];

export const useGetAnnouncements = (seen: boolean, scope?: string) => useQuery({
  queryKey: [...ANNOUNCEMENTS_QUERY_KEY, { seen, scope }],
  queryFn: () => getApiClient().getAnnouncements({ _new: !seen }).then((r: any) => {
    const data = r.data ?? [];
    return scope ? data.filter((a: any) => a.scope === scope) : data;
  }),
});

export const useMarkAnnouncementAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetch(`/api/announcements/${id}/read`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_QUERY_KEY }),
  });
};
