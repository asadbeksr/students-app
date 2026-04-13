// Modified from polito/students-app — 2026-04-13
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const EXAMS_QUERY_KEY = ['exams'];

export const useGetExams = () => useQuery({
  queryKey: EXAMS_QUERY_KEY,
  queryFn: () => getApiClient().getExams().then((r: any) => r.data ?? []),
});

export const useBookExam = (examId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: unknown) => getApiClient().bookExam(examId, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EXAMS_QUERY_KEY }),
  });
};

export const useCancelExamBooking = (examId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => getApiClient().cancelExamBooking(examId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EXAMS_QUERY_KEY }),
  });
};
