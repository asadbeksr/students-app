// Modified from polito/students-app — 2026-04-13
import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const PLACES_QUERY_KEY = ['places'];

export type Place = {
  id: string | number;
  name?: string;
  type?: string;
  latitude?: number;
  longitude?: number;
};

export const useGetPlaces = (params?: Record<string, string>) => useQuery({
  queryKey: [...PLACES_QUERY_KEY, params],
  queryFn: () => getApiClient().getPlaces(params).then((r) => (r.data ?? []) as Place[]),
});
