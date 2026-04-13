// Modified from polito/students-app — 2026-04-13
import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const STUDENT_QUERY_KEY = ['student'];
export const GRADES_QUERY_KEY = ['grades'];
export const PROVISIONAL_GRADES_QUERY_KEY = ['provisionalGrades'];
export const MESSAGES_QUERY_KEY = ['messages'];
export const GUIDES_QUERY_KEY = ['guides'];
export const NOTIFICATIONS_QUERY_KEY = ['notifications'];

export const useGetStudent = () => useQuery({
  queryKey: STUDENT_QUERY_KEY,
  queryFn: () => getApiClient().getStudent().then((r: any) => r.data),
  staleTime: Infinity,
});

export const useGetGrades = () => useQuery({
  queryKey: GRADES_QUERY_KEY,
  queryFn: () => getApiClient().getGrades().then((r: any) => r.data),
});

export const useGetProvisionalGrades = () => useQuery({
  queryKey: PROVISIONAL_GRADES_QUERY_KEY,
  queryFn: () => getApiClient().getProvisionalGrades().then((r: any) => r.data),
});

export const useGetMessages = () => useQuery({
  queryKey: MESSAGES_QUERY_KEY,
  queryFn: () => getApiClient().getMessages().then((r: any) => r.data),
  refetchInterval: 5 * 60 * 1000,
});

export const useGetGuides = () => useQuery({
  queryKey: GUIDES_QUERY_KEY,
  queryFn: () => getApiClient().getGuides().then((r: any) => r.data),
  staleTime: 60 * 60 * 1000,
});

export const useGetNotifications = () => useQuery({
  queryKey: NOTIFICATIONS_QUERY_KEY,
  queryFn: () => getApiClient().getNotifications().then((r: any) => r.data),
  refetchInterval: 5 * 60 * 1000,
});
