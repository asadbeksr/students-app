// Modified from polito/students-app — 2026-04-13
import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '@/lib/api/client';

export const JOB_OFFERS_QUERY_KEY = ['jobOffers'];
export const JOB_OFFER_QUERY_PREFIX = 'jobOffer';

export const useGetJobOffers = () => useQuery({
  queryKey: JOB_OFFERS_QUERY_KEY,
  queryFn: () => getApiClient().getJobOffers().then((r: any) => r.data ?? []),
});

export const useGetJobOffer = (jobOfferId: number) => useQuery({
  queryKey: [JOB_OFFER_QUERY_PREFIX, jobOfferId],
  queryFn: () => getApiClient().getJobOffer(jobOfferId).then((r: any) => r.data),
  enabled: !!jobOfferId,
});
