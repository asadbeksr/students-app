// Modified from polito/students-app — 2026-04-13
import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const NEWS_QUERY_KEY = ['news'];
export const NEWS_ITEM_QUERY_PREFIX = 'news-item';

export const useGetNews = () => useQuery({
  queryKey: NEWS_QUERY_KEY,
  queryFn: () => (getApiClient() as any).getNews().then((r: any) => r.data ?? []),
});

export const useGetNewsItem = (newsItemId: number) => useQuery({
  queryKey: [NEWS_ITEM_QUERY_PREFIX, newsItemId],
  queryFn: () => (getApiClient() as any).getNewsItem(newsItemId).then((r: any) => r.data),
  enabled: !!newsItemId,
});
