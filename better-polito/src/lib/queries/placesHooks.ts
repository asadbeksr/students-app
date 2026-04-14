// Modified from polito/students-app — 2026-04-13
import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const SITES_QUERY_KEY = ['sites'];
export const BUILDINGS_QUERY_KEY = ['buildings'];
export const PLACES_QUERY_KEY = ['places'];
export const PLACE_CATEGORIES_QUERY_KEY = ['place-categories'];
export const FREE_ROOMS_QUERY_KEY = ['free-rooms'];

export const useGetSites = () => useQuery({
  queryKey: SITES_QUERY_KEY,
  queryFn: () => (getApiClient() as any).getSites().then((r: any) => r.data ?? []),
  staleTime: Infinity,
});

export const useGetBuildings = (siteId?: string) => useQuery({
  queryKey: [...BUILDINGS_QUERY_KEY, siteId],
  queryFn: () => (getApiClient() as any).getBuildings(siteId).then((r: any) => r.data ?? []),
});

export const useGetPlaces = (params?: Record<string, string>) => useQuery({
  queryKey: [...PLACES_QUERY_KEY, params],
  queryFn: () => (getApiClient() as any).getPlaces(params).then((r: any) => r.data ?? []),
});

export const useGetPlace = (placeId: string) => useQuery({
  queryKey: ['place', placeId],
  queryFn: () => (getApiClient() as any).getPlace(placeId).then((r: any) => r.data),
  enabled: !!placeId,
});

export const useGetPlaceCategories = () => useQuery({
  queryKey: PLACE_CATEGORIES_QUERY_KEY,
  queryFn: () => (getApiClient() as any).getPlaceCategories().then((r: any) => r.data ?? []),
  staleTime: Infinity,
});

export const useGetFreeRooms = (params: Record<string, string>, enabled: boolean) => useQuery({
  queryKey: [...FREE_ROOMS_QUERY_KEY, params],
  queryFn: () => (getApiClient() as any).getFreeRooms(params).then((r: any) => r.data ?? []),
  enabled,
});
