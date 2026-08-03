'use client';

import { useQuery } from '@tanstack/react-query';
import { useGraphQL } from '@/lib/graphql-client';
import { GET_AI_MODELS, GET_AI_MODEL } from './queries';

export type AIModel = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  auditsCount: number;
  testCasesCount: number;
  createdAt: string;
  updatedAt: string;
  modelType: string;
  lifecycleStage?: string;
};

export function useAIModels(orgId: string, limit = 100) {
  const { request, isAuthenticated } = useGraphQL();

  return useQuery({
    queryKey: ['aiModels', orgId, limit],
    queryFn: async () => {
      const response = await request(GET_AI_MODELS, { limit }, { organization: orgId });
      return (response?.aiModels ?? []) as AIModel[];
    },
    enabled: isAuthenticated && !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAIModel(modelId: string, orgId: string) {
  const { request, isAuthenticated } = useGraphQL();

  return useQuery({
    queryKey: ['aiModel', modelId, orgId],
    queryFn: async () => {
      const response = await request(GET_AI_MODEL, { modelId }, { organization: orgId });
      return (response?.aiModel ?? null) as AIModel | null;
    },
    enabled: isAuthenticated && !!modelId && !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}
