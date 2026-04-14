// Modified from polito/students-app — 2026-04-13
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const STUDENT_QUERY_KEY = ['student'];
export const GRADES_QUERY_KEY = ['grades'];
export const PROVISIONAL_GRADES_QUERY_KEY = ['provisionalGrades'];
export const DEADLINES_QUERY_KEY = ['deadlines'];
export const LECTURES_QUERY_KEY = ['lectures'];
export const MESSAGES_QUERY_KEY = ['messages'];
export const GUIDES_QUERY_KEY = ['guides'];
export const NOTIFICATIONS_QUERY_KEY = ['notifications'];

export const useGetStudent = () => useQuery({
  queryKey: STUDENT_QUERY_KEY,
  queryFn: () => (getApiClient() as any).getMe().then((r: any) => r.data),
  staleTime: Infinity,
});

export const useGetGrades = () => useQuery({
  queryKey: GRADES_QUERY_KEY,
  queryFn: () => (getApiClient() as any).getGrades().then((r: any) => r.data),
});

export const useGetProvisionalGrades = () => useQuery({
  queryKey: PROVISIONAL_GRADES_QUERY_KEY,
  queryFn: () => (getApiClient() as any).getProvisionalGrades().then((r: any) => r.data),
});

export const useGetDeadlines = (params?: { fromDate?: string; toDate?: string }) => useQuery({
  queryKey: [...DEADLINES_QUERY_KEY, params],
  queryFn: () => (getApiClient() as any).getDeadlines(params).then((r: any) => r.data),
  staleTime: 5 * 60 * 1000,
});

export const useGetLectures = (params?: Record<string, string>) => useQuery({
  queryKey: [...LECTURES_QUERY_KEY, params],
  queryFn: () => (getApiClient() as any).getLectures(params).then((r: any) => r.data),
  staleTime: 10 * 60 * 1000,
});

export const useGetMessages = () => useQuery({
  queryKey: MESSAGES_QUERY_KEY,
  queryFn: () => (getApiClient() as any).getMessages().then((r: any) => r.data),
  refetchInterval: 5 * 60 * 1000,
});

export const useGetGuides = () => useQuery({
  queryKey: GUIDES_QUERY_KEY,
  queryFn: () => (getApiClient() as any).getGuides().then((r: any) => r.data),
  staleTime: 60 * 60 * 1000,
});

export const useGetNotifications = () => useQuery({
  queryKey: NOTIFICATIONS_QUERY_KEY,
  queryFn: () => (getApiClient() as any).getNotifications().then((r: any) => r.data),
  refetchInterval: 5 * 60 * 1000,
});

export const useMarkNotificationAsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => (getApiClient() as any).markNotificationAsRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
};
