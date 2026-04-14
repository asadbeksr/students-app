// Modified from polito/students-app — 2026-04-13
import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const PEOPLE_QUERY_PREFIX = 'people';
export const PERSON_QUERY_PREFIX = 'person';

export const useGetPeople = (search: string, enabled: boolean) => useQuery({
  queryKey: [PEOPLE_QUERY_PREFIX, search],
  queryFn: () => (getApiClient() as any).getPeople(search).then((r: any) => r.data ?? []),
  enabled: enabled && search.length >= 2,
});

export const useGetPerson = (personId?: number) => useQuery({
  queryKey: [PERSON_QUERY_PREFIX, personId],
  queryFn: () => (getApiClient() as any).getPerson(personId!).then((r: any) => r.data),
  enabled: !!personId,
});
