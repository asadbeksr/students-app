// Modified from polito/students-app — 2026-04-13
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const ESC_QUERY_KEY = ['esc'];

export const useEscGet = () => useQuery({
  queryKey: ESC_QUERY_KEY,
  queryFn: () => getApiClient().escGet().then((r: any) => r.data),
  gcTime: Infinity,
});

export const useRequestEsc = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => getApiClient().escRequest(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ESC_QUERY_KEY }),
  });
};
