// Modified from polito/students-app — 2026-04-13
import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const SURVEYS_QUERY_KEY = ['surveys'];

export const useGetSurveys = () => useQuery({
  queryKey: SURVEYS_QUERY_KEY,
  queryFn: () => getApiClient().getSurveys().then((r) => r.data ?? []),
});

type CpdSurvey = { isMandatory?: boolean; isCompiled?: boolean };

export const useGetCpdSurveys = () => {
  const query = useGetSurveys();
  return {
    ...query,
    data: (query.data as CpdSurvey[])?.filter((s) => s.isMandatory && !s.isCompiled) ?? [],
  };
};
