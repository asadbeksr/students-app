// Modified from polito/students-app — 2026-04-13
import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const OFFERING_QUERY_KEY = ['offering'];
export const DEGREES_QUERY_PREFIX = 'degrees';
export const STATISTICS_QUERY_PREFIX = 'statistics';

export const useGetOffering = () => useQuery({
  queryKey: OFFERING_QUERY_KEY,
  queryFn: () => (getApiClient() as any).getOffering().then((r: any) => r.data),
  staleTime: Infinity,
});

export const useGetOfferingDegree = (degreeId: string, year?: number) => useQuery({
  queryKey: [DEGREES_QUERY_PREFIX, degreeId, year],
  queryFn: () => (getApiClient() as any).getOfferingDegree(degreeId, year).then((r: any) => r.data),
  enabled: !!degreeId,
});

export const useGetCourseStatistics = (shortcode: string, teacherId?: number, year?: number) => useQuery({
  queryKey: [STATISTICS_QUERY_PREFIX, shortcode, teacherId, year],
  queryFn: () => (getApiClient() as any).getCourseStatistics(shortcode, teacherId, year).then((r: any) => r.data),
  enabled: !!shortcode,
});
