'use client';

import { useQuery } from '@tanstack/react-query';
import { useGraphQL } from '@/lib/graphql-client';
import { GET_MY_EVALUATIONS } from './queries';

export type AuditorEvaluation = {
  id: string;
  name: string;
  modelId: string;
  modelName: string | null;
  status: string;
  evaluationMode: string;
  auditType: string;
  totalTests: number | null;
  passedTests: number | null;
  failedTests: number | null;
  createdAt: string;
  completedAt: string | null;
};

export function useMyEvaluations(limit = 100, offset = 0) {
  const { request, isAuthenticated } = useGraphQL();

  return useQuery({
    queryKey: ['myEvaluations', limit, offset],
    queryFn: async () => {
      const response = await request(GET_MY_EVALUATIONS, { limit, offset });
      return {
        data: (response?.myAudits?.data ?? []) as AuditorEvaluation[],
        total: response?.myAudits?.totalItemsCount ?? 0,
      };
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}
